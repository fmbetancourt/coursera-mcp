# Análisis y Recomendaciones: Proyecto Coursera MCP

**Fecha**: 2026-04-28  
**Estado**: Análisis para Optimización Pre-Implementación  
**Revisor**: Claude Code

---

## 1. Resumen Ejecutivo

El proyecto **Coursera MCP** tiene una arquitectura sólida con documentación exhaustiva, pero hay **7 áreas críticas** que deben optimizarse ANTES de implementación para maximizar seguridad, mantenibilidad y UX:

| Aspecto | Prioritario | Impacto | Esfuerzo |
|---------|-------------|--------|---------|
| Autenticación 2FA | 🔴 Alto | Seguridad personal | 2 días |
| Circuit Breaker | 🔴 Alto | Resiliencia | 1 día |
| Validación Runtime (zod) | 🟠 Medio | Robustez | 2 días |
| Testing Strategy | 🟠 Medio | Calidad | 3 días |
| Stale-While-Revalidate | 🟡 Bajo | UX | 1 día |
| Observabilidad | 🟡 Bajo | Debuggabilidad | 1 día |
| CI/CD Detallado | 🟠 Medio | Deploy | 1 día |

**Esfuerzo total**: +11 días → timeline realista es **6-8 semanas**.

---

## 2. Análisis Detallado por Área

### 2.1 🔴 Autenticación (CRÍTICO)

#### Problema
- v1.0 sin 2FA no es viable para Coursera (muy pocas cuentas sin 2FA hoy)
- Email/password requiere guardar credenciales → riesgo de exposición
- Browser session fallback es frágil (se invalida en updates de Coursera)

#### Solución Recomendada: TOTP + Session Token
```typescript
// Flujo mejorado:
1. Usuario ejecuta: `coursera-mcp init`
2. Solicitar email + contraseña (sesión única, no guardado)
3. Pedir 2FA code (TOTP app: Google Authenticator, 1Password, etc.)
4. Retornar SESSION_TOKEN encriptado con AES-256
5. Guardar en ~/.coursera-mcp/sessions.json (permisos 600)

// Credenciales NUNCA en .env, solo token de sesión
// Token refrescable sin credenciales nuevas
```

#### Implementación
- Librerías: `speakeasy` (TOTP), `crypto-js` (encriptación)
- Tests: Mock TOTP app con `speakeasy.generateSecret()`
- Docs: Instrucciones para cada app de 2FA

#### Timeline
- **Semana 1**: Diseño de flujo + librerías
- **Semana 2**: Implementación + tests

---

### 2.2 🔴 Circuit Breaker (CRÍTICO)

#### Problema
Cuando Coursera API cae:
```
GET /api/courses → 503 Service Unavailable
→ HTTP Client reintentos 3 veces (9 segundos)
→ MCP timeout
→ Usuario ve error abruptamente
```

Si el usuario tiene 50 llamadas en paralelo, todos fallan catastrophically.

#### Solución: Patrón Circuit Breaker
```typescript
// src/services/circuitBreaker.ts
class CourseraCircuitBreaker {
  state: 'closed' | 'open' | 'half-open' = 'closed'
  failures = 0
  successThreshold = 2
  failureThreshold = 5
  resetTimeout = 60_000 // 1 min
  
  async execute<T>(fn: () => Promise<T>, context: string): Promise<T> {
    if (this.state === 'open') {
      // Servir caché stale en vez de fallar
      logger.warn(`Circuit breaker OPEN for ${context}, serving stale cache`)
      return getCacheStale(context)
    }
    
    if (this.state === 'half-open') {
      // Intentar 1 request. Si funciona, cerrar. Si falla, abrir.
      try {
        const result = await fn()
        this.onSuccess()
        return result
      } catch (err) {
        this.onFailure()
        throw err
      }
    }
    
    // Estado 'closed' normal
    try {
      const result = await fn()
      this.failures = 0
      return result
    } catch (err) {
      this.failures++
      if (this.failures >= this.failureThreshold) {
        this.state = 'open'
        setTimeout(() => this.state = 'half-open', this.resetTimeout)
        logger.error(`Circuit breaker OPEN after ${this.failures} failures`)
      }
      throw err
    }
  }
}
```

