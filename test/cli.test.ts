import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as path from "node:path";
import { test } from "node:test";

import { runScan } from "../src/cli";

const FIXTURES = path.resolve(__dirname, "..", "..", "test", "fixtures");
const LEAKY = path.join(FIXTURES, "leaky");
const CLEAN = path.join(FIXTURES, "clean");
const ALIASES = path.join(FIXTURES, "aliases");
const ALIAS_CONFIG = path.join(FIXTURES, "alias-config");
const MEMBER_JSX = path.join(FIXTURES, "member-jsx");
const RE_EXPORT = path.join(FIXTURES, "re-export");
const CLI = path.resolve(__dirname, "..", "..", "dist", "cli.js");

test("runScan reports findings and exit code 1 for a leaking fixture", () => {
  const result = runScan([LEAKY, "--json"], process.cwd());
  assert.equal(result.code, 1);
  assert.ok(result.findings.length >= 8, `expected >=8 findings, got ${result.findings.length}`);
  for (const finding of result.findings) {
    assert.ok(typeof finding.file === "string");
    assert.ok(finding.line > 0);
    assert.ok(finding.column > 0);
    assert.ok(finding.ruleId.startsWith("rsc/"));
    assert.ok(finding.severity === "error" || finding.severity === "warning");
  }
});

test("runScan reports clean and exit code 0 for a clean fixture", () => {
  const result = runScan([CLEAN, "--json"], process.cwd());
  assert.equal(result.code, 0);
  assert.equal(result.findings.length, 0);
});

test("runScan resolves @/ imports with the default alias mapping", () => {
  const result = runScan([ALIASES, "--json"], process.cwd());
  assert.equal(result.code, 1);
  assert.ok(
    result.findings.some((finding) => finding.ruleId === "rsc/client-boundary-prop"),
    JSON.stringify(result.findings, null, 2),
  );
  assert.ok(
    result.findings.some((finding) => finding.ruleId === "rsc/server-only-export"),
    JSON.stringify(result.findings, null, 2),
  );
});

test("runScan resolves custom pathAliases from the config file", () => {
  const result = runScan([ALIAS_CONFIG, "--json"], process.cwd());
  assert.equal(result.code, 1);
  const boundary = result.findings.filter((finding) => finding.ruleId === "rsc/client-boundary-prop");
  assert.ok(boundary.length >= 1, JSON.stringify(result.findings, null, 2));
  assert.ok(boundary.some((finding) => finding.message.includes('prop "text"')), JSON.stringify(boundary, null, 2));
});

test("runScan flags member JSX component leaks", () => {
  const result = runScan([MEMBER_JSX, "--json"], process.cwd());
  assert.equal(result.code, 1);
  const boundary = result.findings.filter((finding) => finding.ruleId === "rsc/client-boundary-prop");
  assert.ok(boundary.length >= 3, JSON.stringify(result.findings, null, 2));
  assert.ok(
    boundary.some((finding) => finding.message.includes("<Card.Header>")),
    JSON.stringify(boundary, null, 2),
  );
  assert.ok(
    boundary.some((finding) => finding.message.includes("<Panel.Item>")),
    JSON.stringify(boundary, null, 2),
  );
  assert.ok(
    boundary.some((finding) => finding.message.includes("<Card.Body>")),
    JSON.stringify(boundary, null, 2),
  );
});

test("runScan human output is clean for a clean fixture", () => {
  const result = runScan([CLEAN], process.cwd());
  assert.equal(result.code, 0);
});

test("runScan returns usage error for missing paths and extra arguments", () => {
  assert.equal(runScan(["/definitely/not/here"], process.cwd()).code, 2);
  assert.equal(runScan([LEAKY, CLEAN], process.cwd()).code, 2);
});

test("the built CLI emits valid JSON on stdout", () => {
  // Exit code 1 for findings: execFileSync surfaces it as a thrown error.
  let leakyStdout = "";
  let leakyStatus = 0;
  try {
    execFileSync(process.execPath, [CLI, "scan", LEAKY, "--json"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const failed = error as { status?: number; stdout?: string };
    leakyStatus = failed.status ?? -1;
    leakyStdout = failed.stdout ?? "";
  }
  assert.equal(leakyStatus, 1);
  const parsed = JSON.parse(leakyStdout);
  assert.ok(Array.isArray(parsed));
  assert.ok(parsed.length >= 8);

  const cleanOut = execFileSync(process.execPath, [CLI, "scan", CLEAN, "--json"], {
    encoding: "utf8",
  });
  assert.deepEqual(JSON.parse(cleanOut), []);
});

test("runScan flags re-export traversal leaks", () => {
  const result = runScan([RE_EXPORT, "--json"], process.cwd());
  assert.equal(result.code, 1);
  const exports = result.findings.filter(
    (finding) => finding.ruleId === "rsc/server-only-export",
  );
  assert.ok(exports.length >= 6, JSON.stringify(result.findings, null, 2));
  assert.ok(
    exports.some((finding) => finding.file.includes("lib/barrel.ts")),
    JSON.stringify(exports, null, 2),
  );
  assert.ok(
    exports.some((finding) => finding.file.includes("lib/named.ts")),
    JSON.stringify(exports, null, 2),
  );
  assert.ok(
    exports.some((finding) => finding.file.includes("lib/ns.ts")),
    JSON.stringify(exports, null, 2),
  );
  const boundary = result.findings.filter(
    (finding) => finding.ruleId === "rsc/client-boundary-prop",
  );
  assert.ok(
    boundary.some((finding) => finding.message.includes('prop "apiKey"')),
    JSON.stringify(boundary, null, 2),
  );
});
