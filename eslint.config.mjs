import { FlatCompat } from "@eslint/eslintrc";

// Next.js 15 ships legacy shareable ESLint presets. Adapt them for ESLint 9.
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

export default [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "node_modules/**",
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
];
