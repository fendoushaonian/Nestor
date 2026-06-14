# 部署 (Docker)

后端 `@nestor/api` 提供了开箱即用的容器化方案:根目录的 `Dockerfile`(多阶段构建)与 `docker-compose.yml`(Postgres + API)。

## 一键启动 (Postgres + API)

```bash
docker compose up --build
```

- API 监听 `http://localhost:3000/api`(Swagger 在 `/api/docs`)。
- 首次启动自动执行数据库 migration 并 seed 基础 RBAC 数据(权限 / admin·user 角色 / 初始管理员)。
- Postgres 数据持久化在命名卷 `nestor-db`。

健康检查:

```bash
curl http://localhost:3000/api/health   # {"status":"ok",...}
```

## 仅构建并运行镜像

```bash
docker build -t nestor-api .

docker run -p 3000:3000 \
  -e NODE_ENV=production \
  -e DB_TYPE=postgres -e DB_HOST=<host> -e DB_PORT=5432 \
  -e DB_USERNAME=<user> -e DB_PASSWORD=<pwd> -e DB_DATABASE=<db> \
  -e JWT_ACCESS_SECRET="$(openssl rand -hex 32)" \
  -e JWT_REFRESH_SECRET="$(openssl rand -hex 32)" \
  -e CREDENTIAL_ENCRYPTION_KEY="$(openssl rand -hex 32)" \
  -e ADMIN_PASSWORD="<强密码>" \
  nestor-api
```

> 镜像默认运行 `node dist/main.js`;也内置了命中 `/api/health` 的容器 `HEALTHCHECK`。

## 生产清单 (上线前务必)

1. **改密钥**:`JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `CREDENTIAL_ENCRYPTION_KEY` 必须改成强随机值
   (例 `openssl rand -hex 32`)。`compose` 文件里的是占位默认值。
2. **设管理员密码**:显式设置 `ADMIN_PASSWORD`(否则生产环境会跳过创建初始管理员)。
3. **数据库**:用托管或独立的数据库实例;`DB_MIGRATIONS_RUN=true` 时容器启动会自动建表/升级。
4. **CORS**:按前端域名设置 `CORS_ORIGINS`(逗号分隔)。
5. 完整环境变量见 `.env.example`。

所有可配置项(数据库 / Redis / Mongo / OAuth / 存储 / 通知 / 限流等)均通过环境变量注入,详见 `.env.example`。
