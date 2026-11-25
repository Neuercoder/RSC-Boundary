import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { test } from "node:test";

import { analyzeFiles, collectFiles, RULES } from "../src/analyzer";
import { defaultConfig, loadConfig, Suppression } from "../src/config";

const CLI = path.resolve(__dirname, "..", "..", "dist", "cli.js");
const invalid = [
  null, [], [[]], "all", 42, {}, { typo: "rsc/external-sink" },
  { file: "" }, { message: "  " }, { ruleId: "" },
  { line: 0 }, { line: -1 }, { line: 1.5 }, { line: Number.MAX_SAFE_INTEGER + 1 },
  { file: "page.ts", line: "1" },
];

function project(run: (root: string) => void) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "rsc-suppression-"));
  try {
    fs.writeFileSync(path.join(root, "page.ts"), 'console.log(process.env.INTERNAL_VALUE);\n');
    run(root);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
}

test("invalid file suppressions cannot hide findings, while valid selectors still work", () => {
  project((root) => {
    const configPath = path.join(root, ".rscboundaryrc.json");
    for (const entry of invalid) {
      fs.writeFileSync(configPath, JSON.stringify({ suppress: [entry] }));
      const loaded = loadConfig(root);
      assert.equal(loaded.configPath, configPath);
      assert.deepEqual(loaded.config.suppress, [], JSON.stringify(entry));
      const result = analyzeFiles(collectFiles(root, loaded.config), { config: loaded.config, rootDir: root });
      assert.equal(result.findings.length, 1, JSON.stringify(entry));
    }
    for (const selector of [
      { file: "page.ts" }, { message: "console.log" },
      { ruleId: RULES.EXTERNAL_SINK }, { line: 1 },
      { file: "page.ts", ruleId: RULES.EXTERNAL_SINK, line: 1 },
      { ruleId: RULES.EXTERNAL_SINK, extra: true },
    ]) {
      fs.writeFileSync(configPath, JSON.stringify({ suppress: [[], selector] }));
      const loaded = loadConfig(root);
      assert.deepEqual(loaded.config.suppress, [selector]);
      const result = analyzeFiles(collectFiles(root, loaded.config), { config: loaded.config, rootDir: root });
      assert.equal(result.findings.length, 0, JSON.stringify(selector));
    }
  });
});

test("programmatic suppressions use the same validation and all-field matching", () => {
  project((root) => {
    for (const entry of [...invalid, { line: NaN }, { line: Infinity },
      { file: "page.ts", line: 2 }, { file: "other.ts", line: 1 },
      { ruleId: RULES.CLIENT_BOUNDARY_PROP }]) {
      const config = defaultConfig();
      config.suppress = [entry] as Suppression[];
      const result = analyzeFiles(collectFiles(root, config), { config, rootDir: root });
      assert.equal(result.findings.length, 1, JSON.stringify(entry));
    }
  });
});

test("built CLI retains exit code 1 for malformed suppressions", () => {
  project((root) => {
    fs.writeFileSync(path.join(root, ".rscboundaryrc.json"), JSON.stringify({
      suppress: [[], {}, { file: "" }, { unknown: true }],
    }));
    assert.throws(() => execFileSync(process.execPath, [CLI, "scan", root, "--json"], {
      encoding: "utf8", stdio: "pipe",
    }), (error: unknown) => {
      const result = error as { status: number; stdout: string };
      assert.equal(result.status, 1);
      const findings = JSON.parse(result.stdout) as { ruleId: string }[];
      assert.equal(findings.length, 1);
      assert.equal(findings[0].ruleId, RULES.EXTERNAL_SINK);
      return true;
    });
  });
});
