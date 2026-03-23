/**
 * Affiliate Link Injector
 *
 * Scans HTML or Markdown content files and automatically inserts affiliate
 * links around the first (or all) occurrences of configured keywords.
 *
 * Usage:
 *   npx ts-node scripts/affiliate-injector.ts --config affiliate-config.json [options]
 *
 * Options:
 *   --config  <path>   Path to JSON config file (required)
 *   --input   <glob>   Glob pattern for content files (default: "**\/*.{html,md}")
 *   --dry-run          Preview changes without writing files
 *   --all              Link every occurrence, not just the first
 *   --report           Print a summary report after processing
 */

import fs from "fs";
import path from "path";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AffiliateRule {
  /** The keyword or phrase to match (case-insensitive by default). */
  keyword: string;
  /** The full affiliate URL including tracking parameters. */
  url: string;
  /** Optional: override the link text (defaults to the matched text). */
  linkText?: string;
  /** If true, match is case-sensitive (default false). */
  caseSensitive?: boolean;
}

interface Config {
  /** List of keyword → affiliate URL mappings. */
  rules: AffiliateRule[];
  /** Glob pattern for files to process. */
  inputGlob?: string;
  /** Only inject into the first occurrence of each keyword per file (default true). */
  firstOccurrenceOnly?: boolean;
  /** HTML attribute to add to injected links (e.g. rel="nofollow sponsored"). */
  linkRel?: string;
  /** If true, add target="_blank" to injected links. */
  openInNewTab?: boolean;
}

interface FileResult {
  file: string;
  injections: number;
  keywords: string[];
  changed: boolean;
}

// ---------------------------------------------------------------------------
// Arg parsing (no external deps)
// ---------------------------------------------------------------------------

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        args[key] = next;
        i++;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// Core injection logic
// ---------------------------------------------------------------------------

/**
 * Inject affiliate links into raw HTML content.
 * Skips text inside existing <a> tags, <script>, <style>, HTML attributes, and code blocks.
 */
function injectLinksHtml(
  content: string,
  rules: AffiliateRule[],
  opts: { firstOnly: boolean; rel: string; newTab: boolean }
): { result: string; injections: number; keywords: string[] } {
  let result = content;
  let totalInjections = 0;
  const touchedKeywords: string[] = [];

  for (const rule of rules) {
    const flags = rule.caseSensitive ? "g" : "gi";
    // Word-boundary-aware pattern; escape special regex chars in keyword
    const escaped = rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(`(?<![\\w/>"'])\\b(${escaped})\\b(?![\\w<"'])`, flags);

    const relAttr = opts.rel ? ` rel="${opts.rel}"` : "";
    const targetAttr = opts.newTab ? ` target="_blank"` : "";

    let injected = 0;

    result = replaceOutsideTags(result, pattern, (match) => {
      if (opts.firstOnly && injected > 0) return match;
      const text = rule.linkText ?? match;
      injected++;
      return `<a href="${rule.url}"${relAttr}${targetAttr}>${text}</a>`;
    });

    if (injected > 0) {
      totalInjections += injected;
      touchedKeywords.push(rule.keyword);
    }
  }

  return { result, injections: totalInjections, keywords: touchedKeywords };
}

/**
 * Inject affiliate links into Markdown content.
 * Skips existing markdown links [text](url), code spans, and fenced code blocks.
 */
function injectLinksMarkdown(
  content: string,
  rules: AffiliateRule[],
  opts: { firstOnly: boolean; rel: string; newTab: boolean }
): { result: string; injections: number; keywords: string[] } {
  let result = content;
  let totalInjections = 0;
  const touchedKeywords: string[] = [];

  // Strip fenced code blocks to avoid injecting inside them
  const codeBlockRanges = getFencedCodeBlockRanges(result);

  for (const rule of rules) {
    const flags = rule.caseSensitive ? "g" : "gi";
    const escaped = rule.keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Don't match inside existing [text](url) links or `code spans`
    const pattern = new RegExp(
      `(?<!\\[)(?<!\\()(?<!\`)\\b(${escaped})\\b(?!\\])(?!\\))(?!\`)`,
      flags
    );

    let injected = 0;
    const newResult = result.replace(pattern, (match, _p1, offset) => {
      // Skip if inside a fenced code block
      if (isInRange(offset, codeBlockRanges)) return match;
      if (opts.firstOnly && injected > 0) return match;
      injected++;
      const text = rule.linkText ?? match;
      return `[${text}](${rule.url})`;
    });

    if (injected > 0) {
      totalInjections += injected;
      touchedKeywords.push(rule.keyword);
      result = newResult;
    }
  }

  return { result, injections: totalInjections, keywords: touchedKeywords };
}

// ---------------------------------------------------------------------------
// Helper: replace text only outside of HTML tags & existing <a> elements
// ---------------------------------------------------------------------------

function replaceOutsideTags(
  html: string,
  pattern: RegExp,
  replacer: (match: string) => string
): string {
  // Split the content into tag tokens and text tokens
  const tagPattern = /<[^>]+>/g;
  const parts: Array<{ isTag: boolean; value: string }> = [];
  let lastIndex = 0;
  let match;

  // Track whether we're inside an <a> or <script>/<style> block
  let insideLink = 0;
  let insideNoScript = 0;

  while ((match = tagPattern.exec(html)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ isTag: false, value: html.slice(lastIndex, match.index) });
    }
    parts.push({ isTag: true, value: match[0] });
    lastIndex = tagPattern.lastIndex;
  }
  if (lastIndex < html.length) {
    parts.push({ isTag: false, value: html.slice(lastIndex) });
  }

  return parts
    .map((part) => {
      if (part.isTag) {
        const tag = part.value.toLowerCase();
        if (/^<a[\s>]/.test(tag)) insideLink++;
        else if (/^<\/a>/.test(tag)) insideLink = Math.max(0, insideLink - 1);
        else if (/^<(script|style)[\s>]/.test(tag)) insideNoScript++;
        else if (/^<\/(script|style)>/.test(tag))
          insideNoScript = Math.max(0, insideNoScript - 1);
        return part.value;
      }
      // Text node
      if (insideLink > 0 || insideNoScript > 0) return part.value;
      return part.value.replace(pattern, replacer);
    })
    .join("");
}