#### Integración
```typescript
// src/services/courseraClient.ts
const circuitBreaker = new CourseraCircuitBreaker()

async function fetchCourses(query: string) {
  return circuitBreaker.execute(
    () => httpClient.get('/api/courses', { params: { q: query } }),
    'fetchCourses'
  )
}
```

#### Beneficio
- **Abierto**: Si Coursera cae, caché stale se sirve con warning
- **Half-open**: Recuperación automática cada 1 minuto
- **Cerrado**: Comportamiento normal

#### Timeline
- **Semana 2**: Diseño + implementación (2 días)

---

### 2.3 🟠 Validación Runtime con Zod (ROBUSTEZ)

#### Problema
Coursera cambia estructura JSON ocasionalmente:
```json
// Antes
{ "courseId": "abc", "title": "Python 101" }

// Después (breaking change sin notificación)
{ "id": "abc", "name": "Python 101" }
```

Sin validación runtime, el parser falla silenciosamente.

#### Solución
```typescript
// src/types/schemas.ts
import { z } from 'zod'

export const CourseSchema = z.object({
  id: z.string().min(1, 'Course ID required'),
  name: z.string().min(1, 'Course name required'),
  slug: z.string(),
  description: z.string().optional(),
  duration: z.number().positive().optional(),
  instructors: z.array(z.object({
    id: z.string(),
    name: z.string()
  })).optional(),
  rating: z.number().min(0).max(5).optional(),
  enrollments: z.number().int().non_negative().optional()
})

export type Course = z.infer<typeof CourseSchema>

// Validación automática en parsers
export function parseCourse(raw: unknown): Course {
  try {
    return CourseSchema.parse(raw)
  } catch (err) {
    if (err instanceof z.ZodError) {
      logger.error('Course schema validation failed', {
        raw,
        errors: err.flatten()
      })
      throw new ValidationError(`Invalid course data: ${err.message}`)
    }
    throw err
  }
}
```

#### Beneficio
- Validación automática con buen UX
- Errores claros ("field X missing")
- Type-safe parsing

#### Timeline
- **Semana 1**: Schemas (2 días)
- **Semana 2**: Integración en parsers (1 día)

---

### 2.4 🟠 Testing Strategy Detallada

#### Estado Actual
Plan menciona "85%+ unit test coverage" pero sin claridad.

#### Propuesta: Three-Tier Testing
```
├── Unit Tests (vitest, mocked)
│   ├── Services: courseraClient, cache, auth, parser
│   ├── Utils: retry logic, logger, errors
│   └── Coverage: 85%+
│   └── Speed: <100ms por test
│
├── Integration Tests (vitest + nock)
│   ├── HTTP client + cache (no saltan a red real)
│   ├── Auth flows: login, 2FA, token refresh
│   ├── Tool workflows: search → parse → cache
│   └── Coverage: 70%+ (critical paths)
│   └── Speed: <1s por test
│
└── E2E Tests (opcional, staging only)
    ├── Full workflows against staging API (si Coursera ofrece)
    ├── Circuit breaker behavior
    └── Ejecutar 1x/week, no en CI pipeline principal
```

#### Estructura de Tests
```
tests/
├── unit/
│   ├── services/
│   │   ├── courseraClient.test.ts
│   │   ├── cache.test.ts
│   │   ├── auth.test.ts
│   │   └── parser.test.ts
│   ├── tools/
│   │   ├── search.test.ts
│   │   ├── enrolled.test.ts
│   │   └── recommendations.test.ts
│   └── utils/
│       ├── retry.test.ts
│       └── circuitBreaker.test.ts
│
├── integration/
│   ├── http-cache.integration.test.ts
│   ├── auth-flow.integration.test.ts
│   └── tools-e2e.integration.test.ts
│
├── fixtures/
│   ├── coursera-api-responses.json
│   ├── mock-courses.json
│   └── mock-users.json
│
└── setup.ts (test utilities)
```

