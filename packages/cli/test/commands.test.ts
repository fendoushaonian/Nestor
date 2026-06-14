import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
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
})
