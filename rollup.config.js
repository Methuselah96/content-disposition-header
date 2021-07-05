import typescript from "rollup-plugin-typescript2";
import nodePolyfills from "rollup-plugin-polyfill-node";

export default [
  {
    input: "index.ts",
    external: ["path"],
    output: [
      { file: "dist/content-disposition-header.cjs.js", format: "cjs" },
      { file: "dist/content-disposition-header.esm.js", format: "es" },
    ],
    plugins: [typescript()],
  },
  {
    input: "index.ts",
    output: [
      { file: "dist/content-disposition-header.browser.cjs.js", format: "cjs" },
      { file: "dist/content-disposition-header.browser.esm.js", format: "es" },
    ],
    plugins: [typescript(), nodePolyfills()],
  },
];
