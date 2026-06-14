import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { Logger, TemplateVariables } from './types.js'
import { silentLogger } from './logger.js'

/** Files/dirs never copied from a template. */
const DEFAULT_IGNORES = ['node_modules', 'dist', '.git', '.tsbuildinfo']

/** Filenames are un-prefixed on output so they survive being in an npm package. */
const FILE_NAME_REWRITES: Record<string, string> = {
  _gitignore: '.gitignore',
  _npmrc: '.npmrc',
  _env: '.env',
}

const INTERPOLATION = /\{\{\s*([\w.]+)\s*\}\}/g

/**
 * Replace every `{{ key }}` occurrence in `input` with `vars[key]`.
 * Unknown keys are left untouched so partial rendering is safe.
 */
export function renderString(input: string, vars: TemplateVariables): string {
  return input.replace(INTERPOLATION, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : match
  })
}

/** Apply filename rewrites and `{{var}}` interpolation to a single path segment. */
function rewriteSegment(segment: string, vars: TemplateVariables): string {
  const rewritten = FILE_NAME_REWRITES[segment] ?? segment
  return renderString(rewritten, vars)
}

export interface RenderTemplateOptions {
  /** Absolute path to the template source directory. */
  templateDir: string
  /** Absolute path to the destination directory. */
  targetDir: string
  /** Variables interpolated into file names and contents. */
  variables?: TemplateVariables
  /** Extra file/dir names to skip (merged with sensible defaults). */
  ignore?: string[]
  /** Overwrite existing files instead of throwing. Defaults to false. */
  overwrite?: boolean
  logger?: Logger
}

export interface RenderTemplateResult {
  /** Destination paths (relative to `targetDir`) that were written. */
  written: string[]
}

/**
 * Recursively copy a template directory into a target directory, interpolating
 * `{{var}}` placeholders in both file names and file contents.
 */
export async function renderTemplate(
  options: RenderTemplateOptions,
): Promise<RenderTemplateResult> {
  const {
    templateDir,
    targetDir,
    variables = {},
    ignore = [],
    overwrite = false,
    logger = silentLogger,
  } = options

  const ignores = new Set([...DEFAULT_IGNORES, ...ignore])
  const written: string[] = []

  async function walk(srcDir: string, destDir: string): Promise<void> {
    const entries = await fs.readdir(srcDir, { withFileTypes: true })
    await fs.mkdir(destDir, { recursive: true })

    for (const entry of entries) {
      if (ignores.has(entry.name)) {
        logger.debug(`skip ignored: ${entry.name}`)
        continue
      }

      const srcPath = path.join(srcDir, entry.name)
      const destName = rewriteSegment(entry.name, variables)
      const destPath = path.join(destDir, destName)

      if (entry.isDirectory()) {
        await walk(srcPath, destPath)
        continue
      }

      if (!overwrite && (await pathExists(destPath))) {
        throw new Error(`Refusing to overwrite existing file: ${destPath}`)
      }

      const raw = await fs.readFile(srcPath, 'utf8')
      const rendered = renderString(raw, variables)
      await fs.writeFile(destPath, rendered, 'utf8')
      written.push(path.relative(targetDir, destPath))
      logger.debug(`wrote: ${destPath}`)
    }
  }

  await walk(templateDir, targetDir)
  return { written }
}

/** True when a path exists on disk. */
export async function pathExists(p: string): Promise<boolean> {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

/** True when a directory exists and contains at least one entry. */
export async function isNonEmptyDir(p: string): Promise<boolean> {
  try {
    const entries = await fs.readdir(p)
    return entries.length > 0
  } catch {
    return false
  }
}
