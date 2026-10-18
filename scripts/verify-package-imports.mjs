#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { isAbsolute, join, resolve } from "node:path";

const packageRoot = resolve(import.meta.dirname, "..");
const temporaryRoot = mkdtempSync(join(tmpdir(), "auraone-sdk-imports-"));

function runNode(args, cwd) {
  return execFileSync(process.execPath, args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

try {
  const packageJson = JSON.parse(
    readFileSync(join(packageRoot, "package.json"), "utf8"),
  );
  const expectedEntrypoints = {
    main: "dist/index.cjs",
    module: "dist/index.js",
    import: "./dist/index.js",
    require: "./dist/index.cjs",
    types: "./dist/index.d.ts",
  };

  for (const [field, expected] of Object.entries(expectedEntrypoints)) {
    const actual =
      field === "import" || field === "require" || field === "types"
        ? packageJson.exports?.["."]?.[field]
        : packageJson[field];
    if (actual !== expected) {
      throw new Error(
        `SDK package ${field} entrypoint mismatch: expected ${expected}, received ${String(actual)}`,
      );
    }
  }

  const packOutput = execFileSync(
    "pnpm",
    ["pack", "--pack-destination", temporaryRoot],
    {
      cwd: packageRoot,
      encoding: "utf8",
      env: { ...process.env, npm_config_ignore_scripts: "true" },
    },
  );
  const archiveName = packOutput.trim().split(/\r?\n/).at(-1);
  if (!archiveName?.endsWith(".tgz")) {
    throw new Error(
      `Unable to resolve SDK package archive from: ${packOutput}`,
    );
  }
  const archivePath = isAbsolute(archiveName)
    ? archiveName
    : join(temporaryRoot, archiveName);

  writeFileSync(
    join(temporaryRoot, "package.json"),
    `${JSON.stringify({ private: true, type: "module" }, null, 2)}\n`,
  );
  execFileSync("npm", ["install", "--ignore-scripts", archivePath], {
    cwd: temporaryRoot,
    stdio: "pipe",
  });

  const esmOutput = runNode(
    [
      "--input-type=module",
      "--eval",
      'import("@auraone/sdk").then((sdk) => { if (typeof sdk.AuraOneClient !== "function") throw new Error("AuraOneClient export missing"); console.log("esm-ok"); })',
    ],
    temporaryRoot,
  );
  const cjsOutput = runNode(
    [
      "--input-type=commonjs",
      "--eval",
      'const sdk = require("@auraone/sdk"); if (typeof sdk.AuraOneClient !== "function") throw new Error("AuraOneClient export missing"); console.log("cjs-ok");',
    ],
    temporaryRoot,
  );

  if (esmOutput !== "esm-ok" || cjsOutput !== "cjs-ok") {
    throw new Error(
      `Unexpected SDK consumer output: esm=${esmOutput}, cjs=${cjsOutput}`,
    );
  }

  console.log("SDK package ESM and CommonJS consumer imports passed.");
} finally {
  rmSync(temporaryRoot, { recursive: true, force: true });
}
