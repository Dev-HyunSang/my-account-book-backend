import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUserNickname1779600000000 implements MigrationInterface {
  name = 'AddUserNickname1779600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users ADD COLUMN nickname varchar(50) NULL`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE users DROP COLUMN IF EXISTS nickname`);
  }
}
