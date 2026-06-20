export interface DocChunk {
  id: string;
  title: string;
  path: string;
  category: string;
  pageTitle: string;
  headings: string;
  content: string;
}

export interface DocPage {
  path: string;
  title: string;
  category: string;
  content: string;
}

export interface SearchResult {
  title: string;
  path: string;
  category: string;
  headings: string;
  excerpt: string;
  score: number;
}

/** 单个文档源的收集配置 */
export interface DocSource {
  /** 收集策略：tree（递归收集所有 .md，默认）| readme（遍历直接子目录，每目录取 README.md） */
  type?: 'tree' | 'readme';
  /** 文档根目录，相对项目根解析（如 packages/<pkg>/docs） */
  root: string;
  /** 路径前缀，决定最终 path 与 category（category = path 第一段）。默认 '' */
  pathPrefix?: string;
  /** glob 排除规则（相对 root，支持 * 与 **）。默认 [] */
  exclude?: string[];
}

/** 单个服务的完整配置 */
export interface ServiceConfig {
  /** server 名，如 "pinia-docs"；工具前缀由 name.replace(/-docs$/, '') 派生 */
  name: string;
  /** 展示名，如 "Pinia"，用于工具描述与输出文案 */
  docsName: string;
  /** 文档源列表；单源服务只有一项 */
  sources: DocSource[];
  /** 检索模式：'hybrid'=BM25+向量融合（需向量化，索引约3倍）；省略=fulltext 纯 BM25（默认） */
  mode?: 'hybrid' | 'fulltext';
}

/** 索引清单：记录构建时的文档指纹，用于运行期检测文档是否过期 */
export interface Manifest {
  /** 构建时间（ISO） */
  builtAt: string;
  /** 服务名 */
  service: string;
  /** 文档源签名：源文件 相对路径+mtime 的 sha1（前 12 位） */
  signature: string;
  /** 被索引的文件数 */
  fileCount: number;
  /** 文档源 git commit（best-effort，非 git 仓库时缺省） */
  gitCommit?: string;
}
