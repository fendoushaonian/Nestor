# Nestor 🪺

> 一个面向 **APP 快速开发** 的全栈脚手架框架：
> 前端用 **CLI / 可视化 Studio** 几秒起项目，后端用一套 **NestJS 企业级架构**（认证、卡密、系统管理、工作流）开箱即用。

Nestor 把「建项目 → 叠加能力 → 生成代码 → 起服务 → 联调发布」整合成一条顺滑的命令行 / 可视化工作流，并为它配好一套生产可用的后端服务。

```bash
nestor create my-app -t mobile   # 选模板，几秒起一个 iOS + Android 工程
nestor add nav auth ui           # 一条命令叠加能力（插件）
nestor generate screen Home      # 生成 页面 / 屏幕 / 组件 / 模块
pnpm dev:api                     # 起 NestJS 后端（认证 / 卡密 / 工作流）
```

---

## Monorepo 结构

这是一个 [pnpm](https://pnpm.io) workspace monorepo。

```
Nestor/
├─ apps/
│  ├─ api/        @nestor/api     NestJS 后端：认证(JWT/RBAC)、卡密、系统管理、iPaaS 工作流
│  └─ web/        @nestor/web     基于 react-flow 的工作流可视化编辑器
├─ packages/
│  ├─ core/       @nestor/core    脚手架引擎：模板渲染 / 代码生成器 / 插件加载
│  ├─ cli/        @nestor/cli     命令行入口（create / add / generate / dev / build）
│  ├─ studio/     @nestor/studio  可视化搭建台（React + Vite，macOS/iOS 风格 UI）
│  ├─ shared/     @nestor/shared  前后端共享库：统一响应 / 分页 / BaseEntity / 错误码
│  └─ sdk/        @nestor/sdk     前端 SDK：类型安全的后端 API 客户端（统一响应解析 + 自动刷新 token）
├─ templates/
│  ├─ starter-mobile/     移动端模板（React Native + Expo + TypeScript）
│  ├─ starter-web/        Web 模板（Vite + TypeScript）
│  └─ starter-fullstack/  全栈模板（Vite 前端 + 内置 @nestor/sdk，直连 NestJS 后端）
└─ docs/architecture.md            企业级后端设计方案与路线
```

> `templates/*` 是 CLI 复制用的「原始文件载荷」（其 `package.json` 里含 `{{占位符}}`），
> 因此**不是** workspace 成员。

---

## 两个子系统

### 1. 脚手架（packages/core · cli · studio + templates）

面向前端 APP 的快速起步：

- **模板引擎** — 复制模板目录，替换 `{{var}}`（文件名 + 内容），`_gitignore` → `.gitignore`
- **生成器** — 内置蓝图 `component` / `page` / `screen` / `module` / `nest-module` / `web-module`，按命令生成代码。`module` 会根据项目 `framework` 自适应：前端项目生成前端模块，`framework: 'node'` 的后端项目生成**完整 NestJS 模块**（entity + service + REST controller + DTO，见「后端模块复用」）
- **插件系统** — 插件声明 `apply(ctx)`，注入依赖 / 文件 / 蓝图（内置 `nav` / `ui` / `auth` / `vitest`）
- **Nestor Studio** — macOS/iOS 风格的可视化工作台，勾选模块与能力，右侧 iPhone 实时预览，并生成对应的 `nestor create … / nestor add …` 命令

### 2. NestJS 企业级后端（apps/api · web + packages/shared）

「登录鉴权、卡密兑换、系统管理、工作流」这些每个 APP 都要重造的能力，一次做好、模块化复用：

- **认证 / 鉴权** — 注册登录、bcrypt、JWT（access + refresh）、RBAC（`@Roles` / `@Permissions` 守卫）
- **卡密 / 授权** — 批量生成、兑换（防并发重复兑换，事务）、商品权益统计
- **系统管理** — 操作审计日志、登录日志、系统配置（读接口）
- **工作流 / iPaaS** — 类 n8n / Zapier 的节点式自动化引擎（触发 + 动作 + 逻辑节点、表达式、webhook、定时，凭证 AES-256-GCM 加密）
- **多数据库** — TypeORM，`.env` 切换 SQLite / MySQL / MariaDB / Postgres / CockroachDB / SQL Server / Oracle
- **可选 Redis / MongoDB** — 缓存 / 限流 / 会话、文档数据，默认关闭、按需开启

详见 [docs/architecture.md](docs/architecture.md)。

---

## 快速开始

```bash
# 需要 Node >= 20, pnpm 9
pnpm install

pnpm build        # 构建全部包
pnpm typecheck    # 全量类型检查
pnpm lint         # ESLint
pnpm test         # 单元测试 (vitest)
```

### 跑后端 API

```bash
cp .env.example .env     # 默认 SQLite，零外部依赖
pnpm dev:api             # http://localhost:3000/api
```

- API: http://localhost:3000/api
- Swagger 文档: http://localhost:3000/api/docs
- 健康检查: http://localhost:3000/api/health

> 首次启动会自动 seed 出一个管理员账号 `admin`（默认密码 `admin123456`，请尽快修改）。

### 试脚手架 CLI（用本地构建产物）

```bash
node packages/cli/dist/index.js create demo --template web
node packages/cli/dist/index.js generate component Card
node packages/cli/dist/index.js add ui
```

### 全栈模板 + 前端 SDK — 前后端一键打通

`fullstack` 模板会生成一个 Vite 前端，内置一个对接 NestJS 后端的**类型安全客户端**（`@nestor/sdk` 的副本：自动解析统一响应 `ApiResponse`、自动带 Bearer token、在 access token 过期时**自动用 refresh token 续期**）。

```bash
node packages/cli/dist/index.js create my-app --template fullstack
# 1) 起后端 pnpm dev:api   2) 配 .env 的 VITE_API_BASE   3) cd my-app && npm i && npm run dev
```

客户端用法（`@nestor/sdk`，或模板内 `src/lib/nestor.ts` 的副本）：

```ts
import { NestorClient } from '@nestor/sdk';

const api = new NestorClient({ baseUrl: import.meta.env.VITE_API_BASE }); // 默认 prefix=api

await api.auth.login({ identifier: 'admin', password: '••••••' }); // token 自动入库
const me = await api.auth.profile(); // 自动附带 Bearer；返回已解包 data
const page = await api.files.list({ page: 1 }); // PaginatedResult<FileObject>
await api.files.upload(file, file.name); // multipart，字段名 file
// access token 过期 → 透明地用 refreshToken 续期并重试一次；失败则清空会话
```

### 后端模块复用 — `nestor g module`

把前端与后端的通用能力一条命令生成：在 NestJS 后端生成一套**风格统一、开箱即编译**的功能模块，对齐 `apps/api` 现有 auth/card/upload 的写法。

```bash
cd apps/api
node ../../packages/cli/dist/index.js g nest-module order   # 生成 order 模块
# 或在 framework: 'node' 的项目里直接：nestor g module order
```

生成内容（位于 `src/modules/<name>/`）：

```
order/
├─ order.module.ts          # TypeOrmModule.forFeature + 装配
├─ order.service.ts         # 仓储 CRUD + 分页(paginate) + BusinessException
├─ order.controller.ts      # REST(@Permissions 守卫 + Swagger)
├─ entities/order.entity.ts # 继承 BaseEntity, 表名自动复数(orders)
└─ dto/
   ├─ create-order.dto.ts   # class-validator 校验
   └─ update-order.dto.ts   # PartialType(CreateOrderDto)
```

生成后默认提示三个接线步骤：① 在 `app.module.ts` 的 `imports` 加 `OrderModule`；② 在 `src/database/entities.ts` 注册 `Order` 实体；③ 如用权限守卫，seed `order:read` / `order:write` 权限。

#### 配合 AI agent 使用 — `--register` / `--json`

为让生成结果能被 **AI agent / 脚本**可靠驱动，`generate` 提供两个开关：

- **`--register`** — 自动把后端模块接线进 `app.module.ts`（import + `imports` 数组）与 `src/database/entities.ts`（import + `entities` 数组），省去手工编辑。**幂等**：已接线则跳过，找不到锚点则安全跳过并在结果里如实标注（不破坏文件）。
- **`--json`** — 只往 stdout 输出**单个 JSON**（屏蔽其它日志），agent 直接 `JSON.parse` 即可拿到结果并据此决策；出错则输出 `{ "ok": false, "error": "..." }` 且退出码为 1。

```bash
cd apps/api
node ../../packages/cli/dist/index.js g nest-module order --register --json
```

```jsonc
{
  "ok": true,
  "blueprint": "nest-module",
  "name": "order",
  "written": ["src/modules/order/order.module.ts", "…（共 6 个文件）"],
  "registered": [
    { "file": "src/app.module.ts", "status": "done" },
    { "file": "src/database/entities.ts", "status": "done" },
  ],
  // 仍需人/agent 处理的后续步骤（此处只剩权限 seed）
  "nextSteps": [
    {
      "type": "seed-permissions",
      "permissions": ["order:read", "order:write"],
      "description": "Seed order:read / order:write permissions …",
    },
  ],
}
```

> 不加 `--register` 时 `registered` 为空，接线步骤会以结构化 `nextSteps`（`register-module` / `register-entity` / `seed-permissions`）返回，agent 可据此自行决定如何落地。

### 跑可视化界面

```bash
pnpm dev:studio   # Nestor Studio（可视化搭建）
pnpm dev:web      # 工作流编辑器（react-flow）
```

---

## 常用脚本（根目录）

| 命令                                                  | 说明                                             |
| ----------------------------------------------------- | ------------------------------------------------ |
| `pnpm build`                                          | `pnpm -r build`，按依赖顺序构建所有包            |
| `pnpm typecheck`                                      | 各包类型检查                                     |
| `pnpm lint` / `pnpm format`                           | ESLint / Prettier                                |
| `pnpm test`                                           | 各包 vitest 单元测试                             |
| `pnpm dev:api` / `dev:web` / `dev:studio` / `dev:cli` | 分别起 后端 / 工作流编辑器 / Studio / CLI(watch) |
| `pnpm migration:generate\|run\|revert`                | TypeORM 迁移（透传到 `@nestor/api`）             |

---

## Roadmap

**脚手架方向**

- ✅ 后端模块生成器 `nestor g module`（生成完整 NestJS 模块，见上）
- ✅ 全栈模板 `fullstack` + 前端 SDK `@nestor/sdk`（前后端打通，见上）
- 更多模板：`flutter` / `miniprogram`（小程序） / `node-api`
- Studio 的 Generate 按钮真正落地生成代码
- 把 `@nestor/sdk` 发布到 npm（模板改为直接依赖，随之移除副本）；SDK 增补 React hooks 封装
- ✅ 生成器自动接线 `--register`（写 app.module / entities）+ `--json` 机器可读输出（配合 AI agent）
- 把 auth/upload 抽成可发布的 `forRoot()` 包
- `npm create nestor` 启动器、官方插件市场、`nestor deploy`、远程模板（git/degit）

**后端方向（docs/architecture.md 的 P5 增量）**

- 支付（微信 / 支付宝、文件传输 本地 / OSS / S3）
- 短信 / 邮件、三方登录（微信 / Google OAuth）、验证码 + 登录失败锁定
- 任务队列（BullMQ）、用户后台管理端

## License

MIT
