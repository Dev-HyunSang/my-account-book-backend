import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateEmailBlacklist1779700000000 implements MigrationInterface {
  name = 'CreateEmailBlacklist1779700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE email_blacklist (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL,
        reason varchar(32) NOT NULL,
        blocked_at timestamptz NOT NULL DEFAULT now(),
        metadata jsonb NULL
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_email_blacklist_lower_email ON email_blacklist (LOWER(email))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_email_blacklist_lower_email`);
    await queryRunner.query(`DROP TABLE IF EXISTS email_blacklist`);
  }
}
