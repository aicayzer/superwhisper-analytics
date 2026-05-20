import { defineConfig } from 'eslint/config'
import tseslint from '@electron-toolkit/eslint-config-ts'
import eslintConfigPrettier from '@electron-toolkit/eslint-config-prettier'
import eslintPluginReact from 'eslint-plugin-react'
import eslintPluginReactHooks from 'eslint-plugin-react-hooks'
import eslintPluginReactRefresh from 'eslint-plugin-react-refresh'

export default defineConfig(
  { ignores: ['**/node_modules', '**/dist', '**/out', '_tmp/**', '_local/**'] },
  tseslint.configs.recommended,
  eslintPluginReact.configs.flat.recommended,
  eslintPluginReact.configs.flat['jsx-runtime'],
  {
    settings: {
      react: {
        version: 'detect'
      }
    }
  },
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': eslintPluginReactHooks,
      'react-refresh': eslintPluginReactRefresh
    },
    rules: {
      ...eslintPluginReactHooks.configs.recommended.rules,
      ...eslintPluginReactRefresh.configs.vite.rules
    }
  },
  // Vendored shadcn primitives — keep as written, don't enforce our rules on them.
  {
    files: ['src/renderer/src/components/ui/**'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      'react-refresh/only-export-components': 'off',
      'react/prop-types': 'off'
    }
  },
  // Funnel every `sonner` consumer through `@renderer/lib/toast`. The
  // wrapper and the Toaster component are the only files allowed to
  // import sonner directly; everywhere else uses `toastError` /
  // `toastInfo` so behaviour stays centralised.
  {
    files: ['src/renderer/**/*.{ts,tsx}'],
    ignores: ['src/renderer/src/lib/toast.ts', 'src/renderer/src/components/ui/sonner.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'sonner',
              message:
                'Import `toastError` / `toastInfo` from `@renderer/lib/toast` instead — the wrapper is the only sonner consumer.'
            }
          ]
        }
      ]
    }
  },
  // Recharts wrappers — TS prop types are sufficient; the plugin can't see
  // them through Recharts' content-render-prop call signatures.
  {
    files: ['src/renderer/src/components/charts/**'],
    rules: {
      'react/prop-types': 'off'
    }
  },
  eslintConfigPrettier
)