#### Ejemplo: Test de Search
```typescript
// tests/unit/tools/search.test.ts
describe('search_courses', () => {
  beforeEach(() => {
    cache.clear()
    nock('https://www.coursera.org').persist()
  })
  
  it('should search courses and return parsed results', async () => {
    nock('https://www.coursera.org')
      .get('/api/courses')
      .query({ q: 'Python', limit: 10 })
      .reply(200, mockCourseListResponse)
    
    const results = await searchCourses('Python', { limit: 10 })
    
    expect(results).toEqual({
      courses: expect.arrayContaining([
        expect.objectContaining({
          id: expect.any(String),
          name: expect.any(String)
        })
      ]),
      total: expect.any(Number)
    })
  })
  
  it('should use cache on subsequent calls', async () => {
    const call1 = await searchCourses('Python')
    const call2 = await searchCourses('Python')
    
    expect(call1).toEqual(call2)
    expect(nock.isDone()).toBe(false) // Solo 1 request real
  })
  
  it('should fail gracefully with invalid input', async () => {
    const result = await searchCourses('', { limit: 0 })
    expect(result.error).toBeDefined()
  })
})
```

#### Timeline
- **Semana 1-2**: Framework + fixtures (2 días)
- **Semana 3-4**: Tests de todas las herramientas (3 días)
- **Semana 5+**: Mantenimiento continuo (2h/semana)

---

### 2.5 🟡 Stale-While-Revalidate Cache (UX)

#### Problema
```
GET /api/courses → caché expirado
→ HTTP request a Coursera
→ Si Coursera lento (3s), usuario espera
→ O si falla, error abruptamente
```

#### Solución
```typescript
// src/services/cache.ts
async function getWithStaleCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number = 3600_000 // 1h
): Promise<{ data: T; fromCache: boolean }> {
  const cached = cache.get<T>(key)
  
  if (cached) {
    if (!cached.isExpired) {
      return { data: cached.data, fromCache: true }
    }
    
    // Caché expirado: servir stale, refetch en background
    logger.info(`Serving stale cache for ${key}, refreshing in background`)
    fetcher()
      .then(data => cache.set(key, data, ttl))
      .catch(err => logger.warn(`Background refresh failed for ${key}:`, err))
    
    return { data: cached.data, fromCache: true }
  }
  
  // Sin caché: fetch normal
  try {
    const data = await fetcher()
    cache.set(key, data, ttl)
    return { data, fromCache: false }
  } catch (err) {
    logger.error(`Fetch failed for ${key}:`, err)
    throw err
  }
}

// Uso en tools
async function searchCourses(query: string) {
  const { data, fromCache } = await getWithStaleCache(
    `search_courses:${query}`,
    () => httpClient.get('/api/courses', { params: { q: query } }),
    24 * 3600_000 // 24 horas
  )
  
  return {
    ...data,
    _meta: { cached: fromCache, age: Date.now() - cached.timestamp }
  }
}
```

#### Beneficio
- Usuarios ven datos stale vs error
- Mejor UX en condiciones de red débil
- Refetch automático

#### Timeline
- **Semana 2**: Implementación (1 día)

---

### 2.6 🟡 Observabilidad y Logging

#### Problema
Error en producción sin datos para debuggear.

#### Solución: Structured Logging
```typescript
// src/utils/logger.ts
import winston from 'winston'

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'coursera-mcp' },
  transports: [
    new winston.transports.File({ filename: '~/.coursera-mcp/error.log', level: 'error' }),
    new winston.transports.File({ filename: '~/.coursera-mcp/combined.log' })
  ]
})

// En desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}

// Uso
logger.info('Course search initiated', {
  query: 'Python',
  userId: user.id,
  cacheHit: true,
  duration: 234 // ms
})

logger.error('API request failed', {
  endpoint: '/api/courses',
  status: 503,
  retries: 3,
  errorMessage: error.message,
  stack: error.stack
})
```

