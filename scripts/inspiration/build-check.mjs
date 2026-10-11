import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";

const builder = readFileSync(new URL("build.ts", import.meta.url), "utf8");
const text = `${"A literary passage about the sea, the sky, and the passing seasons. ".repeat(4)}\n`;

function fixture(run) {
  const temp = mkdtempSync(join(tmpdir(), "inspiration-build-"));
  const root = join(temp, "scripts/inspiration");
  mkdirSync(root, { recursive: true });
  mkdirSync(join(temp, "src/llm"), { recursive: true });
  const sources = [{ id: 1, title: "Test edition", author: "Test author", translator: "Test translator" }];
  const rights = {
    schema_version: 1,
    jurisdiction: "United States",
    editions: [{
      id: 1,
      catalog_url: "https://www.gutenberg.org/ebooks/1",
      rights_evidence_url: "https://www.gutenberg.org/ebooks/1.rdf",
      rights_statement: "Public domain in the USA.",
      use_decision: "public_domain_us_per_gutenberg",
      source_text_sha256: createHash("sha256").update(text).digest("hex"),
    }],
  };
  const picks = [{ start: 1, end: 1, verse: false }];
  mkdirSync(join(root, ".cache"));
  mkdirSync(join(root, "picks"));
  writeFileSync(join(root, "build.ts"), builder);
  writeFileSync(join(root, ".cache/1.txt"), text);
  function execute(command = "preview", before = () => {}) {
    writeFileSync(join(root, "sources.json"), JSON.stringify(sources));
    writeFileSync(join(root, "rights.json"), JSON.stringify(rights));
    writeFileSync(join(root, "picks/1.json"), JSON.stringify(picks));
    before();
    const args = command === "build" ? [] : [command, "1"];
    return spawnSync(process.execPath, [join(root, "build.ts"), ...args], { encoding: "utf8" });
  }
  try {
    run({ root, sources, rights, picks, execute });
  } finally {
    rmSync(temp, { recursive: true, force: true });
  }
}

test("verifies exact normalized bytes before preview or cached fetch", () => {
  fixture(({ root, execute }) => {
    assert.equal(execute().status, 0);
    assert.equal(execute("fetch").status, 0);
    writeFileSync(join(root, ".cache/1.txt"), text.replace(/\n/g, "\r\n"));
    for (const command of ["preview", "fetch"]) {
      const result = execute(command);
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /SHA256 mismatch/);
    }
  });
});

test("downloads are normalized and hash-verified before entering the cache", () => {
  for (const changed of [false, true]) {
    fixture(({ root, execute }) => {
      rmSync(join(root, ".cache/1.txt"));
      const body = changed ? text.replace("literary", "changed") : text;
      const raw = `\uFEFF*** START OF THE PROJECT GUTENBERG EBOOK TEST ***\r\n\r\n${body.replace(/\n/g, "\r\n")}\r\n*** END OF THE PROJECT GUTENBERG EBOOK TEST ***\r\n`;
      const result = execute("fetch", () => {
        writeFileSync(join(root, "build.ts"), `globalThis.fetch = async () => ({ ok: true, text: async () => ${JSON.stringify(raw)} });\n${builder}`);
      });
      if (changed) {
        assert.notEqual(result.status, 0);
        assert.match(result.stderr, /SHA256 mismatch/);
        assert.throws(() => readFileSync(join(root, ".cache/1.txt")), /ENOENT/);
      } else {
        assert.equal(result.status, 0, result.stderr);
        assert.equal(readFileSync(join(root, ".cache/1.txt"), "utf8"), text);
      }
    });
  }
});

test("rejects missing, duplicate, extra, and unapproved rights records", () => {
  for (const mutate of [
    (rights) => { rights.editions = []; },
    (rights) => { rights.editions.push({ ...rights.editions[0] }); },
    (rights) => { rights.editions.push({ ...rights.editions[0], id: 2 }); },
    (rights) => { rights.editions[0].rights_statement = "Copyrighted"; },
    (rights) => { rights.editions[0].use_decision = "pending"; },
    (rights) => { rights.editions[0].source_text_sha256 = "invalid"; },
  ]) {
    fixture(({ rights, execute }) => {
      mutate(rights);
      assert.notEqual(execute().status, 0);
    });
  }
});

