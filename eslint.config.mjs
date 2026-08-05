import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"
import eslintConfigPrettier from "eslint-config-prettier/flat"
import simpleImportSort from "eslint-plugin-simple-import-sort"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Auto-sort and group imports/exports (applied via `eslint --fix`).
  {
    plugins: { "simple-import-sort": simpleImportSort },
    rules: {
      "simple-import-sort/imports": "error",
      "simple-import-sort/exports": "error",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  // Disable stylistic rules that conflict with Prettier. Keep LAST.
  eslintConfigPrettier,
])

export default eslintConfig
