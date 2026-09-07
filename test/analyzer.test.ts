import assert from "node:assert/strict";
import * as path from "node:path";
import { test } from "node:test";

import { analyzeFiles, collectFiles, resolveImport, RULES } from "../src/analyzer";
import { defaultConfig, RscBoundaryConfig } from "../src/config";

const FIXTURES = path.resolve(__dirname, "..", "..", "test", "fixtures");
const LEAKY = path.join(FIXTURES, "leaky");
const CLEAN = path.join(FIXTURES, "clean");
const ALIASES = path.join(FIXTURES, "aliases");
const MEMBER_JSX = path.join(FIXTURES, "member-jsx");
const RE_EXPORT = path.join(FIXTURES, "re-export");

function analyze(dir: string, config = defaultConfig()) {
  const files = collectFiles(dir, config);
  return analyzeFiles(files, { config, rootDir: dir });
}

function byRule(findings: ReturnType<typeof analyzeFiles>["findings"], ruleId: string) {
  return findings.filter((finding) => finding.ruleId === ruleId);
}

test("flags sensitive process.env passed as a client-component prop", () => {
  const result = analyze(LEAKY);
  const boundary = byRule(result.findings, RULES.CLIENT_BOUNDARY_PROP);
  const apiKey = boundary.find((finding) => finding.message.includes('prop "apiKey"'));
  assert.ok(apiKey, "expected a client-boundary finding for the apiKey prop");
  assert.ok(apiKey.file.endsWith("app/page.tsx"));
  assert.ok(apiKey.sources.some((source) => source.includes("process.env.SUPABASE_SESSION_ID")));
  assert.equal(apiKey.severity, "error");
});

test("flags data derived from a server-module call passed to a client component", () => {
  const result = analyze(LEAKY);
  const boundary = byRule(result.findings, RULES.CLIENT_BOUNDARY_PROP);
  const title = boundary.find((finding) => finding.message.includes('prop "title"'));
  assert.ok(title, "expected a client-boundary finding for the title prop");
  assert.ok(
    title.sources.some((source) => source.includes("server module")),
    `expected a server-module source in ${JSON.stringify(title.sources)}`,
  );
});

test("flags exports of sensitive values from server-only modules", () => {
  const result = analyze(LEAKY);
  const exports = byRule(result.findings, RULES.SERVER_ONLY_EXPORT);
  assert.ok(exports.length >= 3, `expected >=3 server-only-export findings, got ${exports.length}`);
  const key = exports.find((finding) => finding.message.includes("SUPABASE_KEY"));
  assert.ok(key, "expected a finding for exported SUPABASE_KEY");
  const alias = exports.find((finding) => finding.message.includes('as "publicKey"'));
  assert.ok(alias, "expected a finding for the aliased export publicKey");
  const header = exports.find((finding) => finding.message.includes("buildAuthHeader"));
  assert.ok(header, "expected a finding for exported buildAuthHeader");
});

test("flags sensitive values flowing into external sinks", () => {
  const result = analyze(LEAKY);
  const sinks = byRule(result.findings, RULES.EXTERNAL_SINK);
  assert.ok(sinks.length >= 1, `expected >=1 external-sink finding, got ${sinks.length}`);
  assert.equal(sinks[0].severity, "warning");
  assert.ok(sinks[0].message.includes("console.log"));
});

test("flags client files importing server modules", () => {
  const result = analyze(LEAKY);
  const imports = byRule(result.findings, RULES.CLIENT_IMPORTS_SERVER);
  assert.ok(imports.length >= 1, `expected >=1 client-imports-server finding, got ${imports.length}`);
  assert.ok(imports[0].file.endsWith("components/client-panel.tsx"));
});

test("reports nothing for clean fixtures", () => {
  const result = analyze(CLEAN);
  assert.equal(result.findings.length, 0, JSON.stringify(result.findings, null, 2));
});

test("findings carry a file, line, column, and taint chain", () => {
  const result = analyze(LEAKY);
  const boundary = byRule(result.findings, RULES.CLIENT_BOUNDARY_PROP);
  assert.ok(boundary.length > 0);
  for (const finding of boundary) {
    assert.ok(finding.line > 0);
    assert.ok(finding.column > 0);
    assert.ok(finding.sources.length > 0);
    assert.ok(finding.message.length > 0);
  }
});

test("config suppression removes matching findings", () => {
  const config = defaultConfig();
  config.suppress = [{ ruleId: RULES.EXTERNAL_SINK }];
  const result = analyze(LEAKY, config);
  assert.equal(byRule(result.findings, RULES.EXTERNAL_SINK).length, 0);
  assert.ok(byRule(result.findings, RULES.CLIENT_BOUNDARY_PROP).length > 0);
});

test("sensitive member reads taint even when the base object is unknown", () => {
  const config = defaultConfig();
  const files = [
    path.join(FIXTURES, "member-read", "page.tsx"),
    path.join(FIXTURES, "member-read", "card.tsx"),
  ];
  const result = analyzeFiles(files, { config });
  const boundary = byRule(result.findings, RULES.CLIENT_BOUNDARY_PROP);
  assert.ok(boundary.length >= 1, JSON.stringify(result.findings, null, 2));
  assert.ok(
    boundary.some((finding) => finding.sources.some((source) => source.includes("sensitive member"))),
    JSON.stringify(boundary, null, 2),
  );
});

test("default-parameter taint does not depend on sensitive-name matching", () => {
  const config = defaultConfig();
  config.sensitiveIdentifiers = [];
  config.sensitiveMembers = [];
  const files = collectFiles(LEAKY, config);
  const result = analyzeFiles(files, { config });
  const exports = byRule(result.findings, RULES.SERVER_ONLY_EXPORT);
  assert.ok(
    exports.some((finding) => finding.message.includes("buildAuthHeader")),
    `expected buildAuthHeader export finding, got ${JSON.stringify(exports, null, 2)}`,
  );
});

