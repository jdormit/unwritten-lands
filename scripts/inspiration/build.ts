// Builds src/llm/inspiration-quotes.json from public-domain Project Gutenberg texts.
//
//   node scripts/inspiration/build.ts fetch   # download texts into .cache/
//   node scripts/inspiration/build.ts preview <id>...  # print extracted passages
//   node scripts/inspiration/build.ts         # extract picked passages
//
// Picks are inclusive, 1-indexed ranges into normalized source text in .cache/.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

interface Source {
  id: number;
  title: string;
  author: string;
  translator: string | null;
  joinIndentedLines?: boolean;
  stripNumbering?: boolean;
  requirePickAttribution?: boolean;
}

interface Pick {
  start: number;
  end: number;
  verse: boolean;
  title?: string;
  author?: string;
  translator?: string | null;
}

interface EditionRights {
  id: number;
  catalog_url: string;
  rights_evidence_url: string;
  rights_statement: string;
  use_decision: "public_domain_us_per_gutenberg" | "original_text_only";
  source_text_sha256: string;
  allowed_text_ranges?: [number, number][];
}

interface Quote {
  id: string;
  text: string;
  title: string;
  author: string;
  translator: string | null;
}

const ROOT = dirname(fileURLToPath(import.meta.url));
const CACHE_DIR = join(ROOT, ".cache");
const PICKS_DIR = join(ROOT, "picks");
const OUTPUT = join(ROOT, "../../src/llm/inspiration-quotes.json");
const MIN_LENGTH = 150;
const MAX_LENGTH = 1500;

const sources: Source[] = JSON.parse(readFileSync(join(ROOT, "sources.json"), "utf8"));
const rights: { schema_version: number; jurisdiction: string; editions: EditionRights[] } =
  JSON.parse(readFileSync(join(ROOT, "rights.json"), "utf8"));
const editions = new Map(rights.editions.map((edition) => [edition.id, edition]));

if (rights.schema_version !== 1 || rights.jurisdiction !== "United States" ||
    editions.size !== rights.editions.length || new Set(sources.map((source) => source.id)).size !== sources.length ||
    editions.size !== sources.length) {
  throw new Error("Invalid or incomplete rights manifest");
}
for (const source of sources) {
  const edition = editions.get(source.id);
  if (!edition || edition.rights_statement !== "Public domain in the USA." ||
      edition.catalog_url !== `https://www.gutenberg.org/ebooks/${source.id}` ||
      edition.rights_evidence_url !== `https://www.gutenberg.org/ebooks/${source.id}.rdf` ||
      !/^[a-f0-9]{64}$/.test(edition.source_text_sha256) ||
      !["public_domain_us_per_gutenberg", "original_text_only"].includes(edition.use_decision) ||
      (edition.use_decision === "original_text_only" && !edition.allowed_text_ranges?.length) ||
      (edition.allowed_text_ranges && !edition.allowed_text_ranges.every(([start, end]) =>
        Number.isInteger(start) && Number.isInteger(end) && start >= 1 && end >= start))) {
    throw new Error(`${source.id}: missing or invalid rights evidence/restrictions`);
  }
}

function verifySource(source: Source, bytes: Uint8Array): void {
  const actual = createHash("sha256").update(bytes).digest("hex");
  if (actual !== editions.get(source.id)!.source_text_sha256) {
    throw new Error(`${source.id}: SHA256 mismatch; review the edition and rights.json before using changed text`);
  }
}

function stripGutenbergBoilerplate(raw: string): string {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const start = /^\*\*\* ?START OF.*$/m.exec(text);
  const end = /^\*\*\* ?END OF.*$/m.exec(text);
  if (!start || !end || end.index <= start.index) {
    throw new Error("Missing or invalid Project Gutenberg text boundaries");
  }
  const body = text.slice(start.index + start[0].length, end.index);
  return body.replace(/^\n+|\n+$/g, "") + "\n";
}

