# AGENTS.md

This file provides guidance to Google Antigravity (AGY) and AI assistants working in this app (`apps/quan-tri-du-an-core`). See the monorepo root [AGENTS.md](../../AGENTS.md) first for repo-wide conventions — this file covers what is specific to this app.

## Commands

```bash
pnpm --filter quan-tri-du-an-core dev     # next dev
pnpm --filter quan-tri-du-an-core build   # next build
pnpm --filter quan-tri-du-an-core start   # next start
```

There is no test suite / test runner configured for this app yet.

Jira sync (run manually, only works from inside the SBSI corporate network/VPN — see "Jira data flow" below):
```bash
# apps/quan-tri-du-an-core/scripts/SYNC_JIRA_NOW.bat  (double-click on Windows)
# or directly:
python apps/quan-tri-du-an-core/scripts/sync_jira_fss.py
```
Requires `apps/quan-tri-du-an-core/scripts/.env` with `JIRA_USER`/`JIRA_PASS` (copy `.env.example`; gitignored, never commit real values).

Re-extracting a legacy page after editing one of the original single-file HTML dashboards (rare — see "Legacy page conversion" below):
```bash
cd apps/quan-tri-du-an-core && node scripts/extract-legacy.mjs
```

## App origin

This app is a fork of a previous standalone repo (`quan-tri-du-an-core`): a set of static, single-file HTML dashboards deployed on Cloudflare Pages, backed by 4 Cloudflare Pages Functions reading/writing one Cloudflare KV namespace. It was ported here as the first app in this monorepo. Frontend look/behavior was kept intentionally identical during the port; only the delivery mechanism changed. **This app's `src/legacy/` conversion machinery is specific to that one-time migration — do not use it as a template for new apps** (see root `AGENTS.md` / skill `/new-app` for the pattern new apps should follow).

## Architecture

**Cloudflare KV is accessed over the REST API, not a native binding.** The original Cloudflare Pages Functions used `env.KV.get/put` bindings, which only work when code actually executes on Cloudflare's Workers runtime. This app deploys off Cloudflare Pages (e.g. Vercel), so `packages/cloudflare-kv` (`kvGet`/`kvPut`) hits `https://api.cloudflare.com/client/v4/accounts/{id}/storage/kv/namespaces/{id}/values/{key}` instead, authenticated with `CLOUDFLARE_API_TOKEN`. Required env vars (`apps/quan-tri-du-an-core/.env.local`): `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_KV_NAMESPACE_ID` (must be the same namespace the original Pages Functions were bound to, to preserve existing test-status data), `CLOUDFLARE_API_TOKEN` (scoped to `Workers KV Storage: Edit`).

**API routes (`src/app/api/*/route.ts`) are a 1:1 behavioral port** of the original Cloudflare Pages Functions — same KV keys (`sbsi_central_state`, `sbsi_audit_logs`), same JSON response shapes, same CORS headers. `state` (GET/POST platform test-case status), `summary` (aggregate pass/fail/pending %, hardcoded totals per platform), `audit` (last-50 activity feed), `jira-sync` (Jira REST proxy — see below). Treat any behavior change here as deliberate, not incidental.

**Legacy page conversion (`src/legacy/`, `src/components/LegacyPage.tsx`, `scripts/extract-legacy.mjs`):** the 6 dashboard HTML files (plus the portal) are real Next.js routes, not static files in `public/`, converted from the original single-file HTML/CSS/JS. `extract-legacy.mjs` splits each original file into `src/legacy/<slug>/{style.css, body.html, meta.json}`. Critically, `body.html` keeps markup and `<script>` blocks **interleaved in original document order** — some scripts sit between modal markup, so scripts and markup can't be split into separate buckets. `LegacyPage.tsx` renders that body via `dangerouslySetInnerHTML`, then on mount replaces every `<script>` node it contains with a freshly created one (browsers never execute scripts inserted via `innerHTML`, but do execute freshly created script elements inserted into a live document) — this preserves both the original execution order and behavior. Route folders are named exactly like the original filenames (e.g. `src/app/Platform_Web_Trading_Online.html/page.tsx`) specifically so the pages' internal relative `<a href="Platform_Web_Trading_Online.html">` links keep working unmodified. The root `/` path is a `next.config.ts` rewrite to `/SBSI_Master_Project_Portal.html` (replacing the old Cloudflare `_redirects` rule).

**Per-page theme (`data-theme` dark/light) is resolved server-side in `src/app/layout.tsx`** via `useSelectedLayoutSegment()` + the static map in `src/lib/pageThemes.ts`, not via a client effect — this matters because setting it client-side would flash the wrong theme on first paint (very visible on `Platform_eKYC_Onboarding.html`, the one page that's `light` while everything else is `dark`).

**Jira data flow is intentionally split across two paths, not unified:**
- `/api/jira-sync` proxies live to `https://projects.fss.com.vn` (Jira FSS). This only succeeds when the process running it has network access to that host — true for local dev on the SBSI network, **not** true for the deployed app (Vercel etc. can't reach it; times out).
- The actual production data path is `apps/quan-tri-du-an-core/scripts/sync_jira_fss.py`, run manually each morning from inside the office/VPN. It fetches Jira directly and pushes the result to an **external** Cloudflare Worker (`sbsi-uat-api.tungbachntb.workers.dev`, not part of this repo, ownership outside this monorepo) — that's Tier 1 of a 5-tier fallback cascade baked into the portal's client JS (`src/legacy/master-project-portal/body.html`) for loading Jira issues, with further tiers falling back to a local snapshot file, another CDN mirror, and finally a hardcoded initial dataset. This external-worker dependency was a deliberate decision to keep (not migrate to this repo's own KV) — least change to a system that already works.

## Security notes specific to this repo

The original repo had a hardcoded Jira Basic Auth password committed to git history (now rotated to env-var-only: `JIRA_USER`/`JIRA_PASS`, no fallback, in both the `jira-sync` route and `sync_jira_fss.py`). If you ever see a hardcoded credential fallback reappear in either of those files, that's a regression — remove it.
