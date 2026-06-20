import { save } from '@orama/orama';
import fs from 'node:fs';
import path from 'node:path';
import { buildIndex, buildOramaDB, resolveRoot } from './indexer.js';
import { loadServiceConfig, listServices } from './config.js';
import { buildManifest } from './manifest.js';

/** 索引输出目录：data/<service>/ */
function dataDir(service: string): string {
  return resolveRoot(`data/${service}`);
}

async function main() {
  const service = process.argv[2];
  if (!service) {
    console.error('Usage: node build-index.js <service>');
    console.error('Available: ' + listServices().join(', '));
    process.exit(1);
  }

  const config = loadServiceConfig(service);
  console.log(`Service: ${config.name} (${config.docsName})`);

  const { chunks, pages } = await buildIndex(config);

  // 构建 orama DB 并序列化（按 config.mode 决定向量化或纯 fulltext）
  const db = await buildOramaDB(chunks, config.mode === 'hybrid');
  const serialized = await save(db);

  // 输出到 data/<service>/
  const dir = dataDir(service);
  fs.mkdirSync(dir, { recursive: true });

  fs.writeFileSync(path.join(dir, 'index.json'), JSON.stringify(serialized));
  fs.writeFileSync(path.join(dir, 'pages.json'), JSON.stringify(pages));

  // 记录文档指纹，供运行期检测过期
  const manifest = buildManifest(config);
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2));

  const indexKB = (JSON.stringify(serialized).length / 1024).toFixed(0);
  const sigInfo = `sig ${manifest.signature}${manifest.gitCommit ? `, git ${manifest.gitCommit}` : ''}`;
  console.log(
    `Saved → data/${service}/index.json (${indexKB} KB), pages.json (${pages.length} pages), manifest (${sigInfo})`,
  );
}

main().catch((err) => {
  console.error('Build index failed:', err);
  process.exit(1);
});
