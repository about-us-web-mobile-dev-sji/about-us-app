import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMediaNomCategorie1791500000000 implements MigrationInterface {
  name = 'AddMediaNomCategorie1791500000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias
      ADD COLUMN IF NOT EXISTS nom varchar(255) NOT NULL DEFAULT 'media'
    `);
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias
      ADD COLUMN IF NOT EXISTS categorie varchar(32) NOT NULL DEFAULT 'document'
    `);
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias
      ALTER COLUMN nom DROP DEFAULT
    `);
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias
      ALTER COLUMN categorie DROP DEFAULT
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias DROP COLUMN IF EXISTS categorie
    `);
    await queryRunner.query(`
      ALTER TABLE mediatheque.medias DROP COLUMN IF EXISTS nom
    `);
  }
}
