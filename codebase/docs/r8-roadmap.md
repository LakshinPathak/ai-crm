# R8 Roadmap — Beta blockers + depth

**Version:** 1.0  
**Date:** 2026-09-11  
**Status:** Batch 1 shipped · Batch 2 in flight  
**Parent:** [`future/implementation-status.md`](future/implementation-status.md) · [`wbs.md`](wbs.md)

---

## Batch 1 (5 subagents — ✅ shipped)

| WS | Theme | Acceptance |
|----|--------|------------|
| **WS-1** | Teams + Google Chat delivery | `workspace-tokens` resolves teams/google_chat; `deliverAgentOutput` posts (or logs with clear stub if API needs app registration) |
| **WS-2** | HubSpot write-back on approve | `crm_field_update` approval → HubSpot deal patch when connection live |
| **WS-3** | Events + call linking | `dispatchDealClosed` on close won/lost; PATCH call artifact `dealId` + UI on `/calls/[id]` |
| **WS-4** | Gong RAG foundation | `ArtifactChunk` model, chunk+embed worker, enqueue from ingest when `rawText` set |
| **WS-5** | Blog detail pages | `/blog/[slug]` for `BLOG_POSTS`; index links work |

**Integrate after batch 1:** `pnpm typecheck && pnpm build && pnpm test:e2e`

---

## Batch 2 (next 5 subagents — queue after batch 1 merges)

| WS | Theme |
|----|--------|
| **WS-6** | Slack interactive approvals (approve/reject buttons → API) |
| **WS-7** | Per-agent webhook trigger `POST /api/v1/agents/:id/webhook` |
| **WS-8** | `deal.created` event dispatch + CRM sync emitter |
| **WS-9** | Deal RAG Q&A API stub `POST /deals/:id/ask` (retrieve chunks + Gemini) |
| **WS-10** | Docs refresh + E2E (write-back smoke, blog slug, trigger-event-catalog) |

---

## Out of scope (R9+)

Salesforce adapter, SQL explorer, production deploy, MCP registry.
