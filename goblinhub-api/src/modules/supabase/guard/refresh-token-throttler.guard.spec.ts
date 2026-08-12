import { Reflector } from '@nestjs/core';
import { ThrottlerStorage } from '@nestjs/throttler';
import { createHash } from 'node:crypto';
import { RefreshTokenThrottlerGuard } from './refresh-token-throttler.guard';

describe('RefreshTokenThrottlerGuard', () => {
  let guard: RefreshTokenThrottlerGuard;

  const getTracker = (guard: RefreshTokenThrottlerGuard, req: unknown) =>
    (
      guard as unknown as {
        getTracker: (req: unknown) => Promise<string>;
      }
    ).getTracker(req);

  beforeEach(() => {
    const storageService: jest.Mocked<ThrottlerStorage> = {
      increment: jest.fn(),
    };

    guard = new RefreshTokenThrottlerGuard(
      { throttlers: [{ limit: 8, ttl: 60000 }] },
      storageService,
      new Reflector(),
    );
  });

  it('combina IP + hash del refresh_token en la misma clave para requests idénticos', async () => {
    const req = { ip: '1.2.3.4', ips: [], body: { refreshToken: 'token-a' } };

    const trackerA = await getTracker(guard, req);
    const trackerB = await getTracker(guard, { ...req });

    expect(trackerA).toBe(trackerB);
  });

  it('genera claves independientes para la misma IP con tokens distintos', async () => {
    const base = { ip: '1.2.3.4', ips: [] };

    const trackerA = await getTracker(guard, {
      ...base,
      body: { refreshToken: 'token-a' },
    });
    const trackerB = await getTracker(guard, {
      ...base,
      body: { refreshToken: 'token-b' },
    });

    expect(trackerA).not.toBe(trackerB);
  });

  it('genera claves independientes para el mismo token con IPs distintas', async () => {
    const body = { refreshToken: 'token-a' };

    const trackerA = await getTracker(guard, { ip: '1.1.1.1', ips: [], body });
    const trackerB = await getTracker(guard, { ip: '2.2.2.2', ips: [], body });

    expect(trackerA).not.toBe(trackerB);
  });

  it('usa el hash sha256 del refresh_token como parte de la clave', async () => {
    const req = { ip: '9.9.9.9', ips: [], body: { refreshToken: 'token-a' } };
    const expectedHash = createHash('sha256').update('token-a').digest('hex');

    const tracker = await getTracker(guard, req);

    expect(tracker).toBe(`9.9.9.9:${expectedHash}`);
  });

  it('cae de vuelta a solo IP si el body no trae refreshToken', async () => {
    const req = { ip: '5.5.5.5', ips: [], body: {} };

    const tracker = await getTracker(guard, req);

    expect(tracker).toBe('5.5.5.5');
  });

  it('usa req.ips[0] cuando hay proxy delante (X-Forwarded-For)', async () => {
    const req = {
      ip: '10.0.0.1',
      ips: ['203.0.113.9', '10.0.0.1'],
      body: { refreshToken: 'token-a' },
    };
    const expectedHash = createHash('sha256').update('token-a').digest('hex');

    const tracker = await getTracker(guard, req);

    expect(tracker).toBe(`203.0.113.9:${expectedHash}`);
  });
});
