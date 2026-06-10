import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserConsent1780000000000 implements MigrationInterface {
  name = 'AddUserConsent1780000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add the two mandatory-consent timestamp columns. A DEFAULT now() lets us
    // add NOT NULL columns to a table that may already hold rows; existing
    // users are backfilled to the migration time.
    // NOTE: this backfill stamps now() as the consent time for any pre-existing
    // user — it does not represent an actual agreement. This is acceptable only
    // because the table holds no real production users at the time of this
    // migration. If that ever changes, prefer a nullable column + re-consent
    // flow over a fabricated timestamp.
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN terms_agreed_at timestamptz NOT NULL DEFAULT now()`,
    );
    await queryRunner.query(
      `ALTER TABLE users ADD COLUMN privacy_agreed_at timestamptz NOT NULL DEFAULT now()`,
    );
    // Drop the defaults so consent timestamps must be supplied explicitly by the
    // application on every future insert (no silent "now()" consent).
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN terms_agreed_at DROP DEFAULT`);
    await queryRunner.query(`ALTER TABLE users ALTER COLUMN privacy_agreed_at DROP DEFAULT`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS privacy_agreed_at`);
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS terms_agreed_at`);
  }
}
