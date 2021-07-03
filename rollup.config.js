import typescript from "@rollup/plugin-typescript";
import nodePolyfills from "rollup-plugin-polyfill-node";
import pkg from "./package.json";

export default [
  {
    input: "index.ts",
    output: [
      { file: pkg.main, format: "cjs" },
      { file: pkg.module, format: "es" },
    ],
    plugins: [typescript(), nodePolyfills()],
  },
];
