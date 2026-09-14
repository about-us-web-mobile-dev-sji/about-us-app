import { describe, expect, it, vi } from 'vitest';
import { ConfigService } from '@nestjs/config';
import type { Request, Response } from 'express';
import { AuthController } from './auth.controller.js';
import type { ChangePassword } from '../../application/use-cases/commands/change-password/change-password.js';

const body = {
  currentPassword: 'old-password',
  newPassword: 'new-password-123',
};
function fixture(cookies = {}, headers: Record<string, string> = {}) {
  const handle = vi.fn().mockResolvedValue(undefined);
  const controller = new AuthController(
    { handle } as unknown as ChangePassword,
    new ConfigService({ auth: { webOrigin: 'http://localhost:4200' } }),
  );
  const req = {
    cookies,
    get: (key: string) => headers[key],
  } as unknown as Request;
  const clearCookie = vi.fn();
  return {
    controller,
    req,
    res: { clearCookie } as unknown as Response,
    handle,
    clearCookie,
  };
}
describe('Password route', () => {
  it('passes the bearer token and ignores a client-supplied target user', async () => {
    const f = fixture({}, { authorization: 'Bearer token' });
    await f.controller.changePassword(
      { ...body, subjectId: 'victim' },
      f.req,
      f.res,
    );
    expect(f.handle).toHaveBeenCalledWith({ ...body, accessToken: 'token' });
    expect(f.clearCookie).not.toHaveBeenCalled();
  });
  it('rejects missing authentication', async () => {
    const f = fixture();
    await expect(
      f.controller.changePassword(body, f.req, f.res),
    ).rejects.toThrow('Access token is required');
    expect(f.handle).not.toHaveBeenCalled();
  });
  it.each([undefined, 'http://evil.example'])(
    'rejects cookie requests from an untrusted origin %s',
    async (origin) => {
      const f = fixture({ access_token: 'cookie' }, origin ? { origin } : {});
      await expect(
        f.controller.changePassword(body, f.req, f.res),
      ).rejects.toThrow('Untrusted request origin');
      expect(f.handle).not.toHaveBeenCalled();
    },
  );
  it('clears both cookies after success', async () => {
    const f = fixture(
      { access_token: 'cookie' },
      { origin: 'http://localhost:4200' },
    );
    await f.controller.changePassword(body, f.req, f.res);
    expect(f.handle).toHaveBeenCalledWith({ ...body, accessToken: 'cookie' });
    expect(f.clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.objectContaining({ path: '/' }),
    );
    expect(f.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/auth/web' }),
    );
  });
  it('preserves cookies when the use case rejects the change', async () => {
    const f = fixture(
      { access_token: 'cookie' },
      { origin: 'http://localhost:4200' },
    );
    f.handle.mockRejectedValue(new Error('Forbidden'));
    await expect(
      f.controller.changePassword(body, f.req, f.res),
    ).rejects.toThrow('Forbidden');
    expect(f.clearCookie).not.toHaveBeenCalled();
  });
  it.each([null, {}, { currentPassword: 12, newPassword: 'abc' }])(
    'rejects malformed bodies',
    async (invalid) => {
      const f = fixture({}, { authorization: 'Bearer token' });
      await expect(
        f.controller.changePassword(invalid, f.req, f.res),
      ).rejects.toThrow('currentPassword and newPassword are required');
      expect(f.handle).not.toHaveBeenCalled();
    },
  );
});
