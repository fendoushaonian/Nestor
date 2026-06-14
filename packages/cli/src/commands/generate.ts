import { promises as fs } from 'node:fs'
import path from 'node:path'
import pc from 'picocolors'
import { Generator, builtinBlueprints, toKebabCase, toPascalCase, type Logger } from '@nestor/core'
import { loadConfig } from '../config-loader.js'

export interface GenerateOptions {
  overwrite?: boolean
  /** Emit a single machine-readable JSON object to stdout (for tools / AI agents). */
  json?: boolean
  /** For backend modules: auto-wire into app.module.ts + entities.ts. */
  register?: boolean
}

/** Outcome of trying to wire a backend module into one host file. */
export interface RegistrationAction {
  file: string
  status: 'done' | 'already' | 'skipped'
  detail?: string
}

/** A follow-up the caller (human or agent) still needs to perform. */
export interface NextStep {
  type: 'register-module' | 'register-entity' | 'seed-permissions'
  description: string
  [key: string]: unknown
}

/** Structured result of a generate run — the shape printed by `--json`. */
export interface GenerateResult {
  ok: true
  blueprint: string
  name: string
  written: string[]
  registered: RegistrationAction[]
  nextSteps: NextStep[]
}

/** Insert `line` right after the last top-level `import ... ` line in `source`. */
function insertAfterLastImport(source: string, line: string): string {
  const lines = source.split('\n')
  let lastImport = -1
  for (let i = 0; i < lines.length; i++) {
    if (/^import\s.+from\s.+$/.test(lines[i].trim())) lastImport = i
  }
  if (lastImport === -1) return `${line}\n${source}`
  lines.splice(lastImport + 1, 0, line)
  return lines.join('\n')
}

/**
 * Best-effort, idempotent wiring of a generated NestJS module into the host app
 * (`src/app.module.ts` imports array + `src/database/entities.ts` entities array).
 * Never throws: anything it can't safely edit is reported as `skipped` so callers
 * can fall back to the manual next-steps.
 */
