import { describe, expect, it } from 'vitest'
import { isValidProjectName, toCamelCase, toKebabCase, toPascalCase } from '../src/utils.js'

describe('case helpers', () => {
  it('converts to kebab-case', () => {
    expect(toKebabCase('My App Name')).toBe('my-app-name')
    expect(toKebabCase('MyAppName')).toBe('my-app-name')
    expect(toKebabCase('my_app__name')).toBe('my-app-name')
  })

  it('converts to PascalCase', () => {
    expect(toPascalCase('my-app name')).toBe('MyAppName')
    expect(toPascalCase('user_profile')).toBe('UserProfile')
  })

  it('converts to camelCase', () => {
    expect(toCamelCase('my-app name')).toBe('myAppName')
    expect(toCamelCase('User Profile')).toBe('userProfile')
  })
})

describe('isValidProjectName', () => {
  it('accepts npm-safe names', () => {
    expect(isValidProjectName('my-app')).toBe(true)
    expect(isValidProjectName('app123')).toBe(true)
  })

  it('rejects invalid names', () => {
    expect(isValidProjectName('My App')).toBe(false)
    expect(isValidProjectName('-bad')).toBe(false)
    expect(isValidProjectName('UPPER')).toBe(false)
  })
})
