---
name: debugging
description: Use when investigating a failing build, runtime error, regression, or unexpected behavior in any app or package in this monorepo.
---

# Debugging Procedure

## Trigger

Use this skill whenever investigating:
- Failing build or lint checks (`pnpm build`, `pnpm lint`).
- Runtime exceptions, 500 errors, or console errors in Next.js apps.
- Data synchronization failures (e.g. Jira sync, Cloudflare KV reads/writes).
- Regressions introduced by recent code edits.

## Step-by-Step Procedure

1. **Reproduce with Minimal Scope**:
   - Run the smallest specific command that triggers the failure (e.g. `pnpm --filter <app> build` or calling a specific API route).
2. **Trace Code Path & Recent Commits**:
   - Inspect the stack trace, relevant files, and check git history (`git log -n 5 -p <file>`).
3. **Hypothesis-Driven Investigation**:
   - Formulate one clear hypothesis at a time.
   - Inspect environment variable configurations (check `.env.example`).
4. **Targeted Diagnostics**:
   - Add temporary diagnostic logging if needed, ensuring it is removed before finalizing.
5. **Fix Root Cause**:
   - Resolve the underlying defect instead of adding silent fallbacks or empty catch blocks.
6. **Regression Verification**:
   - Rerun the reproduction command to verify the fix.
   - Run workspace-wide checks (`pnpm build`, `pnpm lint`) if shared packages (`packages/*`) were touched.
