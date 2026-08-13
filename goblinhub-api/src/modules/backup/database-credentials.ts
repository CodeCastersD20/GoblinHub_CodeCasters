import { spawn } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface SafeDatabaseConnection {
  safeUrl: string;
  passfileEntry: string;
}

const escapePassfileField = (value: string): string =>
  value.replace(/\\/g, '\\\\').replace(/:/g, '\\:');

export function parseDatabaseUrl(value: string): SafeDatabaseConnection {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error('must be a valid PostgreSQL URL');
  }

  if (!['postgres:', 'postgresql:'].includes(url.protocol)) {
    throw new Error('must use the postgres or postgresql protocol');
  }
  if (!url.hostname || !url.username || !url.password) {
    throw new Error('must include host, username, and password');
  }

  const database = decodeURIComponent(url.pathname.replace(/^\//, ''));
  if (!database) throw new Error('must include a database name');

  const password = decodeURIComponent(url.password);
  url.password = '';

  return {
    safeUrl: url.toString(),
    passfileEntry: [
      url.hostname,
      url.port || '5432',
      database,
      decodeURIComponent(url.username),
      password,
    ]
      .map(escapePassfileField)
      .join(':'),
  };
}

export async function withTemporaryPassfile<T>(
  connectionUrl: string,
  callback: (safeUrl: string, childEnv: NodeJS.ProcessEnv) => Promise<T>,
): Promise<T> {
  const connection = parseDatabaseUrl(connectionUrl);
  const tempDir = await fs.promises.mkdtemp(
    path.join(os.tmpdir(), 'goblinhub-pgpass-'),
  );
  const passfile = path.join(tempDir, 'pgpass');

  try {
    await fs.promises.chmod(tempDir, 0o700);
    await fs.promises.writeFile(passfile, `${connection.passfileEntry}\n`, {
      encoding: 'utf8',
      mode: 0o600,
      flag: 'wx',
    });

    const childEnv: NodeJS.ProcessEnv = {
      PATH: process.env.PATH,
      LANG: process.env.LANG,
      LC_ALL: process.env.LC_ALL,
      TZ: process.env.TZ,
      HOME: process.env.HOME,
      PGPASSFILE: passfile,
    };
    return await callback(connection.safeUrl, childEnv);
  } finally {
    await fs.promises.rm(tempDir, { recursive: true, force: true });
  }
}

export function spawnPostgresClient(
  command: string,
  args: string[],
  env: NodeJS.ProcessEnv,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      env,
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    let stderr = '';
    proc.stderr.on('data', (data: Buffer) => (stderr += data.toString()));
    proc.once('error', reject);
    proc.once('close', (code) =>
      code === 0
        ? resolve(stderr)
        : reject(new Error(`${command} exited with code ${code}: ${stderr}`)),
    );
  });
}
