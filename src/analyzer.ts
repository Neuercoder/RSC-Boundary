/**
 * Core taint analysis for rsc-boundary.
 *
 * Detects sensitive / server-only values flowing toward React Server
 * Component boundaries: props passed to client components, exports leaving
 * server modules, and external sinks such as `console.log`.
 *
 * Analysis model:
 *   - An expression is *tainted* if it is a source, derives from a tainted
 *     expression, or flows through a call whose arguments are tainted.
 *   - Tainted names/expressions are tracked per file (`Map<key, reasons[]>`);
 *     member reads are tracked by their source text, so `user.password`
 *     becomes tainted even when `user` is not.
 *   - Sinks are evaluated once the taint sets reach a fixpoint (capped at
 *     MAX_PASSES), so findings carry the most specific provenance chain.
 *   - Re-export edges (`export * from`, `export { x } from`,
 *     `export * as ns from`) are followed across scanned files (alias-aware,
 *     cycle-safe): barrels re-exporting sensitive values are flagged, their
 *     importers inherit the taint, and client components imported through
 *     barrels still resolve as client boundaries.
 */

import * as fs from "fs";
import * as path from "path";
import * as ts from "typescript";

import { RscBoundaryConfig, Suppression } from "./config";

export interface Finding {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning";
  ruleId: string;
  message: string;
  sources: string[];
}

export interface AnalyzeResult {
  findings: Finding[];
  fileCount: number;
}

export const RULES = {
  CLIENT_BOUNDARY_PROP: "rsc/client-boundary-prop",
  SERVER_ONLY_EXPORT: "rsc/server-only-export",
  EXTERNAL_SINK: "rsc/external-sink",
  CLIENT_IMPORTS_SERVER: "rsc/client-imports-server",
} as const;

export interface AnalyzeOptions {
  config?: RscBoundaryConfig;
  /** Project root used to resolve `pathAliases` import specifiers. Defaults to `process.cwd()`. */
  rootDir?: string;
}

const MAX_PASSES = 6;
const SOURCE_EXTS = [".ts", ".tsx", ".mts", ".cts"];
const IMPORT_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js", ".mts", ".cts"];

interface FileAnalysis {
  file: string;
  sf: ts.SourceFile;
  isClient: boolean;
  /** Why this file counts as a server module, if it does. */
  serverReason: string | null;
  /** Import binding name -> server-module specifier it was imported from. */
  serverBindings: Map<string, string>;
  /** JSX element name -> resolved absolute file of a local client component. */
  elementToFile: Map<string, string>;
  /** Named-export re-export edges: exported name -> resolved target file + local name. */
  reExportBindings: Map<string, { file: string; local: string }>;
  /** `export *` source files (resolved), followed during the export-traversal fixpoint. */
  starReExports: Set<string>;
  /** `export * as ns from` namespace bindings: namespace name -> resolved target file. */
  starNamespaces: Map<string, string>;
  /** Resolved files this file imports from (import edges for server-module propagation). */
  importSources: Set<string>;
  /** Namespace-import binding name -> resolved file, for member reads (`ns.secret`) and member tags (`<UI.Card>`). */
  namespaceImports: Map<string, string>;
  /** Expression key -> taint reasons. */
  taint: Map<string, string[]>;
  findings: Finding[];
  seenFindingKeys: Set<string>;
}

/** Collect TypeScript source files under `target` (a file or a directory). */
export function collectFiles(target: string, config: RscBoundaryConfig): string[] {
  const files: string[] = [];
  const exclude = config.exclude ?? [];
  const excluded = (file: string): boolean => {
    const rel = path.relative(process.cwd(), file).split(path.sep).join("/");
    return exclude.some((pattern) => rel.includes(pattern));
  };
  const walk = (dir: string): void => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!excluded(full)) {
          walk(full);
        }
      } else if (entry.isFile() && SOURCE_EXTS.includes(path.extname(entry.name)) && !excluded(full)) {
        files.push(full);
      }
    }
  };

  const resolved = path.resolve(target);
  if (fs.statSync(resolved).isFile()) {
    if (SOURCE_EXTS.includes(path.extname(resolved))) {
      return [resolved];
    }
    return [];
  }
  walk(resolved);
  files.sort();
  return files;
}

function hasClientDirective(sf: ts.SourceFile): boolean {
  const first = sf.statements[0];
  if (first && ts.isExpressionStatement(first)) {
    const expr = first.expression;
    if (ts.isStringLiteral(expr) && expr.text === "use client") {
      return true;
    }
    // Directive may have been parsed with a preceding comment; scan loose.
    if (ts.isNoSubstitutionTemplateLiteral(expr) && expr.text.trim() === "use client") {
      return true;
    }
  }
  return /^\s*["']use client["']\s*;?\s*(?:\/\/.*)?$/m.test(sf.text);
}

function tryParse(file: string): ts.SourceFile | null {
  try {
    const text = fs.readFileSync(file, "utf8");
    const scriptKind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    return ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, scriptKind);
  } catch {
    return null;
  }
}

/** Try to resolve `base` with extension and `index.*` fallbacks (the module
 * resolution shape of the TS compiler after tsconfig `paths` substitution). */
function tryResolveFile(base: string): string | null {
  for (const ext of IMPORT_EXTENSIONS) {
    if (fs.existsSync(base + ext) && fs.statSync(base + ext).isFile()) {
      return base + ext;
    }
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) {
    return base;
  }
  for (const ext of IMPORT_EXTENSIONS) {
    const index = path.join(base, `index${ext}`);
    if (fs.existsSync(index)) {
      return index;
    }
  }
  return null;
}

/** Resolve a relative import specifier from `fromFile` to an absolute file path, if any. */
export function resolveRelativeImport(fromFile: string, specifier: string): string | null {
  if (!specifier.startsWith(".")) {
    return null;
  }
  const base = path.resolve(path.dirname(fromFile), specifier);
  return tryResolveFile(base);
}

/**
 * Resolve any import specifier (relative or tsconfig path-aliased) from
 * `fromFile` to an absolute file path, if any.
 *
 * Relative specifiers (`./x`) resolve as `resolveRelativeImport`. Non-relative
 * specifiers are matched against `config.pathAliases` (default `{ "@/*":
 * ["./*"] }`): a `*` in the alias pattern captures the remainder of the
 * specifier, which is substituted into each replacement path; the result is
 * resolved against `rootDir`. Only one path per alias needs to exist.
 */
export function resolveImport(
  fromFile: string,
  specifier: string,
  config: RscBoundaryConfig,
  rootDir: string,
): string | null {
  if (specifier.startsWith(".")) {
    return resolveRelativeImport(fromFile, specifier);
  }
  const aliases = config.pathAliases ?? {};
  for (const [alias, paths] of Object.entries(aliases)) {
    const star = alias.indexOf("*");
    let captured: string | null = null;
    if (star === -1) {
      if (specifier !== alias) {
        continue;
      }
      captured = "";
    } else {
      const prefix = alias.slice(0, star);
      const suffix = alias.slice(star + 1);
      if (!specifier.startsWith(prefix) || !specifier.endsWith(suffix)) {
        continue;
      }
      captured = specifier.slice(prefix.length, specifier.length - suffix.length);
    }
    for (const pattern of paths) {
      const base = path.resolve(rootDir, pattern.replace(/\*/g, captured));
      const resolved = tryResolveFile(base);
      if (resolved) {
        return resolved;
      }
    }
  }
  return null;
}

