import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import sonarjs from "eslint-plugin-sonarjs";

export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      sonarjs,
    },
    rules: {
      complexity: ["error", { max: 10 }],
      "sonarjs/cognitive-complexity": ["error", 5],
      "max-depth": ["error", 3],
      "max-params": ["error", 4],
    },
  },
  {
    files: ["experiments/pi-explorer/**/*.mjs"],
    languageOptions: {
      globals: {
        // Node runtime globals used by the adapter and its tests.
        process: "readonly",
        console: "readonly",
        URL: "readonly",
        AbortController: "readonly",
        AbortSignal: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
      },
    },
  },
  {
    // These modules also contain self-contained Playwright page callbacks.
    files: ["experiments/pi-explorer/core.mjs", "experiments/pi-explorer/export.mjs"],
    languageOptions: { globals: { window: "readonly" } },
  },
  {
    files: ["src/world.ts", "src/trajectory.ts"],
    rules: {
      "sonarjs/cognitive-complexity": ["error", 10],
    },
  },
);
