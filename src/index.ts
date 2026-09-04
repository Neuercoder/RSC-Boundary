/**
 * rsc-boundary public API.
 *
 * Programmatic entry points mirror the CLI (docs/specs/core-taint-analysis.md):
 *
 *   const result = analyzeFiles(collectFiles(".", config), { config });
 */

export {
  analyzeFiles,
  collectFiles,
  resolveImport,
  resolveRelativeImport,
  RULES,
} from "./analyzer";
export type { AnalyzeOptions, AnalyzeResult, Finding } from "./analyzer";
export {
  CONFIG_FILE_NAMES,
  defaultConfig,
  loadConfig,
  mergeConfig,
} from "./config";
export type { LoadedConfig, RscBoundaryConfig, Suppression } from "./config";
