import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { isNonEmptyDir, renderString, renderTemplate } from '../src/template.js'

describe('renderString', () => {
  it('interpolates known keys', () => {
    expect(renderString('Hello {{ name }}!', { name: 'Nestor' })).toBe('Hello Nestor!')
  })

  it('leaves unknown keys untouched', () => {
    expect(renderString('{{a}}-{{b}}', { a: '1' })).toBe('1-{{b}}')
  })
})

describe('renderTemplate', () => {
  let templateDir: string
  let targetDir: string

  beforeEach(async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'nestor-tpl-'))
    templateDir = path.join(root, 'tpl')
    targetDir = path.join(root, 'out')
    await fs.mkdir(path.join(templateDir, 'src'), { recursive: true })
    await fs.writeFile(path.join(templateDir, 'package.json'), '{ "name": "{{name}}" }\n', 'utf8')
    await fs.writeFile(path.join(templateDir, '_gitignore'), 'node_modules\n', 'utf8')
    await fs.writeFile(
      path.join(templateDir, 'src', '{{name}}.ts'),
      'export const id = "{{name}}"\n',
      'utf8',
    )
  })

  afterEach(async () => {
    await fs.rm(path.dirname(templateDir), { recursive: true, force: true })
  })

  it('interpolates file contents and names, and rewrites _gitignore', async () => {
    const result = await renderTemplate({
      templateDir,
      targetDir,
      variables: { name: 'demo' },
    })

    expect(result.written.sort()).toEqual(
      ['.gitignore', 'package.json', path.join('src', 'demo.ts')].sort(),
    )
    expect(await fs.readFile(path.join(targetDir, 'package.json'), 'utf8')).toContain('"demo"')
    expect(await fs.readFile(path.join(targetDir, 'src', 'demo.ts'), 'utf8')).toContain('"demo"')
    expect(await isNonEmptyDir(targetDir)).toBe(true)
  })

  it('refuses to overwrite by default', async () => {
    await renderTemplate({ templateDir, targetDir, variables: { name: 'demo' } })
    await expect(
      renderTemplate({ templateDir, targetDir, variables: { name: 'demo' } }),
    ).rejects.toThrow(/Refusing to overwrite/)
  })
})
