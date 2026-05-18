import { DataSource, DataSourceOptions } from 'typeorm';
import { appConfig } from './configuration';

const cfg = appConfig();
const url = `postgres://${cfg.dbUser}:${cfg.dbPassword}@${cfg.dbHost}:${cfg.dbPort}/${cfg.dbName}`;

export const typeOrmModuleOptions: DataSourceOptions = {
  type: 'postgres',
  url,
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../../db/migrations/*{.ts,.js}'],
  // synchronize must remain false; all schema changes go through migrations
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
};

const dataSource = new DataSource(typeOrmModuleOptions);

export default dataSource;
