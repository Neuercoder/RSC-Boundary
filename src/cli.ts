#!/usr/bin/env node
/**
 * rsc-boundary CLI.
 *
 * Usage:
 *   rsc-boundary scan [path] [--json]
 *
 *   path   file or directory to scan (defaults to ".")
 *   --json emit findings as a JSON array on stdout
 *
 * Exit codes: 0 = clean, 1 = findings reported, 2 = usage/error.
 */

import * as fs from "fs";
import * as path from "path";

import { analyzeFiles, collectFiles, Finding } from "./analyzer";
import { LoadedConfig, loadConfig } from "./config";

const USAGE = `usage: rsc-boundary scan [path] [--json]

Scans TypeScript sources for sensitive values crossing React Server
Component boundaries (see docs/specs/core-taint-analysis.md).

positional:
  path       file or directory to scan (default: ".")

options:
  --json     emit findings as a JSON array on stdout
  --help     show this help

exit codes:
  0   no findings
  1   findings reported
  2   usage or runtime error`;

export interface ScanCliResult {
  code: number;
  findings: Finding[];
  scanned: number;
  configPath: string | null;
}

export function runScan(argv: string[], cwd: string): ScanCliResult {
  const json = argv.includes("--json");
  let target = ".";
  const positional = argv.filter(
    (arg) => !arg.startsWith("--") || arg === "--",
  );
  if (positional.length > 1) {
    return { code: 2, findings: [], scanned: 0, configPath: null };
  }
  if (positional.length === 1) {
    target = positional[0];
  }
  if (target === "--") {
    target = ".";
  }

  const resolved = path.resolve(cwd, target);
  if (!fs.existsSync(resolved)) {
    process.stderr.write(`rsc-boundary: path not found: ${target}\n`);
    return { code: 2, findings: [], scanned: 0, configPath: null };
  }

  const loaded: LoadedConfig = loadConfig(
    fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved),
  );
  const files = collectFiles(resolved, loaded.config);
  // Path aliases resolve against the project root: the config file's
  // directory when one exists, otherwise the scan target root.
  const rootDir = loaded.configPath
    ? path.dirname(loaded.configPath)
    : fs.statSync(resolved).isDirectory()
      ? resolved
      : path.dirname(resolved);
  const result = analyzeFiles(files, { config: loaded.config, rootDir });

  const findRoot = fs.statSync(resolved).isDirectory() ? resolved : path.dirname(resolved);
  const relative = (file: string): string =>
    path.relative(findRoot, file).split(path.sep).join("/");
  const findings = result.findings.map((finding) => ({
    ...finding,
    file: relative(finding.file),
  }));

  if (json) {
    process.stdout.write(JSON.stringify(findings, null, 2) + "\n");
  } else {
    for (const finding of findings) {
      const pos = `${finding.file}:${finding.line}:${finding.column}`;
      process.stdout.write(
        `${pos}  ${finding.severity}  ${finding.ruleId}  ${finding.message}\n`,
      );
      process.stdout.write(`    tainted by: ${finding.sources.join("; ")}\n`);
    }
    process.stdout.write(
      `Scanned ${result.fileCount} file(s) in ${target}, found ${findings.length} finding(s).\n`,
    );
  }
  return { code: findings.length > 0 ? 1 : 0, findings, scanned: result.fileCount, configPath: loaded.configPath };
}

export async function main(argv: string[]): Promise<number> {
  if (argv.length === 0 || argv.includes("--help")) {
    process.stdout.write(USAGE + "\n");
    return argv.length === 0 ? 2 : 0;
  }
  if (argv[0] !== "scan") {
    process.stderr.write(`rsc-boundary: unknown command "${argv[0]}"\n`);
    return 2;
  }
  const result = runScan(argv.slice(1), process.cwd());
  return result.code;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const isMain = typeof require !== "undefined" && require.main === module;
if (isMain) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (error: unknown) => {
      process.stderr.write(`rsc-boundary: ${String(error)}\n`);
      process.exitCode = 2;
    },
  );
}
