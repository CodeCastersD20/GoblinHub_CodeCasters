import { IsString, Matches } from 'class-validator';

export class RestoreBackupDto {
  @IsString()
  @Matches(/^backup_[\d]{4}-[\d]{2}-[\d]{2}_[\d]{2}-[\d]{2}-[\d]{2}\.sql$/, {
    message:
      'filename must be a valid backup file (e.g. backup_2026-02-27_02-00-00.sql)',
  })
  filename: string;
}
