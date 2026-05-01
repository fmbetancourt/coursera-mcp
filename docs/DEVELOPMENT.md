# Coursera MCP Development Guide

This guide explains the architecture, project structure, and development practices for Coursera MCP.

## Architecture Overview

Coursera MCP uses a **layered, service-oriented architecture** following Clean Architecture and SOLID principles:

```
┌─────────────────────────────────────────────────────┐
│              MCP Server (index.ts)                   │
│    - Tool registration and request handling         │
│    - Error handling and response formatting         │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────┐
│           Middleware Layer                          │
│    - Authentication (requireAuth)                   │
│    - Request validation                             │
│    - Response transformation                        │
└────────────────┬────────────────────────────────────┘
                 │
┌────────────────┴────────────────────────────────────┐
│            Tools Layer (src/tools/)                 │
│    - search_courses, search_programs                │
│    - get_course_details, get_program_details        │
│    - get_enrolled_courses, get_progress             │
│    - get_recommendations                            │
│    ↓ Uses ↓                                          │
├────────────────────────────────────────────────────┤
│           Services Layer (src/services/)            │
│    - CourseraClient: HTTP + Circuit Breaker        │
│    - CacheService: TTL + Stale-While-Revalidate    │
│    - AuthService: TOTP 2FA + Session Management    │
│    - EncryptionService: AES-256-GCM                │
│    - Parser: Zod validation + type parsing         │
│    ↓ Uses ↓                                          │
├────────────────────────────────────────────────────┤
│           Utilities Layer (src/utils/)              │
│    - Logger (Winston)                              │
│    - Retry logic (exponential backoff)             │
│    - Circuit Breaker pattern                       │
│    - Error types                                   │
└────────────────────────────────────────────────────┘
```

## Project Structure

```
coursera-mcp/
├── src/
│   ├── index.ts                    # MCP server entry point
│   ├── types/
│   │   ├── coursera.ts             # Domain types (Course, Program, User, etc.)
│   │   ├── schemas.ts              # Zod validation schemas
│   │   ├── errors.ts               # Error types (discriminated unions)
│   │   └── config.ts               # Configuration types
│   ├── services/
│   │   ├── courseraClient.ts       # HTTP client with circuit breaker
│   │   ├── cache.ts                # Caching service with SWR
│   │   ├── auth.ts                 # TOTP 2FA + session management
│   │   ├── encryption.ts           # AES-256-GCM encryption
│   │   ├── parser.ts               # Response parsing + validation
│   │   └── circuitBreaker.ts       # Circuit breaker implementation
│   ├── tools/
│   │   ├── search.ts               # search_courses, search_programs
│   │   ├── details.ts              # get_course_details, get_program_details
│   │   ├── enrolled.ts             # get_enrolled_courses, get_progress
│   │   └── recommendations.ts      # get_recommendations
│   ├── utils/
│   │   ├── logger.ts               # Winston logger with sanitization
│   │   ├── retry.ts                # Exponential backoff retry
│   │   ├── errors.ts               # Custom error classes
│   │   └── circuitBreaker.ts       # Circuit breaker implementation
│   └── middleware/
│       └── auth.ts                 # Authentication middleware
├── tests/
│   ├── unit/                       # Unit tests (mocked)
│   ├── integration/                # Integration tests (combined services)
│   └── fixtures/                   # Mock data
├── docs/
│   ├── API.md                      # Tool specifications
│   ├── SECURITY.md                 # Security implementation
│   └── DEVELOPMENT.md              # This file
├── .github/workflows/
│   └── ci.yml                      # GitHub Actions CI/CD
├── package.json                    # Dependencies and scripts
├── tsconfig.json                   # TypeScript configuration
├── .eslintrc.json                  # ESLint rules
├── prettier.config.json            # Prettier formatting
└── bunfig.toml                     # Bun test configuration
```

## Key Design Patterns

### 1. **Circuit Breaker Pattern** (src/services/circuitBreaker.ts)

Protects against cascading failures when the Coursera API is down:

```typescript
const breaker = new CircuitBreaker('coursera-api');
const result = await breaker.execute(
  () => courseraClient.get('/api/courses'),
  () => cache.get('fallback-courses') // Fallback to stale cache
);
```

