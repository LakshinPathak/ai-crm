# 11 — AI features

This note covers deal scoring (`refreshDealScores` / `updateOne`), sentiment and technical fit, blocker suggestions, MEDDPICC SSE refresh, deal Ask RAG, Gong ingest + embeddings, Gemini env vars, and what happens when there is **no API key**. Home “focus” is wired to the last **deal-focus** agent run (see `10-agents-approvals.md`).

All paths under `codebase/`. HTTP is `/api/v1`.

---

## Mental model

AI is **optional**. Core CRM (deals, notes, pipeline, agents with heuristic executors) runs without Google. When `GEMINI_API_KEY` is set, the same entry points call Gemini (`GEMINI_MODEL`, default `gemini-3.5-flash-lite`) and embeddings (`GEMINI_EMBEDDING_MODEL`, default `text-embedding-004`). Failures and missing keys fall through to heuristics / stubs — they should not 500 the request.

Two layers:

1. **Synchronous HTTP** — `/ai/*`, `POST /deals/:id/ask`, MEDDPICC stream, some agent executors.
2. **Background jobs** — `ingest-call` (Gong → Artifact), `embed-artifact` (chunk + vector), `refreshDealScores` fire-and-forget after deal mutations.

---

## Key files

| Area | Path |
|------|------|
| Scoring + heuristics | `apps/api/src/lib/ai-scoring.ts` |
| AI HTTP (sentiment / fit / blocker) | `apps/api/src/modules/ai/handlers.ts`, `index.ts` |
| Deal mutations that rescore | `apps/api/src/modules/deals/handlers.ts` |
| MEDDPICC Gemini | `apps/api/src/lib/gemini.ts` |
| MEDDPICC HTTP + SSE | `apps/api/src/modules/meddpicc/handlers.ts` |
| Letter defaults | `apps/api/src/lib/meddpicc-defaults.ts` |
| Deal Ask RAG | `apps/api/src/modules/deals/handlers-ask.ts` |
| Chunk search | `apps/api/src/lib/artifact-chunk-search.ts` |
| Embed job | `apps/api/src/lib/queues/embed-artifact.ts` |
| Gong ingest | `apps/api/src/lib/queues/ingest-call.ts` |
| Generic Gemini JSON | `apps/api/src/lib/gemini-json.ts` |
| Transcript buying signals | `apps/api/src/lib/gemini-transcript.ts` |
| Home focus | `apps/api/src/modules/home/handlers.ts` |
| Suggest-blocker UI | `apps/web/components/deals/tabs/OverviewTab.tsx` |
| Ask UI | `apps/web/components/deals/tabs/InsightsTab.tsx` |
| MEDDPICC stream client | `apps/web/components/deals/MeddpiccStreamLoader.tsx` |
| Env | `ENV.md`, `.env.example` |

---

## Gemini env

| Variable | Default | Used for |
|----------|---------|----------|
| `GEMINI_API_KEY` | empty | Gate for all live model calls. Empty → heuristics / hash embeddings / canned MEDDPICC / Ask fallback text |
| `GEMINI_MODEL` | `gemini-3.5-flash-lite` | `generateContent` (scoring SDK, MEDDPICC fetch, Ask, post-call, NL draft, …) |
| `GEMINI_EMBEDDING_MODEL` | `text-embedding-004` | `embedContent` in `embedText()` — **not** in `.env.example`; override only if needed |

Key is **server-only**. Do not put it in `NEXT_PUBLIC_*`. `ENV.md`: core CRM UI works without it; MEDDPICC refresh, agents that call Gemini, and scoring are richer with it.

Two client styles:

- `@google/generative-ai` `GoogleGenerativeAI` in `ai-scoring.ts`
- Raw `fetch` to `generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key=` in `gemini.ts`, `gemini-json.ts`, post-call, etc.

JSON mode: `responseMimeType: 'application/json'`. On HTTP error / parse miss, callers treat it as “no model output”.

---

## `refreshDealScores` (`updateOne`)

`apps/api/src/lib/ai-scoring.ts` → `refreshDealScores(workspaceId, dealId)`.

Flow:

1. Load deal (`deletedAt: null`). Missing → return.
2. Parallel: company, last **8** notes, last **8** open blockers.
3. `buildDealScoringContext` (title, amount, winProbability, current sentiment/fit, MEDDPICC %, blocker titles, note snippets).
4. Parallel: `scoreSentiment` + `scoreTechnicalFit`.
5. Persist with **`Deal.updateOne`** (not `deal.save()`):

