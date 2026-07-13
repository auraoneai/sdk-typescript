#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

function argumentValue(name) {
  const inline = process.argv.find((value) => value.startsWith(`${name}=`));
  if (inline) return inline.slice(name.length + 1);
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function run(command, args, cwd, options = {}) {
  return execFileSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "inherit",
    ...options,
  });
}

function installWithRetries(spec, cwd, retries) {
  let lastError;
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    try {
      run(
        "npm",
        ["install", "--ignore-scripts", "--no-audit", "--no-fund", spec],
        cwd,
      );
      return;
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delayMs = Math.min(attempt * 5_000, 30_000);
        console.warn(
          `Package install attempt ${attempt}/${retries} failed; retrying in ${delayMs}ms`,
        );
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, delayMs);
      }
    }
  }
  throw lastError;
}

const spec = argumentValue("--spec");
if (!spec) {
  console.error("Usage: verify-package.mjs --spec <tarball-or-package-spec>");
  process.exit(2);
}

const expectedVersion = argumentValue("--expected-version");
const registryRetries = Number(argumentValue("--registry-retries") ?? "1");
const verifySignatures = process.argv.includes("--verify-signatures");
const workspace = mkdtempSync(resolve(tmpdir(), "auraone-sdk-consumer-"));

try {
  writeFileSync(
    resolve(workspace, "package.json"),
    JSON.stringify(
      {
        name: "auraone-sdk-release-smoke",
        private: true,
        type: "module",
      },
      null,
      2,
    ),
  );

  installWithRetries(spec, workspace, registryRetries);
  if (verifySignatures) {
    run("npm", ["audit", "signatures"], workspace);
  }

  const installedPackage = JSON.parse(
    readFileSync(
      resolve(workspace, "node_modules/@auraone/sdk/package.json"),
      "utf8",
    ),
  );
  if (expectedVersion && installedPackage.version !== expectedVersion) {
    throw new Error(
      `Installed ${installedPackage.version}; expected ${expectedVersion}`,
    );
  }

  writeFileSync(
    resolve(workspace, "esm-smoke.mjs"),
    [
      'import AuraOne, { AuraOneClient, VERSION } from "@auraone/sdk";',
      'if (AuraOne !== AuraOneClient) throw new Error("default export mismatch");',
      'const client = new AuraOneClient({ baseUrl: "https://api.auraone.ai" });',
      'if (client.getConfig().version !== VERSION) throw new Error("version mismatch");',
      'console.log(`esm:${VERSION}`);',
      "",
    ].join("\n"),
  );
  run("node", ["esm-smoke.mjs"], workspace);

  writeFileSync(
    resolve(workspace, "commonjs-smoke.cjs"),
    [
      'const sdk = require("@auraone/sdk");',
      'if (typeof sdk.AuraOneClient !== "function") throw new Error("missing AuraOneClient");',
      'if (typeof sdk.VERSION !== "string") throw new Error("missing VERSION");',
      'console.log(`commonjs:${sdk.VERSION}`);',
      "",
    ].join("\n"),
  );
  run("node", ["commonjs-smoke.cjs"], workspace);

  writeFileSync(
    resolve(workspace, "types-smoke.ts"),
    [
      'import { AuraOneClient, EvaluationStatus, type EvaluationResult } from "@auraone/sdk";',
      'const client: AuraOneClient = new AuraOneClient({ retries: 0 });',
      'const result = { id: "eval_test", status: EvaluationStatus.QUEUED } satisfies EvaluationResult;',
      "void client;",
      "void result;",
      "",
    ].join("\n"),
  );
  writeFileSync(
    resolve(workspace, "tsconfig.json"),
    JSON.stringify(
      {
        compilerOptions: {
          target: "ES2020",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          strict: true,
          noEmit: true,
          skipLibCheck: false,
        },
        include: ["types-smoke.ts"],
      },
      null,
      2,
    ),
  );
  run(
    resolve(root, "node_modules/.bin/tsc"),
    ["--project", "tsconfig.json"],
    workspace,
  );

  console.log(
    `Verified ${installedPackage.name}@${installedPackage.version} from ${spec}`,
  );
} finally {
  rmSync(workspace, { recursive: true, force: true });
}