**States:**
- **Closed:** Normal operation, all requests pass through
- **Open:** API failing, requests rejected immediately
- **Half-Open:** Retry one request to see if API recovered

### 2. **Stale-While-Revalidate (SWR) Pattern** (src/services/cache.ts)

Ensures fast responses even during API outages:

```typescript
const courses = await cache.getWithStaleCache(
  'search:python',
  () => courseraClient.post('/api/search', { query: 'python' }),
  24 * 60 * 60 * 1000 // 24h TTL
);
// Returns expired cache immediately, refetches in background
```

### 3. **Zod Runtime Validation**

All API responses are validated against schemas:

```typescript
const CourseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  rating: z.number().min(0).max(5).optional(),
});

export type Course = z.infer<typeof CourseSchema>;

export function parseCourse(raw: unknown): Course {
  return CourseSchema.parse(raw);
}
```

### 4. **Discriminated Unions for Errors**

Type-safe error handling:

```typescript
try {
  const course = await getCourseDetails('course-123');
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`Course ${error.resourceId} not found`);
  } else if (error instanceof AuthenticationError) {
    console.log('Please authenticate first');
  }
}
```

### 5. **Middleware Pattern for Auth**

Wraps tool handlers with authentication:

```typescript
server.setRequestHandler('tools/get_enrolled_courses', 
  async (req) => {
    const context = requireAuth(authService);
    return getEnrolledCourses(courseraClient, cache, context.userId);
  }
);
```

## How to Add a New Tool

### Step 1: Create the tool function (src/tools/)

```typescript
// src/tools/my-feature.ts
import { cache } from '../services/cache';
import { courseraClient } from '../services/courseraClient';

export async function getMyFeature(
  courseraClient: CourseraClient,
  cache: CacheService,
  userId: string
): Promise<MyFeatureResult> {
  const cacheKey = `my-feature:${userId}`;
  
  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      const response = await courseraClient.get('/api/my-feature');
      return parseMyFeature(response);
    },
    1 * 60 * 60 * 1000 // 1h TTL
  );
}
```

### Step 2: Add validation schema (src/types/schemas.ts)

```typescript
import { z } from 'zod';

export const MyFeatureSchema = z.object({
  id: z.string(),
  title: z.string(),
  // ... other fields
});

export type MyFeature = z.infer<typeof MyFeatureSchema>;
```

### Step 3: Create parser (src/services/parser.ts)

```typescript
export function parseMyFeature(raw: unknown): MyFeature {
  try {
    return MyFeatureSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError(`Invalid feature: ${err.message}`);
    }
    throw err;
  }
}
```

### Step 4: Add tests (tests/integration/tools/my-feature.test.ts)

```typescript
import { describe, it, expect } from 'bun:test';
import nock from 'nock';
import { getMyFeature } from '../../../src/tools/my-feature';

describe('getMyFeature', () => {
  it('should fetch and parse feature data', async () => {
    nock('https://www.coursera.org')
      .get('/api/my-feature')
      .reply(200, { id: '1', title: 'Test' });

    const result = await getMyFeature(courseraClient, cache, 'user-1');
    expect(result.id).toBe('1');
  });
});
```

### Step 5: Register in MCP server (src/index.ts)

```typescript
server.setRequestHandler('tools/my-feature', async (req) => {
  const params = req.params as MyFeatureParams;
  return getMyFeature(courseraClient, cache, params.userId);
});
```

## Debugging Guide

### 1. **Enable Verbose Logging**

```bash
LOG_LEVEL=debug bun run dev
```

Logs are written to:
- Console: All levels
- `~/.coursera-mcp/error.log`: Error and above
- `~/.coursera-mcp/combined.log`: All levels

### 2. **Test a Single Tool**

```bash
bun test tests/integration/tools/search.integration.test.ts --match "*python*"
```

### 3. **Check Circuit Breaker State**

```bash
# Look for state transitions in logs
grep "CircuitBreaker" ~/.coursera-mcp/combined.log
```

### 4. **Verify Encryption/Decryption**

