import type { PoolConfig } from 'pg';

/**
 * Neon requires TLS. Its pooled endpoint presents a cert that node's default
 * verifier rejects, so for Neon (or any `sslmode=require` URL) we enable SSL
 * with relaxed verification. For a plain local Postgres, SSL is disabled.
 */
export function sslFor(connectionString: string): PoolConfig['ssl'] {
  const needsSsl =
    connectionString.includes('neon.tech') || connectionString.includes('sslmode=require');
  return needsSsl ? { rejectUnauthorized: false } : false;
}
