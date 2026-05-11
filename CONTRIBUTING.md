# Contributing to @auraone/sdk

Thanks for your interest in contributing. This repository hosts the official AuraOne TypeScript SDK — a client library for the hosted AuraOne API.

## Scope

This repo is the client SDK. We welcome:

- Bug reports with a minimal reproduction.
- Documentation fixes — typos, broken links, clearer examples.
- New convenience methods that wrap existing API endpoints.
- Plugin shims for additional eval / agent frameworks.
- Type refinements on existing responses.

Out of scope:

- Hosted backend behavior — that lives elsewhere. File issues that describe expected vs actual behavior; we'll route them.
- Changes that require breaking the public API surface — these need a deprecation cycle.

## Development

```bash
git clone https://github.com/auraoneai/sdk-typescript.git
cd sdk-typescript
npm install
npm run build
npm test
npm run lint
```

## Pull request expectations

- Keep changes focused.
- Add or update tests when changing behavior.
- Run `npm run typecheck`, `npm run lint`, and `npm test` locally before opening a PR.
- Conventional commit prefixes are appreciated (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).

## Code of Conduct

By participating, you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

Contributions are made under the [MIT License](LICENSE).

## Security

For security issues, do not file public issues. See [SECURITY.md](SECURITY.md).
