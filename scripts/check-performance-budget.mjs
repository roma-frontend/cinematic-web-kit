import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';

const chunksDir = join(process.cwd(), '.next', 'static', 'chunks');
const MAX_CHUNK_BYTES = 700 * 1024;
const MAX_TOTAL_BYTES = 10 * 1024 * 1024;

async function collectJs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectJs(path);
    if (!entry.isFile() || !entry.name.endsWith('.js')) return [];
    return [{ path, bytes: (await stat(path)).size }];
  }));
  return files.flat();
}

try {
  const files = await collectJs(chunksDir);
  const total = files.reduce((sum, file) => sum + file.bytes, 0);
  const oversized = files.filter((file) => file.bytes > MAX_CHUNK_BYTES);

  console.log(`JS chunks: ${files.length}; total: ${(total / 1024 / 1024).toFixed(2)} MB`);
  for (const file of files.sort((a, b) => b.bytes - a.bytes).slice(0, 5)) {
    console.log(`  ${(file.bytes / 1024).toFixed(1)} KB  ${relative(process.cwd(), file.path)}`);
  }

  if (total > MAX_TOTAL_BYTES || oversized.length) {
    if (total > MAX_TOTAL_BYTES) console.error(`Total JS budget exceeded: ${(total / 1024 / 1024).toFixed(2)} MB > ${(MAX_TOTAL_BYTES / 1024 / 1024).toFixed(2)} MB`);
    for (const file of oversized) console.error(`Chunk budget exceeded: ${relative(process.cwd(), file.path)} (${(file.bytes / 1024).toFixed(1)} KB > ${(MAX_CHUNK_BYTES / 1024).toFixed(0)} KB)`);
    process.exitCode = 1;
  }
} catch {
  console.error('Performance budget requires a completed production build (.next/static/chunks was not found).');
  process.exitCode = 1;
}
