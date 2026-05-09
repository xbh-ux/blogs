import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "@typescript-eslint/no-require-imports": "off",
      "@next/next/no-img-element": "off",
    },
  },
];

export default config;
