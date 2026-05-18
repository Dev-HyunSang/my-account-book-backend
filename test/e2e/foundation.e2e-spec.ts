import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { StubController } from './fixtures/stub.controller';

describe('Foundation (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [StubController],
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
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/health', () => {
    it('returns 200 with { status: ok, db: up, redis: up }', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/health').expect(200);

      expect(res.body).toEqual({ status: 'ok', db: 'up', redis: 'up' });
    });
  });

  describe('ValidationPipe', () => {
    it('rejects unknown fields with 400', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/_stub')
        .send({ name: 'valid', unknownField: 'should be rejected' })
        .expect(400);
    });

    it('accepts valid payload', async () => {
      await request(app.getHttpServer()).post('/api/v1/_stub').send({ name: 'valid' }).expect(201);
    });
  });
});