test("resolveImport resolves @/ aliases against the project root", () => {
  const from = path.join(ALIASES, "app", "page.tsx");
  const resolved = resolveImport(from, "@/lib/server/session", defaultConfig(), ALIASES);
  assert.equal(resolved, path.join(ALIASES, "lib", "server", "session.ts"));
  const card = resolveImport(from, "@/components/card", defaultConfig(), ALIASES);
  assert.equal(card, path.join(ALIASES, "components", "card.tsx"));
});

test("resolveImport honors custom pathAliases with wildcard capture", () => {
  const config: RscBoundaryConfig = {
    pathAliases: {
      "@components/*": ["./src/components/*", "./components/*"],
      "@lib/server/session": ["./lib/server/session.ts"],
    },
  };
  const from = path.join(ALIASES, "app", "page.tsx");
  assert.equal(
    resolveImport(from, "@components/card", config, ALIASES),
    path.join(ALIASES, "components", "card.tsx"),
  );
  assert.equal(
    resolveImport(from, "@lib/server/session", config, ALIASES),
    path.join(ALIASES, "lib", "server", "session.ts"),
  );
});

test("flags tainted props through @/ aliased client-component imports", () => {
  const result = analyze(ALIASES);
  const boundary = byRule(result.findings, RULES.CLIENT_BOUNDARY_PROP);
  assert.ok(boundary.length >= 2, JSON.stringify(result.findings, null, 2));
  assert.ok(
    boundary.some((finding) => finding.message.includes('prop "apiKey"')),
    JSON.stringify(boundary, null, 2),
  );
  assert.ok(
    boundary.some((finding) => finding.message.includes('prop "title"')),
    JSON.stringify(boundary, null, 2),
  );
  // The alias-imported server module contributes the taint chain.
  assert.ok(
    boundary.some((finding) =>
      finding.sources.some((source) => source.includes("server module")),
    ),
    JSON.stringify(boundary, null, 2),
  );
});

test("flags sensitive exports from an @/-aliased server module", () => {
  const result = analyze(ALIASES);
  const exports = byRule(result.findings, RULES.SERVER_ONLY_EXPORT);
  assert.ok(exports.length >= 1, JSON.stringify(result.findings, null, 2));
  assert.ok(exports[0].file.endsWith("lib/server/session.ts"));
});

test("flags tainted props and children on member JSX components (<Foo.Bar>)", () => {
  const result = analyze(MEMBER_JSX);
  const boundary = byRule(result.findings, RULES.CLIENT_BOUNDARY_PROP);
  assert.ok(boundary.length >= 3, JSON.stringify(result.findings, null, 2));
  assert.ok(
    boundary.some((finding) => finding.message.includes('<Card.Header> prop "title"')),
    JSON.stringify(boundary, null, 2),
  );
  assert.ok(
    boundary.some((finding) => finding.message.includes('<Panel.Item> prop "apiKey"')),
    JSON.stringify(boundary, null, 2),
  );
  assert.ok(
    boundary.some((finding) => finding.message.includes("inside client component <Card.Body>")),
    JSON.stringify(boundary, null, 2),
  );
  // A member tag with a non-tainted prop stays silent.
  assert.ok(!boundary.some((finding) => finding.message.includes('prop "subtitle"')));
});

test("flags barrels re-exporting sensitive values (export *, named, namespace)", () => {
  const result = analyze(RE_EXPORT);
  const exports = byRule(result.findings, RULES.SERVER_ONLY_EXPORT);
  // export * barrel: both the value and the function chain through.
  assert.ok(
    exports.some(
      (finding) =>
        finding.file.endsWith("lib/barrel.ts") && finding.message.includes('"API_TOKEN"'),
    ),
    JSON.stringify(exports, null, 2),
  );
  assert.ok(
    exports.some(
      (finding) =>
        finding.file.endsWith("lib/barrel.ts") && finding.message.includes('"getSession"'),
    ),
    JSON.stringify(exports, null, 2),
  );
  // export { x } from: flagged on the barrel.
  assert.ok(
    exports.some((finding) => finding.file.endsWith("lib/named.ts")),
    JSON.stringify(exports, null, 2),
  );
  // export * as ns from: namespace finding on the barrel.
  assert.ok(
    exports.some(
      (finding) =>
        finding.file.endsWith("lib/ns.ts") && finding.message.includes('"secrets"'),
    ),
    JSON.stringify(exports, null, 2),
  );
  // Two-hop export * chain: both hops flagged.
  assert.ok(
    exports.some((finding) => finding.file.endsWith("lib/chain-a.ts")),
    JSON.stringify(exports, null, 2),
  );
  assert.ok(
    exports.some((finding) => finding.file.endsWith("lib/mid.ts")),
    JSON.stringify(exports, null, 2),
  );
});

test("importers of barrels inherit taint, incl. client components via barrels", () => {
  const result = analyze(RE_EXPORT);
  const boundary = byRule(result.findings, RULES.CLIENT_BOUNDARY_PROP);
  // <Card> itself arrives through lib/ui-barrel.ts (export * of a client file).
  assert.ok(
    boundary.some((finding) => finding.message.includes('prop "apiKey"')),
    JSON.stringify(boundary, null, 2),
  );
  assert.ok(
    boundary.some((finding) => finding.message.includes('prop "title"')),
    JSON.stringify(boundary, null, 2),
  );
});

test("re-export cycles do not hang the analyzer", () => {
  const result = analyze(RE_EXPORT);
  assert.ok(result.findings.length > 0);
});
