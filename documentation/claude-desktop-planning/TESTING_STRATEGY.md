# Estrategia Integral de Testing: Coursera MCP

**Versión**: 1.0  
**Fecha**: Abril 2026  
**Objetivo**: 85%+ cobertura, arquitectura de tests sostenible

---

## 1. Pirámide de Pruebas

```
            E2E Tests (1%)
           ┌─────────────┐
           │ Staging API │
           │ Workflows   │
           └─────────────┘
                 ▲
                / \
               /   \
              /     \
    Integration Tests (24%)
    ┌──────────────────────┐
    │ HTTP + Cache         │
    │ Auth Flows           │
    │ Tool Workflows       │
    └──────────────────────┘
           ▲
          / \
         /   \
        /     \
Unit Tests (75%)
┌─────────────────────────────────────┐
│ Services, Utils, Parsers, Validators│
│ 85%+ Coverage Target                │
└─────────────────────────────────────┘
```

---

## 2. Unit Tests (Base de la Pirámide)

### 2.1 Servicios

#### courseraClient.test.ts
```typescript
// tests/unit/services/courseraClient.test.ts
import { describe, it, expect, beforeEach, vi } from 'vitest'
import axios from 'axios'
import { CourseraClient } from '@/services/courseraClient'

vi.mock('axios')

describe('CourseraClient', () => {
  let client: CourseraClient
  
  beforeEach(() => {
    client = new CourseraClient()
    vi.clearAllMocks()
  })
  
  describe('GET requests', () => {
    it('should fetch and return JSON response', async () => {
      const mockData = { courses: [] }
      vi.mocked(axios.get).mockResolvedValueOnce({ data: mockData })
      
      const result = await client.get('/api/courses')
      
      expect(result).toEqual(mockData)
      expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/api/courses'))
    })
    
    it('should include session token in Authorization header', async () => {
      client.setSessionToken('token_123')
      vi.mocked(axios.get).mockResolvedValueOnce({ data: {} })
      
      await client.get('/api/me')
      
      expect(axios.get).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer token_123'
          })
        })
      )
    })
  })
  
  describe('Retry Logic', () => {
    it('should retry on network timeout', async () => {
      vi.mocked(axios.get)
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ data: { success: true } })
      
      const result = await client.get('/api/courses')
      
      expect(axios.get).toHaveBeenCalledTimes(3)
      expect(result).toEqual({ success: true })
    })
    
    it('should NOT retry on 4xx errors', async () => {
      vi.mocked(axios.get).mockRejectedValueOnce({
        response: { status: 400, data: { error: 'Bad request' } }
      })
      
      await expect(client.get('/api/courses')).rejects.toThrow()
      expect(axios.get).toHaveBeenCalledTimes(1)
    })
    
    it('should implement exponential backoff', async () => {
      const delays: number[] = []
      const originalSetTimeout = global.setTimeout
      
      vi.stubGlobal('setTimeout', (fn: Function, ms: number) => {
        delays.push(ms)
        fn()
      })
      
      vi.mocked(axios.get)
        .mockRejectedValueOnce(new Error('timeout'))
        .mockRejectedValueOnce(new Error('timeout'))
        .mockResolvedValueOnce({ data: {} })
      
      await client.get('/api/courses')
      
      expect(delays).toEqual([1000, 2000]) // 1s, 2s exponential
      
      vi.stubGlobal('setTimeout', originalSetTimeout)
    })
  })
})
```

