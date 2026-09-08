import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, openSync, closeSync, chmodSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

/** One connection per Nest application. Transactions are synchronous and never await. */
export class SqliteDatabase {
  readonly connection: DatabaseSync;
  constructor(path: string) {
    if (!path.trim()) throw new Error('DATABASE_PATH must not be empty');
    if (path !== ':memory:') {
      path = resolve(path);
      mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
      closeSync(openSync(path, 'a', 0o600));
      chmodSync(path, 0o600);
    }
    this.connection = new DatabaseSync(path, { timeout: 10000 });
    this.connection.exec(
      'PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 10000;',
    );
    try {
      this.transaction(() => {
        const version = this.connection
          .prepare('PRAGMA user_version')
          .get()?.user_version;
        if (version !== 0 && version !== 1)
          throw new Error('Unsupported database schema version');
        this.connection.exec(`
          CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            firstName TEXT, lastName TEXT,
            email TEXT NOT NULL COLLATE NOCASE UNIQUE,
            status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'SUSPENDED')),
            globalRole TEXT NOT NULL CHECK (globalRole IN ('USER', 'SUPER_ADMIN'))
          ) STRICT;
          CREATE INDEX IF NOT EXISTS users_role ON users(globalRole);
          CREATE TABLE IF NOT EXISTS auth_identities (
            id TEXT PRIMARY KEY,
            subjectId TEXT NOT NULL REFERENCES users(id),
            provider TEXT NOT NULL CHECK (provider IN ('EMAIL', 'GOOGLE')),
            providerSubject TEXT NOT NULL,
            passwordHash TEXT,
            createdAt INTEGER NOT NULL, updatedAt INTEGER NOT NULL, lastAuthenticatedAt INTEGER,
            UNIQUE(provider, providerSubject), UNIQUE(subjectId, provider), UNIQUE(id, subjectId),
            CHECK ((provider = 'EMAIL' AND length(passwordHash) > 0 AND passwordHash IS NOT NULL) OR (provider = 'GOOGLE' AND passwordHash IS NULL))
          ) STRICT;
          CREATE TABLE IF NOT EXISTS auth_sessions (
            id TEXT PRIMARY KEY,
            subjectId TEXT NOT NULL REFERENCES users(id),
            identityId TEXT NOT NULL,
            status TEXT NOT NULL CHECK (status IN ('ACTIVE', 'REVOKED', 'EXPIRED')),
            createdAt INTEGER NOT NULL, lastActivityAt INTEGER NOT NULL, expiresAt INTEGER NOT NULL,
            revokedAt INTEGER, revocationReason TEXT, userAgent TEXT,
            FOREIGN KEY (identityId, subjectId) REFERENCES auth_identities(id, subjectId)
          ) STRICT;
          PRAGMA user_version = 1;
        `);
      });
    } catch (error) {
      this.connection.close();
      throw error;
    }
  }
  transaction<T>(work: () => T): T {
    this.connection.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.connection.exec('COMMIT');
      return result;
    } catch (error) {
      this.connection.exec('ROLLBACK');
      throw error;
    }
  }
  onModuleDestroy(): void {
    this.close();
  }
  close(): void {
    if (this.connection.isOpen) this.connection.close();
  }
}
