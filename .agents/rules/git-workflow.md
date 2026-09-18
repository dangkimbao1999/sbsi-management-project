# Git Workflow

Guidelines for branch management, working trees, and safe git operations.

## Do:

- Check git repository status (`git status`, `git branch`) before starting edits.
- Always create or switch to an isolated feature/fix branch (`feat/...`, `fix/...`) before modifying code.
- Keep commits focused and provide clear, conventional commit messages (`feat: ...`, `fix: ...`, `docs: ...`).
- Preserve uncommitted user changes when switching contexts.
- Ask the user before merging branches or drafting pull requests.

## Do not:

- Edit or commit code directly on `main` or `master` (documentation edits such as `AGENTS.md` or `README.md` are exempt).
- Run destructive commands: `git reset --hard`, `git clean -fdx`, or recursive force-checkouts.
- Push or merge directly to `main` without explicit confirmation.

## Scope & Applicability:

- Applies to all tasks interacting with the git repository and version control.
