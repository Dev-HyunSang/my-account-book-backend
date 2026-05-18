import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitFoundation1778459810467 implements MigrationInterface {
  name = 'InitFoundation1778459810467';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // pgcrypto is shared infrastructure; dropping it here could break other extensions.
    // Intentionally a no-op: the extension stays even after revert.
    // If a clean slate is needed, drop the entire database.
  }
}
