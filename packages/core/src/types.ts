/**
 * Shared type definitions for the Nestor engine.
 */

/** Supported target frameworks a Nestor project can be built for. */
export type Framework = 'web' | 'node' | 'react-native' | 'flutter' | 'miniprogram'

/** Variables made available to template files during rendering. */
export type TemplateVariables = Record<string, string>

/** A single blueprint understood by the generator (e.g. "page", "component"). */
export interface Blueprint {
  /** Unique blueprint name, used as `nestor generate <name>`. */
  name: string
  /** Human readable description shown in help output. */
  description: string
  /** Directory (relative to project root) where generated files are written. */
  targetDir: string
  /** Produces the files for a given entity name. */
  files: (entityName: string, vars: TemplateVariables) => GeneratedFile[]
}

/** A file produced by a blueprint. */
export interface GeneratedFile {
  /** Path relative to the blueprint `targetDir`. */
  path: string
  /** File contents. */
  contents: string
}

/** Context handed to a plugin's `apply` hook. */
export interface PluginContext {
  /** Absolute path to the project root. */
  projectRoot: string
  /** The resolved project configuration. */
  config: ResolvedNestorConfig
  /** Register an additional blueprint with the generator. */
  registerBlueprint: (blueprint: Blueprint) => void
  /** Queue an npm dependency to be added to the project. */
  addDependency: (name: string, version?: string, dev?: boolean) => void
  /** Queue a file to be written into the project (path relative to root). */
  addFile: (path: string, contents: string) => void
  /** Structured logger. */
  logger: Logger
}

/** A Nestor plugin definition. */
export interface NestorPlugin {
  /** Unique plugin name, used as `nestor add <name>`. */
  name: string
  /** Optional short description. */
  description?: string
  /** Called when the plugin is applied to a project. */
  apply: (ctx: PluginContext) => void | Promise<void>
}

/** Per-generator overrides in user config. */
export interface GeneratorConfig {
  /** Override the output directory for a blueprint. */
  dir?: string
}

/** User-facing configuration accepted by `defineConfig`. */
export interface NestorConfig {
  /** Target framework. Defaults to `web`. */
  framework?: Framework
  /** Plugins to apply, by name. */
  plugins?: string[]
  /** Per-blueprint generator overrides. */
  generators?: Record<string, GeneratorConfig>
  /** Arbitrary extra options passed through to plugins/templates. */
  options?: TemplateVariables
}

/** Fully resolved configuration with defaults applied. */
export interface ResolvedNestorConfig {
  framework: Framework
  plugins: string[]
  generators: Record<string, GeneratorConfig>
  options: TemplateVariables
}

/** Minimal logger interface used across the engine. */
export interface Logger {
  info: (msg: string) => void
  success: (msg: string) => void
  warn: (msg: string) => void
  error: (msg: string) => void
  debug: (msg: string) => void
}
