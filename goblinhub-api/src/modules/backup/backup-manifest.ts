import * as crypto from 'crypto';
import * as fs from 'fs';

export const BACKUP_MANIFEST_VERSION = 1;

export interface BackupManifest {
  version: number;
  schema: 'public';
  filename: string;
  sha256: string;
  createdAt: string;
}

export const manifestPathFor = (backupPath: string): string =>
  `${backupPath}.manifest.json`;

export async function sha256File(filepath: string): Promise<string> {
  const hash = crypto.createHash('sha256');
  await new Promise<void>((resolve, reject) => {
    const stream = fs.createReadStream(filepath);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.once('error', reject);
    stream.once('end', resolve);
  });
  return hash.digest('hex');
}

export async function writeManifest(
  filepath: string,
  filename: string,
): Promise<void> {
  const manifest: BackupManifest = {
    version: BACKUP_MANIFEST_VERSION,
    schema: 'public',
    filename,
    sha256: await sha256File(filepath),
    createdAt: new Date().toISOString(),
  };
  await fs.promises.writeFile(
    manifestPathFor(filepath),
    `${JSON.stringify(manifest, null, 2)}\n`,
    { encoding: 'utf8', mode: 0o600, flag: 'wx' },
  );
}

export async function validateManifest(
  filepath: string,
  filename: string,
): Promise<void> {
  let manifest: BackupManifest;
  try {
    manifest = JSON.parse(
      await fs.promises.readFile(manifestPathFor(filepath), 'utf8'),
    ) as BackupManifest;
  } catch {
    throw new Error('backup manifest is missing or invalid');
  }
  if (
    manifest.version !== BACKUP_MANIFEST_VERSION ||
    manifest.schema !== 'public' ||
    manifest.filename !== filename ||
    !/^[a-f0-9]{64}$/.test(manifest.sha256)
  ) {
    throw new Error('backup manifest is incompatible');
  }
  if ((await sha256File(filepath)) !== manifest.sha256) {
    throw new Error('backup checksum does not match its manifest');
  }
}
