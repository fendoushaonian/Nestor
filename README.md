# Nestor 🪺

> A scaffolding framework for **rapid APP development** — turn "create project → add
> capabilities → generate code → run → ship" into one smooth command-line workflow.

Nestor 是一个面向「APP 快速开发」的脚手架框架。它把建项目、叠能力、生成样板代码、
起服务、打包发布串成一条流畅的命令行工作流。

```bash
nestor create my-app        # 选模板，秒建项目
nestor add ui auth          # 一行命令叠加能力（插件）
nestor generate page Home   # 生成页面 / 组件 / 模块
nestor dev                  # 起开发服务
nestor build                # 打包产物
```

## Why Nestor

- **约定优于配置** — 默认即可运行，配置只在需要时出现。
- **模板 + 插件 + 生成器** 三件套覆盖项目全生命周期。
- **栈无关** — 当前内置 Web 模板，架构上可扩展 React Native / Flutter / 小程序。

## Architecture

This is a [pnpm](https://pnpm.io) workspace monorepo.

```
Nestor/
├─ packages/
│  ├─ core/        @nestor/core  引擎：模板渲染 / 生成器 / 插件加载 / 配置
│  └─ cli/         @nestor/cli   命令行入口（create / add / generate / dev / build）
├─ templates/
│  └─ starter-web/ 内置 Web 模板（Vite + TypeScript）
└─ pnpm-workspace.yaml
```

### Three subsystems (in `@nestor/core`)

| 子系统   | 作用                                                                       | 关键 API                         |
| -------- | -------------------------------------------------------------------------- | -------------------------------- |
| 模板引擎 | 复制模板目录，对 `{{var}}`（文件名 + 内容）插值，`_gitignore`→`.gitignore` | `renderTemplate`, `renderString` |
| 生成器   | 注册蓝图（`component`/`page`/`module`），按命令生成代码                    | `Generator`, `builtinBlueprints` |
| 插件系统 | 插件声明 `apply(ctx)`，注入依赖 / 文件 / 蓝图                              | `PluginLoader`, `definePlugin`   |

## Quick start (本仓库开发)

```bash
pnpm install
pnpm build           # 构建 core + cli
pnpm test            # 运行单元测试
pnpm typecheck       # 类型检查
pnpm lint            # ESLint

# 试用 CLI（本地构建产物）
node packages/cli/dist/index.js create demo --template web
node packages/cli/dist/index.js generate component Card
node packages/cli/dist/index.js add ui
```

## Configuration — `nestor.config.mjs`

```js
/** @type {import('@nestor/core').NestorConfig} */
export default {
  framework: 'web',
  plugins: ['ui'],
  generators: {
    page: { dir: 'src/pages' },
  },
}
```

> 支持 `.mjs` / `.js` / `.json`。`.ts` 需要额外加载器（会给出提示并回退默认值）。

## Commands

| 命令                                 | 说明                       |
| ------------------------------------ | -------------------------- |
| `nestor create [name] -t <template>` | 从模板创建新项目           |
| `nestor generate <blueprint> <name>` | 由蓝图生成代码（别名 `g`） |
| `nestor add <plugin...>`             | 为当前项目添加能力（插件） |
| `nestor dev`                         | 运行项目的 `dev` 脚本      |
| `nestor build`                       | 运行项目的 `build` 脚本    |

## Built-in blueprints & plugins

- Blueprints：`component`、`page`、`module`
- Plugins：`ui`、`auth`、`vitest`

## Roadmap

- 更多模板：`react-native` / `flutter` / `miniprogram` / `node-api`
- `npm create nestor` 启动器
- 官方插件市场：db(prisma) / i18n / 测试 / 部署
- `nestor deploy` 对接 Vercel / Netlify / 自建
- 远程模板（git / degit）与团队私有模板源

## License

MIT
