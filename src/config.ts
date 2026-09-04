/**
 * Configuration model for rsc-boundary.
 *
 * A config file (`.rscboundaryrc.json` or `rscboundary.config.json`) can be
 * placed at the scan root or any parent directory. Field semantics are
 * documented in `docs/specs/core-taint-analysis.md`.
 */

import * as fs from "fs";
import * as path from "path";

export interface Suppression {
  /** Substring matched (case-sensitive) against the finding's file path. */
  file?: string;
  /** Rule id to suppress, e.g. "rsc/server-only-export". */
  ruleId?: string;
  /** Substring matched against the finding's message. */
  message?: string;
  /** Exact 1-based line to suppress. */
  line?: number;
}

export interface RscBoundaryConfig {
  /** Identifier name patterns (regex, case-insensitive) treated as sensitive values. */
  sensitiveIdentifiers?: string[];
  /** Property name patterns (regex, case-insensitive) treated as sensitive when read, e.g. `user.password`. */
  sensitiveMembers?: string[];
  /** Regex patterns for callee expressions that produce sensitive data, e.g. `^db\\.`. */
  sourceCalls?: string[];
  /** Import specifier patterns whose module bindings are treated as server-only / tainted. */
  serverModules?: string[];
  /** Regex patterns for callee expressions that are external sinks, e.g. `^console\\.log`. */
  externalSinks?: string[];
  /** tsconfig-style path aliases used to resolve non-relative import specifiers:
   * alias pattern -> replacement paths (relative to the project root). A `*`
   * wildcard in the alias captures a specifier segment that is substituted
   * into every `*` in its replacement paths, e.g. `"@/*": ["./*"]`. */
  pathAliases?: Record<string, string[]>;
  /** Path substrings (relative to the scan root) to skip while scanning. */
  exclude?: string[];
  /** Findings to suppress. */
  suppress?: Suppression[];
}

export const CONFIG_FILE_NAMES = [".rscboundaryrc.json", "rscboundary.config.json"];

const DEFAULT_SENSITIVE_IDENTIFIERS = [
  "token",
  "password",
  "passwd",
  "secret",
  "api[_-]?key",
  "apikey",
  "credential",
  "private[_-]?key",
  "access[_-]?token",
  "session[_-]?id",
  "authorization",
  "bearer",
  "auth[_-]?token",
];

const DEFAULT_SOURCE_CALLS = [
  "^db\\.",
  "^prisma\\.",
  "^pool\\.",
  "^sql\\b",
  "^supabase\\.",
  "^createClient\\b",
];

const DEFAULT_SERVER_MODULES = [
  "^server-only$",
  "^(next/headers|next/cookies|next/server)$",
  "^@/server",
  "(^|\\/)(db|prisma|database|sql|server)([-_/]|\\.|$)",
];

const DEFAULT_EXTERNAL_SINKS = [
  "^console\\.(log|info|warn|error|debug|trace)$",
  "^alert\\b",
  "^postMessage\\b",
];

/** Next.js convention: `@/*` maps to the project root (tsconfig default). */
const DEFAULT_PATH_ALIASES: Record<string, string[]> = { "@/*": ["./*"] };

const DEFAULT_EXCLUDE = [".next", ".nuxt", "node_modules", "coverage"];

export function defaultConfig(): RscBoundaryConfig {
  return {
    sensitiveIdentifiers: [...DEFAULT_SENSITIVE_IDENTIFIERS],
    sensitiveMembers: [...DEFAULT_SENSITIVE_IDENTIFIERS],
    sourceCalls: [...DEFAULT_SOURCE_CALLS],
    serverModules: [...DEFAULT_SERVER_MODULES],
    externalSinks: [...DEFAULT_EXTERNAL_SINKS],
    pathAliases: { ...DEFAULT_PATH_ALIASES },
    exclude: [...DEFAULT_EXCLUDE],
    suppress: [],
  };
}

/** Shallow merge: overrides win key by key; arrays are replaced, not concatenated. */
export function mergeConfig(base: RscBoundaryConfig, overrides: RscBoundaryConfig): RscBoundaryConfig {
  const merged: RscBoundaryConfig = { ...base };
  for (const key of Object.keys(overrides) as Array<keyof RscBoundaryConfig>) {
    const value = overrides[key];
    if (value !== undefined) {
      (merged as Record<string, unknown>)[key] = value;
    }
  }
  return merged;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isPathAliases(value: unknown): value is Record<string, string[]> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  return Object.values(value).every(isStringArray);
}

function isSuppression(value: unknown): value is Suppression {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    (record.file === undefined || typeof record.file === "string") &&
    (record.ruleId === undefined || typeof record.ruleId === "string") &&
    (record.message === undefined || typeof record.message === "string") &&
    (record.line === undefined || typeof record.line === "number")
  );
}

function parseConfig(raw: unknown): RscBoundaryConfig | null {
  if (typeof raw !== "object" || raw === null) {
    return null;
  }
  const root = raw as Record<string, unknown>;
  const sources = (root.sources ?? {}) as Record<string, unknown>;
  const config: RscBoundaryConfig = {};
  const pickArray = (obj: Record<string, unknown>, key: string): string[] | undefined => {
    const value = obj[key];
    return isStringArray(value) ? value : undefined;
  };
  config.sensitiveIdentifiers = pickArray(sources, "sensitiveIdentifiers");
  config.sensitiveMembers = pickArray(sources, "sensitiveMembers");
  config.sourceCalls = pickArray(sources, "calls");
  config.serverModules = pickArray(sources, "serverModules");
  config.externalSinks = pickArray(root, "externalSinks");
  config.exclude = pickArray(root, "exclude");
  const pathAliases = root.pathAliases;
  if (isPathAliases(pathAliases)) {
    config.pathAliases = pathAliases;
  }
  const suppress = root.suppress;
  if (Array.isArray(suppress)) {
    const parsed = suppress.filter(isSuppression);
    if (parsed.length > 0) {
      config.suppress = parsed;
    }
  }
  return config;
}

export interface LoadedConfig {
  config: RscBoundaryConfig;
  configPath: string | null;
}

/** Find and parse a config file starting at `startDir`, walking up to the filesystem root. */
export function loadConfig(startDir: string): LoadedConfig {
  let dir = path.resolve(startDir);
  for (;;) {
    for (const name of CONFIG_FILE_NAMES) {
      const candidate = path.join(dir, name);
      if (fs.existsSync(candidate)) {
        const config = parseConfig(JSON.parse(fs.readFileSync(candidate, "utf8")));
        if (config) {
          return { config: mergeConfig(defaultConfig(), config), configPath: candidate };
        }
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      break;
    }
    dir = parent;
  }
  return { config: defaultConfig(), configPath: null };
}
