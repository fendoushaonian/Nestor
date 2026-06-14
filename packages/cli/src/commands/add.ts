import pc from 'picocolors'
import { PluginLoader, type Logger } from '@nestor/core'
import { loadConfig } from '../config-loader.js'
import { builtinPlugins, listBuiltinPlugins } from '../builtin-plugins.js'
import { mergeDependencies } from '../package-json.js'

export interface AddOptions {
  overwrite?: boolean
}

/** `nestor add <plugin...>` — apply one or more plugins to the current project. */
export async function addCommand(
  pluginNames: string[],
  options: AddOptions,
  logger: Logger,
): Promise<void> {
  if (pluginNames.length === 0) {
    logger.info('Available plugins:')
    for (const name of listBuiltinPlugins()) {
      logger.info(`  ${pc.cyan(name.padEnd(10))} ${builtinPlugins[name].description ?? ''}`)
    }
    return
  }

  const unknown = pluginNames.filter((n) => !builtinPlugins[n])
  if (unknown.length > 0) {
    throw new Error(
      `Unknown plugin(s): ${unknown.join(', ')}. Available: ${listBuiltinPlugins().join(', ')}`,
    )
  }

  const cwd = process.cwd()
  const config = await loadConfig(cwd, logger)
  const loader = new PluginLoader(cwd, config, logger)

  const plugins = pluginNames.map((n) => builtinPlugins[n])
  const result = await loader.apply(plugins)

  const writtenFiles = await loader.writeFiles(result.files, options.overwrite)
  const addedDeps = await mergeDependencies(cwd, result.dependencies)

  logger.success(`Applied ${plugins.length} plugin(s).`)
  if (writtenFiles.length > 0) {
    logger.info('Files:')
    writtenFiles.forEach((f) => logger.info(`  ${f}`))
  }
  if (addedDeps.length > 0) {
    logger.info('Dependencies added to package.json:')
    addedDeps.forEach((d) => logger.info(`  ${d}`))
    logger.info('Run your package manager install to fetch them (e.g. `npm install`).')
  }
}
