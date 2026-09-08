import { afterEach, describe, expect, it, vi } from 'vitest';
import databaseConfig from './data-base.config.js';

afterEach(() => vi.unstubAllEnvs());
describe('databaseConfig', () => {
  it('reads environment values with a numeric default port and mysql type', () => {
    vi.stubEnv('DATABASE_TYPE', undefined);
    vi.stubEnv('DATABASE_PORT', undefined);
    vi.stubEnv('DATABASE_HOST', 'test-db');
    vi.stubEnv('DATABASE_USERNAME', 'test-user');
    vi.stubEnv('DATABASE_PASSWORD', 'test-password');
    vi.stubEnv('DATABASE_NAME', 'test-database');
    expect(databaseConfig()).toEqual({
      type: 'mysql',
      host: 'test-db',
      port: 3306,
      username: 'test-user',
      password: 'test-password',
      name: 'test-database',
    });
  });
  it('accepts a mariadb connection and a custom port', () => {
    vi.stubEnv('DATABASE_TYPE', 'mariadb');
    vi.stubEnv('DATABASE_PORT', '3307');
    expect(databaseConfig()).toMatchObject({ type: 'mariadb', port: 3307 });
  });
  it.each(['', 'abc', '3306suffix', '3306.5', '0', '65536'])(
    'rejects invalid port %j',
    (port) => {
      vi.stubEnv('DATABASE_TYPE', 'mysql');
      vi.stubEnv('DATABASE_PORT', port);
      expect(() => databaseConfig()).toThrow('DATABASE_PORT');
    },
  );
  it('rejects unsupported drivers instead of forcing an unsafe TypeScript cast', () => {
    vi.stubEnv('DATABASE_TYPE', 'postgres');
    expect(() => databaseConfig()).toThrow('DATABASE_TYPE');
  });
});