#### Métricas a Trackear
```typescript
interface RequestMetrics {
  endpoint: string
  method: 'GET' | 'POST'
  status: number
  duration: number // ms
  cached: boolean
  retries: number
  circuitBreakerState: 'closed' | 'open' | 'half-open'
}

function recordMetric(metric: RequestMetrics) {
  logger.debug('HTTP request completed', metric)
  
  // Opcional: enviar a observability tool (Datadog, etc.)
  // metrics.histogram('request.duration', metric.duration)
}
```

#### Timeline
- **Semana 4**: Implementación (1 día)

---

### 2.7 🟠 CI/CD Detallado

#### Problema
Plan menciona "GitHub Actions" pero sin detalles. Risk de deploy fallido.

#### Solución: Workflow Robusto
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 9
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'pnpm'
      
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
      
      - name: Type check
        run: pnpm type-check
      
      - name: Lint
        run: pnpm lint
      
      - name: Unit tests
        run: pnpm test:unit --coverage
      
      - name: Integration tests
        run: pnpm test:integration
      
      - name: Build
        run: pnpm build
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json

  release:
    needs: test
    runs-on: ubuntu-latest
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20.x
          registry-url: 'https://registry.npmjs.org'
      
      - name: Release
        uses: semantic-release/semantic-release@v23
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}
```

#### Scripts de package.json
```json
{
  "scripts": {
    "build": "tsc --noEmit && esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js",
    "dev": "tsc --watch",
    "test": "vitest",
    "test:unit": "vitest run --include='**/*.unit.test.ts'",
    "test:integration": "vitest run --include='**/*.integration.test.ts'",
    "test:coverage": "vitest run --coverage",
    "type-check": "tsc --noEmit",
    "lint": "eslint src --ext .ts --fix",
    "semantic-release": "semantic-release"
  }
}
```

#### Timeline
- **Semana 5**: Setup (1 día)

---

## 3. Plan de Implementación Revisado

### Timeline Original vs Revisado

| Fase | Original | Revisado | Cambios |
|------|----------|----------|---------|
| 1 | Fundamentos (2 sem) | Fundamentos + 2FA + zod (3 sem) | +1 semana |
| 2 | Herramientas públicas (1 sem) | Herramientas públicas + circuit breaker (2 sem) | +1 semana |
| 3 | Herramientas privadas (1 sem) | Herramientas privadas (1 sem) | Sin cambios |
| 4 | Polish (2 sem) | Polish + CI/CD + testing (2 sem) | Sin cambios |
| **Total** | **5-7 semanas** | **7-9 semanas** | **+1-2 semanas** |

### Fase 1: Fundamentos + Seguridad (Semanas 1-3)
- [ ] Tipos TypeScript + Zod schemas
- [ ] HTTP client con retry logic
- [ ] Sistema de caché (con stale-while-revalidate)
- [ ] Autenticación: TOTP + session token
- [ ] Circuit breaker
- [ ] Logger estructurado
- [ ] Tests unitarios (85%+ coverage)
- [ ] Documentación interna

### Fase 2: Herramientas Públicas (Semanas 3-5)
- [ ] `search_courses`, `search_programs`
- [ ] `get_course_details`, `get_program_details`
- [ ] MCP server integration
- [ ] Integration tests
- [ ] E2E tests contra fixtures

### Fase 3: Herramientas Privadas (Semana 5-6)
- [ ] `get_enrolled_courses`, `get_progress`
- [ ] `get_recommendations`
- [ ] Session management robusto
- [ ] Tests de autenticación

### Fase 4: Polish + Release (Semana 7-9)
- [ ] CI/CD GitHub Actions
- [ ] Documentación usuario + README
- [ ] Ejemplos de uso
- [ ] Semantic versioning
- [ ] npm publish
- [ ] Integración Claude Desktop

---

## 4. Ajustes al Diseño

### 4.1 Nueva Estructura de Directorios
```
coursera-mcp/
├── src/
│   ├── index.ts
│   ├── types/
│   │   ├── coursera.ts
│   │   ├── schemas.ts          ← NUEVO: Zod schemas
│   │   ├── errors.ts           ← Discriminated unions
│   │   └── cache.ts
│   ├── services/
│   │   ├── courseraClient.ts
│   │   ├── cache.ts            ← Con stale-while-revalidate
│   │   ├── circuitBreaker.ts   ← NUEVO
│   │   ├── auth.ts             ← Con 2FA/TOTP
│   │   └── parser.ts           ← Usa Zod validation
│   ├── tools/
│   │   ├── search.ts
│   │   ├── enrolled.ts
│   │   ├── details.ts
│   │   └── recommendations.ts
│   └── utils/
│       ├── logger.ts
│       ├── retry.ts
│       └── errors.ts           ← Clases custom
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── docs/
│   ├── DEVELOPMENT.md          ← Guía para developers
│   ├── SECURITY.md             ← Seguridad, 2FA setup
│   └── API.md                  ← Especificación de tools
│
├── .github/workflows/
│   └── ci.yml                  ← NUEVO: GitHub Actions
│
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 4.2 Tipos Mejorados con Discriminated Unions
```typescript
// src/types/errors.ts
export type CourseraError = 
  | { type: 'AUTH_ERROR'; message: string; code: 'INVALID_CREDENTIALS' | 'EXPIRED_SESSION' }
  | { type: 'VALIDATION_ERROR'; message: string; field: string }
  | { type: 'NETWORK_ERROR'; message: string; retries: number }
  | { type: 'RATE_LIMIT'; resetAt: Date }
  | { type: 'SERVICE_UNAVAILABLE'; message: string }

// Type-safe error handling
function handleError(error: CourseraError) {
  switch (error.type) {
    case 'AUTH_ERROR':
      if (error.code === 'EXPIRED_SESSION') {
        // Refrescar sesión
      }
      break
    case 'RATE_LIMIT':
      // Esperar hasta error.resetAt
      break
    // ...
  }
}
```

