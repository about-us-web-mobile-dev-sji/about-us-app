import { describe, expect, it } from 'vitest';
import { EmailLoginDto } from './email-login.dto.js';
import { RefreshTokenDto } from './refresh-token.dto.js';
describe('authentication request DTOs', () => {
  it.each([
    null,
    {},
    { email: 'a@example.com', password: 12 },
    { email: '', password: 'x' },
  ])('rejects malformed login input', (body) =>
    expect(() => EmailLoginDto.parse(body)).toThrow(),
  );
  it('selects only allowed login fields', () =>
    expect(
      EmailLoginDto.parse({
        email: 'a@example.com',
        password: 'pass',
        globalRole: 'SUPER_ADMIN',
      }),
    ).toEqual({ email: 'a@example.com', password: 'pass' }));
  it.each([null, {}, { refreshToken: '' }, { refreshToken: 'x'.repeat(8193) }])(
    'rejects malformed refresh input',
    (body) => expect(() => RefreshTokenDto.parse(body)).toThrow(),
  );
});
