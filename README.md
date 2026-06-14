# Nestor 🪺

> A scaffolding framework for **rapid APP development** — turn "create project → add
> capabilities → generate code → run → ship" into one smooth command-line workflow.

Nestor 是一个面向「APP 快速开发」的脚手架框架。它把建项目、叠能力、生成样板代码、
起服务、打包发布串成一条流畅的命令行工作流。

```bash
nestor create my-app -t mobile   # 选模板，秒建 iOS + Android 工程
nestor add nav auth ui           # 一行命令叠加能力（插件）
nestor generate screen Home      # 生成页面 / 屏幕 / 组件 / 模块
nestor dev                       # 起开发服务（Expo / Vite）
nestor build                     # 打包产物
```

**两种用法**：命令行（上面）或可视化工作台 **Nestor Studio**（macOS / iOS 风格 UI，
图标 / 插画全部手写 SVG）—— 勾选平台、模板、能力，右侧 iPhone 实时预览并生成对应命令。

## Why Nestor

- **约定优于配置** — 默认即可运行，配置只在需要时出现。
- **模板 + 插件 + 生成器** 三件套覆盖项目全生命周期。
- **栈无关** — 内置 **Mobile（React Native + Expo）** 与 **Web（Vite）** 模板，一套 TypeScript 代码同出 iOS / Android。
- **可视化** — Nestor Studio 把整条工作流变成 macOS/iOS 风格的图形界面。

## Architecture

This is a [pnpm](https://pnpm.io) workspace monorepo.

```
Nestor/
├─ packages/
│  ├─ core/           @nestor/core    引擎：模板渲染 / 生成器 / 插件加载 / 配置
│  ├─ cli/            @nestor/cli     命令行入口（create / add / generate / dev / build）
│  └─ studio/         @nestor/studio  可视化工作台（React + Vite，macOS/iOS UI，手写 SVG）
├─ templates/
│  ├─ starter-mobile/ 内置 Mobile 模板（React Native + Expo + TypeScript）
│  └─ starter-web/    内置 Web 模板（Vite + TypeScript）
└─ pnpm-workspace.yaml
```

### Three subsystems (in `@nestor/core`)

| 子系统   | 作用                                                                       | 关键 API                         |
| -------- | -------------------------------------------------------------------------- | -------------------------------- |
| 模板引擎 | 复制模板目录，对 `{{var}}`（文件名 + 内容）插值，`_gitignore`→`.gitignore` | `renderTemplate`, `renderString` |
| 生成器   | 注册蓝图（`component`/`page`/`screen`/`module`），按命令生成代码           | `Generator`, `builtinBlueprints` |
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

## Nestor Studio（可视化工作台）

```bash
pnpm --filter @nestor/studio dev    # 本地启动 Studio
```

macOS 窗口质感（红绿灯 + 毛玻璃侧边栏）、iOS 系统配色，全部图标 / 插画 / iPhone 外框
均为手写 SVG，无第三方 UI / 图标库。「新建 App 向导」：填名字 → 勾选 iOS/Android →
选模板 → 多选能力插件 → 右侧 iPhone 实时预览 + 自动生成 `nestor create … / nestor add …`。

## Built-in blueprints & plugins

- Blueprints：`component`、`page`、`screen`、`module`
- Plugins：`nav`（React Navigation）、`ui`、`auth`、`vitest`

## Roadmap

- 更多模板：`flutter` / `miniprogram` / `node-api`
- Studio 直连本地生成（一键 Generate 真正落盘）
- `npm create nestor` 启动器
- 官方插件市场：db(prisma) / i18n / 测试 / 部署
- `nestor deploy` 对接 Vercel / Netlify / 自建
- 远程模板（git / degit）与团队私有模板源

## License

MIT
