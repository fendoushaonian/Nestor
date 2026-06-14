import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { Generator, buildNameVariables, builtinBlueprints } from '../src/generator.js'
import { resolveConfig } from '../src/config.js'

describe('buildNameVariables', () => {
  it('derives all casings', () => {
    expect(buildNameVariables('user profile')).toMatchObject({
      pascalName: 'UserProfile',
      camelName: 'userProfile',
      kebabName: 'user-profile',
    })
  })
})

describe('Generator', () => {
  let projectRoot: string

  beforeEach(async () => {
    projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'nestor-gen-'))
  })

  afterEach(async () => {
    await fs.rm(projectRoot, { recursive: true, force: true })
  })

  it('generates a component from the builtin blueprint', async () => {
    const gen = new Generator(projectRoot, resolveConfig())
    builtinBlueprints().forEach((b) => gen.register(b))

    const written = await gen.generate('component', 'todo item')
    expect(written).toContain(path.join('src', 'components', 'TodoItem', 'TodoItem.tsx'))
    const file = await fs.readFile(
      path.join(projectRoot, 'src', 'components', 'TodoItem', 'TodoItem.tsx'),
      'utf8',
    )
    expect(file).toContain('export function TodoItem')
  })

  it('honours generator dir overrides from config', async () => {
    const gen = new Generator(
      projectRoot,
      resolveConfig({ generators: { page: { dir: 'app/views' } } }),
    )
    builtinBlueprints().forEach((b) => gen.register(b))

    const written = await gen.generate('page', 'home')
    expect(written).toContain(path.join('app', 'views', 'HomePage.tsx'))
  })

  it('throws on unknown blueprint', async () => {
    const gen = new Generator(projectRoot, resolveConfig())
    await expect(gen.generate('nope', 'x')).rejects.toThrow(/Unknown blueprint/)
  })
})