async function fetchSources(): Promise<void> {
  mkdirSync(CACHE_DIR, { recursive: true });
  for (const source of sources) {
    const path = join(CACHE_DIR, `${source.id}.txt`);
    if (existsSync(path)) {
      verifySource(source, readFileSync(path));
      continue;
    }
    const url = `https://www.gutenberg.org/cache/epub/${source.id}/pg${source.id}.txt`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch ${url}: ${response.status}`);
    const normalized = Buffer.from(stripGutenbergBoilerplate(await response.text()), "utf8");
    verifySource(source, normalized);
    writeFileSync(path, normalized);
    console.log(`fetched ${source.id} ${source.title}`);
  }
}

function cleanLine(line: string, stripNumbering: boolean): string {
  if (stripNumbering) {
    line = line
      .replace(/^\s*(?:\d+|[IVXLCDM]+)\.?\s*$/, "")
      .replace(/^\s*\d+(?::\d+){1,2}\s+/, "")
      .replace(/^\s*\d+[.)]?\s+/, "");
  }
  return line
    .replace(/^\s*\(ll?\.? [^)]*\)\s*/, "")
    .replace(/\[(?:\d+|[a-z]|Footnote[^\]]*)\]/gi, "")
    .replace(/\{\d+\}/g, "")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/\s{2,}\d+$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

const indentOf = (line: string) => line.length - line.trimStart().length;

/** Rejoins long verse lines that the source wrapped onto a deeper-indented line. */
function joinIndentedLines(lines: string[]): string[] {
  const joined: string[] = [];
  let lineIndent = 0;
  for (const line of lines) {
    const previous = joined.length - 1;
    if (line.trim() !== "" && previous >= 0 && joined[previous].trim() !== "" && indentOf(line) > lineIndent) {
      joined[previous] += ` ${line.trim()}`;
    } else {
      joined.push(line);
      lineIndent = indentOf(line);
    }
  }
  return joined;
}

function formatPassage(lines: string[], verse: boolean, stripNumbering: boolean): string {
  const stanzas: string[][] = [[]];
  for (const line of lines.map((line) => cleanLine(line, stripNumbering))) {
    if (line === "") {
      if (stanzas[stanzas.length - 1].length > 0) stanzas.push([]);
    } else {
      stanzas[stanzas.length - 1].push(line);
    }
  }
  return stanzas
    .filter((stanza) => stanza.length > 0)
    .map((stanza) => stanza.join(verse ? "\n" : " "))
    .join("\n\n");
}

function extractQuotes(selected: Source[]): Quote[] {
  const quotes: Quote[] = [];
  const seen = new Set<string>();
  for (const source of selected) {
    const picksPath = join(PICKS_DIR, `${source.id}.json`);
    if (!existsSync(picksPath)) {
      throw new Error(`Missing picks for ${source.id} ${source.title}`);
    }
    const bytes = readFileSync(join(CACHE_DIR, `${source.id}.txt`));
    verifySource(source, bytes);
    const lines = bytes.toString("utf8").split("\n");
    const edition = editions.get(source.id)!;
    const picks: Pick[] = JSON.parse(readFileSync(picksPath, "utf8"));
    for (const pick of picks) {
      const label = `${source.id}:${pick.start}-${pick.end}`;
      if (source.requirePickAttribution && (!Object.hasOwn(pick, "author") || !Object.hasOwn(pick, "translator"))) {
        throw new Error(`${label}: anthology passage needs author and translator credits`);
      }
      if (!Number.isInteger(pick.start) || !Number.isInteger(pick.end) ||
          typeof pick.verse !== "boolean" || pick.start < 1 ||
          pick.end > lines.length || pick.start > pick.end) {
        throw new Error(`${label}: invalid range`);
      }
      if (edition.allowed_text_ranges && !edition.allowed_text_ranges.some(([start, end]) =>
        pick.start >= start && pick.end <= end)) {
        throw new Error(`${label}: outside rights-approved literary text`);
      }
      for (const field of ["title", "author", "translator"] as const) {
        if (Object.hasOwn(pick, field) && !(field === "translator" && pick[field] === null) &&
            (typeof pick[field] !== "string" || !pick[field]?.trim())) {
          throw new Error(`${label}: invalid ${field} attribution`);
        }
      }
      const range = lines.slice(pick.start - 1, pick.end);
      const text = formatPassage(
        source.joinIndentedLines ? joinIndentedLines(range) : range,
        pick.verse,
        source.stripNumbering ?? false,
      );
      if (text.length < MIN_LENGTH || text.length > MAX_LENGTH) {
        throw new Error(`${label}: length ${text.length} out of bounds`);
      }
      if (/\[|\]|footnote|illustration/i.test(text)) {
        throw new Error(`${label}: possible editorial markup`);
      }
      if (seen.has(text)) continue;
      seen.add(text);
      quotes.push({
        id: label,
        text,
        title: pick.title ?? source.title,
        author: pick.author ?? source.author,
        translator: Object.hasOwn(pick, "translator") ? pick.translator! : source.translator,
      });
    }
  }
  return quotes;
}

const [command, ...args] = process.argv.slice(2);
if (command === "fetch") {
  await fetchSources();
} else if (command === "preview") {
  const ids = new Set(args.map(Number));
  for (const quote of extractQuotes(sources.filter((source) => ids.has(source.id)))) {
    const credit = quote.translator ? `${quote.author}; translated by ${quote.translator}` : quote.author;
    console.log(`--- ${quote.id} ${quote.title} (${quote.text.length} chars)\n${credit}\n${quote.text}\n`);
  }
} else {
  if (command && command !== "check") throw new Error(`Unknown command: ${command}`);
  const quotes = extractQuotes(sources);
  if (quotes.length < 500 || quotes.length > 1000) {
    throw new Error(`Expected 500–1000 distinct quotes; received ${quotes.length}`);
  }
  const generated = JSON.stringify(quotes, null, 1) + "\n";
  if (command === "check") {
    if (readFileSync(OUTPUT, "utf8") !== generated) {
      throw new Error("Corpus differs from verified sources and picks; run build.ts to rebuild");
    }
    console.log(`verified ${quotes.length} quotes from ${sources.length} editions`);
  } else {
    writeFileSync(OUTPUT, generated);
    console.log(`wrote ${quotes.length} quotes to ${OUTPUT}`);
  }
}
