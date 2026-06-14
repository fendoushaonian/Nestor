# Nestor 企业级脚手架改造方案

> 现状：仓库目前只有一个 `README.md`，写着「关于一个 APP 快速开发的脚手架框架」。也就是说这是**从零开始**，可以按企业级标准一次设计到位。

---

## 0. 先回答你的核心疑问

> 「登录、卡密、数据库这些功能，我感觉不应该用前端写吧？」

**完全正确。** 这些必须放**后端**，原因：

| 功能 | 为什么必须在后端 |
| --- | --- |
| 登录 / 鉴权 | 密码校验、token 签发、会话管理放前端 = 任何人都能伪造登录。前端代码用户可见，秘钥会泄露。 |
| 卡密 / 授权码 | 卡密的「是否已用、是否过期、绑定谁」必须由服务器判定。放前端 = 用户随便改成「已激活」。 |
| 数据库 / 数据表 | 数据库连接串、读写权限只能在后端。前端直连数据库 = 凭证泄露 + 任意篡改数据。 |
| 多数据库支持 | 数据源切换、连接池、事务，都是后端职责。 |

**前端只负责**：界面展示、调用后端 API、把 token 存起来在请求里带上。
**后端负责**：所有业务逻辑、数据校验、权限、数据库读写。

所以正确的结构是 **前后端分离**：后端提供 REST/GraphQL API，前端（Web / 小程序 / App）只是其中一个调用方。

---

## 1. 推荐技术栈

项目名叫 **Nestor**，和 **NestJS** 高度相似，我猜你本来就想用它。这也确实是做「企业级、可复用、模块化」后端的最佳选择之一。

### 首选：NestJS (Node.js + TypeScript)
- **模块化天生适合复用**：每个功能就是一个 Module（AuthModule、CardModule…），可以像积木一样拼装、抽成独立 npm 包。
- **企业级特性内置**：依赖注入、拦截器、守卫（Guard 做鉴权）、管道（校验）、异常过滤器。
- **多数据库友好**：TypeORM / Prisma 都支持 MySQL、PostgreSQL、SQLite、MongoDB，可配多数据源。
- **生态全**：Passport（登录策略）、JWT、Swagger（自动 API 文档）、BullMQ（队列）、缓存。

### 备选方案（如果你团队更熟悉别的）
| 方案 | 适合场景 | 代表脚手架 |
| --- | --- | --- |
| **Java + Spring Boot + Spring Security + MyBatis-Plus** | 大型传统企业、团队是 Java 班底 | 若依 RuoYi、JeecgBoot |
| **Go + gin/go-zero + GORM** | 高并发、追求性能 | go-zero |
| **Python + FastAPI/Django** | AI/数据类业务、快速出原型 | Django Admin |

> 下面的方案我**默认按 NestJS** 写，但架构思路（分层、表设计、模块划分）对任何语言都通用。

---

## 2. 整体架构

采用 **模块化单体（Modular Monolith）** 起步，未来可平滑拆成微服务。用 **monorepo** 管理。

```
Nestor/  (pnpm + Nx/Turborepo monorepo)
├── apps/
│   ├── api/            # 后端主服务 (NestJS)
│   └── admin-web/      # 后台管理前端 (可选, Vue/React)，调用 api
├── packages/           # 可复用的模块库（核心！复用就靠它）
│   ├── core/           # 通用基础：响应封装、异常、日志、配置
│   ├── auth/           # 登录/注册/JWT/RBAC 权限
│   ├── card/           # 卡密生成/校验/兑换
│   ├── database/       # 多数据库适配层
│   └── ...             # 后续：支付、短信、文件存储、审计
└── tools/
    └── cli/            # 脚手架命令：一键生成新模块/新项目
```

- **`packages/` 是复用的关键**：每个通用功能做成独立包，新项目直接 `import`，或发布到私有 npm registry。
- **`tools/cli`**：做一个 `nestor new <module>` 命令，自动生成 controller/service/entity 模板，这才是「快速开发脚手架」的精髓。

---

## 3. 多数据库支持

不是「同时连一堆库」，而是「**可配置切换 + 可同时管理多数据源**」。

1. **数据库无关的 ORM**：用 TypeORM/Prisma，业务代码写一套，靠配置切 MySQL / PostgreSQL / SQLite。
2. **配置驱动**：`.env` 里写 `DB_TYPE=mysql`，换库只改配置不改代码。
   ```
   DB_TYPE=mysql        # 可选 mysql | postgres | sqlite | mongodb
   DB_HOST=...
   DB_PORT=...
   DB_NAME=...
   ```
3. **多数据源**：业务库 + 日志库分离时，注册多个 DataSource。
4. **迁移（Migration）**：用 ORM 的 migration 管理表结构版本，禁止手动改库，保证各环境一致。
5. **读写分离/分库分表**：量大时再加（先留好抽象层）。

---

## 4. 数据表设计（核心表）

### 用户与权限（RBAC）
```
users           用户表    (id, username, email, phone, password_hash, status, created_at)
roles           角色表    (id, name, code, description)
permissions     权限表    (id, name, code, resource, action)
user_roles      用户-角色 (user_id, role_id)
role_permissions角色-权限 (role_id, permission_id)
```

