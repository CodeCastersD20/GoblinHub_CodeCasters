import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import {
  manifestPathFor,
  validateManifest,
  writeManifest,
} from './backup-manifest';

describe('backup manifest', () => {
  let tempDir: string;
  let backup: string;
  const filename = 'backup_2026-08-12_12-00-00.sql';

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'backup-manifest-test-'));
    backup = path.join(tempDir, filename);
    fs.writeFileSync(backup, 'SELECT 1;\n');
  });

  afterEach(() => fs.rmSync(tempDir, { recursive: true, force: true }));

  it('accepts a compatible unmodified backup', async () => {
    await writeManifest(backup, filename);
    await expect(validateManifest(backup, filename)).resolves.toBeUndefined();
    if (process.platform !== 'win32') {
      expect(fs.statSync(manifestPathFor(backup)).mode & 0o777).toBe(0o600);
    }
  });

  it('rejects historical backups without a manifest', async () => {
    await expect(validateManifest(backup, filename)).rejects.toThrow(
      'manifest is missing or invalid',
    );
  });

  it('rejects a modified backup', async () => {
    await writeManifest(backup, filename);
    fs.appendFileSync(backup, 'DROP TABLE usuarios;\n');
    await expect(validateManifest(backup, filename)).rejects.toThrow(
      'checksum does not match',
    );
  });
});
