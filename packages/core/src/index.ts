/**
 * @nestor/core — the engine powering the Nestor app scaffolding framework.
 *
 * Three subsystems are exported here:
 *  - template rendering (`renderTemplate`, `renderString`)
 *  - code generation (`Generator`, `builtinBlueprints`)
 *  - plugins (`PluginLoader`, `definePlugin`)
 * plus the configuration helpers (`defineConfig`, `resolveConfig`).
 */

export const version = '0.1.0'

export * from './types.js'
export { createLogger, silentLogger } from './logger.js'
export { defineConfig, resolveConfig, defaultConfig } from './config.js'
export {
  renderString,
  renderTemplate,
  pathExists,
  isNonEmptyDir,
  type RenderTemplateOptions,
  type RenderTemplateResult,
} from './template.js'
export { Generator, builtinBlueprints, buildNameVariables } from './generator.js'
export {
  PluginLoader,
  definePlugin,
  type ApplyPluginsResult,
  type QueuedDependency,
} from './plugin.js'
export { toKebabCase, toPascalCase, toCamelCase, isValidProjectName } from './utils.js'
