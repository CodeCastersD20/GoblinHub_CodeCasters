import {
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

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
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new InternalServerErrorException('DATABASE_URL is not configured');
    }

    const timestamp = this.getTimestamp();
    const filename = `backup_${timestamp}.sql`;
    const filepath = path.join(this.backupsDir, filename);

    this.logger.log(`Starting database backup → ${filename}`);

    await this.runCommand('pg_dump', [
      `--dbname=${databaseUrl}`,
      '--no-password',
      '--format=plain',
      '--no-owner',
      '--no-acl',
      `--file=${filepath}`,
    ]);

    const stats = fs.statSync(filepath);
    const sizeKb = Math.round(stats.size / 1024);

    this.logger.log(`Backup completed: ${filename} (${sizeKb} KB)`);
    return { filename, path: filepath, sizeKb };
  }

  // ──────────────────────────────────────────────
  //  RESTORE
  // ──────────────────────────────────────────────

  async restoreBackup(filename: string): Promise<{ message: string }> {
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    if (!databaseUrl) {
      throw new InternalServerErrorException('DATABASE_URL is not configured');
    }

    // Validar que el nombre no contiene path traversal
    const safeFilename = path.basename(filename);
    const filepath = path.join(this.backupsDir, safeFilename);

    if (!fs.existsSync(filepath)) {
      throw new NotFoundException(`Backup file '${safeFilename}' not found`);
    }

    this.logger.warn(`Starting database restore from: ${safeFilename}`);

    await this.runCommand('psql', [
      `--dbname=${databaseUrl}`,
      '--no-password',
      `--file=${filepath}`,
      '--single-transaction',
    ]);

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

  private runCommand(command: string, args: string[]): Promise<void> {
    return new Promise((resolve, reject) => {
      const proc = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });

      let stderr = '';
      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          this.logger.error(
            `Command '${command}' failed (exit ${code}): ${stderr}`,
          );
          reject(
            new InternalServerErrorException(
              `'${command}' exited with code ${code}. Check server logs for details.`,
            ),
          );
        }
      });

      proc.on('error', (err) => {
        this.logger.error(`Failed to start '${command}': ${err.message}`);
        reject(
          new InternalServerErrorException(
            `Could not start '${command}'. Make sure postgresql-client is installed.`,
          ),
        );
      });
    });
  }
}