#### cache.test.ts
```typescript
// tests/unit/services/cache.test.ts
describe('CacheService', () => {
  let cache: CacheService
  
  beforeEach(() => {
    cache = new CacheService()
    cache.clear()
  })
  
  describe('Basic Operations', () => {
    it('should store and retrieve values', () => {
      cache.set('key1', { data: 'value1' }, 3600_000)
      
      expect(cache.get('key1')).toEqual({ data: 'value1' })
    })
    
    it('should return null for missing keys', () => {
      expect(cache.get('nonexistent')).toBeNull()
    })
  })
  
  describe('TTL (Time To Live)', () => {
    it('should expire cached values after TTL', async () => {
      cache.set('key1', { data: 'value' }, 100) // 100ms TTL
      
      expect(cache.get('key1')).not.toBeNull()
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      expect(cache.get('key1')).toBeNull()
    })
    
    it('should not expire if not past TTL', async () => {
      cache.set('key1', { data: 'value' }, 1000)
      
      await new Promise(resolve => setTimeout(resolve, 500))
      
      expect(cache.get('key1')).not.toBeNull()
    })
  })
  
  describe('Stale-While-Revalidate', () => {
    it('should serve stale cache while revalidating', async () => {
      cache.set('courses', { count: 5 }, 100)
      
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Caché expirado
      const result = cache.getStale('courses')
      expect(result.data).toEqual({ count: 5 })
      expect(result.isStale).toBe(true)
    })
  })
})
```

#### auth.test.ts
```typescript
// tests/unit/services/auth.test.ts
describe('AuthService', () => {
  let auth: AuthService
  let mockCourseraClient: any
  
  beforeEach(() => {
    mockCourseraClient = {
      post: vi.fn(),
      get: vi.fn()
    }
    auth = new AuthService(mockCourseraClient)
  })
  
  describe('TOTP 2FA', () => {
    it('should validate TOTP code against secret', () => {
      const secret = 'JBSWY3DPEBLW64TMMQ======'
      const isValid = auth.validateTOTPCode(secret, '123456')
      
      expect(typeof isValid).toBe('boolean')
    })
    
    it('should generate correct TOTP codes', () => {
      const secret = 'JBSWY3DPEBLW64TMMQ======'
      const code1 = auth.generateTOTPCode(secret)
      const code2 = auth.generateTOTPCode(secret)
      
      // En el mismo tiempo, código debe ser igual
      expect(code1).toBe(code2)
      expect(code1).toMatch(/^\d{6}$/)
    })
  })
  
  describe('Session Management', () => {
    it('should encrypt session token', () => {
      const token = 'session_abc123'
      const encrypted = auth.encryptSessionToken(token)
      
      expect(encrypted).not.toEqual(token)
      
      const decrypted = auth.decryptSessionToken(encrypted)
      expect(decrypted).toEqual(token)
    })
  })
})
```

#### parser.test.ts
```typescript
// tests/unit/services/parser.test.ts
describe('Parser Service', () => {
  describe('parseCourse with Zod validation', () => {
    it('should parse valid course response', () => {
      const raw = {
        id: 'python-101',
        name: 'Introduction to Python',
        slug: 'python-101',
        description: 'Learn Python basics',
        duration: 4,
        rating: 4.8
      }
      
      const course = parseCourse(raw)
      
      expect(course.id).toBe('python-101')
      expect(course.name).toBe('Introduction to Python')
    })
    
    it('should throw on missing required fields', () => {
      const raw = {
        name: 'Python Course'
        // Missing: id
      }
      
      expect(() => parseCourse(raw)).toThrow()
    })
    
    it('should coerce optional fields', () => {
      const raw = {
        id: 'python-101',
        name: 'Python',
        slug: 'python-101'
        // description, duration, rating optional
      }
      
      const course = parseCourse(raw)
      
      expect(course.description).toBeUndefined()
      expect(course.duration).toBeUndefined()
    })
  })
})
```

### 2.2 Utils y Helpers

#### retry.test.ts
```typescript
// tests/unit/utils/retry.test.ts
describe('Retry Utility', () => {
  it('should succeed on first attempt', async () => {
    const fn = vi.fn().mockResolvedValueOnce({ success: true })
    
    const result = await withRetry(fn, { maxAttempts: 3 })
    
    expect(result).toEqual({ success: true })
    expect(fn).toHaveBeenCalledTimes(1)
  })
  
  it('should retry and eventually succeed', async () => {
    const fn = vi.fn()
      .mockRejectedValueOnce(new Error('fail'))
      .mockRejectedValueOnce(new Error('fail'))
      .mockResolvedValueOnce({ success: true })
    
    const result = await withRetry(fn, { maxAttempts: 3 })
    
    expect(result).toEqual({ success: true })
    expect(fn).toHaveBeenCalledTimes(3)
  })
  
  it('should throw after max attempts', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('always fails'))
    
    await expect(
      withRetry(fn, { maxAttempts: 2 })
    ).rejects.toThrow()
    
    expect(fn).toHaveBeenCalledTimes(2)
  })
})
```

