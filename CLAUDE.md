# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

---

## Project Overview

**Coursera MCP**: A Model Context Protocol server integrating Coursera with Claude AI.

**Key Features**:
- 7 tools: 4 public (search, details), 3 private (enrolled, progress, recommendations)
- TOTP 2FA authentication (not email/password)
- Circuit breaker pattern for resilience
- Zod runtime validation against API schema changes
- 85%+ test coverage (unit/integration/E2E)

**Current Status**: Pre-implementation (analysis & design complete). 68 atomized tasks in `TASKS.md`.

**Timeline**: 7-9 weeks @ 12-15h/week (organized in 4 phases)

---

## Critical Project Principles

### Security First
- **TOTP 2FA** (not email/password) — credentials never stored on disk
- **AES-256 encryption** for session tokens in `~/.coursera-mcp/sessions.json`
- **No logging** of: tokens, passwords, emails, user IDs, full API responses
- Use `sanitizeForLogging()` for all logger calls (auto-redacts sensitive fields)

### Resilience by Design
- **Circuit Breaker pattern**: If API fails, serve stale cache + auto-recover in 60s
- **Exponential backoff**: 1s, 2s, 4s retries on transient errors
- **Stale-While-Revalidate**: Serve old cache + refetch in background
- Never fail when fallback data exists

### Type Safety & Validation
- **TypeScript strict mode** (no `any` type)
- **Zod schemas** for runtime validation (catches API schema changes)
- **Discriminated unions** for error handling (not generic Error)
- Named exports preferred over defaults

### Testing Architecture
- **Unit Tests** (75%): vitest with mocks, <100ms per test
- **Integration Tests** (24%): vitest + nock (HTTP mocks)
- **E2E Tests** (1%): against staging API only
- Coverage enforced: 85% minimum in CI
- Each tool handler thoroughly tested

---

## Common Commands

### Development
```bash
bun install               # Install dependencies
bun run dev               # TypeScript watch mode
bun run build             # Compile + bundle (esbuild)
bun run lint              # ESLint + auto-fix
bun run type-check        # tsc --noEmit
```

### Testing
```bash
bun test                  # Run all tests (watch mode)
bun run test:unit         # Unit tests only
bun run test:integration  # Integration tests only
bun run test:coverage     # Coverage report (must be >85%)
```

### Git Workflow
```bash
git checkout -b feat/TXXX  # Feature branch for task TXXX
# ... implementation ...
git commit -m "feat: TXXX Description"  # Conventional commits
git push origin feat/TXXX
# Create PR → merge to main
```

---

## Project Structure (As Implemented)

```
src/
├── index.ts                    # MCP server entry point
├── types/
│   ├── coursera.ts            # Domain types (Course, Program, User, etc.)
│   ├── schemas.ts             # Zod schemas for validation
│   ├── errors.ts              # Discriminated unions + custom error classes
│   └── config.ts              # Configuration types
├── services/
│   ├── courseraClient.ts       # HTTP client with circuit breaker
│   ├── cache.ts               # Cache with TTL + stale-while-revalidate
│   ├── auth.ts                # TOTP 2FA + session management
│   ├── encryption.ts          # AES-256 encryption for tokens
│   └── parser.ts              # Response parsing with Zod validation
├── tools/
│   ├── search.ts              # search_courses, search_programs
│   ├── details.ts             # get_course_details, get_program_details
│   ├── enrolled.ts            # get_enrolled_courses, get_progress
│   └── recommendations.ts      # get_recommendations
├── utils/
│   ├── logger.ts              # Winston logger with sanitization
│   ├── retry.ts               # Exponential backoff retry logic
│   ├── circuitBreaker.ts      # Circuit breaker pattern
│   └── errors.ts              # Custom error classes
└── middleware/
    └── auth.ts                # Authentication middleware

tests/
├── unit/                       # Mocked service tests (<100ms)
├── integration/                # Real HTTP mocks, combined services
└── fixtures/                   # Mock data (courses, users, etc.)

.github/workflows/
└── ci.yml                      # GitHub Actions (type-check, lint, test, coverage)

docs/
├── API.md                      # Tool specifications
├── DEVELOPMENT.md              # Architecture for developers
├── SECURITY_USERS.md           # TOTP setup instructions
└── [other documentation]
```

