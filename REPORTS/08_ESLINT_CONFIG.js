module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'prettier',
    'import',
  ],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'airbnb',
    'airbnb-typescript',
    'plugin:prettier/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
    project: './tsconfig.json',
  },
  settings: {
    react: {
      version: 'detect',
    },
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
    },
  },
  rules: {
    // === Prettier Integration ===
    'prettier/prettier': 'error',

    // === TypeScript Rules ===
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    '@typescript-eslint/no-explicit-any': 'warn', // Should be 'error' in the long run
    '@typescript-eslint/explicit-module-boundary-types': 'off', // Good practice, but can be enabled later

    // === React Rules ===
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+
    'react/jsx-filename-extension': [1, { extensions: ['.tsx'] }],
    'react/prop-types': 'off', // Handled by TypeScript
    'react/require-default-props': 'off', // Can be verbose with TypeScript

    // === React Hooks Rules ===
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // === Import Rules ===
    'import/prefer-default-export': 'off',
    'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
    'import/order': [
      'error',
      {
        groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index']],
        pathGroups: [
          {
            pattern: 'react',
            group: 'external',
            position: 'before',
          },
          {
            pattern: '@/**',
            group: 'internal',
          },
        ],
        pathGroupsExcludedImportTypes: ['react'],
        'newlines-between': 'always',
        alphabetize: {
          order: 'asc',
          caseInsensitive: true,
        },
      },
    ],

    // === General Code Quality Rules ===
    'no-console': ['warn', { allow: ['warn', 'error'] }], // Allow console.warn and .error
    'no-param-reassign': ['error', { props: false }], // Allow modifying properties of objects
    'no-plusplus': 'off',
    'consistent-return': 'off',
    'max-len': ['warn', { code: 120 }],

    // === Airbnb Overrides for Convenience ===
    'jsx-a11y/anchor-is-valid': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
  },
  env: {
    browser: true,
    es2021: true,
    jest: true,
  },
};