### 卡密系统
```
card_batches    卡密批次  (id, name, product_id, total, value_type, value, expire_days, created_by)
                          value_type: 会员时长 / 额度 / 一次性权限
cards           卡密表    (id, batch_id, code, secret, status, bound_user_id, used_at, expire_at)
                          status: 未使用(unused) / 已使用(used) / 已禁用(disabled) / 已过期(expired)
card_redeem_log 兑换记录  (id, card_id, user_id, ip, device, redeemed_at)
products        商品/权益 (id, name, type, duration, quota)
user_entitlements 用户权益 (id, user_id, product_id, source_card_id, start_at, end_at, remaining_quota)
```

### 通用 / 审计
```
audit_logs      操作审计  (id, user_id, action, target, ip, ua, created_at)
login_logs      登录日志  (id, user_id, ip, ua, success, created_at)
configs         系统配置  (id, key, value, group)
```

---

## 5. 通用功能模块清单

### A. 登录 / 鉴权（`packages/auth`）
- 注册、登录（用户名/邮箱/手机号 + 密码）
- 密码 **bcrypt/argon2 加盐哈希**（绝不明文存）
- **JWT**（access token + refresh token）
- 第三方登录可扩展（微信、Google OAuth）
- 验证码（图形 / 短信，防爆破）
- **RBAC 权限控制**：用 Guard + 装饰器 `@Roles('admin')`、`@Permissions('card:create')`
- 登录失败锁定、登录日志

### B. 卡密 / 授权（`packages/card`）
- **批量生成卡密**（指定数量、面值、有效期，导出 CSV）
- **兑换接口**：校验状态 → 校验过期 → 绑定用户 → 发放权益 → 写日志（**全程加锁/事务防并发重复兑换**）
- 卡密查询、禁用、统计（已用/未用/转化率）
- 防刷：兑换频率限制、IP 限制

### C. 其他企业常见能力（按需逐步加）
- 文件上传（本地 / OSS / S3）
- 短信 / 邮件通知
- 支付（微信/支付宝，配合卡密做自动发卡）
- 操作审计日志、数据字典、定时任务、消息队列
- 自动生成的 **Swagger API 文档**

---

## 6. 「可复用」怎么落地

复用不是口号，靠这 4 个机制：

1. **模块即包**：每个功能在 `packages/` 里独立成包，新项目 `pnpm add @nestor/auth` 即可用。
2. **配置而非硬编码**：数据库、登录方式、卡密规则全走配置，不同项目改 `.env` 即可。
3. **脚手架 CLI**：`nestor new project` 拉起新项目骨架；`nestor g module <name>` 生成标准模块。
4. **统一规范**：统一的响应格式、错误码、分页、日志、目录结构，团队任何人接手都一致。

---

## 7. 实施路线图（建议分阶段）

| 阶段 | 内容 | 产出 |
| --- | --- | --- |
| **P0 地基** | monorepo + NestJS 骨架 + 配置 + 统一响应/异常/日志 + Swagger | 能跑起来的空架子 |
| **P1 数据库** | ORM 接入 + 多数据库配置 + migration + 基础表 | 数据层就绪 |
| **P2 登录权限** | 注册/登录/JWT/RBAC + 验证码 + 日志 | 完整鉴权 |
| **P3 卡密** | 批次生成 + 兑换 + 权益发放 + 统计 | 卡密系统 |
| **P4 复用化** | 抽包 + CLI 脚手架 + 文档 | 真正的「快速开发脚手架」 |
| **P5 增强** | 支付 / 文件 / 短信 / 审计 / 后台前端 | 企业级完善 |

---

## 8. 需要你确认的事

1. **技术栈**：用 **NestJS**（我的推荐，契合项目名）还是 Java Spring Boot / Go / 其他？
2. **数据库**：主要用 MySQL、PostgreSQL 还是别的？是否真的需要多库切换？
3. **是否要后台管理前端**（admin-web），还是只先做后端 API？
4. **从哪开始**：要我直接动手搭 **P0+P1 地基**（monorepo + NestJS + 数据库 + 基础表），还是先把方案细化？

确认后我就开始按阶段搭建并提 PR。

---

## 9. 安全边界(工作流表达式 / Code 节点)

工作流引擎的表达式(`{{ ... }}`)与 Code 节点通过 `new Function(...)` 执行,
这是引擎的**预期能力**(类似 n8n/Zapier),但等同于在 Node 进程内运行 JavaScript:
即便表达式作用域只暴露 `$json/$items/$node/$now`,`new Function` 仍可访问
`process`、`globalThis`、(CJS 下的)`require` 等全局对象。

因此请把「能创建/编辑工作流」视为**受信任操作**:

- 相关写接口已用 `@Permissions('workflow:write')` 守卫,仅授权用户可改工作流;
- **不要**把工作流编辑能力开放给不受信任的终端用户;
- 若未来需要面向不受信任用户,应改用沙箱(如 `isolated-vm` / `vm2` 替代方案 / 子进程 + 资源限制),并对可用全局做白名单。
