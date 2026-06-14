import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))

/**
 * Locate the directory that holds Nestor's built-in templates.
 *
 * Resolution order:
 *  1. `NESTOR_TEMPLATES_DIR` env override
 *  2. `<cli-package>/templates` (bundled at publish time)
 *  3. monorepo `templates/` (local development)
 */
export async function findTemplatesRoot(): Promise<string> {
  const candidates = [
    process.env.NESTOR_TEMPLATES_DIR,
    path.resolve(here, '..', 'templates'),
    path.resolve(here, '..', '..', '..', 'templates'),
  ].filter((c): c is string => Boolean(c))

  for (const candidate of candidates) {
    if (await dirExists(candidate)) return candidate
  }
  throw new Error(
    `Could not locate Nestor templates. Set NESTOR_TEMPLATES_DIR or reinstall @nestor/cli.`,
  )
}

/** List available template names (sub-directories of the templates root). */
export async function listTemplates(): Promise<string[]> {
  const root = await findTemplatesRoot()
  const entries = await fs.readdir(root, { withFileTypes: true })
  return entries.filter((e) => e.isDirectory()).map((e) => e.name.replace(/^starter-/, ''))
}

/** Absolute path to a named template's source directory. */
export async function resolveTemplateDir(name: string): Promise<string> {
  const root = await findTemplatesRoot()
  const candidates = [path.join(root, name), path.join(root, `starter-${name}`)]
  for (const candidate of candidates) {
    if (await dirExists(candidate)) return candidate
  }
  throw new Error(`Unknown template "${name}". Available: ${(await listTemplates()).join(', ')}`)
}

async function dirExists(p: string): Promise<boolean> {
  try {
    const stat = await fs.stat(p)
    return stat.isDirectory()
  } catch {
    return false
  }
}
