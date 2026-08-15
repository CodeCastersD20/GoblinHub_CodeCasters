import * as fs from 'fs';
import * as path from 'path';
import {
  parseDatabaseUrl,
  withTemporaryPassfile,
} from './database-credentials';

describe('secure PostgreSQL credentials', () => {
  const secret = 'p:ss\\word';
  const url =
    'postgresql://backup:p%3Ass%5Cword@db.example.test:5432/app?sslmode=require';

  it('removes the password from the child command URL', () => {
    const parsed = parseDatabaseUrl(url);
    expect(parsed.safeUrl).not.toContain(secret);
    expect(parsed.safeUrl).not.toContain('p%3Ass');
    expect(parsed.safeUrl).toContain('sslmode=require');
    expect(parsed.passfileEntry).toBe(
      'db.example.test:5432:app:backup:p\\:ss\\\\word',
    );
  });

  it('creates a 0600 passfile, filters secrets, and always removes it', async () => {
    let passfile = '';
    process.env.DATABASE_URL = 'must-not-leak';
    process.env.RESTORE_DATABASE_URL = 'must-not-leak-either';
    process.env.PGPASSWORD = 'must-not-leak-three';

    await expect(
      withTemporaryPassfile(url, (safeUrl, env) => {
        passfile = env.PGPASSFILE!;
        expect(safeUrl).not.toContain(secret);
        expect(env.DATABASE_URL).toBeUndefined();
        expect(env.RESTORE_DATABASE_URL).toBeUndefined();
        expect(env.PGPASSWORD).toBeUndefined();
        expect(fs.statSync(passfile).mode & 0o777).toBe(0o600);
        expect(fs.statSync(path.dirname(passfile)).mode & 0o777).toBe(0o700);
        return Promise.reject(new Error('expected failure'));
      }),
    ).rejects.toThrow('expected failure');

    expect(fs.existsSync(passfile)).toBe(false);
    delete process.env.DATABASE_URL;
    delete process.env.RESTORE_DATABASE_URL;
    delete process.env.PGPASSWORD;
  });

  it.each([
    ['not-a-url'],
    ['https://user:password@example.test/database'],
    ['postgresql://user@example.test/database'],
  ])('rejects unsafe or incomplete URL %s', (invalidUrl) => {
    expect(() => parseDatabaseUrl(invalidUrl)).toThrow();
  });
});
