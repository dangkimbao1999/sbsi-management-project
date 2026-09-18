# Environment And Secrets

Security policies regarding credentials, API keys, and sensitive business data.

## Do:

- Use `.env.example` for variable names and documentation only.
- Keep real secrets in gitignored local files (`.env.local`, `scripts/.env`, etc.) or in a managed secret store on the deploy platform.
- Treat SBSI business data, customer financial info, and internal credentials as strictly confidential.

## Do not:

- Commit `.env`, credentials, account IDs, tokens, or private keys into git.
- Paste secrets into docs, pull requests, issue trackers, or commit messages.
- Add a hardcoded credential "fallback default" in code — if an environment variable is missing, fail fast with a clear error message instead.

## Scope & Applicability:

- Applies whenever modifying configuration, authentication, API clients, or files handling environment variables.
