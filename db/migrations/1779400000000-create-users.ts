import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1779400000000 implements MigrationInterface {
  name = 'CreateUsers1779400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE users (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        email varchar(255) NOT NULL,
        password_hash text NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now(),
        updated_at timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX uq_users_lower_email ON users (LOWER(email))`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS uq_users_lower_email`);
    await queryRunner.query(`DROP TABLE IF EXISTS users`);
  }
}
