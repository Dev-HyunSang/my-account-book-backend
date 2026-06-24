import { DataSource, DataSourceOptions } from 'typeorm';
import { appConfig } from './configuration';

const cfg = appConfig();
const url = `postgres://${cfg.dbUser}:${cfg.dbPassword}@${cfg.dbHost}:${cfg.dbPort}/${cfg.dbName}`;

// When this file runs compiled (dist, prod) we must only ever match the
// compiled .js migrations. Matching the .ts sources makes plain node try to
// require() TypeScript, which fails on Node >=20 ("Cannot require() ES Module").
const isCompiled = __filename.endsWith('.js');
const migrationExt = isCompiled ? 'js' : 'ts';

export const typeOrmModuleOptions: DataSourceOptions = {
  type: 'postgres',
  url,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + `/../../db/migrations/*.${migrationExt}`],
  // synchronize must remain false; all schema changes go through migrations
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(typeOrmModuleOptions);

export default dataSource;
