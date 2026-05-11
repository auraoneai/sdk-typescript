module.exports = {
  root: true,
  extends: ["eslint:recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  rules: {
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": "warn",
    "no-unused-vars": "warn",
    "prefer-const": "warn",
    "no-undef": "off", // Turn off no-undef since we have globals
  },
  env: {
    node: true,
    es6: true,
    jest: true,
    browser: true,
  },
  globals: {
    RequestInit: "readonly",
    NodeJS: "readonly",
    document: "readonly",
  },
};
