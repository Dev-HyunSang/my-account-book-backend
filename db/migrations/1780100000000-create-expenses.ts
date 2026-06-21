import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateExpenses1780100000000 implements MigrationInterface {
  name = 'CreateExpenses1780100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE expenses (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expense_date date NOT NULL,
        amount numeric(20,0) NOT NULL CHECK (amount >= 0),
        memo text NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE INDEX idx_expenses_user_date ON expenses (user_id, expense_date DESC, id DESC)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS idx_expenses_user_date`);
    await queryRunner.query(`DROP TABLE IF EXISTS expenses`);
  }
}
