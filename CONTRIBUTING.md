# Contributing to Coursera MCP

## Development Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up environment: `cp .env.example .env`
4. Run tests: `bun test`

## Branch Strategy

- **main**: Production-ready code (protected, requires PR review)
- **develop**: Integration branch for features and fixes

## Making Changes

1. Create feature branch from `develop`: `git checkout -b feature/your-feature`
2. Make changes and commit (conventional format):
   - `feat:` for features
   - `fix:` for bug fixes
   - `docs:` for documentation
   - `test:` for tests
   - `chore:` for build/tooling
3. Push to remote and create PR against `develop`
4. After review, PR is merged to `develop`
5. Release process: merge `develop` to `main` with version tag

## Commit Messages

Use conventional commit format:
```
type(scope): description

body (optional)
```

Example:
```
feat(auth): add TOTP 2FA verification

Implement speakeasy-based TOTP validation with AES-256 encryption
for backup codes. Fixes #42.
```

## Testing

- Unit tests: `bun test tests/unit`
- Integration tests: `bun test tests/integration`
- Coverage: `bun test --coverage`
- Minimum coverage: 85%

## Code Style

- TypeScript strict mode required
- ESLint: `bun run lint`
- Prettier: `bun run format` (auto-format before commit)
- No `any` types allowed

## Pull Request Checklist

- [ ] Tests pass locally
- [ ] Coverage meets 85% minimum
- [ ] Code is linted and formatted
- [ ] Commit messages follow conventional format
- [ ] PR description explains changes
- [ ] No sensitive data (keys, tokens) in code

## Questions?

Open an issue or check documentation in `/docs`
