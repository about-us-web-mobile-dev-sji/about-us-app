import { afterEach, describe, expect, it, vi } from 'vitest';
import databaseConfig from './data-base.config.js';
afterEach(() => vi.unstubAllEnvs());
describe('databaseConfig', () => {
  it('parses PostgreSQL environment configuration', () => {
    vi.stubEnv('DATABASE_TYPE', 'postgres');
    vi.stubEnv('DATABASE_PORT', '5433');
    vi.stubEnv('DATABASE_SYNCHRONIZE', 'false');
    expect(databaseConfig()).toMatchObject({
      type: 'postgres',
      port: 5433,
      synchronize: false,
    });
  });
  it.each(['', 'abc', '5432suffix', '5432.5', '0', '65536'])(
    'rejects invalid port %j',
    (port) => {
      vi.stubEnv('DATABASE_TYPE', 'postgres');
      vi.stubEnv('DATABASE_PORT', port);
      expect(() => databaseConfig()).toThrow('DATABASE_PORT');
    },
  );
  it('rejects unsupported database drivers', () => {
    vi.stubEnv('DATABASE_TYPE', 'mysql');
    expect(() => databaseConfig()).toThrow('DATABASE_TYPE');
  });
  it('rejects ambiguous booleans', () => {
    vi.stubEnv('DATABASE_TYPE', 'postgres');
    vi.stubEnv('DATABASE_PORT', '5432');
    vi.stubEnv('DATABASE_SYNCHRONIZE', 'yes');
    expect(() => databaseConfig()).toThrow('DATABASE_SYNCHRONIZE');
  });
});
