import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  Blueprint,
  Framework,
  GeneratedFile,
  Logger,
  ResolvedNestorConfig,
  TemplateVariables,
} from './types.js'
import { nestModuleBlueprint } from './blueprints/nest-module.js'
import { silentLogger } from './logger.js'
import { pathExists } from './template.js'
import { toCamelCase, toKebabCase, toPascalCase } from './utils.js'

/** Naive pluralisation good enough for resource/table names (user -> users, category -> categories). */
function pluralize(word: string): string {
  if (/(s|x|z|ch|sh)$/.test(word)) return `${word}es`
  if (/[^aeiou]y$/.test(word)) return `${word.slice(0, -1)}ies`
  return `${word}s`
}

/** Build the standard name variables exposed to every blueprint. */
export function buildNameVariables(entityName: string): TemplateVariables {
  const kebab = toKebabCase(entityName)
  const snake = kebab.replace(/-/g, '_')
  return {
    name: entityName,
    Name: toPascalCase(entityName),
    pascalName: toPascalCase(entityName),
    camelName: toCamelCase(entityName),
    kebabName: kebab,
    snakeName: snake,
    /** kebab-cased plural, used for REST route paths (e.g. `users`). */
    pluralKebab: pluralize(kebab),
    /** snake_cased plural, used for DB table names (e.g. `users`). */
    tableName: pluralize(snake),
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

/**
 * The blueprints that ship with Nestor out of the box.
 *
 * `module` is framework-aware: in a backend project (`framework: 'node'`) it
 * scaffolds a full NestJS feature module; otherwise it scaffolds a frontend
 * feature module. The backend variant is also always available explicitly as
 * `nest-module`, and the frontend variant as `web-module`, so either can be
 * used regardless of the configured framework.
 */
export function builtinBlueprints(framework: Framework = 'web'): Blueprint[] {
  const webModule: Blueprint = {
    name: 'web-module',
    description: 'A frontend feature module (state + service + barrel)',
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
  }

  const nestModule = nestModuleBlueprint(
    'nest-module',
    'A NestJS backend feature module (entity + service + REST controller + DTOs)',
  )

  // `module` resolves to the variant matching the project's framework.
  const moduleAlias: Blueprint =
    framework === 'node'
      ? nestModuleBlueprint('module', nestModule.description)
      : { ...webModule, name: 'module' }

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
      name: 'screen',
      description: 'A React Native screen (Expo)',
      targetDir: 'src/screens',
      files: (_name, v) => [
        {
          path: `${v.pascalName}Screen.tsx`,
          contents: `import { StyleSheet, Text, View } from 'react-native'\n\nexport function ${v.pascalName}Screen() {\n  return (\n    <View style={styles.container}>\n      <Text style={styles.title}>${v.pascalName}</Text>\n    </View>\n  )\n}\n\nconst styles = StyleSheet.create({\n  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },\n  title: { fontSize: 22, fontWeight: '700' },\n})\n`,
        },
      ],
    },
    moduleAlias,
    webModule,
    nestModule,
  ]
}