async function registerNestModule(
  projectRoot: string,
  name: string,
): Promise<RegistrationAction[]> {
  const Pascal = toPascalCase(name)
  const kebab = toKebabCase(name)
  const moduleClass = `${Pascal}Module`
  const actions: RegistrationAction[] = []

  // --- app.module.ts ---
  const appPath = path.join(projectRoot, 'src', 'app.module.ts')
  try {
    let src = await fs.readFile(appPath, 'utf8')
    if (src.includes(moduleClass)) {
      actions.push({ file: 'src/app.module.ts', status: 'already' })
    } else {
      const importLine = `import { ${moduleClass} } from './modules/${kebab}/${kebab}.module';`
      const importsRe = /(@Module\(\s*\{[\s\S]*?imports:\s*\[)/
      if (!importsRe.test(src)) {
        actions.push({
          file: 'src/app.module.ts',
          status: 'skipped',
          detail: 'could not locate @Module imports array',
        })
      } else {
        src = insertAfterLastImport(src, importLine)
        src = src.replace(importsRe, `$1\n    ${moduleClass},`)
        await fs.writeFile(appPath, src, 'utf8')
        actions.push({ file: 'src/app.module.ts', status: 'done' })
      }
    }
  } catch {
    actions.push({ file: 'src/app.module.ts', status: 'skipped', detail: 'file not found' })
  }

  // --- database/entities.ts ---
  const entitiesPath = path.join(projectRoot, 'src', 'database', 'entities.ts')
  try {
    let src = await fs.readFile(entitiesPath, 'utf8')
    const arrayRe = /(export const entities\s*=\s*\[)/
    if (new RegExp(`\\b${Pascal}\\b`).test(src)) {
      actions.push({ file: 'src/database/entities.ts', status: 'already' })
    } else if (!arrayRe.test(src)) {
      actions.push({
        file: 'src/database/entities.ts',
        status: 'skipped',
        detail: 'could not locate entities array',
      })
    } else {
      const importLine = `import { ${Pascal} } from '../modules/${kebab}/entities/${kebab}.entity';`
      src = insertAfterLastImport(src, importLine)
      src = src.replace(arrayRe, `$1\n  ${Pascal},`)
      await fs.writeFile(entitiesPath, src, 'utf8')
      actions.push({ file: 'src/database/entities.ts', status: 'done' })
    }
  } catch {
    actions.push({ file: 'src/database/entities.ts', status: 'skipped', detail: 'file not found' })
  }

  return actions
}

/** `nestor generate <blueprint> <name>` — scaffold code from a blueprint. */
export async function generateCommand(
  blueprint: string | undefined,
  name: string | undefined,
  options: GenerateOptions,
  logger: Logger,
): Promise<GenerateResult | undefined> {
  const cwd = process.cwd()

  // In JSON mode, normal logs would corrupt the single JSON object on stdout.
  const log: Logger = options.json
    ? { info: () => {}, success: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
    : logger

  const emitError = (message: string): undefined => {
    if (options.json) {
      process.stdout.write(`${JSON.stringify({ ok: false, error: message })}\n`)
      process.exitCode = 1
      return undefined
    }
    throw new Error(message)
  }

  try {
    return await run()
  } catch (err) {
    // Honour the --json contract for *any* failure (e.g. a malformed nestor.config),
    // not just the explicit emitError paths below.
    return emitError(err instanceof Error ? err.message : String(err))
  }

  async function run(): Promise<GenerateResult | undefined> {
    const config = await loadConfig(cwd, log)
    const generator = new Generator(cwd, config, log)
    builtinBlueprints(config.framework).forEach((b) => generator.register(b))

    if (!blueprint) {
      if (options.json) {
        process.stdout.write(
          `${JSON.stringify({ ok: true, blueprints: generator.list().map((b) => ({ name: b.name, description: b.description })) })}\n`,
        )
        return undefined
      }
      logger.info('Available blueprints:')
      for (const b of generator.list()) {
        logger.info(`  ${pc.cyan(b.name.padEnd(12))} ${b.description}`)
      }
      return undefined
    }

    if (!name) {
      return emitError(`Usage: nestor generate ${blueprint} <name>`)
    }

    const written = await generator.generate(blueprint, name, { overwrite: options.overwrite })

    const isNestModule =
      blueprint === 'nest-module' || (blueprint === 'module' && config.framework === 'node')

    const Pascal = toPascalCase(name)
    const kebab = toKebabCase(name)
    const registered: RegistrationAction[] = []
    const nextSteps: NextStep[] = []

    if (isNestModule) {
      if (options.register) {
        registered.push(...(await registerNestModule(cwd, name)))
      } else {
        nextSteps.push(
          {
            type: 'register-module',
            description: `Add ${Pascal}Module to the imports array in src/app.module.ts`,
            module: `${Pascal}Module`,
            file: 'src/app.module.ts',
          },
          {
            type: 'register-entity',
            description: `Add ${Pascal} entity to the entities array in src/database/entities.ts`,
            entity: Pascal,
            file: 'src/database/entities.ts',
          },
        )
      }
      nextSteps.push({
        type: 'seed-permissions',
        description: `Seed ${kebab}:read / ${kebab}:write permissions if you use the permission guards`,
        permissions: [`${kebab}:read`, `${kebab}:write`],
      })
    }

    const result: GenerateResult = { ok: true, blueprint, name, written, registered, nextSteps }

    if (options.json) {
      process.stdout.write(`${JSON.stringify(result)}\n`)
      return result
    }

    logger.success(`Generated ${written.length} file(s):`)
    written.forEach((f) => logger.info(`  ${f}`))

    for (const action of registered) {
      const label =
        action.status === 'done'
          ? pc.green('wired')
          : action.status === 'already'
            ? pc.dim('already wired')
            : pc.yellow('skipped')
      logger.info(`  ${label} ${action.file}${action.detail ? ` (${action.detail})` : ''}`)
    }

    if (nextSteps.length > 0) {
      logger.info('')
      logger.info(pc.yellow('Next steps:'))
      nextSteps.forEach((step, i) => logger.info(`  ${i + 1}. ${step.description}`))
    }

    return result
  }
}
