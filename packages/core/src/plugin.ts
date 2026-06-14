import { promises as fs } from 'node:fs'
import path from 'node:path'
import type {
  Blueprint,
  Logger,
  NestorPlugin,
  PluginContext,
  ResolvedNestorConfig,
} from './types.js'
import { silentLogger } from './logger.js'
import { Generator } from './generator.js'

/** Identity helper giving plugin authors type-checking. */
export function definePlugin(plugin: NestorPlugin): NestorPlugin {
  return plugin
}

export interface QueuedDependency {
  name: string
  version: string
  dev: boolean
}

export interface ApplyPluginsResult {
  /** Dependencies queued by plugins. */
  dependencies: QueuedDependency[]
  /** Files queued by plugins (path relative to project root -> contents). */
  files: Map<string, string>
  /** Blueprints contributed by plugins. */
  blueprints: Blueprint[]
}

/**
 * Applies a set of plugins against a project, collecting the side effects
 * (dependencies, files, blueprints) they request. The caller decides how to
 * persist those effects, which keeps this loader pure and testable.
 */
export class PluginLoader {
  constructor(
    private readonly projectRoot: string,
    private readonly config: ResolvedNestorConfig,
    private readonly logger: Logger = silentLogger,
  ) {}

  async apply(plugins: NestorPlugin[]): Promise<ApplyPluginsResult> {
    const dependencies: QueuedDependency[] = []
    const files = new Map<string, string>()
    const generator = new Generator(this.projectRoot, this.config, this.logger)

    const ctx: PluginContext = {
      projectRoot: this.projectRoot,
      config: this.config,
      logger: this.logger,
      registerBlueprint: (blueprint) => generator.register(blueprint),
      addDependency: (name, version = 'latest', dev = false) => {
        dependencies.push({ name, version, dev })
      },
      addFile: (filePath, contents) => {
        files.set(filePath, contents)
      },
    }

    for (const plugin of plugins) {
      this.logger.debug(`applying plugin: ${plugin.name}`)
      await plugin.apply(ctx)
    }

    return { dependencies, files, blueprints: generator.list() }
  }

  /** Write queued files to disk relative to the project root. */
  async writeFiles(files: Map<string, string>, overwrite = false): Promise<string[]> {
    const written: string[] = []
    for (const [relPath, contents] of files) {
      const destPath = path.resolve(this.projectRoot, relPath)
      if (!overwrite) {
        try {
          await fs.access(destPath)
          throw new Error(`Refusing to overwrite existing file: ${destPath}`)
        } catch (err) {
          if (err instanceof Error && err.message.startsWith('Refusing')) throw err
        }
      }
      await fs.mkdir(path.dirname(destPath), { recursive: true })
      await fs.writeFile(destPath, contents, 'utf8')
      written.push(relPath)
    }
    return written
  }
}