```text
{ $set: { sentiment, technicalFitScore } }
filter: { _id, workspaceId, deletedAt: null }
```

Errors are logged (`refreshDealScores failed`) and swallowed — deal PATCH still succeeded.

The in-memory `deal.sentiment = …` assignment before `updateOne` is unused for persistence; the source of truth is the `$set`.

### When it runs

Always **fire-and-forget** (`void refreshDealScores(...)`) after:

| Handler | Trigger |
|---------|---------|
| update deal card fields | title / amount / isHot / close date |
| move stage | pipeline move |
| create note | |
| update note | |
| create blocker | |
| update blocker | (after recounting open blockers) |

It does **not** run on deal create in the snippets above (create has `dispatchDealCreated` instead). HTTP `/ai/sentiment` and `/ai/fit-score` **do** `deal.save()` themselves and are separate from `refreshDealScores`.

---

## Sentiment and technical fit

Shared context: notes + blockers + optional extra text.

### Sentiment — `green` | `yellow` | `red`

**Gemini:** prompt asks for JSON `{ sentiment, confidence 0–1 }`. Invalid → heuristic.

**Heuristic (`heuristicSentiment`):**

- Scan notes + extraText for positive words (`excited`, `approved`, `moving forward`, …) vs negative (`delay`, `competitor`, `stalled`, `blocked`, …).
- `blockerCount >= 2` → −1; `winProbability >= 70` → +1; `<= 30` → −1.
- Score ≥ 1 → green (conf 0.65); ≤ −1 → red (0.65); else yellow (0.55).
- `source: 'heuristic' | 'gemini'` is returned on the HTTP APIs.

`POST /api/v1/ai/sentiment` `{ dealId, text? }` scores, **saves** `deal.sentiment`, returns `{ dealId, sentiment, confidence, source }`.

### Technical fit — integer 1–5

**Gemini:** `{ technicalFitScore: 1–5 }`, rounded and clamped.

**Heuristic (`heuristicFitScore`):** start at 3; +1 if MEDDPICC ≥ 70%; +1 if winProb ≥ 60; −1 if ≥ 2 blockers; −1 if sentiment is `red`; clamp 1–5.

`POST /api/v1/ai/fit-score` `{ dealId }` saves `technicalFitScore` and returns `{ dealId, technicalFitScore, source }`.

Home “at risk” treats `sentiment === 'red'` **or** 14-day stall as at-risk (`home/handlers.ts`).

---

## `suggest-blocker`

`POST /api/v1/ai/suggest-blocker` `{ dealId, context? }`.

Does **not** create a blocker. Returns `{ title, reasoning, source }` for the Overview tab form.

**Gemini:** one title ≤ 80 chars requested; response trimmed to 120 chars.

**Heuristic (`heuristicBlockerTitle`), first match:**

1. Open blocker exists → `Resolve: {first title}`
2. `blockerCount > 0` → follow up outstanding blockers
3. MEDDPICC completeness `< 50` → complete qualification gaps
4. winProbability `< 40` → re-validate technical requirements
5. Default → `Confirm integration requirements with customer`

UI: `OverviewTab.suggestBlocker()` fills the blocker title input; user still submits `POST /deals/:id/blockers`.

---

## MEDDPICC stream

Letters: `M, E, D1, D2, P, I, C1, C2` (`meddpicc-defaults.ts`). Without a model, `buildDefaultMeddpicc(dealTitle)` fills canned summaries (demo-quality, not empty).

### HTTP

| Method | Path | Role |
|--------|------|------|
| `GET` | `/deals/:dealId/meddpicc` | get-or-create `DealMeddpicc` (idle, default letters) |
| `POST` | `/deals/:dealId/meddpicc/refresh` | set status `regenerating`, return `{ jobId, streamUrl }` |
| `GET` | `/deals/:dealId/meddpicc/stream` | **SSE** that actually generates |

Refresh does **not** run the model; the client must open `streamUrl`.

### SSE (`streamMeddpicc`)

Headers: `text/event-stream`, no-cache, keep-alive.

1. Load deal, company, last 5 notes, artifact chunks grouped by letter (`fetchMeddpiccArtifactChunksByLetter`) for citations.
2. For each letter: `step.started` then `step.completed`. Delay ~200ms with Gemini, longer mock delays without.
3. Generate letters:
   - **With key:** `generateMeddpiccWithGemini` then `attachChunkCitationsToLetters`. Emit `section.completed` for all letters at once after the model returns.
   - **Without key:** default letters + citations; emit `section.completed` one letter at a time with mock delays (UI still “streams”).
