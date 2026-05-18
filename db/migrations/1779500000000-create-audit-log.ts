import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLog1779500000000 implements MigrationInterface {
  name = 'CreateAuditLog1779500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE audit_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NULL REFERENCES users(id) ON DELETE SET NULL,
        action varchar(64) NOT NULL,
        ip varchar(45) NULL,
        user_agent text NULL,
        metadata jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX audit_log_user_id_created_at_idx ON audit_log (user_id, created_at DESC)`,
    );
    await queryRunner.query(
      `CREATE INDEX audit_log_action_created_at_idx ON audit_log (action, created_at DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS audit_log_action_created_at_idx`);
    await queryRunner.query(`DROP INDEX IF EXISTS audit_log_user_id_created_at_idx`);
    await queryRunner.query(`DROP TABLE IF EXISTS audit_log`);
  }
}
