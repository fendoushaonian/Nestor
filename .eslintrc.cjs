/* eslint-env node */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: { jsx: true },
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'eslint-config-prettier',
  ],
  env: {
    node: true,
    browser: true,
    es2022: true,
  },
  ignorePatterns: [
    'dist/',
    'build/',
    'node_modules/',
    'templates/',
    'coverage/',
    '**/migrations/*.ts',
    '*.config.ts',
    '*.config.js',
    '*.config.mjs',
    '.eslintrc.cjs',
  ],
  rules: {
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    'no-console': 'off',
  },
  overrides: [
    {
      // The scaffold packages hold a stricter bar than the NestJS backend.
      files: ['packages/core/**/*.ts', 'packages/cli/**/*.ts'],
      rules: {
        '@typescript-eslint/no-explicit-any': 'error',
      },
    },
  ],
};
