import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { PluginLoader, definePlugin } from '../src/plugin.js'
import { resolveConfig } from '../src/config.js'

describe('PluginLoader', () => {
  let projectRoot: string

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nestor-plugin-'))
  })

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true })
  })

  it('collects dependencies, files and blueprints from plugins', async () => {
    const authPlugin = definePlugin({
      name: 'auth',
      apply(ctx) {
        ctx.addDependency('jsonwebtoken', '^9.0.0')
        ctx.addFile('src/auth/index.ts', 'export const auth = true\n')
        ctx.registerBlueprint({
          name: 'guard',
          description: 'route guard',
          targetDir: 'src/guards',
          files: (_n, v) => [{ path: `${v.pascalName}.ts`, contents: '// guard\n' }],
        })
      },
    })

    const loader = new PluginLoader(projectRoot, resolveConfig())
    const result = await loader.apply([authPlugin])

    expect(result.dependencies).toEqual([{ name: 'jsonwebtoken', version: '^9.0.0', dev: false }])
    expect(result.files.get('src/auth/index.ts')).toContain('auth = true')
    expect(result.blueprints.map((b) => b.name)).toContain('guard')

    const written = await loader.writeFiles(result.files)
    expect(written).toContain('src/auth/index.ts')
    expect(await fs.readFile(path.join(projectRoot, 'src/auth/index.ts'), 'utf8')).toContain(
      'auth = true',
    )
  })
})