#### circuitBreaker.test.ts
```typescript
// tests/unit/utils/circuitBreaker.test.ts
describe('CircuitBreaker', () => {
  let breaker: CircuitBreaker
  
  beforeEach(() => {
    breaker = new CircuitBreaker({
      failureThreshold: 3,
      successThreshold: 2,
      resetTimeout: 1000
    })
  })
  
  it('should pass through requests when CLOSED', async () => {
    const fn = vi.fn().mockResolvedValue('success')
    
    const result = await breaker.execute(fn)
    
    expect(result).toBe('success')
    expect(breaker.state).toBe('closed')
  })
  
  it('should OPEN after threshold failures', async () => {
    const fn = vi.fn().mockRejectedValue(new Error('fail'))
    
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(fn)).rejects.toThrow()
    }
    
    expect(breaker.state).toBe('open')
  })
  
  it('should serve stale cache when OPEN', async () => {
    // Setup: OPEN the breaker
    const failFn = vi.fn().mockRejectedValue(new Error('fail'))
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow()
    }
    
    // Now request should serve stale cache
    const result = await breaker.execute(
      () => Promise.resolve('new data'),
      () => Promise.resolve('stale data')
    )
    
    expect(result).toBe('stale data') // Stale cache served
  })
  
  it('should transition to HALF-OPEN after timeout', async () => {
    const failFn = vi.fn().mockRejectedValue(new Error('fail'))
    for (let i = 0; i < 3; i++) {
      await expect(breaker.execute(failFn)).rejects.toThrow()
    }
    
    expect(breaker.state).toBe('open')
    
    await new Promise(resolve => setTimeout(resolve, 1100))
    
    expect(breaker.state).toBe('half-open')
  })
})
```

---

## 3. Integration Tests (Capa Media)

### 3.1 HTTP + Cache Integration

```typescript
// tests/integration/http-cache.integration.test.ts
describe('HTTP Client with Cache', () => {
  let client: CourseraClient
  let cache: CacheService
  
  beforeEach(() => {
    cache = new CacheService()
    client = new CourseraClient(cache)
    vi.clearAllMocks()
  })
  
  it('should cache GET request and skip second HTTP call', async () => {
    const mockHttpFn = vi.fn().mockResolvedValue({ courses: [] })
    client['_fetch'] = mockHttpFn
    
    await client.get('/api/courses')
    await client.get('/api/courses') // Same request
    
    // HTTP llamado una sola vez
    expect(mockHttpFn).toHaveBeenCalledTimes(1)
    
    // Cache devolvió resultado en segunda llamada
    expect(cache.get('GET:/api/courses')).not.toBeNull()
  })
  
  it('should invalidate cache on POST/PUT/DELETE', async () => {
    cache.set('GET:/api/courses', { courses: [1, 2, 3] })
    
    const mockHttpFn = vi.fn().mockResolvedValue({ success: true })
    client['_fetch'] = mockHttpFn
    
    // POST debe invalidar GET cache relacionado
    await client.post('/api/courses', { name: 'New Course' })
    
    expect(cache.get('GET:/api/courses')).toBeNull()
  })
})
```

### 3.2 Authentication Flow

