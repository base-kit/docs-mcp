import { pipeline, env } from '@huggingface/transformers';
import fs from 'node:fs';
import { MODELS_DIR } from './paths.js';

// huggingface.co 在企业网络被封锁，走国内镜像 hf-mirror.com（模型首次下载后本地缓存，后续离线可用）
env.remoteHost = 'https://hf-mirror.com';
if (!process.env.HF_ENDPOINT) {
  process.env.HF_ENDPOINT = 'https://hf-mirror.com';
}
// 模型缓存到 DATA_ROOT/models，避免落入全局 node_modules（npm upgrade 会清空、需重下 23MB）
fs.mkdirSync(MODELS_DIR, { recursive: true });
env.cacheDir = MODELS_DIR;

/** all-MiniLM-L6-v2 输出维度 */
export const EMBED_DIM = 384;

let extractor: any = null;

/** 单例加载 feature-extraction pipeline（首次加载模型约数秒，之后走缓存） */
async function getExtractor() {
  if (!extractor) {
    extractor = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
  }
  return extractor;
}

/** 单文本 → 384 维归一化向量 */
export async function embed(text: string): Promise<number[]> {
  const ex = await getExtractor();
  const out = await ex(text, { pooling: 'mean', normalize: true });
  return out.tolist()[0] as number[];
}

/** 批量文本 → 向量数组（分批处理，避免大批量 OOM；建索引时用） */
export async function embedBatch(texts: string[], batchSize = 32): Promise<number[][]> {
  const ex = await getExtractor();
  const result: number[][] = [];
  for (let i = 0; i < texts.length; i += batchSize) {
    const batch = texts.slice(i, i + batchSize);
    const out = await ex(batch, { pooling: 'mean', normalize: true });
    result.push(...(out.tolist() as number[][]));
    if (texts.length > 200 && (i + batchSize) % (batchSize * 10) === 0) {
      console.log(`  embedded ${i + batch.length}/${texts.length}`);
    }
  }
  return result;
}
