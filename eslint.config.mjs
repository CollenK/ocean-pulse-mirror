import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      // Complexity rules for quality measurement
      'complexity': ['warn', 15],
      'max-depth': ['warn', 4],
      'max-lines': ['warn', 600],
      'max-lines-per-function': ['warn', 120],
      'max-params': ['warn', 5],
      // Relax rules that conflict with Next.js / React patterns
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
      'no-unused-vars': 'off',
    },
  },
  {
    ignores: [
      'node_modules/',
      '.next/',
      '.quality/',
      'public/',
      'scripts/',
      '*.config.*',
      'sentry.*',
      'next-env.d.ts',
      'instrumentation.*',
    ],
  },
);
