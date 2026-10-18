import { FlatCompat } from "@eslint/eslintrc";

// Next.js 15 ships legacy shareable ESLint presets. Adapt them for ESLint 9.
const compat = new FlatCompat({
  baseDirectory: import.meta.dirname,
});

const eslintConfig = [
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

export default eslintConfig;
