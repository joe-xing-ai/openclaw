/**
 * Redaction system: scan the codebase for content that looks like tokens,
 * keys, or secrets and report file path, line, category, and a masked snippet.
 */

export { runRedactionScan } from "./scanner.js";
export { getPatternRules, maskSnippet, MIN_MATCH_LENGTH } from "./patterns.js";
export type {
  RedactionFinding,
  RedactionScanOptions,
  RedactionScanResult,
  SuspiciousCategory,
} from "./types.js";
