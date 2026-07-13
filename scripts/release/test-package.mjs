#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const output = mkdtempSync(resolve(tmpdir(), "auraone-sdk-pack-"));

try {
  const packOutput = execFileSync(
    "npm",
    ["pack", "--json", "--ignore-scripts", "--pack-destination", output],
    { cwd: root, encoding: "utf8" },
  );
  const [pack] = JSON.parse(packOutput);
  const paths = new Set(pack.files.map((file) => file.path));

  for (const requiredPath of [
    "dist/index.cjs",
    "dist/index.esm.js",
    "dist/index.d.ts",
    "README.md",
    "LICENSE",
    "package.json",
  ]) {
    if (!paths.has(requiredPath)) {
      throw new Error(`Packed tarball is missing ${requiredPath}`);
    }
  }

  const forbidden = pack.files.filter(
    (file) =>
      file.path.startsWith("src/") ||
      file.path.startsWith("scripts/") ||
      file.path.startsWith(".github/") ||
      /\.(?:env|pem|key|otf|ttf|woff2?)$/i.test(file.path),
  );
  if (forbidden.length > 0) {
    throw new Error(
      `Packed tarball contains forbidden paths: ${forbidden
        .map((file) => file.path)
        .join(", ")}`,
    );
  }

  const packageJson = JSON.parse(readFileSync(resolve(root, "package.json")));
  const tarball = resolve(output, pack.filename);
  execFileSync(
    "node",
    [
      resolve(root, "scripts/release/verify-package.mjs"),
      "--spec",
      tarball,
      "--expected-version",
      packageJson.version,
    ],
    { cwd: root, stdio: "inherit" },
  );

  console.log(
    `Packed ${pack.filename}: ${pack.entryCount} files, ${pack.size} bytes`,
  );
} finally {
  rmSync(output, { recursive: true, force: true });
}
