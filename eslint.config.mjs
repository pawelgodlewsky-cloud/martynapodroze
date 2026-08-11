import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default [
  {
    ignores: ["node_modules/**", ".wrangler/**", "output/**", "tmp/**", "tools/**"]
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["worker-public/**/*.js", "assets/cookie-consent.js"],
    languageOptions: {
      globals: {
        document: "readonly",
        window: "readonly",
        navigator: "readonly",
        location: "readonly",
        confirm: "readonly",
        crypto: "readonly",
        CustomEvent: "readonly",
        FormData: "readonly",
        URL: "readonly",
        fetch: "readonly",
        setTimeout: "readonly"
      }
    }
  }
];
