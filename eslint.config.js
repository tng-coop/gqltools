import js from "@eslint/js";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettier from "eslint-config-prettier";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const tsconfigRootDir = dirname(__filename);

export default [
  {
    ignores: ["dist/", "node_modules/"], // Add ignores to globally ignore these directories
  },
  {
    files: ["**/*.ts"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: tsParser,
      parserOptions: {
        project: [
          "./tsconfig.json",
          "./playwright/tsconfig.json",
          "./graphql-ts-example/tsconfig.json",
        ],
        tsconfigRootDir,
      },
      globals: {
        process: "readonly",
        console: "readonly", // Define console as a global variable
        setInterval: "readonly", // Define setInterval as a global variable
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...tsPlugin.configs["recommended-requiring-type-checking"].rules,
      ...tsPlugin.configs.strict.rules,
      ...tsPlugin.configs.stylistic.rules,
    },
  },
  {
    // Specific configuration for the preload.ts file
    files: ["src/preload.ts"],
    rules: {
      "@typescript-eslint/no-require-imports": "off", // Allow require() in preload.ts
      "@typescript-eslint/no-var-requires": "off", // Allow var requires if needed
    },
  },
  prettier, // Disable ESLint rules that conflict with Prettier
];
