// モックデータ投入スクリプト（`npm run seed`）
// src/shared/mock/buildSeedData.js の内容を src/shared/mock/data/seed.json に書き出す。

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSeedData } from '../src/shared/mock/buildSeedData.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(__dirname, '../src/shared/mock/data/seed.json');

async function main() {
  const data = buildSeedData();
  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(data, null, 2)}\n`, 'utf-8');
  console.warn(`モックデータを書き出しました: ${outputPath}`);
}

main();
