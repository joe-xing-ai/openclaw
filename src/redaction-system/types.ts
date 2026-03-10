/**
 * Redaction system: detect content that looks like tokens, keys, or secrets
 * so it can be reported and removed before commit.
 */

export type SuspiciousCategory =
  | "env_assignment"
  | "json_token_field"
  | "bearer_token"
  | "long_base64_like"
  | "client_secret_like"
  | "known_token_prefix"
  | "oauth_code_like";

export type RedactionFinding = {
  path: string;
  line: number;
  category: SuspiciousCategory;
  /** Masked snippet for display (e.g. first 6 + "..." + last 4 chars). */
  snippet: string;
  /** Raw match length, for sorting. */
  matchLength: number;
};

export type RedactionScanOptions = {
  /** Glob patterns or paths to scan (default: repo source and scripts). */
  include?: string[];
  /** Paths to exclude (e.g. node_modules, dist). */
  exclude?: string[];
  /** Only scan changed files (git diff). */
  changedOnly?: boolean;
  /** Max file size in bytes to scan (default 512KB). */
  maxFileBytes?: number;
};

export type RedactionScanResult = {
  scannedFiles: number;
  skippedFiles: number;
  findings: RedactionFinding[];
};
