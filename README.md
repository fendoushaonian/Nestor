# Nestor

企业级 APP 快速开发脚手架，基于 **NestJS + TypeScript**。

目标：把「登录、卡密、权限、数据库」这些每个项目都要重写的通用能力一次做好、做成可复用模块，新项目直接拼装，不必重复造轮子。

> 这些核心能力都在**后端**实现（前端无法安全地做鉴权/卡密校验），前端只负责界面与调用 API。设计与路线图见 [docs/architecture.md](docs/architecture.md)。

## 技术栈

- **NestJS 10** — 模块化、依赖注入、Guard/Pipe/Interceptor
- **TypeORM** — 多数据库（SQLite / MySQL / PostgreSQL）一键切换
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
│               ├── auth/     # 用户 / 角色 / 权限 实体 (P2 加业务)
│               ├── card/     # 卡密 / 批次 / 商品 / 权益 实体 (P3 加业务)
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

只改 `.env` 不改代码：

```bash
DB_TYPE=sqlite      # 开发默认, 零依赖
# DB_TYPE=postgres  # 生产推荐
# DB_TYPE=mysql
```

切到 MySQL/PostgreSQL 后，按该数据库生成并执行迁移：

```bash
pnpm migration:generate src/database/migrations/Init
pnpm migration:run
```

> 仓库内置的初始迁移针对 SQLite（开发默认）。切换到其它数据库时请重新生成对应迁移。

## 路线图

| 阶段 | 内容 | 状态 |
| --- | --- | --- |
| P0 | monorepo + NestJS 骨架 + 统一响应/异常/日志 + Swagger | ✅ |
| P1 | TypeORM 多数据库 + 基础数据表 + 迁移 | ✅ |
| P2 | 登录 / 注册 / JWT / RBAC 权限 | 规划中 |
| P3 | 卡密生成 / 兑换 / 权益发放 | 规划中 |
| P4 | 抽包复用 + CLI 脚手架 | 规划中 |

详见 [docs/architecture.md](docs/architecture.md)。
