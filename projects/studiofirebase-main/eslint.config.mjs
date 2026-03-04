// eslint.config.mjs
import pluginJs from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import nextPlugin from "@next/eslint-plugin-next";

const sharedGlobals = {
  window: "readonly",
  document: "readonly",
  navigator: "readonly",
  location: "readonly",
  localStorage: "readonly",
  sessionStorage: "readonly",
  fetch: "readonly",
  console: "readonly",
  alert: "readonly",
  setTimeout: "readonly",
  clearTimeout: "readonly",
  setInterval: "readonly",
  clearInterval: "readonly",
  requestAnimationFrame: "readonly",
  cancelAnimationFrame: "readonly",
  process: "readonly",
  Buffer: "readonly",
  require: "readonly",
  btoa: "readonly",
};

export default [
  {
    ignores: [
      ".next/",
      "functions/",
      "scripts/",
      "sms-backend/",
      "**/dist/**",
      "**/*.min.js",
      "whatsapp-business-jaspers-market/**",
      "*.js",
      "!next.config.js",
      "!postcss.config.js",
      "!tailwind.config.js"
    ]
  },
  pluginJs.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: sharedGlobals
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "@next/next": nextPlugin,
      "react-hooks": reactHooksPlugin
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...nextPlugin.configs.recommended.rules,
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@typescript-eslint/no-unused-expressions": "off",
      "@typescript-eslint/use-unknown-in-catch-clause": "off",
      "@typescript-eslint/no-async-promise-executor": "warn",
      "react-hooks/exhaustive-deps": "off",
      "no-async-promise-executor": "warn",
      "no-empty": "off",
      "no-redeclare": "off",
      "no-unreachable": "off",
      "no-useless-escape": "off",
      "no-useless-catch": "off",
      "no-undef": "off",
      "prefer-promise-reject-errors": "off"
    }
  },
  {
    files: ["src/**/*.js"],
    languageOptions: {
      globals: sharedGlobals
    }
  },
  {
    files: ["src/**/*.d.ts", "src/types/**/*.ts"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off"
    }
  },
  {
    files: ["src/utils/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off"
    }
  }
];