const js = require('@eslint/js');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
    js.configs.recommended,
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 12,
                sourceType: 'module',
            },
            globals: {
                Buffer: 'readonly',
                console: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
        },
        rules: {
            // TypeScript ESLint recommended rules
            ...typescriptEslint.configs.recommended.rules,
            'no-shadow': 'off',
            '@typescript-eslint/no-shadow': ['error'],
            // note you must disable the base rule as it can report incorrect errors
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error'],
        },
        settings: {},
        ignores: ['.github/**', 'node_modules/**', 'dist/**', 'lib/**'],
    },
];
