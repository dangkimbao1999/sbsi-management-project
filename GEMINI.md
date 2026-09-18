# GEMINI.md

Guidance for Google Antigravity (AGY) and Gemini models working in the SBSI Monorepo.

See [AGENTS.md](./AGENTS.md) for full project conventions, stack specifications, and command references.

## Key Directives

1. **Stack Convention:** All new apps default to Next.js (App Router, TypeScript) in Turborepo. Use Cloudflare KV via REST API (`packages/cloudflare-kv`), never native worker bindings.
2. **Branching First:** Never commit or edit code directly on `main`/`master`. Always create or switch to a feature/fix branch (`feat/...`, `fix/...`) before modifying code.
3. **Environment & Secrets:** Never commit `.env` files, API tokens, or hardcode credential fallbacks. Document required variables in `.env.example`.
4. **Active Knowledge Base:** After completing any significant task on an app, proactively update `apps/<app>/AGENTS.md` with architectural decisions, constraints, and pending items.
5. **Quality & Verification:** Keep patches small, follow existing patterns, and verify changes with actual commands (`pnpm build`, `pnpm lint`) before reporting completion.
6. **Implementation Plan Mandatory:** Every code implementation, feature development, or system refactor must strictly follow an `implementation_plan.md` artifact. Always stop and obtain user approval before modifying code or running modifying commands.
