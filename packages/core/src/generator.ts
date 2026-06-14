import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  Blueprint,
  GeneratedFile,
  Logger,
  ResolvedNestorConfig,
  TemplateVariables,
} from './types.js'
import { silentLogger } from './logger.js'
import { pathExists } from './template.js'
import { toCamelCase, toKebabCase, toPascalCase } from './utils.js'

/** Build the standard name variables exposed to every blueprint. */
export function buildNameVariables(entityName: string): TemplateVariables {
  return {
    name: entityName,
    Name: toPascalCase(entityName),
    pascalName: toPascalCase(entityName),
    camelName: toCamelCase(entityName),
    kebabName: toKebabCase(entityName),
  }
}

/** Registry + executor for code generation blueprints. */
export class Generator {
  private readonly blueprints = new Map<string, Blueprint>()

  constructor(
    private readonly projectRoot: string,
    private readonly config: ResolvedNestorConfig,
    private readonly logger: Logger = silentLogger,
  ) {}

  /** Register (or override) a blueprint by name. */
  register(blueprint: Blueprint): this {
    this.blueprints.set(blueprint.name, blueprint)
    return this
  }

  /** List the names of all registered blueprints. */
  list(): Blueprint[] {
    return [...this.blueprints.values()]
  }

  /** Look up a blueprint by name. */
  get(name: string): Blueprint | undefined {
    return this.blueprints.get(name)
  }

  /**
   * Generate files for `entityName` using the blueprint `blueprintName`.
   * Honours per-blueprint `dir` overrides from config.
   */
  async generate(
    blueprintName: string,
    entityName: string,
    options: { overwrite?: boolean } = {},
  ): Promise<string[]> {
    const blueprint = this.blueprints.get(blueprintName)
    if (!blueprint) {
      throw new Error(
        `Unknown blueprint "${blueprintName}". Available: ${
          this.list()
            .map((b) => b.name)
            .join(', ') || '(none)'
        }`,
      )
    }

    const vars = buildNameVariables(entityName)
    const overrideDir = this.config.generators[blueprintName]?.dir
    const baseDir = path.resolve(this.projectRoot, overrideDir ?? blueprint.targetDir)

    const files: GeneratedFile[] = blueprint.files(entityName, vars)
    const written: string[] = []

    for (const file of files) {
      const destPath = path.join(baseDir, file.path)
      if (!options.overwrite && (await pathExists(destPath))) {
        throw new Error(`Refusing to overwrite existing file: ${destPath}`)
      }
      await fs.mkdir(path.dirname(destPath), { recursive: true })
      await fs.writeFile(destPath, file.contents, 'utf8')
      written.push(path.relative(this.projectRoot, destPath))
      this.logger.debug(`generated: ${destPath}`)
    }

    return written
  }
}

/** The blueprints that ship with Nestor out of the box. */
export function builtinBlueprints(): Blueprint[] {
  return [
    {
      name: 'component',
      description: 'A reusable UI component',
      targetDir: 'src/components',
      files: (_name, v) => [
        {
          path: `${v.pascalName}/${v.pascalName}.tsx`,
          contents: `export interface ${v.pascalName}Props {\n  title?: string\n}\n\nexport function ${v.pascalName}({ title = '${v.pascalName}' }: ${v.pascalName}Props) {\n  return <div className="${v.kebabName}">{title}</div>\n}\n`,
        },
        {
          path: `${v.pascalName}/index.ts`,
          contents: `export * from './${v.pascalName}.js'\n`,
        },
      ],
    },
    {
      name: 'page',
      description: 'A route/page entry',
      targetDir: 'src/pages',
      files: (_name, v) => [
        {
          path: `${v.pascalName}Page.tsx`,
          contents: `export function ${v.pascalName}Page() {\n  return (\n    <main className="${v.kebabName}-page">\n      <h1>${v.pascalName}</h1>\n    </main>\n  )\n}\n`,
        },
      ],
    },
    {
      name: 'module',
      description: 'A feature module (state + service + barrel)',
      targetDir: 'src/modules',
      files: (_name, v) => [
        {
          path: `${v.kebabName}/${v.camelName}.service.ts`,
          contents: `export class ${v.pascalName}Service {\n  async list(): Promise<unknown[]> {\n    return []\n  }\n}\n`,
        },
        {
          path: `${v.kebabName}/index.ts`,
          contents: `export * from './${v.camelName}.service.js'\n`,
        },
      ],
    },
  ]
}
