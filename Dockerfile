# syntax=docker/dockerfile:1

# 仅打包后端 API (@nestor/api)。这是 pnpm workspace monorepo, 需先构建其依赖的
# 工作区包 @nestor/shared, 再构建 api, 最后裁剪掉 devDependencies 作为运行镜像。

FROM node:20-bookworm-slim AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS build
# 原生模块 (bcrypt / sqlite3) 在无预编译产物时需要编译工具链
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && rm -rf /var/lib/apt/lists/*
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm --filter @nestor/shared build \
  && pnpm --filter @nestor/api build
# 裁掉 devDependencies, 保留工作区链接与运行时依赖
RUN pnpm prune --prod

FROM base AS runtime
ENV NODE_ENV=production
# 仅复制运行所需: 裁剪后的依赖 + 构建产物 (含工作区符号链接)
COPY --from=build /app /app
WORKDIR /app/apps/api
EXPOSE 3000
# 健康检查命中应用自带的 /api/health
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.APP_PORT||3000)+'/'+(process.env.APP_PREFIX||'api')+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "dist/main.js"]
