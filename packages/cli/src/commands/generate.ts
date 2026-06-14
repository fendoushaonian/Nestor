import pc from 'picocolors'
import { Generator, builtinBlueprints, type Logger } from '@nestor/core'
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
  builtinBlueprints().forEach((b) => generator.register(b))

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
}