```typescript
// tests/integration/auth-flow.integration.test.ts
describe('Complete Authentication Flow', () => {
  let authService: AuthService
  let mockCourseraClient: any
  let sessionStorage: SessionStorage
  
  beforeEach(() => {
    sessionStorage = new SessionStorage()
    mockCourseraClient = {
      post: vi.fn(),
      get: vi.fn()
    }
    authService = new AuthService(mockCourseraClient, sessionStorage)
  })
  
  it('should complete TOTP 2FA login flow', async () => {
    // 1. Post credenciales
    mockCourseraClient.post.mockResolvedValueOnce({
      totpRequired: true,
      sessionId: 'temp_session_123'
    })
    
    const initResult = await authService.initiateLogin({
      email: 'user@example.com',
      password: 'password123'
    })
    
    expect(initResult.totpRequired).toBe(true)
    
    // 2. Validar código TOTP
    mockCourseraClient.post.mockResolvedValueOnce({
      sessionToken: 'session_token_abc',
      refreshToken: 'refresh_token_xyz',
      expiresIn: 86400
    })
    
    const loginResult = await authService.verifyTOTP({
      sessionId: initResult.sessionId,
      totpCode: '123456'
    })
    
    expect(loginResult.sessionToken).toBeDefined()
    
    // 3. Verificar que sesión fue guardada encriptada
    const savedSession = sessionStorage.getSession('user@example.com')
    expect(savedSession.sessionToken).toBeDefined()
    expect(savedSession.sessionToken).not.toEqual('session_token_abc') // Encriptado
  })
  
  it('should handle failed TOTP validation', async () => {
    mockCourseraClient.post.mockRejectedValueOnce({
      response: { status: 401, data: { error: 'Invalid TOTP code' } }
    })
    
    await expect(
      authService.verifyTOTP({
        sessionId: 'temp_session',
        totpCode: 'invalid'
      })
    ).rejects.toThrow('Invalid TOTP code')
  })
  
  it('should refresh expired session', async () => {
    sessionStorage.saveSession('user@example.com', {
      sessionToken: 'expired_token',
      refreshToken: 'refresh_token',
      expiresAt: new Date(Date.now() - 1000) // Expirado
    })
    
    mockCourseraClient.post.mockResolvedValueOnce({
      sessionToken: 'new_session_token',
      refreshToken: 'new_refresh_token'
    })
    
    const newSession = await authService.refreshSession('user@example.com')
    
    expect(newSession.sessionToken).toBe('new_session_token')
    
    // Verificar que sesión fue actualizada
    const updated = sessionStorage.getSession('user@example.com')
    expect(updated.sessionToken).toBe('new_session_token')
  })
})
```

### 3.3 Tool Workflows

```typescript
// tests/integration/tools-workflow.integration.test.ts
describe('Tool Workflows', () => {
  let mcp: MCPServer
  let mockCourseraApi: nock.Scope
  
  beforeEach(() => {
    mcp = new MCPServer()
    mockCourseraApi = nock('https://www.coursera.org')
  })
  
  afterEach(() => {
    nock.cleanAll()
  })
  
  it('search_courses → parse → cache workflow', async () => {
    mockCourseraApi
      .get('/api/courses')
      .query({ q: 'Python' })
      .reply(200, {
        courses: [
          {
            id: 'python-101',
            name: 'Introduction to Python',
            slug: 'python-101',
            rating: 4.8
          }
        ]
      })
    
    const result = await mcp.callTool('search_courses', {
      query: 'Python',
      limit: 10
    })
    
    expect(result.courses).toHaveLength(1)
    expect(result.courses[0].name).toBe('Introduction to Python')
    
    // Verificar que caché fue actualizado
    expect(mcp.cache.get('search:Python')).not.toBeNull()
    
    // Segunda llamada debe usar caché
    mockCourseraApi.done() // Verifica que no hay more pending requests
    
    const result2 = await mcp.callTool('search_courses', {
      query: 'Python'
    })
    
    expect(result2).toEqual(result)
  })
})
```

---

## 4. E2E Tests (Punta de la Pirámide)

```typescript
// tests/e2e/staging.e2e.test.ts
// NOTA: Ejecutar solo contra staging API
describe('E2E Tests (Staging Only)', () => {
  let client: CourseraClient
  
  beforeAll(() => {
    if (process.env.STAGING_API_URL !== 'https://staging.coursera.org') {
      throw new Error('E2E tests must run against staging only')
    }
    client = new CourseraClient(process.env.STAGING_API_URL)
  })
  
  it('should search real courses from staging', async () => {
    const result = await client.get('/api/courses', {
      params: { q: 'Python', limit: 5 }
    })
    
    expect(result.courses).toBeDefined()
    expect(result.courses.length).toBeGreaterThan(0)
    expect(result.courses[0]).toHaveProperty('id')
    expect(result.courses[0]).toHaveProperty('name')
  })
  
  it.skip('should authenticate and fetch enrolled courses', async () => {
    // Requiere credenciales válidas en staging
    const session = await client.authenticate({
      email: process.env.STAGING_EMAIL,
      password: process.env.STAGING_PASSWORD
    })
    
    const enrolled = await client.get('/api/me/enrolled')
    expect(enrolled.courses).toBeDefined()
  })
})
```

