import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import path from "path";

const config = [
  // ESM and CommonJS builds
  {
    input: path.resolve("src/index.ts"),
    output: [
      {
        file: "dist/index.cjs",
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
      {
        file: "dist/index.esm.js",
        format: "es",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outputToFilesystem: true,
      }),
    ],
    external: ["typescript", "fs/promises", "node:crypto", "cross-fetch", "qs"],
  },
  // TypeScript declarations
  {
    input: path.resolve("src/index.ts"),
    output: {
      file: "dist/index.d.ts",
      format: "es",
    },
    plugins: [dts()],
  },
];

export default config;
