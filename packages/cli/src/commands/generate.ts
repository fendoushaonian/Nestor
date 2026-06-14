import pc from 'picocolors'
import { Generator, builtinBlueprints, toKebabCase, toPascalCase, type Logger } from '@nestor/core'
import { loadConfig } from '../config-loader.js'

export interface GenerateOptions {
  overwrite?: boolean
}

/** `nestor generate <blueprint> <name>` — scaffold code from a blueprint. */
export async function generateCommand(
  blueprint: string | undefined,
  name: string | undefined,
  options: GenerateOptions,
  logger: Logger,
): Promise<void> {
  const cwd = process.cwd()
  const config = await loadConfig(cwd, logger)
  const generator = new Generator(cwd, config, logger)
  builtinBlueprints(config.framework).forEach((b) => generator.register(b))

  if (!blueprint) {
    logger.info('Available blueprints:')
    for (const b of generator.list()) {
      logger.info(`  ${pc.cyan(b.name.padEnd(12))} ${b.description}`)
    }
    return
  }

  if (!name) {
    throw new Error(`Usage: nestor generate ${blueprint} <name>`)
  }

  const written = await generator.generate(blueprint, name, { overwrite: options.overwrite })
  logger.success(`Generated ${written.length} file(s):`)
  written.forEach((f) => logger.info(`  ${f}`))

  // Backend modules need wiring into the Nest app; remind the user of the manual steps.
  const isNestModule =
    blueprint === 'nest-module' || (blueprint === 'module' && config.framework === 'node')
  if (isNestModule) {
    const Pascal = toPascalCase(name)
    logger.info('')
    logger.info(pc.yellow('Next steps — register the module:'))
    logger.info(`  1. Add ${pc.cyan(`${Pascal}Module`)} to the imports array in app.module.ts`)
    logger.info(`  2. Add ${pc.cyan(Pascal)} entity to src/database/entities.ts`)
    logger.info(
      `  3. Seed ${pc.cyan(`${toKebabCase(name)}:read`)} / ${pc.cyan(`${toKebabCase(name)}:write`)} permissions if you use the permission guards`,
    )
  }
}
