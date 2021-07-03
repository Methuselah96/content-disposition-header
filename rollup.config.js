import resolve from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";
import nodePolyfills from "rollup-plugin-polyfill-node";
import pkg from "./package.json";

export default [
  {
    input: "index.js",
    output: {
      name: "content-disposition",
      file: pkg.browser,
      format: "umd",
    },
    plugins: [nodePolyfills(), resolve(), commonjs()],
  },
  {
    input: "index.js",
    external: "safe-buffer",
    output: [
      { file: pkg.main, format: "cjs" },
      { file: pkg.module, format: "es" },
    ],
    plugins: [nodePolyfills()],
  },
];
