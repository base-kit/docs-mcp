# Drizzle ORM 文档路径速查

> 数据源：`drizzle-team/drizzle-orm-docs` 仓 `src/content/docs/`（Astro + MDX，250 页）。
> ⚠️ 此服务促使内核扩展支持 `.mdx`（Astro Starlight 站点用 MDX）。已排除 `src/mdx/get-started/`（带 props 的可复用 include 片段）。

## 核心 API（扁平 path，直接查）

| 场景 | path |
|------|------|
| **总览** | `overview` / `why-drizzle` |
| **SQL Select 查询** | `select` |
| **Insert 插入** | `insert` |
| **Update 更新** | `update` |
| **Delete 删除** | `delete` |
| **关联查询 RQB** | `rqb`（关系查询 v2）/ `rqb-v2` / `relations-v1-v2` |
| **关联声明** | `relations` / `relations-schema-declaration` |
| **SQL 运算符** | `operators` / `sql` |
| **动态查询** | `dynamic-query-building` / `data-querying` |
| **事务** | `transactions` |
| **Schema 声明** | `sql-schema-declaration` / `schemas` |
| **列类型** | `column-types/{pg\|mysql\|sqlite\|mssql\|cockroach\|singlestore}` |
| **自定义类型 / 生成列 / 序列** | `custom-types` / `generated-columns` / `sequences` |
| **索引与约束** | `indexes-constraints` |
| **视图 / 物化视图** | `views` |
| **RLS（行级安全）** | `rls` |
| **读写分离 / 只读副本** | `read-replicas` |
| **缓存 / Batch API** | `cache` / `batch-api` |

## Drizzle Kit（CLI 工具，扁平 path）

| 场景 | path |
|------|------|
| **Kit 总览** | `kit-overview` |
| **配置文件** | `drizzle-config-file` |
| **generate（生成迁移）** | `drizzle-kit-generate` |
| **migrate（执行迁移）** | `drizzle-kit-migrate` |
| **push（直接推送 schema）** | `drizzle-kit-push` |
| **pull（反向拉取 schema）** | `drizzle-kit-pull` |
| **export（导出）** | `drizzle-kit-export` |
| **check / up / studio** | `drizzle-kit-check` / `drizzle-kit-up` / `drizzle-kit-studio` |
| **自定义迁移 / 团队迁移** | `kit-custom-migrations` / `kit-migrations-for-teams` |
| **种子数据** | `kit-seed-data` / `seed-functions` / `seed-overview` |

## 数据库连接（connect-* 系列，扁平 path）

PostgreSQL：`connect-neon` / `connect-supabase` / `connect-vercel-postgres` / `connect-pglite` / `connect-xata` / `connect-turso` / `connect-planetscale-postgres` / `connect-prisma-postgres` / `connect-aws-data-api-pg` / `connect-nile` / `connect-effect-postgres`

MySQL：`connect-planetscale` / `connect-tidb` / `connect-aws-data-api-mysql`

SQLite/边缘：`connect-bun-sqlite` / `connect-node-sqlite` / `connect-expo-sqlite` / `connect-op-sqlite` / `connect-react-native-sqlite` / `connect-sqlite-cloud` / `connect-bun-sql`

Serverless：`connect-cloudflare-d1` / `connect-cloudflare-do` / `connect-netlify-db` / `connect-drizzle-proxy`

入口：`connect-overview`

## get-started — 各方言入门（`get-started/{dialect}-{existing\|new}`）

PostgreSQL / MySQL / SQLite / MSSQL / SingleStore / CockroachDB / Gel 的 existing（已有项目）与 new（新项目）起步。

## guides — 实用指南（26 篇）

`guides/{name}`：conditional-filters-in-query / count-rows / cursor-based-pagination / limit-offset-pagination / incrementing-a-value / decrementing-a-value / full-text-search-with-generated-columns / postgis-geometry-point / point-datatype-psql 等

## tutorials — 教程

`tutorials/drizzle-with-frameworks`（Next.js / Nuxt / SvelteKit / Astro / Remix / Express / Hono / Fastify / Bun 等）
`tutorials/drizzle-on-the-edge`（Cloudflare/Vercel/Netlify/Deno 部署）

## 验证库 / 扩展

| 场景 | path |
|------|------|
| Zod / Valibot / Arktype / Effect / TypeBox 校验 | `zod` / `valibot` / `arktype` / `effect-schema` / `typebox` |
| ESLint 插件 | `eslint-plugin` |
| GraphQL 服务 | `graphql` |
| Prisma 迁移 | `prisma` |
| 升级 | `upgrade-v1` / `upgrade-21` |

> **提示**：MDX 文档含 Astro 组件标签（`<Callout>`/`<CodeTabs>`/`import` 语句）会残留在 `get_drizzle_doc` 返回文本开头，不影响检索。代码示例完整可读。