4. Persist `DealMeddpicc` (`idle`, `overallConfidence`, `inputHash` `gemini-{ts}` or `mock-{ts}`, `$inc version`).
5. `Deal.updateOne({ meddpiccCompleteness })` — completeness = round(mean letter confidence × 100).
6. `upsertMeddpiccCitations`.
7. `summary.completed` `{ dealId, confidence, completeness }`.

Gemini prompt requires all eight keys with `{ label, summary, confidence }` plus optional `chunkId` / `excerpt` from artifact excerpts. Any missing summary → full default MEDDPICC for the deal title.

Client: `MeddpiccStreamLoader.consumeMeddpiccStream` parses `event:` / `data:` blocks. Overview tab “Refresh” drives this.

Agent `meddpicc-synth` is a separate path (`executors/meddpicc-synth.ts`) that also uses Gemini-or-defaults; it is event-triggered (`activity.ingested` by default), not the SSE UI.

---

## Deal Ask RAG

`POST /api/v1/deals/:dealId/ask` body `{ question }` (`DealAskSchema`).

UI: Insights tab — question box → `{ answer, citations: [{ chunkId, excerpt }] }`.

Pipeline:

1. Confirm deal in workspace.
2. Last **20** notes (body + createdAt).
3. `searchArtifactChunks(workspaceId, dealId, question, 8)` — vector or regex (below).
4. Prompt: answer **only** from notes + labeled `[chunkId: …]` excerpts. JSON `{ answer, citations }`.
5. `generateGeminiJson` (`gemini-json.ts`). If no `answer`, **`fallbackAnswer`**.
6. Citations are filtered to chunk IDs that were actually retrieved (`normalizeCitations`). Hallucinated ids dropped.

### Fallback without Gemini (or failed JSON)

- No notes and no chunks → “No deal notes or indexed call artifacts…”
- Else: count of notes + count of excerpts + **explicit** `Configure GEMINI_API_KEY for a synthesized answer to: "{question}"`.
- Citations: first 3 chunk excerpts (not model-chosen).

This is RAG-shaped even without a model: retrieval still runs; generation is a stub.

---

## Gong ingest

OAuth: `GONG_CLIENT_ID` / `GONG_CLIENT_SECRET`. Webhook: `POST /api/v1/webhooks/gong/:connectionId` (raw body, `X-Gong-Signature` HMAC). Job queue `ingest-call`.

`processIngestCall`:

1. Parse Gong payload (`callId`, title, parties, timestamps).
2. **Deal resolve** (first hit wins):
   - Participant emails ↔ `DealParticipant.email`
   - Else company `domain` ↔ email domain → deals on those companies
   - Else workspace `User.email` ↔ parties → that owner’s deals
   - Else title regex vs deal title / company name (skip generic `Gong call …` titles)
   - Multiple matches: prefer **open**, then most recent `lastActivityAt` / `updatedAt`
3. Upsert `Artifact` `{ source: 'gong', sourceId, type: 'call' }` with metadata + content hash.
4. If `callId`: `fetchGongCallTranscript` → `rawText`. If transcript exists, enqueue **`embed-artifact`**.
5. `dispatchActivityIngested` — fires event agents **only when `dealId` is set**.

Unmatched calls still store an artifact; they do not drive post-call / buying-signals / MEDDPICC-synth agents.

---

## Embeddings

Queue `embed-artifact`, processor in `processor.ts`.

`processEmbedArtifact`:

1. Load artifact with `rawText`.
2. `chunkRawText`: ~512 tokens, 64 overlap, **4 chars/token** estimate.
3. Delete existing `ArtifactChunk`s for that artifact.
4. For each window: `embedText(text)` then insert `{ workspaceId, artifactId, dealId, chunkIndex, text, embedding }`.
5. Set artifact `chunkCount`, `embeddedAt`.

### `embedText`

- No `GEMINI_API_KEY` **or** Gemini embed HTTP/parse failure → **`hashEmbed(text, 384)`** (per-dimension SHA-256, L2-normalized). Deterministic stub so local RAG/search still has vectors.
- With key: `models/{GEMINI_EMBEDDING_MODEL}:embedContent`.

Model: `packages/db/src/models/artifact-chunk.ts`. Unique `(workspaceId, artifactId, chunkIndex)`.

### Search (`searchArtifactChunks`)