---

## 5. Fixture Management

```typescript
// tests/fixtures/index.ts
export const mockCourses = [
  {
    id: 'python-101',
    name: 'Introduction to Python',
    slug: 'python-101',
    description: 'Learn Python from scratch',
    duration: 4,
    level: 'beginner',
    language: 'en',
    rating: 4.8,
    enrollments: 150000,
    instructors: [
      { id: 'prof_1', name: 'Dr. John Smith' }
    ],
    hasFreeCertificate: true
  },
  // ... más cursos
]

export const mockPrograms = [
  {
    id: 'data-science-specialization',
    name: 'Data Science Specialization',
    type: 'specialization',
    courses: [...],
    totalDuration: '3 months'
  }
]

export const mockEnrolledCourses = [
  {
    id: 'python-101',
    name: 'Introduction to Python',
    progress: {
      percent: 45,
      currentWeek: 2,
      lastAccessedDate: '2026-04-27'
    },
    status: 'in-progress'
  }
]
```

---

## 6. Coverage Requirements

### 6.1 Tabla de Cobertura por Módulo

| Módulo | Target | Crítico |
|--------|--------|---------|
| services/courseraClient.ts | 90% | ✓ |
| services/cache.ts | 85% | ✓ |
| services/auth.ts | 95% | ✓✓ |
| services/parser.ts | 80% | ✓ |
| utils/retry.ts | 85% | ✓ |
| utils/circuitBreaker.ts | 90% | ✓ |
| tools/*.ts | 75% | ✓ |
| **TOTAL** | **85%** | - |

### 6.2 CI Coverage Report

```bash
$ pnpm test:coverage

======== Coverage Summary ========
Statements   : 85.3% ( 2447/2870 )
Branches     : 82.1% ( 1156/1407 )
Functions    : 87.2% (  654/750  )
Lines        : 85.9% ( 2401/2794 )

Uncovered lines:
  src/tools/recommendations.ts:145 (rare ML edge case)
  src/utils/logger.ts:89 (development-only path)
```

---

## 7. Test Execution Pipeline

### 7.1 Scripts de package.json

```json
{
  "scripts": {
    "test": "vitest",
    "test:watch": "vitest --watch",
    "test:unit": "vitest run --include='**/*.unit.test.ts'",
    "test:integration": "vitest run --include='**/*.integration.test.ts'",
    "test:e2e": "vitest run --include='**/*.e2e.test.ts'",
    "test:coverage": "vitest run --coverage",
    "test:ci": "vitest run --coverage --reporter=json --reporter=default"
  }
}
```

### 7.2 GitHub Actions Integration

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - uses: actions/setup-node@v4
        with:
          node-version: 20.x
          cache: pnpm
      
      # Unit tests (rápido)
      - run: pnpm test:unit --coverage
      
      # Integration tests
      - run: pnpm test:integration
      
      # Coverage report
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true
          min_coverage_percentage: 85
      
      # E2E tests (solo en main, contra staging)
      - if: github.ref == 'refs/heads/main'
        run: pnpm test:e2e
        env:
          STAGING_API_URL: ${{ secrets.STAGING_API_URL }}
```

---

## 8. Best Practices

✅ **Haz**:
- Un test por comportamiento esperado
- Nombres descriptivos: `should_X_when_Y()`
- Mocks para dependencias externas
- Fixtures reutilizables
- Tests independientes (sin order)

❌ **Evita**:
- Tests acoplados a implementación interna
- Múltiples aserciones por test
- Mocks de todo (solo externas)
- Waits/sleeps sin timeout
- Tests lentos en unit tests

---

**Documento guía para mantener calidad y confianza en el código.**