### Key Architectural Patterns

**Tool Handler Pattern**:
```typescript
// src/tools/search.ts
export async function searchCourses(
  query: string,
  options?: SearchOptions
): Promise<SearchResult> {
  // 1. Validate inputs (Zod schema)
  // 2. Create cache key
  // 3. Check cache (or getWithStaleCache)
  // 4. HTTP request via CourseraClient (circuit breaker built-in)
  // 5. Parse response (Zod validation)
  // 6. Update cache
  // 7. Return typed result
  // 8. Error handling (throw CourseraException)
}
```

**Service Composition**:
- `CourseraClient` (HTTP) → wraps circuit breaker + axios
- `CacheService` (persistence) → memory + disk with TTL
- `AuthService` (security) → TOTP + encryption
- `Parser` (validation) → Zod schemas

**Error Flow**:
- API error → CourseraClient catches → CircuitBreaker opens if threshold exceeded
- CircuitBreaker open → getWithStaleCache returns stale data
- Zod validation fails → ValidationError with field + reason
- Auth expires → refreshSession() called automatically

---

## Critical Implementation Details

### TOTP 2FA Flow (src/services/auth.ts)
1. User runs `coursera-mcp init`
2. Input email + password (session only, not stored)
3. Display QR code (QR contains secret)
4. User scans with Google Authenticator/1Password/Authy
5. User enters 6-digit code
6. Validate code with speakeasy.totp.verify()
7. Fetch sessionToken from Coursera API
8. Encrypt with AES-256-GCM using PBKDF2-derived master key
9. Save to `~/.coursera-mcp/sessions.json` (mode 0o600)
10. Delete credentials from memory

### Circuit Breaker States
- **Closed**: Normal operation, all requests pass through
- **Open**: API failing, serve stale cache, don't make requests
- **Half-Open**: Retry one request to see if API recovered

Transitions:
- Closed → Open: After 5 consecutive failures
- Open → Half-Open: After 60 second timeout
- Half-Open → Closed: If request succeeds
- Half-Open → Open: If request fails

### Zod Validation Pattern
```typescript
// Define schema once
export const CourseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rating: z.number().min(0).max(5).optional(),
  // ...
})

// Infer type from schema
export type Course = z.infer<typeof CourseSchema>

// Use in parser
export function parseCourse(raw: unknown): Course {
  try {
    return CourseSchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.error('Validation failed', sanitizeForLogging({errors: err.flatten()}))
      throw new ValidationError(`Invalid course: ${err.message}`)
    }
    throw err
  }
}
```

### Cache TTL Strategy
- **Public data** (courses, programs): 24 hours
- **User data** (enrolled, progress): 1 hour (shorter, more personal)
- **Recommendations**: 6 hours (personal but expensive to compute)
- **Stale-While-Revalidate**: Always serve expired cache + refetch in background

---

## When Implementing Tasks (TASKS.md)

Each task in `TASKS.md` includes:
- **Prompt**: Copy-paste directly to Claude Code
- **Criterio de éxito**: What "done" means
- **Referencias**: Links to relevant docs

### Task Execution Pattern
1. Open `TASKS.md`, find next task (T1.1, T1.2, etc.)
2. Copy entire "Prompt optimized" section
3. Paste into Claude Code
4. Wait for implementation
5. Validate against "Éxito" criteria
6. Mark `[ ]` → `[x]` in TASKS.md
7. Commit: `git commit -m "feat: TXX description"`
8. Repeat next task

### Task Dependencies
Tasks are ordered by phase. Only start Fase 2 after Fase 1 checklist complete.
Each task lists "Requisitos" (what must be done first).

---

## User Preferences (Global CLAUDE.md)

These apply to all conversation with this project:

- **Conversation language**: Spanish
- **Code & comments**: English (American)
- **Package manager**: bun (previously pnpm, changed for speed/simplicity)
- **Git commits**: Conventional format (feat:, fix:, chore:, test:, docs:)
- **Architecture**: SOLID principles + Clean Architecture / Hexagonal
- **Development**: TDD (write tests alongside implementation)
- **TypeScript**: Strict mode always, never use `any`
- **Named exports**: Prefer over default exports
- **Treat as expert**: Suggest solutions you didn't think of, anticipate needs
- **Be right**: Mistakes erode trust — be thorough
- **No moral lectures**: Just technical guidance

