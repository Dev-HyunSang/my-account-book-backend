import * as dotenv from 'dotenv';

if (
  !process.env.NODE_ENV ||
  process.env.NODE_ENV === 'development' ||
  process.env.NODE_ENV === 'test'
) {
  dotenv.config({ path: '.env.dev' });
}

export const appConfig = () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.APP_PORT ?? '3000', 10),
  dbHost: process.env.POSTGRES_HOST ?? 'localhost',
  dbPort: parseInt(process.env.POSTGRES_PORT ?? '5432', 10),
  dbUser: process.env.POSTGRES_USER ?? 'postgres',
  dbPassword: process.env.POSTGRES_PASSWORD ?? '',
  dbName: process.env.POSTGRES_DB ?? 'postgres',
  redisUrl: process.env.REDIS_URL ?? '',
  jwtAccessSecret: process.env.JWT_ACCESS_SECRET ?? '',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET ?? '',
  timezone: process.env.TZ ?? 'Asia/Seoul',
});