export function analyzeFiles(files: string[], options: AnalyzeOptions = {}): AnalyzeResult {
  const config = options.config ?? {};
  const rootDir = options.rootDir ?? process.cwd();

  const analyses = new Map<string, FileAnalysis>();
  const clientFiles = new Set<string>();

  // Parse every file first so the cross-file client-component index is
  // complete before any JSX sink is evaluated.
  for (const file of files) {
    const sf = tryParse(file);
    if (!sf) {
      continue;
    }
    const isClient = hasClientDirective(sf);
    if (isClient) {
      clientFiles.add(file);
    }
    analyses.set(file, {
      file,
      sf,
      isClient,
      serverReason: null,
      serverBindings: new Map(),
      elementToFile: new Map(),
      reExportBindings: new Map(),
      starReExports: new Set(),
      starNamespaces: new Map(),
      importSources: new Set(),
      namespaceImports: new Map(),
      taint: new Map(),
      findings: [],
      seenFindingKeys: new Set(),
    });
  }

  // Fixpoint passes: grow the taint sets without emitting findings so that
  // findings carry the final, most specific provenance chain.
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    let changed = false;
    for (const analysis of analyses.values()) {
      const walker = new FileWalker(
        analysis,
        analyses,
        clientFiles,
        config,
        rootDir,
        false,
      );
      changed = walker.run() || changed;
    }
    changed = propagateReExports(analyses, config, rootDir) || changed;
    if (!changed) {
      break;
    }
  }

  // Final pass: emit findings against the settled taint sets.
  for (const analysis of analyses.values()) {
    new FileWalker(analysis, analyses, clientFiles, config, rootDir, true).run();
  }

  const findings: Finding[] = [];
  const suppress = config.suppress ?? [];
  for (const analysis of analyses.values()) {
    for (const finding of analysis.findings) {
      if (!isSuppressed(finding, suppress)) {
        findings.push(finding);
      }
    }
  }
  return { findings, fileCount: analyses.size };
}

function isSuppressed(finding: Finding, suppress: Suppression[]): boolean {
  return suppress.some((rule) => {
    if (rule.file !== undefined && !finding.file.includes(rule.file)) {
      return false;
    }
    if (rule.ruleId !== undefined && finding.ruleId !== rule.ruleId) {
      return false;
    }
    if (rule.message !== undefined && !finding.message.includes(rule.message)) {
      return false;
    }
    if (rule.line !== undefined && finding.line !== rule.line) {
      return false;
    }
    return true;
  });
}

/**
 * Cross-file re-export propagation between fixpoint passes.
 *
 * Each scanned file's taint set is per-file, so taint entering through a
 * barrel hop (`import { x } from "./barrel"`, `ns.x` on a namespace import,
 * or a member read `barrel.x` where `barrel` is a re-export edge) must be
 * copied explicitly once the exporting module's own taint has settled. This
 * runs after every pass's walkers: for each import edge, resolve the imported
 * name through the target's export chain (named hops, nested `export *`,
 * `export * as ns` namespaces) and taint the local binding with the
 * declaring module's provenance. Reports whether any taint set grew.
 */
function propagateReExports(
  analyses: Map<string, FileAnalysis>,
  config: RscBoundaryConfig,
  rootDir: string,
): boolean {
  let changed = false;
  const addTaint = (target: FileAnalysis, key: string, reason: string): void => {
    const existing = target.taint.get(key);
    if (!existing) {
      target.taint.set(key, [reason]);
      changed = true;
    } else if (!existing.includes(reason)) {
      existing.push(reason);
      changed = true;
    }
  };
  const taintReasonsFor = (target: FileAnalysis, name: string): string[] => {
    const tracked = target.taint.get(name);
    if (tracked) {
      return tracked.slice(0, 3);
    }
    const serverBinding = target.serverBindings.get(name);
    if (serverBinding) {
      return [`binding from server module "${serverBinding}"`];
    }
    return [];
  };
  const exportedNameReasons = (
    file: string,
    name: string,
    visited: Set<string>,
  ): string[] => {
    if (visited.has(file)) {
      return [];
    }
    visited.add(file);
    const target = analyses.get(file);
    if (!target) {
      return [];
    }
    if (isExportedName(target, name)) {
      return taintReasonsFor(target, name);
    }
    const hop = target.reExportBindings.get(name);
    if (hop && !visited.has(hop.file)) {
      const reasons = exportedNameReasons(hop.file, hop.local, visited);
      if (reasons.length > 0) {
        return reasons;
      }
    }
    for (const star of target.starReExports) {
      const reasons = exportedNameReasons(star, name, visited);
      if (reasons.length > 0) {
        return reasons;
      }
    }
    return [];
  };
  const namespaceReasons = (
    file: string,
    visited: Set<string>,
  ): string[] => {
    if (visited.has(file)) {
      return [];
    }
    visited.add(file);
    const target = analyses.get(file);
    if (!target) {
      return [];
    }
    const reasons = firstExportedReasons(analyses, target, visited, exportedNameReasons, taintReasonsFor);
    if (reasons.length > 0) {
      return reasons;
    }
    return [];
  };
  for (const analysis of analyses.values()) {
    for (const statement of analysis.sf.statements) {
      if (!ts.isImportDeclaration(statement) || !statement.importClause || !ts.isStringLiteral(statement.moduleSpecifier)) {
        continue;
      }
      const resolved = resolveImport(analysis.file, statement.moduleSpecifier.text, config, rootDir);
      if (!resolved || !analyses.has(resolved)) {
        continue;
      }
      const clause = statement.importClause;
      if (clause.name) {
        // Default imports cannot name a star-exported binding (`export *`
        // excludes defaults), so only direct default exports propagate here.
        const direct = analyses.get(resolved);
        if (direct && isExportedName(direct, "default")) {
          const reasons =
            direct.taint.get("default") ??
            (direct.serverBindings.get("default")
              ? [`binding from server module "${direct.serverBindings.get("default")}"`]
              : []);
          for (const reason of reasons.slice(0, 3)) {
            addTaint(analysis, clause.name.text, reason);
          }
        } else if (direct) {
          for (const star of direct.starReExports) {
            const reasons = exportedNameReasons(star, "default", new Set([analysis.file, resolved]));
            for (const reason of reasons) {
              addTaint(analysis, clause.name.text, reason);
            }
          }
        }
      }
      const named = clause.namedBindings;
      if (named) {
        if (ts.isNamespaceImport(named)) {
          const reasons = namespaceReasons(resolved, new Set([analysis.file]));
          if (reasons.length > 0) {
            addTaint(analysis, named.name.text, `namespace re-export from "${statement.moduleSpecifier.text}" (${reasons[0]})`);
          }
        } else {
          for (const el of named.elements) {
            const imported = el.propertyName?.text ?? el.name.text;
            const reasons = exportedNameReasons(resolved, imported, new Set([analysis.file]));
            for (const reason of reasons) {
              addTaint(analysis, el.name.text, reason);
            }
          }
        }
      }
    }
  }
  // Barrels re-exporting sensitive values are server modules: a file that
  // re-exports a tainted name (or namespace) out of another scanned file is
  // itself an exporter of sensitive data, even without its own `server-only`
  // import. Without this, `processExport`'s `serverReason` guard would skip
  // exactly those `export *` / `export { x } from` findings.
  for (const analysis of analyses.values()) {
    if (analysis.serverReason !== null) {
      continue;
    }
    if (reExportsSensitive(analyses, analysis)) {
      analysis.serverReason = "re-exports sensitive value";
      changed = true;
    }
  }
  return changed;
}

/**
 * Whether `analysis` re-exports at least one sensitive name (or sensitive
 * namespace) out of another scanned file in `analyses`. Inspects only
 * cross-file edges (`export *`, `export { x } from`, `export * as ns from`),
 * not the file's own declarations — a pure sensitive declaration with its
 * own `server-only` import is marked server elsewhere.
 */
function reExportsSensitive(analyses: Map<string, FileAnalysis>, analysis: FileAnalysis): boolean {
  const taintReasonsFor = (target: FileAnalysis, name: string): string[] => {
    const tracked = target.taint.get(name);
    if (tracked) {
      return tracked.slice(0, 3);
    }
    const serverBinding = target.serverBindings.get(name);
    if (serverBinding) {
      return [`binding from server module "${serverBinding}"`];
    }
    return [];
  };
  const exportedNameReasons = (
    file: string,
    name: string,
    visited: Set<string>,
  ): string[] => {
    if (visited.has(file)) {
      return [];
    }
    visited.add(file);
    const target = analyses.get(file);
    if (!target) {
      return [];
    }
    if (isExportedName(target, name)) {
      return taintReasonsFor(target, name);
    }
    const hop = target.reExportBindings.get(name);
    if (hop && !visited.has(hop.file)) {
      const reasons = exportedNameReasons(hop.file, hop.local, visited);
      if (reasons.length > 0) {
        return reasons;
      }
    }
    for (const star of target.starReExports) {
      const reasons = exportedNameReasons(star, name, visited);
      if (reasons.length > 0) {
        return reasons;
      }
    }
    return [];
  };
  for (const hop of analysis.reExportBindings.values()) {
    if (exportedNameReasons(hop.file, hop.local, new Set([analysis.file])).length > 0) {
      return true;
    }
  }
  for (const star of analysis.starReExports) {
    const target = analyses.get(star);
    if (!target) {
      continue;
    }
    if (firstExportedReasons(analyses, target, new Set([analysis.file]), exportedNameReasons, taintReasonsFor).length > 0) {
      return true;
    }
  }
  for (const starFile of analysis.starNamespaces.values()) {
    const target = analyses.get(starFile);
    if (!target) {
      continue;
    }
    if (firstExportedReasons(analyses, target, new Set([analysis.file]), exportedNameReasons, taintReasonsFor).length > 0) {
      return true;
    }
  }
  return false;
}

