import { ValueTransformer } from 'typeorm';

/**
 * Parses a money string or number from the DB / wire into a JS bigint.
 * Postgres returns numeric columns as strings when using the `pg` driver.
 */
export function parseMoney(value: string | number | bigint | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;
  return BigInt(value);
}

/**
 * Serialises a bigint back to a string for Postgres numeric columns.
 */
export function serializeMoney(value: bigint | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return value.toString();
}

/**
 * TypeORM ValueTransformer for numeric(20,0) <-> bigint columns.
 * Used in @Column({ type: 'numeric', transformer: bigintTransformer }).
 */
export const bigintTransformer: ValueTransformer = {
  to(value: bigint | null | undefined): string | null {
    return serializeMoney(value);
  },
  from(value: string | number | null | undefined): bigint {
    return parseMoney(value);
  },
};
