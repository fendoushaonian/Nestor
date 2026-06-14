import { promises as fs } from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  resolveConfig,
  type Logger,
  type NestorConfig,
  type ResolvedNestorConfig,
} from '@nestor/core'

const CONFIG_NAMES = ['nestor.config.mjs', 'nestor.config.js', 'nestor.config.json']

/**
 * Load and resolve the project config from `cwd`.
 *
 * Supports `.mjs`/`.js` (via dynamic import) and `.json`. TypeScript configs
 * require a loader and are reported as unsupported so the user gets a clear hint
 * instead of a cryptic crash. Missing config falls back to defaults.
 */
export async function loadConfig(cwd: string, logger: Logger): Promise<ResolvedNestorConfig> {
  for (const name of CONFIG_NAMES) {
    const file = path.join(cwd, name)
    if (!(await fileExists(file))) continue

    logger.debug(`loading config: ${file}`)
    if (name.endsWith('.json')) {
      const raw = await fs.readFile(file, 'utf8')
      return resolveConfig(JSON.parse(raw) as NestorConfig)
    }
    const mod = (await import(pathToFileURL(file).href)) as { default?: NestorConfig }
    return resolveConfig(mod.default ?? {})
  }

  if (await fileExists(path.join(cwd, 'nestor.config.ts'))) {
    logger.warn(
      'Found nestor.config.ts but TS configs need a loader. Using defaults — ' +
        'rename to nestor.config.mjs or add a build step.',
    )
  }
  return resolveConfig({})
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}
