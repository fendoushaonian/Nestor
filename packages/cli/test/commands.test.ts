import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { silentLogger } from '@nestor/core'
import { buildProgram } from '../src/cli.js'
import { generateCommand } from '../src/commands/generate.js'
import { addCommand } from '../src/commands/add.js'

describe('buildProgram', () => {
  it('registers the expected commands', () => {
    const program = buildProgram(silentLogger)
    const names = program.commands.map((c) => c.name())
    expect(names).toEqual(expect.arrayContaining(['create', 'generate', 'add', 'dev', 'build']))
  })
})

describe('command integration', () => {
  let cwd: string
  let prev: string

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'nestor-cli-'))
    prev = process.cwd()
    process.chdir(cwd)
  })

  afterEach(async () => {
    process.chdir(prev)
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('generate creates files from a builtin blueprint', async () => {
    await generateCommand('component', 'widget box', {}, silentLogger)
    const file = path.join(cwd, 'src', 'components', 'WidgetBox', 'WidgetBox.tsx')
    expect(await fs.readFile(file, 'utf8')).toContain('export function WidgetBox')
  })

  it('add applies a plugin: writes files and updates package.json', async () => {
    await fs.writeFile(
      path.join(cwd, 'package.json'),
      JSON.stringify({ name: 'demo', dependencies: {} }, null, 2),
      'utf8',
    )
    await addCommand(['auth'], {}, silentLogger)

    const authFile = await fs.readFile(path.join(cwd, 'src', 'auth', 'index.ts'), 'utf8')
    expect(authFile).toContain('export interface Session')

    const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf8'))
    expect(pkg.dependencies.jsonwebtoken).toBe('^9.0.0')
  })

  it('generate screen creates a React Native screen', async () => {
    await generateCommand('screen', 'settings panel', {}, silentLogger)
    const file = path.join(cwd, 'src', 'screens', 'SettingsPanelScreen.tsx')
    const contents = await fs.readFile(file, 'utf8')
    expect(contents).toContain('export function SettingsPanelScreen')
    expect(contents).toContain("from 'react-native'")
  })

  it('add nav queues React Navigation deps + a navigator file', async () => {
    await fs.writeFile(
      path.join(cwd, 'package.json'),
      JSON.stringify({ name: 'demo', dependencies: {} }, null, 2),
      'utf8',
    )
    await addCommand(['nav'], {}, silentLogger)

    const navFile = await fs.readFile(path.join(cwd, 'src', 'navigation', 'index.tsx'), 'utf8')
    expect(navFile).toContain('AppNavigator')

    const pkg = JSON.parse(await fs.readFile(path.join(cwd, 'package.json'), 'utf8'))
    expect(pkg.dependencies['@react-navigation/native']).toBe('^6.1.0')
  })
})

describe('templates', () => {
  it('exposes the mobile template', async () => {
    const { listTemplates } = await import('../src/paths.js')
    const names = await listTemplates()
    expect(names).toEqual(expect.arrayContaining(['mobile', 'web']))
  })
})

describe('generate — agent-friendly output', () => {
  let cwd: string
  let prev: string

  beforeEach(async () => {
    cwd = await fs.mkdtemp(path.join(os.tmpdir(), 'nestor-agent-'))
    prev = process.cwd()
    process.chdir(cwd)
    await fs.writeFile(
      path.join(cwd, 'nestor.config.mjs'),
      "export default { framework: 'node' }\n",
      'utf8',
    )
  })

  afterEach(async () => {
    process.chdir(prev)
    await fs.rm(cwd, { recursive: true, force: true })
  })

  it('returns a structured result with written files + manual nextSteps (no --register)', async () => {
    const result = await generateCommand('nest-module', 'invoice', { json: true }, silentLogger)
    expect(result?.ok).toBe(true)
    expect(result?.written).toEqual(
      expect.arrayContaining([path.join('src', 'modules', 'invoice', 'invoice.module.ts')]),
    )
    expect(result?.registered).toEqual([])
    // Without --register, the host-file edits are surfaced as structured next steps.
    expect(result?.nextSteps.map((s) => s.type)).toEqual([
      'register-module',
      'register-entity',
      'seed-permissions',
    ])
  })

  it('--register auto-wires the module into app.module.ts and entities.ts', async () => {
    await fs.mkdir(path.join(cwd, 'src', 'database'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, 'src', 'app.module.ts'),
      "import { Module } from '@nestjs/common';\nimport { DatabaseModule } from './database/database.module';\n\n@Module({\n  imports: [\n    DatabaseModule,\n  ],\n})\nexport class AppModule {}\n",
      'utf8',
    )
    await fs.writeFile(
      path.join(cwd, 'src', 'database', 'entities.ts'),
      "import { User } from '../modules/auth/entities/user.entity';\n\nexport const entities = [\n  User,\n];\n",
      'utf8',
    )

    const result = await generateCommand('nest-module', 'order', { register: true }, silentLogger)

    expect(result?.registered).toEqual([
      { file: 'src/app.module.ts', status: 'done' },
      { file: 'src/database/entities.ts', status: 'done' },
    ])
    expect(result?.nextSteps.map((s) => s.type)).toEqual(['seed-permissions'])

    const appModule = await fs.readFile(path.join(cwd, 'src', 'app.module.ts'), 'utf8')
    expect(appModule).toContain("import { OrderModule } from './modules/order/order.module';")
    expect(appModule).toMatch(/imports:\s*\[\s*\n\s*OrderModule,/)

    const entities = await fs.readFile(path.join(cwd, 'src', 'database', 'entities.ts'), 'utf8')
    expect(entities).toContain("import { Order } from '../modules/order/entities/order.entity';")
    expect(entities).toMatch(/export const entities = \[\s*\n\s*Order,/)
  })

  it('--json emits a structured error (not a thrown exception) when the config is malformed', async () => {
    await fs.writeFile(
      path.join(cwd, 'nestor.config.mjs'),
      'export default { not valid js\n',
      'utf8',
    )
    const writes: string[] = []
    const spy = vi.spyOn(process.stdout, 'write').mockImplementation((chunk: unknown) => {
      writes.push(String(chunk))
      return true
    })
    const prevExit = process.exitCode
    try {
      const result = await generateCommand('nest-module', 'foo', { json: true }, silentLogger)
      expect(result).toBeUndefined()
      const payload = JSON.parse(writes.join(''))
      expect(payload.ok).toBe(false)
      expect(typeof payload.error).toBe('string')
      expect(process.exitCode).toBe(1)
    } finally {
      spy.mockRestore()
      process.exitCode = prevExit
    }
  })

  it('--register is idempotent', async () => {
    await fs.mkdir(path.join(cwd, 'src', 'database'), { recursive: true })
    await fs.writeFile(
      path.join(cwd, 'src', 'app.module.ts'),
      '@Module({\n  imports: [\n  ],\n})\nexport class AppModule {}\n',
      'utf8',
    )
    await fs.writeFile(
      path.join(cwd, 'src', 'database', 'entities.ts'),
      'export const entities = [\n];\n',
      'utf8',
    )

    await generateCommand('nest-module', 'order', { register: true }, silentLogger)
    const second = await generateCommand(
      'nest-module',
      'order',
      { register: true, overwrite: true },
      silentLogger,
    )

    expect(second?.registered).toEqual([
      { file: 'src/app.module.ts', status: 'already' },
      { file: 'src/database/entities.ts', status: 'already' },
    ])
  })
})
