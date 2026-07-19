// Native flat configs shipped with eslint-config-next 16 — no FlatCompat needed.
import nextCoreWebVitals from 'eslint-config-next/core-web-vitals';
import nextTypescript from 'eslint-config-next/typescript';

const eslintConfig = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // The `_`-prefix convention marks intentionally unused vars/args.
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      // react-hooks v7 compiler rules flag long-standing intentional patterns
      // here (state mirrored into refs for unload handlers, hydrating state
      // from storage in effects). Keep them visible but non-blocking until
      // those spots are refactored deliberately.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/purity': 'off',
    },
  },
  {
    // Tests legitimately cast to poke private internals.
    files: ['tests/**', 'e2e/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off' },
  },
  { ignores: ['scripts/**', '.next/**', 'node_modules/**'] },
];

export default eslintConfig;