/** Whether `name` is declared (and exported, or a re-exportable import) in `target`'s own source. */
function isExportedName(target: FileAnalysis, name: string): boolean {
  for (const statement of target.sf.statements) {
    if (
      (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      (ts.getCombinedModifierFlags(statement as ts.Declaration) & ts.ModifierFlags.Export) !== 0
    ) {
      if (ts.isVariableStatement(statement)) {
        if (
          statement.declarationList.declarations.some(
            (decl) => ts.isIdentifier(decl.name) && decl.name.text === name,
          )
        ) {
          return true;
        }
      } else if (statement.name?.text === name) {
        return true;
      }
    }
    if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
      if (!statement.moduleSpecifier) {
        for (const el of statement.exportClause.elements) {
          const local = el.propertyName ?? el.name;
          if (ts.isIdentifier(el.name) && el.name.text === name && ts.isIdentifier(local) && locallyDeclared(target, local.text)) {
            return true;
          }
        }
      }
    }
    if (ts.isExportAssignment(statement) && !statement.isExportEquals && name === "default") {
      return true;
    }
  }
  return false;
}

function locallyDeclared(target: FileAnalysis, name: string): boolean {
  for (const statement of target.sf.statements) {
    if (ts.isVariableStatement(statement)) {
      if (statement.declarationList.declarations.some((decl) => ts.isIdentifier(decl.name) && decl.name.text === name)) {
        return true;
      }
    } else if (
      (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      statement.name?.text === name
    ) {
      return true;
    } else if (ts.isImportDeclaration(statement)) {
      const clause = statement.importClause;
      if (clause?.name?.text === name) {
        return true;
      }
      const named = clause?.namedBindings;
      if (named) {
        if (ts.isNamespaceImport(named) && named.name.text === name) {
          return true;
        }
        if (ts.isNamedImports(named) && named.elements.some((el) => el.name.text === name)) {
          return true;
        }
      }
    }
  }
  return false;
}

/**
 * First sensitive name exported by `target` (own declarations, local
 * `export { x }`, `export { x } from` hops, then nested `export *`),
 * with the declaring module's provenance. Cycle-safe via `visited`.
 */
function firstExportedReasons(
  analyses: Map<string, FileAnalysis>,
  target: FileAnalysis,
  visited: Set<string>,
  exportedNameReasons: (file: string, name: string, visited: Set<string>) => string[],
  taintReasonsFor: (target: FileAnalysis, name: string) => string[],
): string[] {
  for (const statement of target.sf.statements) {
    if (
      (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
      (ts.getCombinedModifierFlags(statement as ts.Declaration) & ts.ModifierFlags.Export) !== 0
    ) {
      if (ts.isVariableStatement(statement)) {
        for (const decl of statement.declarationList.declarations) {
          if (ts.isIdentifier(decl.name)) {
            const reasons = taintReasonsFor(target, decl.name.text);
            if (reasons.length > 0) {
              return reasons;
            }
          }
        }
      } else if (statement.name) {
        const reasons = taintReasonsFor(target, statement.name.text);
        if (reasons.length > 0) {
          return reasons;
        }
      }
    }
    if (
      ts.isExportDeclaration(statement) &&
      statement.exportClause &&
      ts.isNamedExports(statement.exportClause)
    ) {
      for (const el of statement.exportClause.elements) {
        const local = el.propertyName ?? el.name;
        if (!ts.isIdentifier(local) || !ts.isIdentifier(el.name)) {
          continue;
        }
        if (!statement.moduleSpecifier) {
          const reasons = taintReasonsFor(target, local.text);
          if (reasons.length > 0) {
            return reasons;
          }
          continue;
        }
        if (ts.isStringLiteral(statement.moduleSpecifier)) {
          const hopTarget = target.reExportBindings.get(el.name.text);
          if (hopTarget && !visited.has(hopTarget.file)) {
            const reasons = exportedNameReasons(hopTarget.file, hopTarget.local, visited);
            if (reasons.length > 0) {
              return reasons;
            }
          }
        }
      }
    }
    if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
      const reasons = taintReasonsFor(target, "default");
      if (reasons.length > 0) {
        return reasons;
      }
    }
  }
  for (const hop of target.reExportBindings.values()) {
    if (visited.has(hop.file)) {
      continue;
    }
    const next = hop.file;
    visited.add(next);
    const nextTarget = analyses.get(next);
    if (nextTarget) {
      const reasons = firstExportedReasons(analyses, nextTarget, visited, exportedNameReasons, taintReasonsFor);
      if (reasons.length > 0) {
        return reasons;
      }
    }
  }
  for (const star of target.starReExports) {
    if (visited.has(star)) {
      continue;
    }
    visited.add(star);
    const nextTarget = analyses.get(star);
    if (nextTarget) {
      const reasons = firstExportedReasons(analyses, nextTarget, visited, exportedNameReasons, taintReasonsFor);
      if (reasons.length > 0) {
        return reasons;
      }
    }
  }
  return [];
}

class FileWalker {
  private changed = false;
  private readonly patternsCache = new Map<string, RegExp>();

  constructor(
    private analysis: FileAnalysis,
    private readonly analyses: Map<string, FileAnalysis>,
    private readonly clientFiles: Set<string>,
    private readonly config: RscBoundaryConfig,
    private readonly rootDir: string,
    private readonly emitFindings: boolean,
  ) {}

  run(): boolean {
    this.changed = false;
    this.walk(this.analysis.sf);
    return this.changed;
  }

  // -------------------------------------------------------------------------
  // Taint bookkeeping
  // -------------------------------------------------------------------------

  private regex(patterns: string[] | undefined): RegExp[] {
    return (patterns ?? []).map((pattern) => {
      let re = this.patternsCache.get(pattern);
      if (!re) {
        re = new RegExp(pattern, "i");
        this.patternsCache.set(pattern, re);
      }
      return re;
    });
  }

  private get identifierRE(): RegExp[] {
    return this.regex(this.config.sensitiveIdentifiers);
  }

  private get memberRE(): RegExp[] {
    return this.regex(this.config.sensitiveMembers);
  }

  private get callRE(): RegExp[] {
    return this.regex(this.config.sourceCalls);
  }

  private get moduleRE(): RegExp[] {
    return this.regex(this.config.serverModules);
  }

  private get sinkRE(): RegExp[] {
    return this.regex(this.config.externalSinks);
  }

  private addTaint(key: string, reason: string): void {
    const existing = this.analysis.taint.get(key);
    if (!existing) {
      this.analysis.taint.set(key, [reason]);
      this.changed = true;
    } else if (!existing.includes(reason)) {
      existing.push(reason);
      this.changed = true;
    }
  }

  private matchesAny(text: string, patterns: RegExp[]): string | null {
    for (const re of patterns) {
      if (re.test(text)) {
        return text;
      }
    }
    return null;
  }

  private markServerModule(reason: string): void {
    if (this.analysis.serverReason === null) {
      this.analysis.serverReason = reason;
    }
  }

  /** Bind taint onto every variable name in a binding pattern / identifier. */
  private bindNames(name: ts.BindingName, reasons: string[]): void {
    if (ts.isIdentifier(name)) {
      for (const reason of reasons) {
        this.addTaint(name.text, reason);
      }
      return;
    }
    const isObjectPattern = ts.isObjectBindingPattern(name);
    for (const element of name.elements) {
      if (!ts.isBindingElement(element)) {
        continue;
      }
      // Object-destructuring reads a member: `const { password } = user`.
      // Treat the read itself as a sensitive-member source.
      if (isObjectPattern && element.propertyName && ts.isIdentifier(element.propertyName)) {
        const memberReason = this.matchesAny(element.propertyName.text, this.memberRE);
        if (memberReason) {
          this.addTaint(this.bindingElementKey(element), `read of "user.${memberReason}" (sensitive member)`);
          continue;
        }
      }
      if (ts.isIdentifier(element.name)) {
        const nameReason = this.matchesAny(element.name.text, this.identifierRE);
        if (nameReason) {
          this.addTaint(element.name.text, `identifier "${nameReason}" (sensitive name)`);
          continue;
        }
      }
      this.bindNames(element.name, reasons);
    }
  }

  private bindingElementKey(element: ts.BindingElement): string {
    return ts.isIdentifier(element.name) ? element.name.text : element.getText(this.analysis.sf);
  }

  private describe(node: ts.Node): string {
    const flat = node.getText(this.analysis.sf).replace(/\s+/g, " ").trim();
    return flat.length > 40 ? flat.slice(0, 37) + "..." : flat;
  }

  private emit(
    node: ts.Node,
    ruleId: string,
    severity: Finding["severity"],
    message: string,
    sources: string[],
  ): void {
    if (!this.emitFindings) {
      return;
    }
    const pos = node.getStart(this.analysis.sf);
    const lineCol = this.analysis.sf.getLineAndCharacterOfPosition(pos);
    const key = `${ruleId}|${this.analysis.file}|${pos}|${message}`;
    if (this.analysis.seenFindingKeys.has(key)) {
      return;
    }
    this.analysis.seenFindingKeys.add(key);
    this.analysis.findings.push({
      file: this.analysis.file,
      line: lineCol.line + 1,
      column: lineCol.character + 1,
      severity,
      ruleId,
      message,
      sources: sources.slice(0, 3),
    });
  }

  // -------------------------------------------------------------------------
  // Tree walk
  // -------------------------------------------------------------------------

  private walk(node: ts.Node): void {
    if (ts.isImportDeclaration(node)) {
      this.processImport(node);
    } else if (ts.isVariableDeclaration(node)) {
      this.processVariableDeclaration(node);
    } else if (ts.isBindingElement(node)) {
      this.processBindingElement(node);
    } else if (ts.isParameter(node)) {
      this.processParameter(node);
    } else if (ts.isBinaryExpression(node)) {
      this.processBinaryExpression(node);
    } else if (ts.isPropertyAccessExpression(node)) {
      this.processPropertyAccess(node);
    } else if (ts.isCallExpression(node) || ts.isNewExpression(node) || ts.isTaggedTemplateExpression(node)) {
      this.processCallLike(node);
    } else if (ts.isExportDeclaration(node) || ts.isExportAssignment(node)) {
      this.processExport(node);
    } else if (ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      this.processFunctionOrClass(node);
    } else if (ts.isJsxElement(node) || ts.isJsxSelfClosingElement(node)) {
      this.processJsx(node);
    }

    for (const child of node.getChildren(this.analysis.sf)) {
      this.walk(child);
    }

    // Exports are checked after children so this pass's taint is visible.
    if (ts.isVariableStatement(node) || ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) {
      this.checkExportedDeclarations(node);
    }
  }

  private processImport(node: ts.ImportDeclaration): void {
    const specifier = ts.isStringLiteral(node.moduleSpecifier)
      ? node.moduleSpecifier.text
      : node.moduleSpecifier.getText(this.analysis.sf);
    const isServer = this.moduleRE.some((re) => re.test(specifier));
    if (isServer || specifier === "next/headers" || specifier === "next/cookies") {
      this.markServerModule(`import "${specifier}"`);
    }
    if (this.analysis.isClient && isServer) {
      this.emit(
        node,
        RULES.CLIENT_IMPORTS_SERVER,
        "error",
        `Client boundary file imports server-only module "${specifier}"`,
        [`server module "${specifier}"`],
      );
    }

    // Index local client components for the JSX boundary rule. Relative
    // (`./x`) and tsconfig path-aliased (`@/x`) specifiers are both resolved.
    // Barrel re-exports (`export *` / `export { x } from`) are traversed so a
    // client component imported through a barrel still resolves. Import edges
    // and namespace bindings are recorded for server-module propagation and
    // `ns.member` re-export resolution.
    const resolved = resolveImport(this.analysis.file, specifier, this.config, this.rootDir);
    if (resolved) {
      this.analysis.importSources.add(resolved);
      const clientTarget = this.resolveClientTarget(resolved);
      if (clientTarget) {
        const bindings = node.importClause;
        const names: string[] = [];
        if (bindings?.name) {
          names.push(bindings.name.text);
        }
        if (bindings?.namedBindings) {
          if (ts.isNamespaceImport(bindings.namedBindings)) {
            names.push(bindings.namedBindings.name.text);
          } else {
            for (const el of bindings.namedBindings.elements) {
              names.push(el.name.text);
            }
          }
        }
        for (const name of names) {
          this.analysis.elementToFile.set(name, clientTarget);
        }
      }
      if (node.importClause?.namedBindings && ts.isNamespaceImport(node.importClause.namedBindings)) {
        this.analysis.namespaceImports.set(node.importClause.namedBindings.name.text, resolved);
      }
    }

    const importClause = node.importClause;
    if (!importClause) {
      return;
    }
    const taintBinding = (binding: ts.Identifier, importText: string): void => {
      if (isServer) {
        this.analysis.serverBindings.set(binding.text, specifier);
        this.addTaint(binding.text, `import ${importText} from "${specifier}" (server module)`);
      }
    };
    if (importClause.name) {
      taintBinding(importClause.name, importClause.name.text);
    }
    const named = importClause.namedBindings;
    if (named) {
      if (ts.isNamespaceImport(named)) {
        taintBinding(named.name, `* as ${named.name.text}`);
      } else {
        for (const el of named.elements) {
          taintBinding(el.name, el.propertyName ? `${el.propertyName.text} as ${el.name.text}` : el.name.text);
        }
      }
    }
  }

  private processVariableDeclaration(node: ts.VariableDeclaration): void {
    const init = node.initializer;
    if (!init) {
      return;
    }
    // Function assigned to a variable: taint the binding if the body returns
    // tainted data, so downstream call sites and exports are caught.
    if (ts.isArrowFunction(init) || ts.isFunctionExpression(init)) {
      const reasons = this.functionReturnsTainted(init);
      if (reasons && ts.isIdentifier(node.name)) {
        this.addTaint(node.name.text, `returns ${reasons[0]}`);
      }
    }
    const reasons = this.taintReasons(init);
    if (reasons.length > 0) {
      this.bindNames(node.name, reasons);
    }
  }

  /** Mark a declared function tainted when any of its returns are tainted. */
  private processFunctionOrClass(node: ts.FunctionDeclaration | ts.ClassDeclaration): void {
    if (!ts.isFunctionDeclaration(node) || !node.name) {
      return;
    }
    const reasons = this.functionReturnsTainted(node);
    if (reasons) {
      this.addTaint(node.name.text, `returns ${reasons[0]}`);
    }
  }

  /** First tainted return expression found in `fn`'s body (skipping nested functions). */
  private functionReturnsTainted(fn: ts.FunctionLikeDeclaration): string[] | null {
    let result: string[] | null = null;
    const visit = (node: ts.Node): void => {
      if (ts.isReturnStatement(node)) {
        if (node.expression) {
          const reasons = this.taintReasons(node.expression);
          if (reasons.length > 0) {
            result = result ?? reasons.slice(0, 3);
          }
        }
      }
      if (ts.isFunctionLike(node) && node !== fn) {
        return;
      }
      for (const child of node.getChildren(this.analysis.sf)) {
        visit(child);
      }
    };
    const body = fn.body;
    if (body) {
      visit(body);
    }
    return result;
  }

  private processBindingElement(node: ts.BindingElement): void {
    // Default binding-element initializers can smuggle a sensitive value into
    // a destructured variable.
    const init = node.initializer;
    if (init && this.isTainted(init)) {
      this.addTaint(this.bindingElementKey(node), `default value ${this.describe(init)}`);
    }
  }

  /** Default parameter values can smuggle a sensitive value into a function. */
  private processParameter(node: ts.ParameterDeclaration): void {
    const init = node.initializer;
    if (init && this.isTainted(init)) {
      this.bindNames(node.name, [`default value ${this.describe(init)}`]);
    }
  }

  private processBinaryExpression(node: ts.BinaryExpression): void {
    const token = node.operatorToken.kind;
    if (token === ts.SyntaxKind.EqualsToken || token === ts.SyntaxKind.QuestionQuestionEqualsToken) {
      const rhsReasons = this.taintReasons(node.right);
      if (rhsReasons.length === 0) {
        return;
      }
      const lhs = node.left;
      if (ts.isIdentifier(lhs)) {
        this.addTaint(lhs.text, `assigned ${this.describe(node.right)}`);
      } else if (ts.isPropertyAccessExpression(lhs) || ts.isElementAccessExpression(lhs)) {
        this.addTaint(lhs.getText(this.analysis.sf), `assigned ${this.describe(node.right)}`);
      } else {
        const pattern = ts.isParenthesizedExpression(lhs) ? lhs.expression : lhs;
        if (ts.isObjectBindingPattern(pattern) || ts.isArrayBindingPattern(pattern)) {
          this.bindNames(pattern, rhsReasons);
        }
      }
      return;
    }
    if (token === ts.SyntaxKind.PlusEqualsToken) {
      const lhs = node.left;
      if ((ts.isIdentifier(lhs) || ts.isPropertyAccessExpression(lhs)) && this.isTainted(node.right)) {
        this.addTaint(lhs.getText(this.analysis.sf), `compound-assigned ${this.describe(node.right)}`);
      }
      return;
    }
  }

  private processPropertyAccess(node: ts.PropertyAccessExpression): void {
    const name = node.name.text;
    const base = node.expression;
    if (ts.isIdentifier(base) && base.text === "process" && name === "env") {
      return; // process.env base is handled by taintReasons
    }
    const baseReasons = this.taintReasons(base);
    if (baseReasons.length > 0) {
      this.addTaint(node.getText(this.analysis.sf), `read ${this.describe(node)}`);
    } else if (this.matchesAny(name, this.memberRE)) {
      // Sensitive member read even when the base object is unknown:
      // `user.password` / `config.apiKey` taint by expression text.
      this.addTaint(node.getText(this.analysis.sf), `read of "….${name}" (sensitive member)`);
    }
  }

  private processCallLike(node: ts.CallExpression | ts.NewExpression | ts.TaggedTemplateExpression): void {
    if (ts.isCallExpression(node)) {
      this.checkExternalSink(node);
    }
    // Taint the callee identifier so later calls reuse the reasoning.
    if (ts.isCallExpression(node) && ts.isIdentifier(node.expression)) {
      const reasons = this.taintReasons(node.expression);
      if (reasons.length > 0) {
        this.addTaint(node.expression.text, `result of call ${this.describe(node)}`);
      }
    }
  }

  private calleeText(node: ts.CallExpression): string {
    return node.expression.getText(this.analysis.sf);
  }

  private checkExternalSink(node: ts.CallExpression): void {
    const callee = this.calleeText(node);
    if (!this.sinkRE.some((re) => re.test(callee))) {
      return;
    }
    for (const arg of node.arguments) {
      const reasons = this.taintReasons(arg);
      if (reasons.length > 0) {
        this.emit(
          node,
          RULES.EXTERNAL_SINK,
          "warning",
          `Sensitive value flows into external sink ${this.describe(node)}`,
          reasons,
        );
        return;
      }
    }
  }

  private isExportedDeclaration(node: ts.VariableStatement | ts.FunctionDeclaration | ts.ClassDeclaration): boolean {
    return (ts.getCombinedModifierFlags(node as ts.Declaration) & ts.ModifierFlags.Export) !== 0;
  }

  private checkExportedDeclarations(node: ts.VariableStatement | ts.FunctionDeclaration | ts.ClassDeclaration): void {
    if (!this.isExportedDeclaration(node) || !this.analysis.serverReason) {
      return;
    }
    const checkName = (name: ts.Identifier): void => {
      const reasons = this.taintReasons(name);
      if (reasons.length > 0) {
        this.emit(
          node,
          RULES.SERVER_ONLY_EXPORT,
          "error",
          `Server module exports sensitive ${ts.isFunctionDeclaration(node) ? "function" : ts.isClassDeclaration(node) ? "class" : "value"} "${name.text}"`,
          reasons,
        );
      }
    };
    if (ts.isVariableStatement(node)) {
      for (const decl of node.declarationList.declarations) {
        if (ts.isIdentifier(decl.name)) {
          checkName(decl.name);
        }
      }
    } else if (node.name) {
      checkName(node.name);
    }
  }

  private processExport(node: ts.ExportDeclaration | ts.ExportAssignment): void {
    this.indexReExport(node);
    if (!this.analysis.serverReason) {
      return;
    }
    if (ts.isExportAssignment(node)) {
      if (node.isExportEquals) {
        return; // `export = ...` — not part of the ESM boundary model
      }
      const reasons = this.taintReasons(node.expression);
      if (reasons.length > 0) {
        this.emit(
          node,
          RULES.SERVER_ONLY_EXPORT,
          "error",
          "Server module exports sensitive value as default export",
          reasons,
        );
      }
      return;
    }
    if (!node.exportClause) {
      this.emitStarReExport(node);
      return;
    }
    if (ts.isNamespaceExport(node.exportClause)) {
      const name = node.exportClause.name.text;
      const reasons = this.taintReasons(node.exportClause.name);
      const namespaceReasons = reasons.length > 0 ? reasons : this.starNamespaceReasons(name);
      // `export * as ns from "./mod"` always carries the namespace binding,
      // even when an unrelated local `ns` currently shadows it for taint
      // purposes: namespace member taint (e.g. a sensitive property read on
      // the source module) is resolved through the target module instead.
      const emitReasons = reasons.length > 0 ? reasons : namespaceReasons;
      if (emitReasons.length > 0) {
        this.emit(
          node,
          RULES.SERVER_ONLY_EXPORT,
          "error",
          `Server module re-exports sensitive namespace "${name}"`,
          emitReasons,
        );
      }
      return;
    }
    for (const el of node.exportClause.elements) {
      const local = el.propertyName ?? el.name;
      let reasons = this.taintReasons(local);
      if (reasons.length === 0 && node.moduleSpecifier) {
        // `export { x } from "./mod"`: resolve through the source module so
        // re-exported sensitive values are flagged on the barrel as well.
        reasons = this.reExportedReasons(node.moduleSpecifier, local.text, new Set([this.analysis.file]));
      }
      if (reasons.length > 0) {
        this.emit(
          node,
          RULES.SERVER_ONLY_EXPORT,
          "error",
          `Server module exports sensitive value${local.text !== el.name.text ? ` as "${el.name.text}"` : ""}`,
          reasons,
        );
      }
    }
  }

  /**
   * Record re-export edges for the cross-file traversal: `export * from`
   * sources, `export { x } from` name mappings, and `export * as ns from`
   * namespace bindings. Import/export specifiers resolve exactly like imports
   * (relative + `pathAliases`), and unresolvable or unscanned targets are
   * ignored. Safe to run on every pass (edge sets only grow).
   */
  private indexReExport(node: ts.ExportDeclaration | ts.ExportAssignment): void {
    if (!ts.isExportDeclaration(node) || !node.moduleSpecifier || !ts.isStringLiteral(node.moduleSpecifier)) {
      return;
    }
    const resolved = resolveImport(this.analysis.file, node.moduleSpecifier.text, this.config, this.rootDir);
    if (!resolved) {
      return;
    }
    if (!node.exportClause) {
      // `export * from "./mod"`
      this.analysis.starReExports.add(resolved);
      return;
    }
    if (ts.isNamespaceExport(node.exportClause)) {
      // `export * as ns from "./mod"`
      this.analysis.starNamespaces.set(node.exportClause.name.text, resolved);
      return;
    }
    for (const el of node.exportClause.elements) {
      const local = el.propertyName ?? el.name;
      if (ts.isIdentifier(local) && ts.isIdentifier(el.name)) {
        this.analysis.reExportBindings.set(el.name.text, { file: resolved, local: local.text });
      }
    }
  }

  /**
   * Follow a barrel's `export *` chain to the file where `name` is declared,
   * then return that declaration's taint reasons. Follows `export { x }`
   * hops along the way; visited files guard against re-export cycles.
   */
  private reExportedReasons(
    specifier: ts.Expression,
    name: string,
    visited: Set<string>,
  ): string[] {
    if (!ts.isStringLiteral(specifier)) {
      return [];
    }
    const resolved = resolveImport(this.analysis.file, specifier.text, this.config, this.rootDir);
    if (!resolved) {
      return [];
    }
    return this.exportedNameReasons(resolved, name, visited);
  }

  /** Taint provenance for exported `name` in `file`, following barrel hops. */
  private exportedNameReasons(file: string, name: string, visited: Set<string>): string[] {
    if (visited.has(file)) {
      return [];
    }
    visited.add(file);
    const target = this.analyses.get(file);
    if (!target) {
      return [];
    }
    // Direct declaration in the target file wins over further hops.
    if (this.isExportedName(target, name)) {
      return this.taintReasonsFor(target, name);
    }
    const hop = target.reExportBindings.get(name);
    if (hop && !visited.has(hop.file)) {
      const reasons = this.exportedNameReasons(hop.file, hop.local, visited);
      if (reasons.length > 0) {
        return reasons;
      }
    }
    for (const star of target.starReExports) {
      const reasons = this.exportedNameReasons(star, name, visited);
      if (reasons.length > 0) {
        return reasons;
      }
    }
    return [];
  }

  /** Whether `name` is declared (and exported) in `target`'s own source. */
  private isExportedName(target: FileAnalysis, name: string): boolean {
    for (const statement of target.sf.statements) {
      if (
        (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
        (ts.getCombinedModifierFlags(statement as ts.Declaration) & ts.ModifierFlags.Export) !== 0
      ) {
        if (ts.isVariableStatement(statement)) {
          if (
            statement.declarationList.declarations.some(
              (decl) => ts.isIdentifier(decl.name) && decl.name.text === name,
            )
          ) {
            return true;
          }
        } else if (statement.name?.text === name) {
          return true;
        }
      }
      if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        if (!statement.moduleSpecifier) {
          for (const el of statement.exportClause.elements) {
            const local = el.propertyName ?? el.name;
            if (ts.isIdentifier(el.name) && el.name.text === name && this.locallyDeclared(target, local.text)) {
              return true;
            }
          }
        }
      }
    }
    return false;
  }

  private locallyDeclared(target: FileAnalysis, name: string): boolean {
    for (const statement of target.sf.statements) {
      if (ts.isVariableStatement(statement)) {
        if (statement.declarationList.declarations.some((decl) => ts.isIdentifier(decl.name) && decl.name.text === name)) {
          return true;
        }
      } else if (
        (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
        statement.name?.text === name
      ) {
        return true;
      } else if (ts.isImportDeclaration(statement)) {
        const clause = statement.importClause;
        if (clause?.name?.text === name) {
          return true;
        }
        const named = clause?.namedBindings;
        if (named) {
          if (ts.isNamespaceImport(named) && named.name.text === name) {
            return true;
          }
          if (ts.isNamedImports(named) && named.elements.some((el) => el.name.text === name)) {
            return true;
          }
        }
      }
    }
    return false;
  }

  private taintReasonsFor(target: FileAnalysis, name: string): string[] {
    const tracked = target.taint.get(name);
    if (tracked) {
      return tracked.slice(0, 3);
    }
    const serverBinding = target.serverBindings.get(name);
    if (serverBinding) {
      return [`binding from server module "${serverBinding}"`];
    }
    return [];
  }

  /**
   * Taint provenance for `export * as ns from` namespaces: the target
   * module's own taint for `ns` if present, else the first sensitive export
   * flowing through its re-export chain (cycle-safe).
   */
  private starNamespaceReasons(name: string): string[] {
    const targetFile = this.analysis.starNamespaces.get(name);
    if (!targetFile) {
      return [];
    }
    const target = this.analyses.get(targetFile);
    if (!target) {
      return [];
    }
    const tracked = target.taint.get(name);
    if (tracked) {
      return tracked.slice(0, 3);
    }
    return this.firstStarExportReasons(target, new Set([this.analysis.file, targetFile]));
  }

  private firstStarExportReasons(target: FileAnalysis, visited: Set<string>): string[] {
    for (const statement of target.sf.statements) {
      if (
        (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
        (ts.getCombinedModifierFlags(statement as ts.Declaration) & ts.ModifierFlags.Export) !== 0
      ) {
        if (ts.isVariableStatement(statement)) {
          for (const decl of statement.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              const reasons = this.taintReasonsFor(target, decl.name.text);
              if (reasons.length > 0) {
                return reasons;
              }
            }
          }
        } else if (
          (ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
          statement.name
        ) {
          const reasons = this.taintReasonsFor(target, statement.name.text);
          if (reasons.length > 0) {
            return reasons;
          }
        }
      }
      if (
        ts.isExportDeclaration(statement) &&
        statement.exportClause &&
        ts.isNamedExports(statement.exportClause) &&
        !statement.moduleSpecifier
      ) {
        for (const el of statement.exportClause.elements) {
          const local = el.propertyName ?? el.name;
          if (ts.isIdentifier(local)) {
            const reasons = this.taintReasonsFor(target, local.text);
            if (reasons.length > 0) {
              return reasons;
            }
          }
        }
      }
    }
    for (const hop of target.reExportBindings.values()) {
      if (visited.has(hop.file)) {
        continue;
      }
      visited.add(hop.file);
      const next = this.analyses.get(hop.file);
      if (next) {
        const reasons = this.firstStarExportReasons(next, visited);
        if (reasons.length > 0) {
          return reasons;
        }
      }
    }
    for (const star of target.starReExports) {
      if (visited.has(star)) {
        continue;
      }
      visited.add(star);
      const next = this.analyses.get(star);
      if (next) {
        const reasons = this.firstStarExportReasons(next, visited);
        if (reasons.length > 0) {
          return reasons;
        }
      }
    }
    return [];
  }

  /**
   * Emit `rsc/server-only-export` for names this barrel's `export *` chain
   * re-exports while sensitive in their declaring module. Names shadowed by a
   * local declaration or a named re-export keep their local meaning and are
   * skipped here (they are still checked through the normal export paths);
   * cycles and unresolvable targets contribute nothing.
   */
  private emitStarReExport(node: ts.ExportDeclaration): void {
    for (const { name, reasons } of this.collectStarExportReasons(new Set([this.analysis.file]))) {
      this.emit(
        node,
        RULES.SERVER_ONLY_EXPORT,
        "error",
        `Server module re-exports sensitive value "${name}"`,
        reasons,
      );
    }
  }

  private collectStarExportReasons(
    visited: Set<string>,
  ): Array<{ name: string; reasons: string[] }> {
    const collected = new Map<string, string[]>();
    const seenNames = new Set<string>();
    for (const statement of this.analysis.sf.statements) {
      if (
        (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
        (ts.getCombinedModifierFlags(statement as ts.Declaration) & ts.ModifierFlags.Export) !== 0
      ) {
        if (ts.isVariableStatement(statement)) {
          for (const decl of statement.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              seenNames.add(decl.name.text);
            }
          }
        } else if (statement.name) {
          seenNames.add(statement.name.text);
        }
      }
      if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const el of statement.exportClause.elements) {
          if (ts.isIdentifier(el.name)) {
            seenNames.add(el.name.text);
          }
        }
        if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
          const hopTarget = resolveImport(
            this.analysis.file,
            statement.moduleSpecifier.text,
            this.config,
            this.rootDir,
          );
          if (hopTarget) {
            for (const { name, reasons } of this.starExportedNames(hopTarget, visited)) {
              if (!seenNames.has(name) && !collected.has(name)) {
                collected.set(name, reasons);
              }
            }
          }
        }
      }
    }
    for (const star of this.analysis.starReExports) {
      for (const { name, reasons } of this.starExportedNames(star, visited)) {
        if (!seenNames.has(name) && !collected.has(name)) {
          collected.set(name, reasons);
        }
      }
    }
    return [...collected.entries()].map(([name, reasons]) => ({ name, reasons }));
  }

  /**
   * Sensitive names visible through `file`'s own declarations plus its full
   * re-export chain (`export { x }` hops and nested `export *`), each paired
   * with the declaring module's taint provenance.
   */
  private starExportedNames(
    file: string,
    visited: Set<string>,
  ): Array<{ name: string; reasons: string[] }> {
    if (visited.has(file)) {
      return [];
    }
    visited.add(file);
    const target = this.analyses.get(file);
    if (!target) {
      return [];
    }
    const exported = new Map<string, string[]>();
    for (const statement of target.sf.statements) {
      if (
        (ts.isVariableStatement(statement) || ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) &&
        (ts.getCombinedModifierFlags(statement as ts.Declaration) & ts.ModifierFlags.Export) !== 0
      ) {
        if (ts.isVariableStatement(statement)) {
          for (const decl of statement.declarationList.declarations) {
            if (ts.isIdentifier(decl.name)) {
              const reasons = this.taintReasonsFor(target, decl.name.text);
              if (reasons.length > 0) {
                exported.set(decl.name.text, reasons);
              }
            }
          }
        } else if (statement.name) {
          const reasons = this.taintReasonsFor(target, statement.name.text);
          if (reasons.length > 0) {
            exported.set(statement.name.text, reasons);
          }
        }
      }
      if (ts.isExportDeclaration(statement) && statement.exportClause && ts.isNamedExports(statement.exportClause)) {
        for (const el of statement.exportClause.elements) {
          const local = el.propertyName ?? el.name;
          if (!ts.isIdentifier(el.name)) {
            continue;
          }
          if (!statement.moduleSpecifier) {
            if (ts.isIdentifier(local)) {
              const reasons = this.taintReasonsFor(target, local.text);
              if (reasons.length > 0) {
                exported.set(el.name.text, reasons);
              }
            }
            continue;
          }
          if (ts.isStringLiteral(statement.moduleSpecifier) && ts.isIdentifier(local)) {
            const hopResolved = resolveImport(target.file, statement.moduleSpecifier.text, this.config, this.rootDir);
            if (hopResolved) {
              const hopWalker = new FileWalker(target, this.analyses, this.clientFiles, this.config, this.rootDir, this.emitFindings);
              const reasons = hopWalker.exportedNameReasons(hopResolved, local.text, visited);
              if (reasons.length > 0 && !exported.has(el.name.text)) {
                exported.set(el.name.text, reasons);
              }
            }
          }
        }
      }
    }
    for (const star of target.starReExports) {
      for (const { name, reasons } of this.starExportedNames(star, visited)) {
        if (!exported.has(name)) {
          exported.set(name, reasons);
        }
      }
    }
    return [...exported.entries()].map(([name, reasons]) => ({ name, reasons }));
  }

  /**
   * Resolve a JSX tag to a locally-imported client component, if any.
   *
   * Supports plain identifier tags (`<Card>`) and member-expression tags
   * (`<Card.Header>`, `<Panel.Item>`, `<UI.Card.Body>`) whose leftmost
   * identifier is a client-component binding or namespace import. Namespace
   * imports of barrels that re-export a client component (`import * as UI
   * from "./barrel"` where the barrel does `export * from "./card"`) resolve
   * through the same barrel traversal. Intrinsic host elements (lowercase
   * tags) and unknown components are skipped.
   */
  private resolveClientTag(tag: ts.JsxTagNameExpression): { text: string; file: string } | null {
    if (!ts.isIdentifier(tag) && !ts.isPropertyAccessExpression(tag)) {
      return null; // namespaced names (<svg:path>) are not component refs
    }
    let base: ts.Expression = tag;
    while (ts.isPropertyAccessExpression(base)) {
      base = base.expression;
    }
    if (!ts.isIdentifier(base) || /^[a-z]/.test(base.text)) {
      return null; // intrinsic host element or non-identifier tag
    }
    const direct = this.analysis.elementToFile.get(base.text);
    if (direct && this.resolveClientTarget(direct)) {
      return { text: tag.getText(this.analysis.sf), file: direct };
    }
    // `import * as UI from "./barrel"` where the barrel re-exports a client
    // component: any member of the namespace may be a client boundary.
    const namespaceFile = this.analysis.namespaceImports.get(base.text);
    if (namespaceFile && this.resolveClientTarget(namespaceFile)) {
      return { text: tag.getText(this.analysis.sf), file: namespaceFile };
    }
    return null; // not a local "use client" component
  }

  /**
   * Resolve an identifier through this file's own re-export edges (used when
   * `processExport` checks `export { x }` of a local): named `export { x }
   * from` hops and `export *` chains, cycle-safe. Returns the declaring
   * module's taint provenance (or `[]` when the name is local/unresolvable).
   */
  private resolveLocalReExport(name: string, depth: number): string[] {
    if (depth > 20) {
      return [];
    }
    const hop = this.analysis.reExportBindings.get(name);
    if (hop) {
      const reasons = this.exportedNameReasons(hop.file, hop.local, new Set([this.analysis.file]));
      if (reasons.length > 0) {
        return reasons;
      }
    }
    for (const star of this.analysis.starReExports) {
      const reasons = this.exportedNameReasons(star, name, new Set([this.analysis.file]));
      if (reasons.length > 0) {
        return reasons;
      }
    }
    return [];
  }

  /**
   * Resolve `ns.member` where `ns` is a namespace import of a scanned module:
   * follow the member through the target's export chain (named hops and
   * `export *`), including `export * as ns from` indirection. Falls back to
   * `[]` so ordinary sensitive-member matching still applies.
   */
  private resolveNamespaceMember(namespace: string, member: string): string[] {
    const namespaceFile = this.analysis.namespaceImports.get(namespace)
      ?? this.analysis.starNamespaces.get(namespace);
    if (!namespaceFile) {
      return [];
    }
    return this.exportedNameReasons(namespaceFile, member, new Set([this.analysis.file]));
  }

  /**
   * Resolve a module through barrel re-exports to the file that should count
   * for client-component detection: the module itself when it is a client
   * file, else the first `export *` target that (transitively) is one.
   * Named re-export hops are import bindings, not components, so they do not
   * redirect the lookup. Cycles and unresolvable targets yield `null`.
   */
  private resolveClientTarget(resolved: string): string | null {
    if (this.clientFiles.has(resolved)) {
      return resolved;
    }
    const seen = new Set<string>([this.analysis.file, resolved]);
    const queue: string[] = [resolved];
    while (queue.length > 0) {
      const current = queue.shift() as string;
      const target = this.analyses.get(current);
      if (!target) {
        continue;
      }
      for (const star of target.starReExports) {
        if (seen.has(star)) {
          continue;
        }
        seen.add(star);
        if (this.clientFiles.has(star)) {
          return star;
        }
        queue.push(star);
      }
    }
    return null;
  }

  private processJsx(node: ts.JsxElement | ts.JsxSelfClosingElement): void {
    if (this.analysis.isClient) {
      return; // already in the browser; upstream sources were flagged elsewhere
    }
    const opening = ts.isJsxSelfClosingElement(node) ? node : node.openingElement;
    const resolved = this.resolveClientTag(opening.tagName);
    if (!resolved) {
      return; // intrinsic host element or not a local "use client" component
    }
    const tagText = resolved.text;

    for (const property of opening.attributes.properties) {
      if (ts.isJsxAttribute(property)) {
        const initializer = property.initializer;
        const expr = initializer && ts.isJsxExpression(initializer) ? initializer.expression : undefined;
        const propName = ts.isIdentifier(property.name) ? property.name.text : property.getText(this.analysis.sf);
        if (expr) {
          const reasons = this.taintReasons(expr);
          if (reasons.length > 0) {
            this.emit(
              node,
              RULES.CLIENT_BOUNDARY_PROP,
              "error",
              `Sensitive value flows into client component <${tagText}> prop "${propName}"`,
              reasons,
            );
          }
        }
      } else if (ts.isJsxSpreadAttribute(property)) {
        const reasons = this.taintReasons(property.expression);
        if (reasons.length > 0) {
          this.emit(
            node,
            RULES.CLIENT_BOUNDARY_PROP,
            "error",
            `Sensitive values spread into client component <${tagText}>`,
            reasons,
          );
        }
      }
    }

    if (ts.isJsxElement(node)) {
      for (const child of node.children) {
        if (ts.isJsxExpression(child) && child.expression) {
          const reasons = this.taintReasons(child.expression);
          if (reasons.length > 0) {
            this.emit(
              node,
              RULES.CLIENT_BOUNDARY_PROP,
              "error",
              `Sensitive value is rendered inside client component <${tagText}>`,
              reasons,
            );
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Taint evaluation
  // -------------------------------------------------------------------------

  private isTainted(node: ts.Node): boolean {
    return this.taintReasons(node).length > 0;
  }

  private taintReasons(node: ts.Node): string[] {
    return this.taintReasonsWorker(node, 0);
  }

  private taintReasonsWorker(node: ts.Node, depth: number): string[] {
    if (depth > 24) {
      return [];
    }
    switch (node.kind) {
      case ts.SyntaxKind.Identifier: {
        const id = node as ts.Identifier;
        const tracked = this.analysis.taint.get(id.text);
        if (tracked) {
          return tracked.slice(0, 3);
        }
        const serverBinding = this.analysis.serverBindings.get(id.text);
        if (serverBinding) {
          return [`binding from server module "${serverBinding}"`];
        }
        const reExported = this.resolveLocalReExport(id.text, depth);
        if (reExported.length > 0) {
          return reExported;
        }
        const nameReason = this.matchesAny(id.text, this.identifierRE);
        return nameReason ? [`identifier "${nameReason}" (sensitive name)`] : [];
      }
      case ts.SyntaxKind.PropertyAccessExpression: {
        const access = node as ts.PropertyAccessExpression;
        const base = access.expression;
        const name = access.name.text;
        if (ts.isIdentifier(base) && base.text === "process") {
          return [name === "env" ? "process.env" : `process.env.${name}`];
        }
        const tracked = this.analysis.taint.get(access.getText(this.analysis.sf));
        if (tracked) {
          return tracked.slice(0, 3);
        }
        if (ts.isIdentifier(base)) {
          const namespaceReasons = this.resolveNamespaceMember(base.text, name);
          if (namespaceReasons.length > 0) {
            return namespaceReasons;
          }
        }
        const baseReasons = this.taintReasonsWorker(base, depth + 1);
        if (baseReasons.length > 0) {
          return baseReasons.slice(0, 3);
        }
        const memberReason = this.matchesAny(name, this.memberRE);
        return memberReason ? [`read of "….${memberReason}" (sensitive member)`] : [];
      }
      case ts.SyntaxKind.ElementAccessExpression: {
        const access = node as ts.ElementAccessExpression;
        const tracked = this.analysis.taint.get(access.getText(this.analysis.sf));
        if (tracked) {
          return tracked.slice(0, 3);
        }
        return this.taintReasonsWorker(access.expression, depth + 1);
      }
      case ts.SyntaxKind.CallExpression:
      case ts.SyntaxKind.NewExpression: {
        const call = node as ts.CallExpression | ts.NewExpression;
        for (const arg of call.arguments ?? []) {
          const argReasons = this.taintReasonsWorker(arg, depth + 1);
          if (argReasons.length > 0) {
            return argReasons.slice(0, 3);
          }
        }
        const calleeReasons = this.taintReasonsWorker(call.expression, depth + 1);
        if (calleeReasons.length > 0) {
          return calleeReasons.slice(0, 3);
        }
        if (ts.isCallExpression(call)) {
          const callee = call.expression.getText(this.analysis.sf);
          if (this.callRE.some((re) => re.test(callee))) {
            return [`call ${callee} (data source)`];
          }
          if (
            this.analysis.serverReason &&
            ts.isIdentifier(call.expression) &&
            /^(cookies|headers|draftMode)$/.test(call.expression.text)
          ) {
            return [`${call.expression.text}() (per-request server data)`];
          }
        }
        return [];
      }
      case ts.SyntaxKind.TaggedTemplateExpression: {
        const tagged = node as ts.TaggedTemplateExpression;
        const tagText = tagged.tag.getText(this.analysis.sf);
        if (this.callRE.some((re) => re.test(tagText))) {
          return [`tagged template ${tagText} (data source)`];
        }
        const template = tagged.template;
        if (ts.isNoSubstitutionTemplateLiteral(template)) {
          return [];
        }
        for (const span of template.templateSpans) {
          const reasons = this.taintReasonsWorker(span.expression, depth + 1);
          if (reasons.length > 0) {
            return reasons.slice(0, 3);
          }
        }
        return [];
      }
      case ts.SyntaxKind.TemplateExpression: {
        const template = node as ts.TemplateExpression;
        for (const span of template.templateSpans) {
          const reasons = this.taintReasonsWorker(span.expression, depth + 1);
          if (reasons.length > 0) {
            return reasons.slice(0, 3);
          }
        }
        return [];
      }
      case ts.SyntaxKind.BinaryExpression: {
        const binary = node as ts.BinaryExpression;
        const op = binary.operatorToken.kind;
        if (
          op === ts.SyntaxKind.PlusToken ||
          op === ts.SyntaxKind.QuestionQuestionToken ||
          op === ts.SyntaxKind.AmpersandAmpersandToken ||
          op === ts.SyntaxKind.BarBarToken
        ) {
          const left = this.taintReasonsWorker(binary.left, depth + 1);
          if (left.length > 0) {
            return left.slice(0, 3);
          }
          return this.taintReasonsWorker(binary.right, depth + 1);
        }
        return [];
      }
      case ts.SyntaxKind.ConditionalExpression: {
        const cond = node as ts.ConditionalExpression;
        for (const part of [cond.condition, cond.whenTrue, cond.whenFalse]) {
          const reasons = this.taintReasonsWorker(part, depth + 1);
          if (reasons.length > 0) {
            return reasons.slice(0, 3);
          }
        }
        return [];
      }
      case ts.SyntaxKind.ParenthesizedExpression: {
        return this.taintReasonsWorker((node as ts.ParenthesizedExpression).expression, depth + 1);
      }
      case ts.SyntaxKind.PostfixUnaryExpression:
      case ts.SyntaxKind.PrefixUnaryExpression: {
        return this.taintReasonsWorker((node as ts.PostfixUnaryExpression).operand, depth + 1);
      }
      case ts.SyntaxKind.AsExpression:
      case ts.SyntaxKind.TypeAssertionExpression:
      case ts.SyntaxKind.NonNullExpression: {
        const asserted = node as
          | ts.AsExpression
          | ts.TypeAssertion
          | ts.NonNullExpression;
        return this.taintReasonsWorker(asserted.expression, depth + 1);
      }
      case ts.SyntaxKind.SatisfiesExpression: {
        return this.taintReasonsWorker((node as ts.SatisfiesExpression).expression, depth + 1);
      }
      case ts.SyntaxKind.AwaitExpression: {
        return this.taintReasonsWorker((node as ts.AwaitExpression).expression, depth + 1);
      }
      case ts.SyntaxKind.SpreadElement: {
        return this.taintReasonsWorker((node as ts.SpreadElement).expression, depth + 1);
      }
      case ts.SyntaxKind.ObjectLiteralExpression: {
        const object = node as ts.ObjectLiteralExpression;
        for (const prop of object.properties) {
          if (ts.isPropertyAssignment(prop)) {
            const reasons = this.taintReasonsWorker(prop.initializer, depth + 1);
            if (reasons.length > 0) {
              return reasons.slice(0, 3);
            }
          } else if (ts.isSpreadAssignment(prop)) {
            const reasons = this.taintReasonsWorker(prop.expression, depth + 1);
            if (reasons.length > 0) {
              return reasons.slice(0, 3);
            }
          } else if (ts.isShorthandPropertyAssignment(prop)) {
            // `{ secret }` reads the binding `secret`; taint the whole
            // literal when the binding is tainted so `{ secret }.secret`
            // and spreads stay flagged.
            const reasons = this.taintReasonsWorker(prop.name, depth + 1);
            if (reasons.length > 0) {
              return reasons.slice(0, 3);
            }
          }
        }
        return [];
      }
      case ts.SyntaxKind.ArrayLiteralExpression: {
        const array = node as ts.ArrayLiteralExpression;
        for (const element of array.elements) {
          const reasons = this.taintReasonsWorker(element, depth + 1);
          if (reasons.length > 0) {
            return reasons.slice(0, 3);
          }
        }
        return [];
      }
      default:
        return [];
    }
  }
}
