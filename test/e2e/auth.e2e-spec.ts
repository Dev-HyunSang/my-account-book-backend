import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { Redis } from 'ioredis';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { REDIS } from '../../src/redis/redis.constants';
import { ProtectedController } from './fixtures/protected.controller';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let redis: Redis;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ProtectedController],
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
    redis = moduleFixture.get<Redis>(REDIS);
  });

  beforeEach(async () => {
    await dataSource.query('TRUNCATE users CASCADE');
    await redis.flushdb();
  });

  afterAll(async () => {
    await app.close();
  });

  const validCreds = { email: 'alice@example.com', password: 'pa55word!', nickname: 'Alice' };

  describe('POST /api/v1/auth/register', () => {
    it('returns 201 with token pair on success', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validCreds)
        .expect(201);
      expect(res.body).toHaveProperty('accessToken');
      expect(res.body).toHaveProperty('refreshToken');
    });

    it('returns 409 on duplicate email', async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(validCreds).expect(201);
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(validCreds).expect(409);
    });

    it('returns 400 when password too short', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send({ email: 'a@b.com', password: 'short', nickname: 'Bob' })
        .expect(400);
    });
  });

  describe('POST /api/v1/auth/login', () => {
    beforeEach(async () => {
      await request(app.getHttpServer()).post('/api/v1/auth/register').send(validCreds).expect(201);
    });

    it('returns 200 with token pair on correct credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send(validCreds)
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
    });

    it('returns 401 on wrong password', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ ...validCreds, password: 'wrongpass11' })
        .expect(401);
    });

    it('returns 401 on unknown email', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'pa55word!' })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    let refreshToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validCreds)
        .expect(201);
      refreshToken = res.body.refreshToken;
    });

    it('rotates and returns a new pair', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();
      expect(res.body.refreshToken).not.toBe(refreshToken);
    });

    it('rejects the old refresh after rotation', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(200);
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('POST /api/v1/auth/logout + protected route', () => {
    let accessToken: string;
    let refreshToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validCreds)
        .expect(201);
      accessToken = res.body.accessToken;
      refreshToken = res.body.refreshToken;
    });

    it('GET /api/v1/_protected without bearer returns 401', async () => {
      await request(app.getHttpServer()).get('/api/v1/_protected').expect(401);
    });

    it('GET /api/v1/_protected with valid bearer returns 200', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/_protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.userId).toBeDefined();
    });

    it('logout returns 204 and revokes the access token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
      await request(app.getHttpServer())
        .get('/api/v1/_protected')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(401);
    });

    it('logout also revokes the bound refresh token', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
      await request(app.getHttpServer())
        .post('/api/v1/auth/refresh')
        .send({ refreshToken })
        .expect(401);
    });
  });

  describe('GET /api/v1/auth/verify', () => {
    let accessToken: string;

    beforeEach(async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(validCreds)
        .expect(201);
      accessToken = res.body.accessToken;
    });

    it('returns { valid: true, expiresAt } with a valid bearer token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.valid).toBe(true);
      expect(typeof res.body.expiresAt).toBe('number');
      expect(res.body.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('returns { valid: false, expiresAt: null } when the header is missing', async () => {
      const res = await request(app.getHttpServer()).get('/api/v1/auth/verify').expect(200);
      expect(res.body).toEqual({ valid: false, expiresAt: null });
    });

    it('returns { valid: false } when the token is malformed', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/verify')
        .set('Authorization', 'Bearer not-a-real-jwt')
        .expect(200);
      expect(res.body).toEqual({ valid: false, expiresAt: null });
    });

    it('stays valid after logout (signature-only check, no blacklist)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(204);
      const res = await request(app.getHttpServer())
        .get('/api/v1/auth/verify')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);
      expect(res.body.valid).toBe(true);
    });
  });
});
