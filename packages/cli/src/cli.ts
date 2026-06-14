import { Command } from 'commander'
import { createLogger, version, type Logger } from '@nestor/core'
import { createCommand } from './commands/create.js'
import { generateCommand } from './commands/generate.js'
import { addCommand } from './commands/add.js'
import { runScriptCommand } from './commands/run-script.js'

/** Build the Nestor CLI program. Exported for testing. */
export function buildProgram(logger: Logger = createLogger()): Command {
  const program = new Command()

  program
    .name('nestor')
    .description('Nestor — scaffolding framework for rapid APP development')
    .version(version, '-v, --version')

  program
    .command('create')
    .argument('[name]', 'project name')
    .option('-t, --template <template>', 'template to use')
    .option('--overwrite', 'overwrite an existing directory', false)
    .description('scaffold a new project')
    .action((name, opts) => createCommand(name, opts, logger))

  program
    .command('generate')
    .alias('g')
    .argument('[blueprint]', 'blueprint name (component, page, screen, module, nest-module, web-module)')
    .argument('[name]', 'entity name')
    .option('--overwrite', 'overwrite existing files', false)
    .option('--json', 'emit a machine-readable JSON result (for tools / AI agents)', false)
    .option('--register', 'auto-wire a backend module into app.module.ts + entities.ts', false)
    .description('generate code from a blueprint')
    .action(async (blueprint, name, opts) => {
      await generateCommand(blueprint, name, opts, logger)
    })

  program
    .command('add')
    .argument('[plugins...]', 'plugin names to add')
    .option('--overwrite', 'overwrite existing files', false)
    .description('add a capability/plugin to the current project')
    .action((plugins, opts) => addCommand(plugins, opts, logger))

  program
    .command('dev')
    .description("run the project's dev script")
    .action(() => runScriptCommand('dev', logger))

  program
    .command('build')
    .description("run the project's build script")
    .action(() => runScriptCommand('build', logger))

  return program
}

/** Parse argv and run, turning thrown errors into clean CLI output. */
export async function run(
  argv: string[] = process.argv,
  logger: Logger = createLogger(),
): Promise<void> {
  const program = buildProgram(logger)
  try {
    await program.parseAsync(argv)
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err))
    process.exitCode = 1
  }
}