If `GEMINI_API_KEY` is set, embed the **query** and run Atlas `$vectorSearch`:

- index name `artifact_chunks_vector`
- path `embedding`
- `numCandidates` ≥ 80
- filter `workspaceId` (+ `dealId` when scoped)

If the aggregation throws (no Atlas vector index) **or** returns empty, fall through to:

```text
ArtifactChunk.find({ text: case-insensitive regex of query }).sort({ chunkIndex: 1 }).limit(n)
```

Without an API key, **only** the regex path runs (stub vectors are not queried via `$vectorSearch`). Ask and MEDDPICC citations still work if the query string appears in chunk text.

---

## Heuristic / stub matrix (no API key)

| Feature | Behavior without `GEMINI_API_KEY` |
|---------|-----------------------------------|
| `refreshDealScores` / `/ai/sentiment` | Keyword + winProb/blocker heuristic |
| `/ai/fit-score` | 1–5 from MEDDPICC / winProb / blockers / sentiment |
| `/ai/suggest-blocker` | Rule titles (see above) |
| MEDDPICC stream | `buildDefaultMeddpicc` + fake step delays; `inputHash` `mock-*` |
| Deal Ask | Retrieval + “configure GEMINI_API_KEY…” answer |
| Embeddings | 384-d hash vectors |
| Chunk search | Regex only |
| Post-call agent | Template email/tasks bundle (`generatedWith: 'template'`) |
| Buying-signals agent | Keyword scan of notes/tasks/transcripts |
| Win/loss agent | Keyword themes (never called Gemini) |
| Deal-focus agent | Pure CRM math (never called Gemini) |
| NL agent draft | `draftFromKeywords` |

Gemini HTTP failures (bad key, quota) generally take the **same** fallbacks as a missing key.

---

## Home focus from last deal-focus run

Not an LLM ranking.

`focusDealsFromLatestRun` in `apps/api/src/modules/home/handlers.ts`:

1. Latest **active** agent with `templateSlug: 'deal-focus'` owned by the current user.
2. Latest `AgentRun` for that agent with status `completed` or `awaiting_approval`, sorted by `completedAt` / `updatedAt`.
3. Read `run.scope.output.focusDeals[].dealId` (written by `runDealFocus`).
4. Load those deals if still open; preserve run order.
5. Empty / missing agent / missing ids → **heuristic fallback**.

### Fallback (`GET /home`)

Open deals that are `isHot` **or** `riskScore > 50` **or** owned by the user, sort hot first then `riskScore`, take 5.

### Fallback (`GET /home/focus`)

Hot deals only, up to 20 (then still passed through `focusDealsFromLatestRun`, so a deal-focus run overrides).

Until someone **runs** My Deal Focus (manual or weekday 07:00 cron), home focus is the heuristic. Scoring weights live in `executors/deal-focus.ts` (risk, blockers, 14-day stall, hot +10, relative amount) — see `10-agents-approvals.md`.

---

## AI HTTP cheat sheet

| Method | Path | Writes deal? |
|--------|------|----------------|
| `POST` | `/ai/sentiment` | yes `sentiment` |
| `POST` | `/ai/fit-score` | yes `technicalFitScore` |
| `POST` | `/ai/suggest-blocker` | no |
| `POST` | `/deals/:id/ask` | no |
| `GET/POST` | `/deals/:id/meddpicc` (+ `/stream`) | `DealMeddpicc` + `meddpiccCompleteness` |
| (implicit) | deal note/blocker/stage PATCH | `void refreshDealScores` → sentiment + fit |

---

## Gotchas

1. **`refreshDealScores` uses `updateOne`**, so concurrent `deal.save()` on another request can race; it is intentionally best-effort.
2. **Ask citations only attach to artifact chunks**, not notes (notes are in the prompt but not citation objects).
3. **Vector search needs Atlas index `artifact_chunks_vector`**. Local Mongo → regex fallback even with a Gemini key.
4. **Hash embeddings are 384-d; Gemini embeddings are model-native length.** Mixing key on/off without re-embed will make `$vectorSearch` nonsense — re-ingest or re-run embed jobs after enabling the key.
5. **Gong without deal match** still stores calls but never fires `activity.ingested` agents and Ask won’t see those chunks on a deal.
6. **Home focus is stale by design** until the next deal-focus run; editing a deal does not recompute the home list.
7. Sentiment heuristic is English keyword lists — fine for demo, weak on real transcripts (prefer Gemini + Gong text).
