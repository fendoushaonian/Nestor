import type { NestorConfig, ResolvedNestorConfig } from './types.js'

/** Default configuration applied when fields are omitted. */
export const defaultConfig: ResolvedNestorConfig = {
  framework: 'web',
  plugins: [],
  generators: {},
  options: {},
}

/**
 * Identity helper that gives users type-checking and editor autocomplete in
 * their `nestor.config.ts`. Mirrors the `defineConfig` pattern from Vite et al.
 */
export function defineConfig(config: NestorConfig): NestorConfig {
  return config
}

/** Merge a (possibly partial) user config with defaults. */
export function resolveConfig(config: NestorConfig = {}): ResolvedNestorConfig {
  return {
    framework: config.framework ?? defaultConfig.framework,
    plugins: config.plugins ?? [],
    generators: { ...defaultConfig.generators, ...config.generators },
    options: { ...defaultConfig.options, ...config.options },
  }
}
