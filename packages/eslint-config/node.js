/**
 * Shared config for the Node services (the auction server and the email
 * worker). Deliberately narrow: these are small, long-running processes where
 * the failures that matter are unhandled promises and accidentally-any values,
 * not stylistic ones -- Prettier already handles formatting.
 */
/** @type {import("eslint").Linter.Config} */
module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  plugins: ['@typescript-eslint'],
  ignorePatterns: ['dist', 'node_modules', '*.config.ts'],
  rules: {
    // Underscore-prefixed arguments are an intentional "unused on purpose".
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    // `while (true)` is the read loop in the queue worker.
    'no-constant-condition': ['error', { checkLoops: false }],
  },
};
