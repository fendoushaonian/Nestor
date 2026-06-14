import type { Logger } from './types.js'

const PREFIX = '[nestor]'

/** A small dependency-free logger. Honours `NESTOR_DEBUG` for debug output. */
export function createLogger(debugEnabled = process.env.NESTOR_DEBUG === '1'): Logger {
  return {
    info: (msg) => console.log(`${PREFIX} ${msg}`),
    success: (msg) => console.log(`${PREFIX} ✓ ${msg}`),
    warn: (msg) => console.warn(`${PREFIX} ! ${msg}`),
    error: (msg) => console.error(`${PREFIX} ✗ ${msg}`),
    debug: (msg) => {
      if (debugEnabled) console.debug(`${PREFIX} · ${msg}`)
    },
  }
}

/** A logger that discards everything; handy in tests. */
export const silentLogger: Logger = {
  info: () => {},
  success: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
}
