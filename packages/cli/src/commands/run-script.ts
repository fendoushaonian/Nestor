import { spawn } from 'node:child_process'
import type { Logger } from '@nestor/core'
import { readPackageJson } from '../package-json.js'

/** Detect the package manager from the lockfile / npm_config_user_agent. */
function detectPackageManager(ua = process.env.npm_config_user_agent ?? ''): string {
  if (ua.startsWith('pnpm')) return 'pnpm'
  if (ua.startsWith('yarn')) return 'yarn'
  if (ua.startsWith('bun')) return 'bun'
  return 'npm'
}

/**
 * `nestor dev` / `nestor build` — thin wrappers that run the matching script
 * from the project's package.json using the detected package manager.
 */
export async function runScriptCommand(script: string, logger: Logger): Promise<void> {
  const cwd = process.cwd()
  const pkg = await readPackageJson(cwd)

  if (!pkg) {
    throw new Error('No package.json found in the current directory.')
  }
  if (!pkg.scripts?.[script]) {
    throw new Error(
      `No "${script}" script found in package.json. Available: ${
        Object.keys(pkg.scripts ?? {}).join(', ') || '(none)'
      }`,
    )
  }

  const pm = detectPackageManager()
  logger.info(`Running "${script}" with ${pm}...`)

  await new Promise<void>((resolve, reject) => {
    const child = spawn(pm, ['run', script], {
      cwd,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    })
    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`"${script}" exited with code ${code}`))
    })
  })
}

export { detectPackageManager }
