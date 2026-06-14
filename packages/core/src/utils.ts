/** String + filesystem helpers shared across the engine. */

/** `my app name` / `MyApp` -> `my-app-name`. */
export function toKebabCase(input: string): string {
  return input
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

/** `my-app name` -> `MyAppName`. */
export function toPascalCase(input: string): string {
  return toKebabCase(input)
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join('')
}

/** `my-app name` -> `myAppName`. */
export function toCamelCase(input: string): string {
  const pascal = toPascalCase(input)
  return pascal.charAt(0).toLowerCase() + pascal.slice(1)
}

/** Validate a project / package name (npm-safe, lowercase). */
export function isValidProjectName(name: string): boolean {
  return /^[a-z0-9]([a-z0-9-._]*[a-z0-9])?$/.test(name)
}
