import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { createHash } from 'node:crypto';

/**
 * Combina IP + hash del refresh_token como clave de throttling, para que un
 * atacante con un token filtrado no pueda evadir el límite rotando de IP,
 * y para que usuarios legítimos con tokens distintos no compartan contador.
 */
interface RefreshTokenRequest {
  ip: string;
  ips?: string[];
  body?: { refreshToken?: unknown };
}

@Injectable()
export class RefreshTokenThrottlerGuard extends ThrottlerGuard {
  protected getTracker(req: Record<string, any>): Promise<string> {
    const { ip, ips, body } = req as RefreshTokenRequest;
    const trackerIp = ips?.length ? ips[0] : ip;
    const refreshToken = body?.refreshToken;

    if (typeof refreshToken !== 'string' || refreshToken.length === 0) {
      return Promise.resolve(trackerIp);
    }

    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');
    return Promise.resolve(`${trackerIp}:${tokenHash}`);
  }
}
