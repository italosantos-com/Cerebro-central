module.exports = {
  root: true,
  extends: ["next/core-web-vitals", "next/typescript"],
  ignorePatterns: [
    "functions/**",
    "sms-backend/**",
    "scripts/**",
    "**/dist/**",
    "**/*.min.js",
    "whatsapp-business-jaspers-market/**"
  ],
  rules: {
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-require-imports": "off",
    "@typescript-eslint/no-unused-expressions": "off",
    "@typescript-eslint/no-this-alias": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/no-namespace": "off",
    "prefer-const": "off",
    "prefer-rest-params": "off"
  }
};