test("original-text-only editions require and enforce inclusive approved ranges", () => {
  fixture(({ root, rights, picks, execute }) => {
    const edition = rights.editions[0];
    edition.use_decision = "original_text_only";
    assert.match(execute().stderr, /rights evidence\/restrictions/);
    edition.allowed_text_ranges = [[1, 1]];
    assert.equal(execute().status, 0);
    edition.allowed_text_ranges = [[2, 2]];
    assert.match(execute().stderr, /outside rights-approved/);
    writeFileSync(join(root, ".cache/1.txt"), text + text);
    edition.source_text_sha256 = createHash("sha256").update(text + text).digest("hex");
    edition.allowed_text_ranges = [[1, 1], [2, 2]];
    picks[0].end = 2;
    assert.match(execute().stderr, /outside rights-approved/);
  });
});

test("anthologies require passage credits, including explicit null for original English", () => {
  fixture(({ sources, picks, execute }) => {
    sources[0].requirePickAttribution = true;
    assert.match(execute().stderr, /needs author and translator/);
    Object.assign(picks[0], { author: "Original poet", translator: null, title: "Individual poem" });
    const result = execute();
    assert.equal(result.status, 0);
    assert.match(result.stdout, /Individual poem/);
    assert.match(result.stdout, /Original poet/);
    assert.doesNotMatch(result.stdout, /Test translator/);
    picks[0].author = "";
    assert.match(execute().stderr, /invalid author attribution/);
  });
});

test("rights records distinguish print evidence from unknown dates", (t) => {
  const rights = JSON.parse(readFileSync(new URL("rights.json", import.meta.url), "utf8"));
  for (const edition of rights.editions) {
    assert.ok(edition.title);
    if (edition.publication_year !== null || edition.publication_year_range) {
      assert.ok(edition.publication_evidence?.url && edition.publication_evidence?.quote, String(edition.id));
    }
    if (edition.publication_year > 1930) {
      assert.ok(edition.original_publication_year <= 1930 && edition.notes, String(edition.id));
    }
  }
  const dated = rights.editions.filter((edition) => edition.publication_year !== null || edition.publication_year_range);
  t.diagnostic(`${rights.editions.length} rights records; ${dated.length} dated print editions/ranges; ${rights.editions.length - dated.length} unknown print dates`);
});

test("read-only corpus verification rejects altered text and credits", () => {
  fixture(({ root, rights, picks, execute }) => {
    const body = Array.from({ length: 500 }, (_, index) => `${index}: ${text.trim()}\n`).join("");
    writeFileSync(join(root, ".cache/1.txt"), body);
    rights.editions[0].source_text_sha256 = createHash("sha256").update(body).digest("hex");
    picks.splice(0, 1, ...Array.from({ length: 500 }, (_, index) => ({ start: index + 1, end: index + 1, verse: false })));
    assert.equal(execute("build").status, 0);
    assert.equal(execute("check").status, 0);
    const output = join(root, "../../src/llm/inspiration-quotes.json");
    const original = readFileSync(output, "utf8");
    for (const field of ["text", "author", "translator", "title"]) {
      const corpus = JSON.parse(original);
      corpus[0][field] = "Changed without updating picks";
      writeFileSync(output, JSON.stringify(corpus, null, 1) + "\n");
      assert.match(execute("check").stderr, /differs from verified sources and picks/);
      assert.equal(JSON.parse(readFileSync(output, "utf8"))[0][field], corpus[0][field]);
    }
  });
});

test("shipped corpus matches hash-verified editions, permitted picks and credits", () => {
  const result = spawnSync(process.execPath, [
    new URL("build.ts", import.meta.url).pathname, "check",
  ], { encoding: "utf8", maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
});
