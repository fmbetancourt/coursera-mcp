# Contributing to Coursera MCP

Thank you for your interest in contributing to Coursera MCP! This document provides guidelines and instructions for participating in the project.

## Development Setup

### Prerequisites

- Node.js >= 18.0.0
- Bun >= 1.0.0
- Git

### Local Development

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/coursera-mcp.git
cd coursera-mcp
```

2. **Install dependencies**

```bash
bun install
```

3. **Run development mode**

```bash
bun run dev
```

This starts TypeScript in watch mode for automatic compilation.

## Git Workflow

### Branch Naming

Feature branches should follow the convention:

```
feat/T{task-number}-{brief-description}
fix/ISSUE-{issue-number}-{brief-description}
docs/update-{doc-name}
chore/{feature-name}
```

Examples:
- `feat/T2.1-search-courses`
- `fix/ISSUE-42-auth-token-expiry`
- `docs/update-api-docs`

### Commit Messages

This project uses **conventional commits** format:

```
type(scope): description

[optional body]

[optional footer]
```

**Types:**

- `feat:` - A new feature
- `fix:` - A bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, missing semicolons, etc.)
- `refactor:` - Code refactoring
- `perf:` - Performance improvements
- `test:` - Adding or updating tests
- `chore:` - Build, dependency, or tooling changes

**Examples:**

```
feat: T2.1 implement search_courses tool

- Add search functionality with query validation
- Implement caching with 24h TTL
- Add comprehensive unit and integration tests

Closes #15
```

```
fix: correct session token expiration check

The previous implementation was not properly checking the expiration time.
This fix adds proper date comparison with timezone awareness.
```

### Pull Requests

1. **Create a feature branch**

```bash
git checkout -b feat/T2.1-search-courses
```

2. **Make your changes**

Follow the code style guidelines below.

3. **Test your changes**

```bash
# Run all tests
bun test

# Run specific test suite
bun test tests/unit/services/cache.unit.test.ts

# Check coverage
bun run test:coverage

# Type checking
bun run type-check

# Linting
bun run lint
```

4. **Commit your changes**

```bash
git add .
git commit -m "feat: T2.1 implement search_courses tool"
```

5. **Push to remote**

```bash
git push origin feat/T2.1-search-courses
```

6. **Create a Pull Request**

- Title: Keep it short and descriptive
- Description: Reference the task/issue and explain what changed
- Link to related issues/tasks
- Ensure all CI checks pass

## Code Style

### TypeScript

- **Strict mode:** Always enabled (`strict: true` in tsconfig.json)
- **No `any` type:** Use `unknown` with type guards instead
- **Named exports:** Prefer named exports over default exports
- **Type inference:** Leverage TypeScript's type inference, add explicit types for function signatures

### Naming Conventions

- **Constants:** `UPPER_SNAKE_CASE`
- **Functions/Variables:** `camelCase`
- **Classes:** `PascalCase`
- **Interfaces/Types:** `PascalCase`
- **Private members:** Prefix with `_` (e.g., `_privateMethod()`)

### File Organization

```
src/
├── types/          # Type definitions and schemas
├── services/       # Business logic (HTTP, cache, auth)
├── tools/          # MCP tool implementations
├── utils/          # Utility functions
├── middleware/     # Request middleware (auth, validation)
└── index.ts        # Entry point
```

## Testing

### Test Structure

Tests use Bun's native test runner (Jest-compatible):

```typescript
import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

describe('Feature Name', () => {
  let testData;

  beforeEach(() => {
    // Setup
    testData = { /* ... */ };
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do something', () => {
    expect(true).toBe(true);
  });
});
```

### Test Coverage Requirements

- Minimum 85% overall coverage
- All public APIs must be tested
- Test edge cases and error conditions
- Integration tests for inter-service communication

### Running Tests

```bash
# All tests
bun test

# Unit tests only
bun run test:unit

# Integration tests only
bun run test:integration

# With coverage report
bun run test:coverage

# Specific test file
bun test tests/unit/services/cache.unit.test.ts

# Tests matching pattern
bun test --match "*search*"
```

## Code Review Checklist

Before submitting a PR, ensure:

- [ ] Code follows the style guidelines
- [ ] All tests pass (`bun test`)
- [ ] Coverage >= 85% (`bun run test:coverage`)
- [ ] Type checking passes (`bun run type-check`)
- [ ] Linting passes (`bun run lint`)
- [ ] Commit messages follow conventional commits
- [ ] No secrets or sensitive data in code
- [ ] Documentation updated if needed
- [ ] PR description references task/issue

## Security

### Never commit:

- `.env` files or environment variables
- API tokens or credentials
- Private keys or secrets
- Passwords in any form

### Security checks:

```bash
# Audit dependencies for vulnerabilities
npm audit

# Check for secrets in code
git grep -i "password\|token\|secret"
```

## Documentation

### Types of Documentation

- **API.md** - Tool specifications and examples
- **DEVELOPMENT.md** - Architecture and development guide
- **SECURITY.md** - Security implementation details
- **README.md** - Project overview and quick start
- **Code comments** - Only for non-obvious "why" (not "what")

### Code Comments

- Keep comments concise (one line max)
- Explain "why", not "what" (code explains what)
- Update comments when code changes
- Remove obsolete comments

Example:

```typescript
// Good: Explains why we refresh at 5-minute warning
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;

// Bad: Just restates the code
const threshold = 5 * 60 * 1000; // 5 minutes in milliseconds
```

## Getting Help

- Open an issue for bugs or features
- Discuss major changes in an issue first
- Ask questions in PR comments
- Check existing documentation and issues

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing to Coursera MCP!** 🎉
