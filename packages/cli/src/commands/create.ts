import path from 'node:path'
import prompts from 'prompts'
import pc from 'picocolors'
import { isNonEmptyDir, isValidProjectName, renderTemplate, type Logger } from '@nestor/core'
import { listTemplates, resolveTemplateDir } from '../paths.js'

export interface CreateOptions {
  template?: string
  overwrite?: boolean
}

/** `nestor create <name>` — scaffold a new project from a template. */
export async function createCommand(
  nameArg: string | undefined,
  options: CreateOptions,
  logger: Logger,
): Promise<void> {
  const templates = await listTemplates()

  const answers = await prompts(
    [
      {
        type: nameArg ? null : 'text',
        name: 'name',
        message: 'Project name',
        initial: 'my-app',
        validate: (v: string) =>
          isValidProjectName(v) || 'Use a lowercase, npm-safe name (a-z, 0-9, -)',
      },
      {
        type: options.template ? null : 'select',
        name: 'template',
        message: 'Pick a template',
        choices: templates.map((t) => ({ title: t, value: t })),
        initial: 0,
      },
    ],
    { onCancel: () => process.exit(1) },
  )

  const name = nameArg ?? (answers.name as string)
  const template = options.template ?? (answers.template as string)

  if (!isValidProjectName(name)) {
    throw new Error(`Invalid project name "${name}". Use a lowercase, npm-safe name.`)
  }

  const targetDir = path.resolve(process.cwd(), name)
  if ((await isNonEmptyDir(targetDir)) && !options.overwrite) {
    throw new Error(`Directory "${name}" already exists and is not empty. Use --overwrite.`)
  }

  const templateDir = await resolveTemplateDir(template)
  logger.info(`Creating ${pc.cyan(name)} from template ${pc.cyan(template)}...`)

  const { written } = await renderTemplate({
    templateDir,
    targetDir,
    overwrite: options.overwrite,
    variables: {
      name,
      pascalName: name.replace(/(^|-)(\w)/g, (_m, _s, c: string) => c.toUpperCase()),
    },
    logger,
  })

  logger.success(`Created ${written.length} files in ${pc.cyan(name)}/`)
  printNextSteps(name, logger)
}

function printNextSteps(name: string, logger: Logger): void {
  logger.info('')
  logger.info('Next steps:')
  logger.info(`  cd ${name}`)
  logger.info('  npm install')
  logger.info('  npx nestor dev')
}
