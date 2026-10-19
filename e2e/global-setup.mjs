import fs from 'node:fs';
import path from 'node:path';

/**
 * Hapus shard dari run sebelumnya.
 *
 * Setiap worker menulis satu shard bernama per-pid. PID berbeda antar run, jadi
 * shard lama tidak tertimpa dan akan ikut terhitung dua kali di laporan kalau
 * tidak dibersihkan lebih dulu.
 */
export default function globalSetup() {
  const dir = path.join(process.cwd(), 'e2e-artifacts', 'shards');
  fs.rmSync(dir, { recursive: true, force: true });
}
