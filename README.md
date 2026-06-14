# Nestor

企业级 APP 快速开发脚手架，基于 **NestJS + TypeScript**。

目标：把「登录、卡密、权限、数据库」这些每个项目都要重写的通用能力一次做好、做成可复用模块，新项目直接拼装，不必重复造轮子。

> 这些核心能力都在**后端**实现（前端无法安全地做鉴权/卡密校验），前端只负责界面与调用 API。设计与路线图见 [docs/architecture.md](docs/architecture.md)。

## 技术栈

- **NestJS 10** — 模块化、依赖注入、Guard/Pipe/Interceptor
- **TypeORM** — 多数据库一键切换（SQLite / better-sqlite3 / MySQL / MariaDB / PostgreSQL / CockroachDB / SQL Server / Oracle）
- **Redis**（ioredis）— 可选缓存 / 限流 / 会话，`CacheService` 一键复用
- **MongoDB**（@nestjs/mongoose）— 可选文档数据层，与关系型并存
- **pnpm monorepo** — `apps/` 应用 + `packages/` 可复用包
- **class-validator** 参数校验、**Swagger** 自动 API 文档、**pino** 结构化日志

## 目录结构

```
Nestor/
├── apps/
│   └── api/                  # 后端 API 服务 (NestJS)
│       └── src/
│           ├── common/       # 统一响应拦截器 / 全局异常过滤器
│           ├── config/       # 配置加载 (env -> 类型化配置)
│           ├── database/     # TypeORM 多数据库 + 迁移数据源 + 实体注册
│           └── modules/
│               ├── auth/     # 用户 / 角色 / 权限 / JWT / RBAC
│               ├── card/     # 卡密 / 批次 / 商品 / 权益 / 兑换
│               ├── system/   # 审计日志 / 登录日志 / 系统配置
│               └── health/   # 健康检查
├── packages/
│   └── core/                 # 共享: 统一响应、分页、BaseEntity、错误码
└── docs/architecture.md      # 企业级改造方案 / 路线图
```

## 快速开始

```bash
# 1. 安装依赖 (需 Node >= 20, pnpm 9)
pnpm install

# 2. 准备环境变量 (默认用 SQLite, 无需额外安装数据库)
cp .env.example .env

# 3. 启动开发服务 (会先构建 @nestor/core)
pnpm dev
```

启动后：

- 服务: http://localhost:3000/api
- Swagger 文档: http://localhost:3000/api/docs
- 健康检查: http://localhost:3000/api/health

## 多数据库切换

只改 `.env` 不改代码，重启即生效：

```bash
DB_TYPE=sqlite      # 开发默认, 零依赖
# DB_TYPE=postgres  # 生产推荐
# DB_TYPE=mysql / mariadb / cockroachdb / mssql / oracle / better-sqlite3
```

支持的库与对应驱动（按需安装，不强塞进项目）：

| DB_TYPE | 数据库 | 需安装的驱动 |
| --- | --- | --- |
| `sqlite` | SQLite | 已内置 |
| `better-sqlite3` | SQLite (更快) | `better-sqlite3` |
| `mysql` | MySQL | `mysql2` |
| `mariadb` | MariaDB | `mysql2` |
| `postgres` | PostgreSQL | `pg` |
| `cockroachdb` | CockroachDB | `pg` |
| `mssql` | SQL Server | `mssql` |
| `oracle` | Oracle | `oracledb` |

安装示例：`pnpm --filter @nestor/api add mysql2`（其它库同理）。

非法的 `DB_TYPE` 会在启动时直接报错，不会静默回退。

切到非 SQLite 数据库后，按该库生成并执行迁移：

```bash
pnpm migration:generate src/database/migrations/Init
pnpm migration:run
```

> 仓库内置的初始迁移针对 SQLite（开发默认）。切换到其它数据库时请重新生成对应迁移；
> 如需先关闭启动自动迁移，设 `DB_MIGRATIONS_RUN=false`。

## Redis（缓存 / 限流 / 会话，可选）

默认关闭。设 `REDIS_ENABLED=true` 即接入；**关闭时所有缓存操作自动降级为空操作**，业务代码无需到处判断 Redis 是否可用。

```bash
REDIS_ENABLED=true
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_KEY_PREFIX=nestor:    # key 前缀, 多环境/多项目共用实例时隔离
```

注入全局 `CacheService` 即可使用（get/set/del/exists/incrWithTtl）：

```ts
constructor(private readonly cache: CacheService) {}

await this.cache.set('user:1', user, 300);      // 缓存 5 分钟
const u = await this.cache.get<User>('user:1');
const n = await this.cache.incrWithTtl('login:ip:1.2.3.4', 60); // 限流计数
```

## MongoDB（文档数据层，可选）

默认关闭。设 `MONGO_ENABLED=true` 才建立连接。它与关系型数据库**并存**，适合存日志、事件、埋点等文档型数据。

```bash
MONGO_ENABLED=true
MONGO_URI=mongodb://localhost:27017/nestor
```

业务模块里用官方 `@nestjs/mongoose` 的 `MongooseModule.forFeature([...])` 注册 schema 即可。

> 健康检查 `/api/health` 会按启用状态自动纳入 `redis` / `mongodb` 探测，未启用则不影响整体状态。

## 系统管理（system 模块）

面向后台运营的只读/管理接口，均需 `system:read` / `system:write` 权限：

| 方法 | 路径 | 权限 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/system/audit-logs` | `system:read` | 操作审计日志（分页，可按 `userId`/`action` 过滤）|
| GET | `/api/system/login-logs` | `system:read` | 登录日志（分页，可按 `username`/`success` 过滤）|
| GET | `/api/system/configs` | `system:read` | 系统配置列表（可按 `group` 过滤）|
| GET | `/api/system/configs/:key` | `system:read` | 读取单个配置项 |
| PUT | `/api/system/configs/:key` | `system:write` | 新增或更新配置项（幂等）|
| DELETE | `/api/system/configs/:key` | `system:write` | 删除配置项 |

> 登录日志由认证流程自动写入；审计日志可在任意模块注入 `AuditLogService.record(...)` 记录。

## 测试与质量

```bash
pnpm build       # 构建 core + api
pnpm typecheck   # 类型检查
pnpm lint        # ESLint
pnpm test        # 单元测试 (vitest)
```

仓库已配置 GitHub Actions（[.github/workflows/ci.yml](.github/workflows/ci.yml)）：每次 push 到 `main` 或开 PR 时自动跑 install / build / typecheck / lint / test。

## 路线图

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| P0 | monorepo + NestJS 骨架 + 统一响应/异常/日志 + Swagger | ✅ |
| P1 | TypeORM 多数据库 + 基础数据表 + 迁移 | ✅ |
| P2 | 登录 / 注册 / JWT / RBAC 权限 | ✅ |
| P3 | 卡密生成 / 兑换 / 权益发放 | ✅ |
| P4 | 抽包复用 + CLI 脚手架 | 规划中 |

详见 [docs/architecture.md](docs/architecture.md)。
