import { MigrationInterface, QueryRunner } from 'typeorm';

export class BlacklistEmailToHash1779800000000 implements MigrationInterface {
  name = 'BlacklistEmailToHash1779800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // GDPR data minimization: store sha256 hex of the lowercased email so
    // an erased user leaves no PII behind. Backfill existing rows in place.
    await queryRunner.query(`DROP INDEX IF EXISTS uq_email_blacklist_lower_email`);
    await queryRunner.query(
      `ALTER TABLE email_blacklist ADD COLUMN email_hash varchar(64)`,
    );
    await queryRunner.query(
      `UPDATE email_blacklist SET email_hash = encode(digest(LOWER(email), 'sha256'), 'hex')
       WHERE email_hash IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE email_blacklist ALTER COLUMN email_hash SET NOT NULL`,
    );
    await queryRunner.query(`ALTER TABLE email_blacklist DROP COLUMN email`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_email_blacklist_email_hash ON email_blacklist (email_hash)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Irreversible: cannot recover plaintext emails from sha256. Restore the
    // schema shape so the prior migration's down() can run, but mark rows as
    // unrecoverable by inserting the hash as the "email" value.
    await queryRunner.query(`DROP INDEX IF EXISTS uq_email_blacklist_email_hash`);
    await queryRunner.query(
      `ALTER TABLE email_blacklist ADD COLUMN email varchar(255)`,
    );
    await queryRunner.query(`UPDATE email_blacklist SET email = email_hash`);
    await queryRunner.query(`ALTER TABLE email_blacklist ALTER COLUMN email SET NOT NULL`);
    await queryRunner.query(`ALTER TABLE email_blacklist DROP COLUMN email_hash`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_email_blacklist_lower_email ON email_blacklist (LOWER(email))`,
    );
  }
}
