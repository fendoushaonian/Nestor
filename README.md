# Nestor 🪺

> 一个面向 **APP 快速开发**的全栈脚手架框架:
> 前端用 **CLI / 可视化 Studio** 秒级起项目,后端用一套 **NestJS 企业级骨架**(认证、卡密、系统管理、工作流)直接拿来即用。

Nestor 把「建项目 → 叠能力 → 生成代码 → 起服务 → 发布」做成一条顺滑的命令行 / 可视化工作流,同时为你准备好一套生产可用的后端服务。

```bash
nestor create my-app -t mobile   # 选模板,秒出 iOS + Android 工程
nestor add nav auth ui           # 一条命令叠加能力(插件)
nestor generate screen Home      # 生成页面 / 屏幕 / 组件 / 模块
pnpm dev:api                     # 起 NestJS 后端(认证 / 卡密 / 工作流)
```

---

## Monorepo 结构

这是一个 [pnpm](https://pnpm.io) workspace monorepo。

```
Nestor/
├─ apps/
│  ├─ api/        @nestor/api     NestJS 后端:认证(JWT/RBAC)、卡密、系统管理、iPaaS 工作流
│  └─ web/        @nestor/web     基于 react-flow 的工作流可视化编辑器
├─ packages/
│  ├─ core/       @nestor/core    脚手架引擎:模板渲染 / 代码生成器 / 插件加载
│  ├─ cli/        @nestor/cli     命令行入口(create / add / generate / dev / build)
│  ├─ studio/     @nestor/studio  可视化搭建台(React + Vite,macOS/iOS 风格 UI)
│  └─ shared/     @nestor/shared  后端共享库:统一响应 / 分页 / BaseEntity / 错误码
├─ templates/
│  ├─ starter-mobile/   内置 Mobile 模板(React Native + Expo + TypeScript)
│  └─ starter-web/      内置 Web 模板(Vite + TypeScript)
└─ docs/architecture.md            企业级后端的设计方案与路线图
```

> `templates/*` 是 CLI 复制用的「原始文件载荷」(其 `package.json` 里含 `{{占位符}}`),
> 因此**不是** workspace 成员。

---

## 两大子系统

### 1. 脚手架(packages/core · cli · studio + templates)

面向前端 APP 的快速起步:

- **模板引擎** — 复制模板目录,替换 `{{var}}`(文件名 + 内容),`_gitignore` → `.gitignore`
- **生成器** — 内置蓝图 `component` / `page` / `screen` / `module`,按命令生成代码
- **插件系统** — 插件声明 `apply(ctx)`,注入依赖 / 文件 / 蓝图(内置 `nav` / `ui` / `auth` / `vitest`)
- **Nestor Studio** — macOS/iOS 风格的可视化工作台,勾选模板与能力,右侧 iPhone 实时预览并生成对应的 `nestor create … / nestor add …` 命令

### 2. NestJS 企业级后端(apps/api · web + packages/shared)

「登录鉴权、卡密兑换、系统管理、工作流」这些每个 APP 都要重复造的能力,一次做好、模块化复用:

- **认证 / 鉴权** — 注册登录、bcrypt、JWT(access + refresh)、RBAC(`@Roles` / `@Permissions` 守卫)
- **卡密 / 授权** — 批量生卡、兑换(防并发重复兑换、事务)、商品权益、统计
- **系统管理** — 操作审计日志、登录日志、系统配置(读写接口)
- **工作流 / iPaaS** — 类 n8n / Zapier 的节点式自动化引擎(触发 + 动作 + 逻辑节点、表达式、Webhook、定时、凭据 AES-256-GCM 加密)
- **多数据库** — TypeORM,`.env` 切换 SQLite / MySQL / MariaDB / Postgres / CockroachDB / SQL Server / Oracle
- **可选 Redis / MongoDB** — 缓存 / 限流 / 会话、文档型数据,默认关闭、按需开启

详见 [docs/architecture.md](docs/architecture.md)。

---

## 快速开始

```bash
# 需要 Node >= 20, pnpm 9
pnpm install

pnpm build        # 构建全部 6 个包
pnpm typecheck    # 全量类型检查
pnpm lint         # ESLint
pnpm test         # 单元测试 (vitest)
```

### 跑后端 API

```bash
cp .env.example .env     # 默认 SQLite,零额外依赖
pnpm dev:api             # http://localhost:3000/api
```

- API: http://localhost:3000/api
- Swagger 文档: http://localhost:3000/api/docs
- 健康检查: http://localhost:3000/api/health

> 首次启动会自动 seed 出一个管理员账号 `admin`(默认密码 `admin123456`,请尽快修改)。

### 试用脚手架 CLI(本地构建产物)

```bash
node packages/cli/dist/index.js create demo --template web
node packages/cli/dist/index.js generate component Card
node packages/cli/dist/index.js add ui
```

### 跑可视化界面

```bash
pnpm dev:studio   # Nestor Studio(可视化搭建台)
pnpm dev:web      # 工作流编辑器(react-flow)
```

---

## 常用脚本(根目录)

| 命令 | 说明 |
| --- | --- |
| `pnpm build` | `pnpm -r build`,按依赖顺序构建所有包 |
| `pnpm typecheck` | 各包类型检查 |
| `pnpm lint` / `pnpm format` | ESLint / Prettier |
| `pnpm test` | 各包 vitest 单测 |
| `pnpm dev:api` / `dev:web` / `dev:studio` / `dev:cli` | 分别起后端 / 工作流编辑器 / Studio / CLI(watch) |
| `pnpm migration:generate\|run\|revert` | TypeORM 迁移(透传到 `@nestor/api`) |

---

## Roadmap

**脚手架方向**
- 更多模板:`flutter` / `miniprogram`(小程序) / `node-api`
- Studio 一键 Generate 真正落盘生成代码
- `npm create nestor` 启动器、官方插件市场、`nestor deploy`、远程模板(git/degit)

**后端方向(docs/architecture.md 的 P5 增强)**
- 支付(微信 / 支付宝)、文件上传(本地 / OSS / S3)
- 短信 / 邮件、第三方登录(微信 / Google OAuth)、验证码 + 登录失败锁定
- 任务队列(BullMQ)、通用后台管理前端

## License

MIT
