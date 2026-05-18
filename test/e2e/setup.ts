import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { DataSource } from 'typeorm';

let app: INestApplication;
let dataSource: DataSource;

export async function createTestApp(): Promise<INestApplication> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleFixture.createNestApplication();

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  dataSource = moduleFixture.get(DataSource);

  return app;
}

export async function closeTestApp(): Promise<void> {
  if (app) {
    await app.close();
  }
}

/**
 * Wraps a test body in a QueryRunner transaction that rolls back after the test.
 * Provides per-test isolation without truncating tables.
 */
export async function withTxRollback(
  fn: (queryRunner: import('typeorm').QueryRunner) => Promise<void>,
): Promise<void> {
  const queryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();
  try {
    await fn(queryRunner);
  } finally {
    await queryRunner.rollbackTransaction();
    await queryRunner.release();
  }
}

export { dataSource };

// Jest globalSetup — no-op here; app is initialized per-file via createTestApp().
export default async function globalSetup() {}