---

## 5. Checklist Pre-Implementación

- [ ] Revisar y aprobar cambios de arquitectura
- [ ] Crear repo GitHub private/public
- [ ] Configurar branch protection (main, develop)
- [ ] Setup GitHub secrets para npm token
- [ ] Crear proyecto en Linear/GitHub Projects
- [ ] Documentar decisiones en ADRs (Architecture Decision Records)
- [ ] Comunicar timeline revisado a stakeholders
- [ ] Configurar MCP local para testing manual
- [ ] Preparar fixtures de API Coursera (requests/responses reales)

---

## 6. Recomendaciones Adicionales

### 6.1 Documentación como Código
```typescript
// Mantener tipos y docs juntos
/**
 * Search for courses by query and filters
 * 
 * @param query - Search keywords (e.g., "Python", "Machine Learning")
 * @param options - Optional filters
 * @returns Array of courses with metadata
 * 
 * @example
 * const courses = await searchCourses('Python', { 
 *   category: 'computer-science',
 *   limit: 10 
 * })
 */
export async function searchCourses(
  query: string,
  options?: SearchOptions
): Promise<SearchResult<Course>> {
  // ...
}
```

### 6.2 Version Management
```json
{
  "name": "coursera-mcp",
  "version": "0.0.0-semantic-release",
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "keywords": ["mcp", "coursera", "claude", "ai", "learning"]
}
```

### 6.3 Sensibilidad de Datos
```typescript
// NUNCA loguear
- Credenciales, tokens
- IDs de usuario de Coursera
- Emails
- Respuestas completas de API (solo metas)

// OK loguear
- Endpoints accedidos
- Status codes
- Duración de requests
- Cache hits/misses
- Errores genéricos
```

---

## 7. Conclusión

El proyecto Coursera MCP es **altamente viable** pero requiere inversión adicional en:
1. **Seguridad** (2FA, circuit breaker)
2. **Robustez** (validación runtime, testing)
3. **Operabilidad** (logging, CI/CD)

Con estos ajustes, el proyecto pasa de "viable" a **production-ready** desde el inicio.

**Timeline realista**: **7-9 semanas** a ~12-15h/semana.

---

**Próximos pasos:**
1. ✅ Revisar este documento
2. ✅ Feedback y ajustes
3. ✅ Crear repo GitHub
4. ✅ Iniciar Fase 1
