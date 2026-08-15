import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import {
  spawnPostgresClient,
  withTemporaryPassfile,
} from './database-credentials';
import { validateManifest, writeManifest } from './backup-manifest';

@Injectable()
export class BackupService {
  private readonly logger = new Logger(BackupService.name);
  private readonly backupsDir: string;

  constructor(private readonly configService: ConfigService) {
    this.backupsDir = path.join(process.cwd(), 'backups');
    // Crear carpeta si no existe al iniciar el servicio
    if (!fs.existsSync(this.backupsDir)) {
      fs.mkdirSync(this.backupsDir, { recursive: true });
    }
  }

  // ──────────────────────────────────────────────
  //  BACKUP
  // ──────────────────────────────────────────────

  async createBackup(): Promise<{
    filename: string;
    path: string;
    sizeKb: number;
  }> {
    const databaseUrl = this.configService.get<string>('BACKUP_DATABASE_URL');
    if (!databaseUrl) {
      throw new InternalServerErrorException(
        'BACKUP_DATABASE_URL is not configured',
      );
    }

    const timestamp = this.getTimestamp();
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(this.backupsDir, filename);

    this.logger.log(`Starting database backup → ${filename}`);

    try {
      await withTemporaryPassfile(databaseUrl, (safeUrl, env) =>
        this.runCommand(
          'pg_dump',
          [
            `--dbname=${safeUrl}`,
            '--no-password',
            '--format=plain',
            '--no-owner',
            '--no-acl',
            '--schema=public',
            `--file=${filepath}`,
          ],
          env,
        ),
      );
      await writeManifest(filepath, filename);
    } catch (error) {
      await fs.promises.rm(filepath, { force: true });
      throw error;
    }

    const stats = fs.statSync(filepath);
    const sizeKb = Math.round(stats.size / 1024);

    this.logger.log(`Backup completed: ${filename} (${sizeKb} KB)`);
    return { filename, path: filepath, sizeKb };
  }

  // ──────────────────────────────────────────────
  //  RESTORE
  // ──────────────────────────────────────────────

  async restoreBackup(filename: string): Promise<{ message: string }> {
    const databaseUrl = this.configService.get<string>('RESTORE_DATABASE_URL');
    if (!databaseUrl) {
      throw new InternalServerErrorException(
        'RESTORE_DATABASE_URL is not configured',
      );
    }

    // Validar que el nombre no contiene path traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(this.backupsDir, safeFilename);

    if (!fs.existsSync(filepath)) {
      throw new NotFoundException(`Backup file '${safeFilename}' not found`);
    }

    try {
      await validateManifest(filepath, safeFilename);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'invalid backup';
      throw new InternalServerErrorException(
        `Backup cannot be restored safely: ${message}`,
      );
    }

    this.logger.warn(`Starting database restore from: ${safeFilename}`);

    await withTemporaryPassfile(databaseUrl, (safeUrl, env) =>
      this.runCommand(
        'psql',
        [
          `--dbname=${safeUrl}`,
          '--no-password',
          `--file=${filepath}`,
          '--single-transaction',
        ],
        env,
      ),
    );

    this.logger.log(`Restore completed from: ${safeFilename}`);
    return { message: `Database restored successfully from '${safeFilename}'` };
  }

  // ──────────────────────────────────────────────
  //  LISTAR BACKUPS
  // ──────────────────────────────────────────────

  listBackups(): {
    filename: string;
    createdAt: Date;
    sizeKb: number;
  }[] {
    if (!fs.existsSync(this.backupsDir)) {
      return [];
    }

    const files = fs
      .readdirSync(this.backupsDir)
      .filter((f) => f.endsWith('.sql') && f !== '.gitkeep');

    return files
      .map((filename) => {
        const filepath = path.join(this.backupsDir, filename);
        const stats = fs.statSync(filepath);
        return {
          filename,
          createdAt: stats.birthtime,
          sizeKb: Math.round(stats.size / 1024),
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // más recientes primero
  }

  // ──────────────────────────────────────────────
  //  HELPERS PRIVADOS
  // ──────────────────────────────────────────────

  private getTimestamp(): string {
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` +
      `_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`
    );
  }

  private async runCommand(
    command: string,
    args: string[],
    env: NodeJS.ProcessEnv,
  ): Promise<void> {
    try {
      await spawnPostgresClient(command, args, env);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unknown error';
      this.logger.error(`PostgreSQL client '${command}' failed: ${message}`);
      throw new InternalServerErrorException(
        `'${command}' failed. Check server logs for details.`,
      );
    }
  }
}
