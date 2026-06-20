# Redis 文档路径速查

> 数据源：`redis/docs` 仓 `content/`（Hugo，2081 页，7 分类，含 560 条命令参考）。
> 已排除 `operate/**`（rs/k8s/rc 等商业产品部署运维）与 `embeds/**`（Hugo 嵌入片段），聚焦「开发指南」。
> ⚠️ Hugo section 索引页用 `_index`（如 `develop/data-types/streams/_index`）。

## 命令参考（560 条，核心）

所有命令统一路径 `commands/{命令名小写连字符}`，frontmatter 含 `arguments` / `since` / `complexity` / `acl_categories`。

| 场景 | path |
|------|------|
| **SET / GET / 字符串** | `commands/set`、`commands/get`、`commands/append`、`commands/incr`、`commands/mset` |
| **键管理** | `commands/del`、`commands/expire`、`commands/keys`、`commands/scan`、`commands/type` |
| **Hash** | `commands/hset`、`commands/hget`、`commands/hgetall` |
| **List** | `commands/lpush`、`commands/rpush`、`commands/lrange`、`commands/lpop` |
| **Set / Sorted Set** | `commands/sadd`、`commands/zadd`、`commands/zrange` |
| **Stream（X 族）** | `commands/xadd`、`commands/xread`、`commands/xreadgroup`、`commands/xrange`、`commands/xack`、`commands/xpending`、`commands/xclaim`、`commands/xlen`、`commands/xinfo`、`commands/xtrim` |
| **Pub/Sub** | `commands/publish`、`commands/subscribe`、`commands/psubscribe`、`commands/pubsub` |
| **ACL（安全）** | `commands/acl`、`commands/acl-setuser`、`commands/acl-getuser`、`commands/acl-list`、`commands/acl-cat` |
| **事务 / 脚本** | `commands/multi`、`commands/exec`、`commands/eval`、`commands/evalsha` |

### AR 命令族（Redis 8 新增，Active-Active 数组）

| 命令 | path |
|------|------|
| ARLEN / ARINFO | `commands/arlen`、`commands/arinfo` |
| ARGET / ARGETRANGE / ARSCAN | `commands/arget`、`commands/argetrange`、`commands/arscan` |
| ARINSERT / ARMSET | `commands/arinsert`、`commands/armset` |
| ARMGET / ARCOUNT / ARLEN | `commands/armget`、`commands/arcount` |
| ARDEL / ARDELRANGE | `commands/ardel`、`commands/ardelrange` |
| ARNEXT / AROP / ARRING | `commands/arnext`、`commands/arop`、`commands/arring` |

## develop — 编程指南（1272）

| 场景 | path |
|------|------|
| **数据类型总览** | `develop/data-types` |
| **Streams 数据类型** | `develop/data-types/streams/_index` |
| **客户端库** | `develop/clients`（go/java/node/python/rust/...） |
| **工具链** | `develop/tools`（redis-cli / RedisInsight） |
| **参考手册** | `develop/reference` |
| **版本新特性** | `develop/whats-new` |
| **编程能力** | `develop/programmability`、`develop/pubsub` |

### develop/ai — 向量数据库 / AI（876）

| 场景 | path |
|------|------|
| **向量搜索查询** | `develop/ai/search-and-query/query/vector-search` |
| **查询管理（FT.SEARCH）** | `develop/ai/search-and-query/administration/overview` |
| **AI 用例** | `develop/ai`（索引 / 向量化 / RAG / 语义缓存） |

## integrate — 客户端 / 框架集成（245）

| 场景 | path |
|------|------|
| 各语言客户端 / Google ADK 等 | `integrate/{name}`（如 `integrate/google-adk/search-tools`） |

## 其它

| 场景 | path |
|------|------|
| **快速开始** | `get-started` |
| **术语表** | `glossary` |
| **APIs** | `apis/_index` |

> **版本敏感查询提示**：命令页 frontmatter 的 `since` 字段标注引入版本（如 `SET ... IFEQ since: 8.4.0`、`XADD ... KEEPREF/DELREF/ACKED since: 8.x`）。Redis 版本迭代快，涉及新命令/新参数时**务必 `get_redis_doc` 查 `since` 字段确认**，不要依赖训练知识。
