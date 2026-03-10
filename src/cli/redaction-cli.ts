import path from "node:path";
import type { Command } from "commander";
import { runRedactionScan } from "../redaction-system/index.js";
import { isRich, theme } from "../terminal/theme.js";
import { formatHelpExamples } from "./help-format.js";

export function registerRedactionCli(program: Command) {
  const redaction = program
    .command("redaction")
    .description("Scan for tokens, keys, or secret-like content in the codebase")
    .addHelpText(
      "after",
      () =>
        `\n${theme.heading("Examples:")}\n${formatHelpExamples([
          ["openclaw redaction scan", "Scan full repo (src, scripts, extensions, docs)."],
          ["openclaw redaction scan --changed", "Scan only changed files (git diff)."],
          ["openclaw redaction scan --json", "Output findings as JSON."],
        ])}\n`,
    );

  redaction
    .command("scan")
    .description("Scan files for content that looks like tokens or keys")
    .option("--changed", "Only scan changed files (git diff + staged)", false)
    .option("--json", "Output findings as JSON", false)
    .option("--root <path>", "Repo root (default: cwd)", process.cwd())
    .action(async (opts: { changed?: boolean; json?: boolean; root?: string }) => {
      const root = path.resolve(opts.root ?? process.cwd());
      const result = await runRedactionScan(root, {
        changedOnly: opts.changed === true,
      });

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      const rich = isRich();
      const heading = (t: string) => (rich ? theme.heading(t) : t);
      const muted = (t: string) => (rich ? theme.muted(t) : t);
      const warn = (t: string) => (rich ? theme.warn(t) : t);

      console.log(heading("Redaction scan"));
      console.log(muted(`Scanned ${result.scannedFiles} files, skipped ${result.skippedFiles}`));
      console.log(muted(`Findings: ${result.findings.length}`));
      console.log("");

      if (result.findings.length === 0) {
        console.log(muted("No suspicious content found."));
        return;
      }

      console.log(warn("Suspicious content (path, line, category, snippet):"));
      console.log("");
      for (const f of result.findings) {
        const fullPath = path.resolve(f.path);
        const relPath = path.relative(root, f.path);
        console.log(`  path: ${fullPath}`);
        console.log(`  (relative: ${relPath}:${f.line})`);
        console.log(`  line: ${f.line}`);
        console.log(`  category: ${f.category}`);
        console.log(`  snippet: ${f.snippet}`);
        console.log("");
      }
    });
}
