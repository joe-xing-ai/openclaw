/**
 * Scans files for content that looks like tokens, keys, or secrets.
 */

import fs from "node:fs/promises";
import path from "node:path";
import { getPatternRules, maskSnippet, MIN_MATCH_LENGTH } from "./patterns.js";
import type { RedactionFinding, RedactionScanOptions, RedactionScanResult } from "./types.js";

const DEFAULT_EXCLUDE = [
  "node_modules",
  "dist",
  ".git",
  "coverage",
  ".next",
  "build",
  ".cursor",
  "*.min.js",
  "*.bundle.js",
  "pnpm-lock.yaml",
  "package-lock.json",
  "yarn.lock",
];

const DEFAULT_MAX_FILE_BYTES = 512 * 1024;

const SCAN_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".json",
  ".sh",
  ".bash",
  ".yml",
  ".yaml",
  ".md",
  ".mdc",
]);

function shouldExclude(filePath: string, exclude: string[]): boolean {
  const normalized = filePath.replace(/\\/g, "/");
  for (const ex of exclude) {
    if (ex.includes("*")) {
      const base = path.basename(normalized);
      const pattern = ex.replace(/\*/g, ".*");
      if (new RegExp(`^${pattern}$`).test(base)) {
        return true;
      }
    } else if (normalized.includes(ex)) {
      return true;
    }
  }
  return false;
}

async function getChangedFiles(repoRoot: string): Promise<string[]> {
  const { execSync } = await import("node:child_process");
  try {
    const out = execSync("git diff --name-only HEAD", {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    const staged = execSync("git diff --cached --name-only", {
      cwd: repoRoot,
      encoding: "utf-8",
    });
    const set = new Set<string>();
    for (const p of out.split("\n").concat(staged.split("\n"))) {
      const t = p.trim();
      if (t) {
        set.add(path.join(repoRoot, t));
      }
    }
    return [...set];
  } catch {
    return [];
  }
}

async function collectFilesToScan(root: string, options: RedactionScanOptions): Promise<string[]> {
  const exclude = options.exclude ?? DEFAULT_EXCLUDE;
  const changedOnly = options.changedOnly === true;
  const include = options.include;

  if (changedOnly) {
    const changed = await getChangedFiles(root);
    return changed.filter(
      (p) => !shouldExclude(p, exclude) && SCAN_EXTENSIONS.has(path.extname(p)),
    );
  }

  if (include && include.length > 0) {
    const files: string[] = [];
    const walkDir = async (dir: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const e of entries) {
        const child = path.join(dir, e.name);
        if (e.isFile()) {
          if (SCAN_EXTENSIONS.has(path.extname(e.name)) && !shouldExclude(child, exclude)) {
            files.push(child);
          }
        } else if (e.isDirectory() && !e.name.startsWith(".") && !exclude.includes(e.name)) {
          await walkDir(child);
        }
      }
    };
    for (const inc of include) {
      const full = path.isAbsolute(inc) ? inc : path.join(root, inc);
      try {
        const st = await fs.stat(full);
        if (st.isFile()) {
          if (!shouldExclude(full, exclude)) {
            files.push(full);
          }
        } else if (st.isDirectory()) {
          await walkDir(full);
        }
      } catch {
        // skip missing paths
      }
    }
    return files;
  }

  const files: string[] = [];
  const walk = async (dir: string) => {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isFile()) {
        if (SCAN_EXTENSIONS.has(path.extname(e.name)) && !shouldExclude(full, exclude)) {
          files.push(full);
        }
      } else if (e.isDirectory() && !e.name.startsWith(".") && !exclude.includes(e.name)) {
        await walk(full);
      }
    }
  };
  await walk(root);
  return files;
}

function scanLine(
  line: string,
  lineNum: number,
  filePath: string,
  rules: ReturnType<typeof getPatternRules>,
): RedactionFinding[] {
  const findings: RedactionFinding[] = [];
  for (const { category, regex } of rules) {
    regex.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      const value = m[1] ?? m[0];
      if (value.length < MIN_MATCH_LENGTH) {
        continue;
      }
      findings.push({
        path: filePath,
        line: lineNum,
        category: category,
        snippet: maskSnippet(value),
        matchLength: value.length,
      });
    }
  }
  return findings;
}

export async function runRedactionScan(
  repoRoot: string,
  options: RedactionScanOptions = {},
): Promise<RedactionScanResult> {
  const rules = getPatternRules();
  const maxFileBytes = options.maxFileBytes ?? DEFAULT_MAX_FILE_BYTES;
  const files = await collectFilesToScan(repoRoot, options);
  const findings: RedactionFinding[] = [];
  let skippedFiles = 0;

  for (const filePath of files) {
    try {
      const st = await fs.stat(filePath);
      if (st.size > maxFileBytes) {
        skippedFiles++;
        continue;
      }
      const content = await fs.readFile(filePath, "utf-8");
      const lines = content.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        findings.push(...scanLine(lines[i], i + 1, filePath, rules));
      }
    } catch {
      skippedFiles++;
    }
  }

  return {
    scannedFiles: files.length,
    skippedFiles,
    findings,
  };
}
