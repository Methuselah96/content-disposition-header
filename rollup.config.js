import alias from "@rollup/plugin-alias";
import commonjs from "@rollup/plugin-commonjs";
import typescript from "@rollup/plugin-typescript";

export default [
  {
    input: "index.ts",
    external: ['path', 'buffer'],
    output: [
      { file: "dist/content-disposition.cjs.js", format: "cjs" },
      { file: "dist/content-disposition.esm.js", format: "es" },
    ],
    plugins: [typescript()],
  },
  {
    input: "index.ts",
    external: ['path', 'buffer'],
    output: [
      { file: "dist/content-disposition.browser.cjs.js", format: "cjs" },
      { file: "dist/content-disposition.browser.esm.js", format: "es" },
    ],
    plugins: [typescript(), alias({
      entries: [
        { find: 'path', replacement: 'path-browserify' }
      ]
    }), commonjs()],
  },
];
