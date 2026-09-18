# Code Conventions

Guidelines for writing code in the SBSI Monorepo.

## Do:

- Read existing files before editing.
- Prefer the repo's existing patterns (check the app's own `AGENTS.md` / `CLAUDE.md` first).
- Keep patches small, clean, and easy to review.
- Explain verification honestly — report what was actually run, not what should theoretically work.
- Respect monorepo workspace boundaries: place shared logic in `packages/`, app-specific logic in `apps/<app>/`.

## Do not:

- Rewrite unrelated code or reformat whole files unnecessarily.
- Add broad abstractions for a narrow task — most apps in this repo are small internal tools, not enterprise frameworks.
- Claim a build/test/lint passed without actually running it.
- Introduce silent error handling or empty catch blocks.

## Scope & Applicability:

- Applies to all coding and refactoring tasks across the monorepo.
