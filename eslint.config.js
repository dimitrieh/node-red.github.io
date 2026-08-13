// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import eslintPluginAstro from 'eslint-plugin-astro';
import eslintConfigPrettier from 'eslint-config-prettier';
import unocss from '@unocss/eslint-config/flat';

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  ...eslintPluginAstro.configs.recommended,
  unocss,
  eslintConfigPrettier,
  {
    // Vendored browser assets and generated survey charts are not ours to lint.
    // Minified code read as authored source is a wall of no-unused-expressions
    // and no-undef, and it used to account for nearly every error this config
    // reported, drowning out the findings that were about our own code.
    // Excluding it is what makes the remaining output actionable. Kept in step
    // with .prettierignore, which excludes the same paths for the same reason.
    ignores: [
      'dist/**',
      '.astro/**',
      'node_modules/**',
      '**/*.min.js',
      '**/survey/**',
      '_includes/**',
      'blog/**',
      'css/**',
      // Scratch files written by local tooling, not project source. Linting
      // them reported errors nobody can act on in files nobody edits.
      '.remember/**',
    ],
  },
  {
    // The build scripts and the Astro config run in Node, but the config
    // declared no environment, so every `process`, `console`, `URL` and timer
    // reference in them was reported as no-undef. That was 37 of the 75 errors
    // this config produced, all of them noise, and enough of it to bury the
    // findings that are about real problems.
    //
    // The identifiers are listed rather than pulled from the `globals` package.
    // `globals` is only present here as a transitive dependency of eslint, so
    // importing it would mean relying on a package this project never declared.
    // The list is short because the surface is five build scripts, and when one
    // of them reaches for something new the error names exactly what to add.
    files: ['**/*.mjs', 'astro.config.mjs', 'eslint.config.js'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
        URL: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
);
