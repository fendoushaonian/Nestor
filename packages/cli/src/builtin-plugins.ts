import { definePlugin, type NestorPlugin } from '@nestor/core'

/**
 * The plugins that ship with the CLI for `nestor add <name>`. Each one is
 * intentionally small — it queues dependencies and a starter file. Real-world
 * plugins would live in their own packages under `plugins/`.
 */
export const builtinPlugins: Record<string, NestorPlugin> = {
  vitest: definePlugin({
    name: 'vitest',
    description: 'Unit testing with Vitest',
    apply(ctx) {
      ctx.addDependency('vitest', '^2.0.0', true)
      ctx.addFile(
        'vitest.config.ts',
        "import { defineConfig } from 'vitest/config'\n\nexport default defineConfig({\n  test: { environment: 'node' },\n})\n",
      )
      ctx.addFile(
        'src/__tests__/smoke.test.ts',
        "import { expect, test } from 'vitest'\n\ntest('smoke', () => {\n  expect(1 + 1).toBe(2)\n})\n",
      )
      ctx.logger.success('Added Vitest. Run tests with `npx vitest`.')
    },
  }),

  ui: definePlugin({
    name: 'ui',
    description: 'A minimal design-token stylesheet + Button component',
    apply(ctx) {
      ctx.addFile(
        'src/ui/tokens.css',
        ':root {\n  --nestor-radius: 8px;\n  --nestor-primary: #4f46e5;\n}\n',
      )
      ctx.registerBlueprint({
        name: 'ui-button',
        description: 'Styled button component',
        targetDir: 'src/ui',
        files: (_n, v) => [
          {
            path: `${v.pascalName}Button.tsx`,
            contents: `export function ${v.pascalName}Button() {\n  return <button className="nestor-btn">${v.pascalName}</button>\n}\n`,
          },
        ],
      })
      ctx.logger.success('Added UI tokens + ui-button blueprint.')
    },
  }),

  auth: definePlugin({
    name: 'auth',
    description: 'Token-based auth scaffolding',
    apply(ctx) {
      ctx.addDependency('jsonwebtoken', '^9.0.0')
      ctx.addFile(
        'src/auth/index.ts',
        'export interface Session {\n  userId: string\n}\n\nexport function verify(_token: string): Session | null {\n  // TODO: implement token verification\n  return null\n}\n',
      )
      ctx.logger.success('Added auth scaffolding under src/auth.')
    },
  }),
}

export function listBuiltinPlugins(): string[] {
  return Object.keys(builtinPlugins)
}
