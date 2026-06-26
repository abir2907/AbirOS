import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { env } from '../env.js';

/**
 * Storage abstraction. File *binaries* live on the local disk (never in Neon —
 * the free tier's 0.5 GB is for text/chunks/embeddings only). Swapping to S3 or
 * another backend later means a new driver here, not changes at call sites.
 */
export interface StorageDriver {
  readonly id: string;
  /** Persist bytes under a content-addressed key; returns where it landed. */
  save(key: string, data: Buffer): Promise<{ uri: string; size: number }>;
  read(key: string): Promise<Buffer>;
  exists(key: string): Promise<boolean>;
  delete(key: string): Promise<void>;
}

/** Content hash used for dedupe and as the storage key. */
export function hashBytes(data: Buffer): string {
  return createHash('sha256').update(data).digest('hex');
}

export function hashString(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

class LocalStorageDriver implements StorageDriver {
  readonly id = 'local';
  constructor(private readonly root: string) {}

  private resolve(key: string): string {
    // Shard by first 2 hex chars to avoid huge flat directories.
    const safe = key.replace(/[^a-zA-Z0-9._-]/g, '_');
    return path.join(this.root, safe.slice(0, 2), safe);
  }

  async save(key: string, data: Buffer) {
    const full = this.resolve(key);
    await fs.mkdir(path.dirname(full), { recursive: true });
    await fs.writeFile(full, data);
    return { uri: `file://${full}`, size: data.byteLength };
  }

  async read(key: string) {
    return fs.readFile(this.resolve(key));
  }

  async exists(key: string) {
    try {
      await fs.access(this.resolve(key));
      return true;
    } catch {
      return false;
    }
  }

  async delete(key: string) {
    await fs.rm(this.resolve(key), { force: true });
  }
}

let driver: StorageDriver | undefined;

export function getStorage(): StorageDriver {
  if (driver) return driver;
  switch (env.STORAGE_DRIVER) {
    case 'local':
    default:
      driver = new LocalStorageDriver(path.resolve(process.cwd(), env.STORAGE_LOCAL_PATH));
  }
  return driver;
}
