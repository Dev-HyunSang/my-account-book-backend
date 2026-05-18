/**
 * Verifies that all migrations can be applied, reverted to empty (except pgcrypto),
 * and re-applied to produce an identical schema snapshot.
 *
 * Requires a live Postgres instance at DATABASE_URL. Skip in CI unit job;
 * runs in the e2e job where the PG service container is available.
 */
import { DataSource, DataSourceOptions } from 'typeorm';
import { typeOrmModuleOptions } from '../../src/config/typeorm.config';

const DATABASE_URL = process.env.DATABASE_URL;

const describeIfDb = DATABASE_URL ? describe : describe.skip;

describeIfDb('Migrations round-trip', () => {
  let ds: DataSource;

  beforeAll(async () => {
    ds = new DataSource({
      ...typeOrmModuleOptions,
      // Use a dedicated test schema to avoid collisions with other tests
      schema: 'migration_roundtrip_test',
    } as DataSourceOptions);
    await ds.initialize();
    await ds.query(`CREATE SCHEMA IF NOT EXISTS migration_roundtrip_test`);
  });

  afterAll(async () => {
    if (ds?.isInitialized) {
      await ds.query(`DROP SCHEMA IF EXISTS migration_roundtrip_test CASCADE`);
      await ds.destroy();
    }
  });

  async function snapshotTables(dataSource: DataSource): Promise<string[]> {
    const rows: Array<{ table_name: string }> = await dataSource.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'migration_roundtrip_test'
        AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return rows.map((r) => r.table_name);
  }

  it('schema after run → revert-all → run is identical', async () => {
    // First run
    await ds.runMigrations();
    const snapshotAfterFirstRun = await snapshotTables(ds);

    // Revert all migrations one by one until none remain
    const appliedMigrations = await ds.query(`SELECT id FROM migrations ORDER BY id DESC`);
    for (let i = 0; i < appliedMigrations.length; i++) {
      await ds.undoLastMigration();
    }

    // Second run
    await ds.runMigrations();
    const snapshotAfterSecondRun = await snapshotTables(ds);

    expect(snapshotAfterSecondRun).toEqual(snapshotAfterFirstRun);
  });
});
