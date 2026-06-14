import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { QueuedDependency } from '@nestor/core'

interface PackageJson {
  name?: string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  [key: string]: unknown
}

/** Read a project's package.json, or `null` when absent. */
export async function readPackageJson(cwd: string): Promise<PackageJson | null> {
  const file = path.join(cwd, 'package.json')
  try {
    return JSON.parse(await fs.readFile(file, 'utf8')) as PackageJson
  } catch {
    return null
  }
}

/** Merge queued dependencies into a project's package.json (sorted). */
export async function mergeDependencies(cwd: string, deps: QueuedDependency[]): Promise<string[]> {
  if (deps.length === 0) return []
  const file = path.join(cwd, 'package.json')
  const pkg = (await readPackageJson(cwd)) ?? {}

  const added: string[] = []
  for (const dep of deps) {
    const bucket = dep.dev ? 'devDependencies' : 'dependencies'
    pkg[bucket] = pkg[bucket] ?? {}
    const target = pkg[bucket] as Record<string, string>
    if (target[dep.name] !== dep.version) {
      target[dep.name] = dep.version
      added.push(`${dep.name}@${dep.version}`)
    }
  }

  if (pkg.dependencies) pkg.dependencies = sortKeys(pkg.dependencies)
  if (pkg.devDependencies) pkg.devDependencies = sortKeys(pkg.devDependencies)

  await fs.writeFile(file, JSON.stringify(pkg, null, 2) + '\n', 'utf8')
  return added
}

function sortKeys(obj: Record<string, string>): Record<string, string> {
  return Object.fromEntries(Object.entries(obj).sort(([a], [b]) => a.localeCompare(b)))
}