---

## Key Documentation References

**For understanding the project**:
- `START_HERE.md` — Quick overview (5 min)
- `documentation/README.md` — Navigation guide
- `DOCUMENTATION_SUMMARY.md` — What's been updated

**For implementation**:
- `IMPLEMENTATION_GUIDE.md` — Step-by-step Fase 1-4
- `TESTING_STRATEGY.md` — Testing architecture + examples
- `SECURITY.md` — TOTP 2FA, encryption, OWASP

**For analysis & decisions**:
- `ANALYSIS_AND_RECOMMENDATIONS.md` — 7 critical improvements rationale
- `coursera-mcp-design.md` — Full technical specification
- `CHANGELOG.md` — What changed from original analysis

**For execution**:
- `TASKS.md` — 68 atomized tasks with prompts (THE main reference during implementation)

---

## Common Debugging

### "How do I run a single test?"
```bash
pnpm test -- tests/unit/services/auth.unit.test.ts
pnpm test -- --grep "TOTP validation"  # By test name
```

### "Where do I add a new tool?"
1. Create function in `src/tools/XXXX.ts`
2. Validate inputs with Zod schema
3. Use `cache.getWithStaleCache()` for caching
4. Parse response with appropriate parser
5. Register in `src/index.ts`: `server.setRequestHandler('tools/XXXX', ...)`
6. Add unit + integration tests in `tests/`

### "How do I add a tool that requires auth?"
1. Wrap handler with `requireAuth()` middleware
2. Middleware will: validate session, refresh if expired, inject userId
3. Check `src/tools/enrolled.ts` for example

### "Circuit breaker opened, why?"
1. Check logs: `~/.coursera-mcp/error.log`
2. If Coursera API is down, circuit breaker serving stale cache (expected)
3. Will auto-recover in 60 seconds
4. If persists, check network/API status

### "Encryption failing?"
1. Verify AES-256-GCM algorithm used
2. Check IV (16 bytes), authTag present
3. Verify master key derived with PBKDF2 (100k iterations)
4. Test with: `new EncryptionService('test-password')`

---

## Before Pushing to Main

- [ ] `bun run type-check` passes
- [ ] `bun run lint` passes
- [ ] `bun test` passes (all tests green)
- [ ] `bun run test:coverage` shows ≥85%
- [ ] No sensitive data in code (run `git grep -i "password\|token\|secret"`)
- [ ] Commit message follows convention (feat:, fix:, etc.)
- [ ] PR description references TASK number (e.g., "Implements T1.5")

---

## Stack Reference

**Core**:
- TypeScript 5.4+ (strict mode)
- Node.js 18+ (runtime)
- @anthropic-ai/sdk (MCP protocol)

**HTTP & Network**:
- axios (HTTP client)
- nock (HTTP mocking in tests)

**Validation & Data**:
- zod (runtime schemas + type inference)
- fs-extra (file I/O with promises)

**Security & Crypto**:
- speakeasy (TOTP generation/validation)
- crypto (Node.js native for AES-256-GCM)

**Logging & Debugging**:
- winston (structured JSON logging)

**Testing**:
- vitest (fast unit tests)
- nock (HTTP request mocking)

**Build & Deployment**:
- esbuild (bundling for standalone executable)
- semantic-release (automated npm versioning)
- GitHub Actions (CI/CD)

---

## Red Flags (Stop and Ask)

If you're about to:
- **Store credentials in `.env`** → They should NEVER be stored (only tokens after TOTP setup)
- **Log a token or password** → Use `sanitizeForLogging()` first
- **Use `any` type in TypeScript** → Ask why, use `unknown` + type guard
- **Skip tests** → TDD applies always
- **Change TOTP flow** → It's security-critical, verify in SECURITY.md first
- **Modify circuit breaker thresholds** → Document rationale
- **Remove Zod validation** → Runtime validation is mandatory

---

**Last Updated**: Abril 28, 2026  
**Project Phase**: Pre-implementation (68 tasks ready in TASKS.md)  
**Next Step**: Execute T1.1 from TASKS.md
