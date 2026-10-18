import typescript from "@rollup/plugin-typescript";
import dts from "rollup-plugin-dts";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const sdkVersion = require("./package.json").version;

/**
 * Injects the package.json version into src/version.ts at build time —
 * package.json is the single version source (PR-19 T-P1-13).
 */
const versionPlugin = {
  name: "auraone-version",
  transform(code, id) {
    if (!id.endsWith("src/version.ts")) return null;
    return {
      code: code.replaceAll("__SDK_VERSION__", sdkVersion),
      map: null,
    };
  },
};

const entrypoints = ["index", "node", "browser"];

const config = [
  ...entrypoints.map((name) => ({
    input: `src/${name}.ts`,
    output: [
      {
        file: `dist/${name}.cjs`,
        format: "cjs",
        sourcemap: true,
        exports: "named",
      },
      {
        file: `dist/${name}.js`,
        format: "es",
        sourcemap: true,
        exports: "named",
      },
    ],
    plugins: [
      versionPlugin,
      typescript({
        tsconfig: "./tsconfig.json",
        declaration: false,
        outputToFilesystem: true,
      }),
    ],
    external: ["typescript", "fs/promises", "node:crypto", "cross-fetch", "qs"],
  })),
  ...entrypoints.map((name) => ({
    input: `src/${name}.ts`,
    output: {
      file: `dist/${name}.d.ts`,
      format: "es",
    },
    plugins: [versionPlugin, dts()],
  })),
];

export default config;