```bash
# Test locally
bun run dev
# In REPL:
const auth = new AuthService(client, 'test-password');
const token = auth.encryptSessionToken('secret');
const decrypted = auth.decryptSessionToken(token);
console.log(decrypted === 'secret'); // true
```

### 5. **Debug Cache Misses**

```bash
# Check cache key format
grep "Cache" ~/.coursera-mcp/combined.log | grep -i "miss"
```

## Common Issues and Solutions

### Issue: "Validation error in Course"

**Cause:** API response doesn't match Zod schema

**Solution:**
1. Check API response format in Coursera API docs
2. Update schema in `src/types/schemas.ts`
3. Run tests to verify: `bun test --match "*parse*"`

### Issue: "Session refresh failed"

**Cause:** Session token expired before auto-refresh could complete

**Solution:**
1. Increase refresh threshold: Change `5` minutes to `10` in `src/middleware/auth.ts`
2. Check if CourseraClient.post() is working: Add logs to `refreshSessionWithAPI()`

### Issue: "Circuit breaker stuck in OPEN"

**Cause:** API down, circuit breaker waiting for recovery timeout

**Solution:**
1. Check Coursera API status page
2. Wait 60 seconds (reset timeout)
3. Make a new request to trigger half-open state
4. If API still down, circuit breaker will reopen

### Issue: "Coverage below 85%"

**Cause:** New code not tested

**Solution:**
1. Run coverage report: `bun run test:coverage`
2. Identify uncovered lines in the report
3. Add unit tests for uncovered paths
4. Run tests again to verify: `bun test --coverage`

### Issue: "TypeScript compilation errors"

**Cause:** Type mismatch or missing type definition

**Solution:**
```bash
bun run type-check  # Shows all type errors
# OR
bun run dev         # Watch mode for development
```

## Performance Tuning

### 1. **Cache TTL Guidelines**

- **Public data** (courses, programs): 24h
- **User data** (enrolled, progress): 1h (more personal)
- **Recommendations**: 6h (expensive to compute)

### 2. **Circuit Breaker Settings**

```typescript
// Current defaults in circuitBreaker.ts
const FAILURE_THRESHOLD = 5;      // Open after 5 failures
const RESET_TIMEOUT = 60 * 1000;  // Try again after 60s
```

To tune for your use case:
- Lower threshold: Open circuit sooner
- Higher threshold: Tolerate more failures

### 3. **Retry Strategy**

```typescript
// src/utils/retry.ts
// Current: 1s, 2s, 4s delays
// Change maxDelay if APIs need longer timeouts
```

## Testing Strategy

### Unit Tests (75%)

- Test individual functions in isolation
- Mock dependencies (services, APIs)
- Run fast: <100ms each
- Location: `tests/unit/`

```bash
bun run test:unit
```

### Integration Tests (24%)

- Test multiple services together
- Mock HTTP with `nock`
- Test cache, auth, validation together
- Location: `tests/integration/`

```bash
bun run test:integration
```

### E2E Tests (1%)

- Test full user workflows
- May call real API (staging only)
- Location: `tests/e2e/`

```bash
# Only in CI
bun test tests/e2e/
```

### Coverage Requirements

- Minimum: 85%
- Target: 88%+
- Check: `bun run test:coverage`

## Adding Dependencies

### Before adding a package:

1. Check if it solves a real problem
2. Check for security vulnerabilities: `npm audit`
3. Consider bundle size
4. Use `bun add` (not npm/pnpm)

```bash
bun add package-name
# or for dev dependencies:
bun add -d package-name
```

### Security check:

```bash
npm audit
# Fix critical/high vulnerabilities immediately
npm audit fix
```

## Release Process

Releases are automated via GitHub Actions and semantic-release:

1. **Commit messages** must follow conventional format
2. **Push to main** triggers CI/CD
3. **All tests pass** → Automatic version bump
4. **npm publish** happens automatically
5. **GitHub Release** created automatically

See CHANGELOG.md for all releases.

## Resources

- **Architecture**: See CLAUDE.md for project architecture
- **Security**: See SECURITY.md for security implementation
- **API Docs**: See API.md for tool specifications
- **Git Workflow**: See CONTRIBUTING.md for git guidelines

---

**Last Updated**: May 1, 2026