// ---------------------------------------------------------------------------
// Helpers for Markdown code blocks
// ---------------------------------------------------------------------------

function getFencedCodeBlockRanges(md: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];
  const fence = /^```[\s\S]*?^```/gm;
  let m;
  while ((m = fence.exec(md)) !== null) {
    ranges.push([m.index, m.index + m[0].length]);
  }
  return ranges;
}

function isInRange(index: number, ranges: Array<[number, number]>): boolean {
  return ranges.some(([start, end]) => index >= start && index <= end);
}

// ---------------------------------------------------------------------------
// File processing
// ---------------------------------------------------------------------------

function processFile(
  filePath: string,
  rules: AffiliateRule[],
  opts: { firstOnly: boolean; rel: string; newTab: boolean; dryRun: boolean }
): FileResult {
  const content = fs.readFileSync(filePath, "utf-8");
  const ext = path.extname(filePath).toLowerCase();
  const isMarkdown = ext === ".md" || ext === ".mdx";

  const { result, injections, keywords } = isMarkdown
    ? injectLinksMarkdown(content, rules, opts)
    : injectLinksHtml(content, rules, opts);

  const changed = result !== content;

  if (changed && !opts.dryRun) {
    fs.writeFileSync(filePath, result, "utf-8");
  }

  return { file: filePath, injections, keywords, changed };
}

// ---------------------------------------------------------------------------
// File finder (no external glob dependency required)
// ---------------------------------------------------------------------------

/**
 * Recursively find files matching a set of extensions derived from a glob pattern.
 * Supports patterns like "**\/*.{html,md,mdx}" or "content/**\/*.html".
 */
function findFiles(root: string, globPattern: string): string[] {
  // Extract extensions from pattern like **/*.{html,md} or **/*.html
  const extMatch = globPattern.match(/\*\.(?:\{([^}]+)\}|(\w+))$/);
  const extensions: string[] = [];
  if (extMatch) {
    if (extMatch[1]) extensions.push(...extMatch[1].split(",").map((e) => `.${e.trim()}`));
    else if (extMatch[2]) extensions.push(`.${extMatch[2]}`);
  }

  // Extract base directory from pattern (portion before **)
  const baseDir = globPattern.split("**")[0].replace(/\/$/, "") || ".";
  const searchRoot = path.resolve(root, baseDir);

  if (!fs.existsSync(searchRoot)) return [];

  const results: string[] = [];

  function walk(dir: string) {
    const skip = /node_modules|[/\\]dist[/\\]|\.git/;
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (skip.test(full)) continue;
      if (entry.isDirectory()) {
        walk(full);
      } else if (
        extensions.length === 0 ||
        extensions.includes(path.extname(entry.name).toLowerCase())
      ) {
        results.push(full);
      }
    }
  }

  walk(searchRoot);
  return results;
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.config || typeof args.config !== "string") {
    console.error("Error: --config <path> is required.");
    console.error(
      "Example: npx ts-node scripts/affiliate-injector.ts --config scripts/affiliate-config.json"
    );
    process.exit(1);
  }

  const configPath = path.resolve(args.config);
  if (!fs.existsSync(configPath)) {
    console.error(`Config file not found: ${configPath}`);
    process.exit(1);
  }

  const config: Config = JSON.parse(fs.readFileSync(configPath, "utf-8"));

  if (!config.rules || config.rules.length === 0) {
    console.error("Config must contain at least one rule.");
    process.exit(1);
  }

  const inputGlob =
    (typeof args.input === "string" ? args.input : null) ??
    config.inputGlob ??
    "**/*.{html,md,mdx}";

  const dryRun = args["dry-run"] === true;
  const firstOnly =
    args.all === true ? false : (config.firstOccurrenceOnly ?? true);
  const rel = config.linkRel ?? "nofollow sponsored";
  const newTab = config.openInNewTab ?? true;
  const showReport = args.report === true;

  const files = findFiles(process.cwd(), inputGlob);

  if (files.length === 0) {
    console.warn(`No files matched: ${inputGlob}`);
    process.exit(0);
  }

  console.log(
    `\nAffiliate Link Injector${dryRun ? " [DRY RUN]" : ""}`
  );
  console.log(`Rules: ${config.rules.length} | Files: ${files.length}\n`);

  const results: FileResult[] = [];

  for (const file of files) {
    try {
      const result = processFile(file, config.rules, {
        firstOnly,
        rel,
        newTab,
        dryRun,
      });
      results.push(result);
      if (result.changed) {
        const label = dryRun ? "Would inject" : "Injected";
        console.log(
          `  ${label} ${result.injections} link(s) → ${path.relative(process.cwd(), file)}`
        );
        if (showReport) {
          result.keywords.forEach((k) => console.log(`    • "${k}"`));
        }
      }
    } catch (err) {
      console.error(`  ERROR processing ${file}: ${(err as Error).message}`);
    }
  }

  const totalFiles = results.filter((r) => r.changed).length;
  const totalLinks = results.reduce((sum, r) => sum + r.injections, 0);

  console.log(
    `\nDone. ${totalLinks} link(s) ${dryRun ? "would be" : ""} injected across ${totalFiles} file(s).\n`
  );
}

main();
