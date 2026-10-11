# Literary inspiration

Creative requests draw a random passage from public-domain prose and poetry to vary the model's imagery, ideas, and mood. Each request gets one independent selection; schema retries retain it. The prompt keeps game rules and continuity authoritative and asks the model to avoid copying wording or names.

The corpus loads on the first creative request as a separate browser chunk. Requests wait for it before contacting the model. Streaming calls still return an abortable handle immediately.

## Sources and provenance

`sources.json` identifies the Project Gutenberg editions and records authors, translators, collectors and editors separately. Passage-level credits in `picks/` override edition defaults for anthologies and embedded translations. `requirePickAttribution` requires an explicit author and translator for each pick, with `null` for original English text.

`rights.json` records Gutenberg's explicit U.S. public-domain determination for all 62 editions, including the English translations, and SHA256 hashes of the normalized source texts. Of these, 38 have dated print-edition evidence or a publication range; 24 have no verified print date and rely on Gutenberg's determination. This is a U.S. basis, not a worldwide determination or an independent copyright notice/renewal search.

`picks/<Gutenberg ID>.json` records each passage as inclusive, 1-indexed line numbers in `.cache/<Gutenberg ID>.txt`. The generated quote ID is `<Gutenberg ID>:<start>-<end>`. Find an edition at `https://www.gutenberg.org/ebooks/<Gutenberg ID>`.

The extractor removes Gutenberg's header and footer, normalizes whitespace, removes footnote references and typographic emphasis markers, and joins wrapped prose. Source options remove verse/stanza numbering and rejoin Morris's indented continuation lines. Verse otherwise retains line breaks. These are excerpts from the source texts, not model-generated quotations. Older translations and retellings retain their translators' choices.

### Passage audit (2026-10-11)

The corpus contains 906 distinct passages across all 62 editions, down from 909. Three embedded passages from Aram Raffi's historical contribution to *Armenian Legends and Poems* were excluded because their English translator credits were not established: `54036:6550-6562`, `54036:6573-6577` and `54036:7517-7530`. The retained Armenian poems and prose use the anthology's first-line index for author and translator credits.

The audit checked suspicious excerpts against cached surrounding text, including Budge's study, Spence's *Popol Vuh* summary, Davis's Rumi selections, the Egyptian and Persian anthologies, Gregory's embedded poems, the Maya chronicles and the ethnographic collections. Literary retellings remain credited to their writers; translated songs and poems retain their traditional or named authors. Scholarly framing, production credits and modern editorial additions are excluded from picks.

The builder enforces `allowed_text_ranges` in `rights.json`. Edition 8161 permits only Macpherson's fragments (lines 636–1902), excluding John J. Dunn's 1966 introduction and notes. Edition 348 permits the literary translations (1489–9130), excluding the preparer's prose and the endnotes containing Douglas B. Killings's modern additions. The 1969 *Maya Chronicles* edition reproduces the identified 1882 text; its modern imprint and transcriber commentary are excluded.

## Rebuilding

Run from the repository root with Node 22.18 or later:

```sh
node scripts/inspiration/build.ts fetch
node scripts/inspiration/build.ts preview 981 73533
node scripts/inspiration/build.ts
node scripts/inspiration/build.ts check
node --test scripts/inspiration/build-check.mjs scripts/inspiration/check.mjs
npm run build
npm run lint
```

Downloads are cached and excluded from git. Fetch, preview and build verify exact normalized source bytes against the rights hashes before using them; a changed download is rejected before caching. Review the edition and rights evidence before updating a hash. Previews print quote IDs and credits alongside the text.

The build rejects incomplete rights records, picks outside approved literary ranges, invalid ranges, editorial markup, excerpts outside 150–1,500 characters, and corpus totals outside 500–1,000 distinct passages. It writes `src/llm/inspiration-quotes.json`, which is committed so deployment needs no access to Gutenberg. `check` compares that file byte-for-byte with the verified extraction without rewriting it. Builder tests cover hash failures, download normalization, rights completeness, range restrictions, anthology credits and stale corpus detection.

The integration checks use Node's test runner and Vite's installed esbuild dependency to substitute an AI stub. They verify prompt coverage, partial and final streaming output, abort before startup, and passage retention through schema retries without making model requests.
