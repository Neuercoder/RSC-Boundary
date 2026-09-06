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
      const walker = new FileWalker(analysis, clientFiles, config, rootDir, false);
      changed = walker.run() || changed;
    }
    if (!changed) {
      break;
    }
  }

  // Final pass: emit findings against the settled taint sets.
  for (const analysis of analyses.values()) {
    new FileWalker(analysis, clientFiles, config, rootDir, true).run();
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

class FileWalker {
  private changed = false;
  private readonly patternsCache = new Map<string, RegExp>();

  constructor(
    private analysis: FileAnalysis,
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
    const resolved = resolveImport(this.analysis.file, specifier, this.config, this.rootDir);
    if (resolved && this.clientFiles.has(resolved)) {
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
        this.analysis.elementToFile.set(name, resolved);
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
      return; // `export * from "..."` — names would need re-export traversal
    }
    if (ts.isNamespaceExport(node.exportClause)) {
      const reasons = this.taintReasons(node.exportClause.name);
      if (reasons.length > 0) {
        this.emit(
          node,
          RULES.SERVER_ONLY_EXPORT,
          "error",
          `Server module re-exports sensitive namespace "${node.exportClause.name.text}"`,
          reasons,
        );
      }
      return;
    }
    for (const el of node.exportClause.elements) {
      const local = el.propertyName ?? el.name;
      const reasons = this.taintReasons(local);
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

  /**
   * Resolve a JSX tag to a locally-imported client component, if any.
   *
   * Supports plain identifier tags (`<Card>`) and member-expression tags
   * (`<Card.Header>`, `<Panel.Item>`, `<UI.Card.Body>`) whose leftmost
   * identifier is a client-component binding or namespace import. Intrinsic
   * host elements (lowercase tags) and unknown components are skipped.
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
    const targetFile = this.analysis.elementToFile.get(base.text);
    if (!targetFile || !this.clientFiles.has(targetFile)) {
      return null; // not a local "use client" component
    }
    return { text: tag.getText(this.analysis.sf), file: targetFile };
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
