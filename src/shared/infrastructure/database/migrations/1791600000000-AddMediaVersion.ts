import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaVersion1791600000000 implements MigrationInterface {
  name = 'AddMediaVersion1791600000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias
      ADD COLUMN IF NOT EXISTS version varchar(64) NOT NULL DEFAULT '1'
    `);
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias
      ALTER COLUMN version DROP DEFAULT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias DROP COLUMN IF EXISTS version
    `);
  }
}
