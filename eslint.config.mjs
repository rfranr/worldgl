import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      complexity: ['error', { max: 10 }],
      'max-depth': ['error', 3],
      'max-params': ['error', 4],
      'max-lines-per-function': ['error', {
        max: 60,
        skipBlankLines: true,
        skipComments: true,
      }],
    },
  },
);