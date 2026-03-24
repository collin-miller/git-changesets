const js = require('@eslint/js');
const { FlatCompat } = require('@eslint/eslintrc');
const typescriptEslint = require('@typescript-eslint/eslint-plugin');
const typescriptParser = require('@typescript-eslint/parser');
const importPlugin = require('eslint-plugin-import');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');

const compat = new FlatCompat({
    baseDirectory: __dirname,
    recommendedConfig: js.configs.recommended,
});

module.exports = [
    ...compat.extends('airbnb-base', 'eslint-config-prettier', 'plugin:prettier/recommended'),
    {
        files: ['**/*.ts'],
        languageOptions: {
            parser: typescriptParser,
            parserOptions: {
                ecmaVersion: 12,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': typescriptEslint,
        },
        rules: {
            // note you must disable the base rule as it can report incorrect errors
            'no-shadow': 'off',
            '@typescript-eslint/no-shadow': ['error'],
            // note you must disable the base rule as it can report incorrect errors
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['error'],
            'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
            'import/extensions': [
                'error',
                'ignorePackages',
                {
                    js: 'never',
                    jsx: 'never',
                    ts: 'never',
                    tsx: 'never',
                },
            ],
        },
        settings: {
            'import/resolver': {
                typescript: {}, // this loads <rootdir>/tsconfig.json to eslint
            },
        },
        ignores: ['.github/**', 'node_modules/**', 'dist/**', 'lib/**'],
    },
];
