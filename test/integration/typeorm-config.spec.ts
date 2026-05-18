import dataSource, { typeOrmModuleOptions } from '../../src/config/typeorm.config';

describe('TypeORM config', () => {
  it('has synchronize set to false', () => {
    expect(typeOrmModuleOptions.synchronize).toBe(false);
  });

  it('dataSource options have synchronize set to false', () => {
    expect(dataSource.options.synchronize).toBe(false);
  });
});
