import type { MigrationInterface, QueryRunner } from 'typeorm';

const FROM = 'auth';
const TO = 'authentication';
/** Only our own tables: Supabase owns the `auth` schema and its users/sessions/identities. */
const TABLES = ['auth_identities', 'auth_sessions'] as const;

/**
 * Moves the auth module tables out of the `auth` schema, which Supabase
 * reserves for its own authentication. Indexes, constraints and data move with
 * each table. Idempotent: a table already moved, or never created, is skipped.
 */
export class MoveAuthTablesToAuthenticationSchema1791331200000 implements MigrationInterface {
  name = 'MoveAuthTablesToAuthenticationSchema1791331200000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${TO}"`);
    await move(queryRunner, FROM, TO);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS "${FROM}"`);
    await move(queryRunner, TO, FROM);
  }
}

async function move(queryRunner: QueryRunner, from: string, to: string): Promise<void> {
  for (const table of TABLES) {
    if (!(await queryRunner.hasTable(`${from}.${table}`))) continue;
    if (await queryRunner.hasTable(`${to}.${table}`))
      throw new Error(`Both "${from}"."${table}" and "${to}"."${table}" exist: resolve manually`);
    await queryRunner.query(`ALTER TABLE "${from}"."${table}" SET SCHEMA "${to}"`);
  }
}
