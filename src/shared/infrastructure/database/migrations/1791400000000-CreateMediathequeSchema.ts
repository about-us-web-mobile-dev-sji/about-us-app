import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMediathequeSchema1791400000000 implements MigrationInterface {
  name = 'CreateMediathequeSchema1791400000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE SCHEMA IF NOT EXISTS mediatheque`);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mediatheque.medias (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        url text NOT NULL,
        taille bigint NOT NULL,
        type_fichier varchar(255) NOT NULL,
        storage_key varchar(512) NOT NULL,
        espace_id uuid NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS IDX_medias_storage_key
      ON mediatheque.medias (storage_key)
    `);
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS mediatheque.pending_uploads (
        key varchar(512) PRIMARY KEY,
        mime_type varchar(255) NOT NULL,
        size bigint NOT NULL,
        espace_id uuid NULL,
        created_at timestamptz NOT NULL
      )
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS mediatheque.pending_uploads`);
    await queryRunner.query(`DROP TABLE IF EXISTS mediatheque.medias`);
    await queryRunner.query(`DROP SCHEMA IF EXISTS mediatheque`);
  }
}
