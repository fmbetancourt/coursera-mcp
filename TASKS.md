# 📋 Tareas de Implementación: Coursera MCP

**Versión**: 1.0  
**Total de Tareas**: 68 (Fase 1-4)  
**Tiempo Estimado**: 7-9 semanas @ 12-15h/semana  
**Última Actualización**: Abril 28, 2026

---

## 📌 Cómo Usar Este Documento

Cada tarea:
- 🎯 Descripción breve
- 📋 Requisitos previos (dependencias)
- ⏱️ Tiempo estimado
- 🎭 Prompt optimizado para Claude
- ✅ Criterio de éxito
- 🔗 Referencias a documentación

**Marcar como completada**: `[x]` cuando termines

---

## ⚠️ IMPORTANTE: Testing Framework

**Este proyecto usa bun test nativo**, NO vitest.
- ✅ Bun test: Jest-compatible, 2-3x más rápido, incluido en bun
- ✅ Sintaxis: `bun test` (en lugar de `vitest`)
- ✅ Importaciones: `import { describe, it, expect } from "bun:test"`
- Ver: BUN_MIGRATION.md para detalles

Todos los comandos de test en este documento usan `bun test`.

---

# 🔴 FASE 1: Fundamentos + Seguridad (Semanas 1-3)

## Setup Inicial

### T1.1: Crear estructura de proyecto y git setup
- **Requisitos**: Repo GitHub creado
- **Tiempo**: 30 min
- **Prompt**: 
  ```
  Setup inicial del proyecto Coursera MCP:
  1. Crear directorios: src/{types,services,tools,utils}, tests/{unit,integration,fixtures}, docs, .github/workflows
  2. Inicializar git: crear branches main y develop
  3. Configurar branch protection en main
  4. Crear .gitignore estándar (Node + IDE + secretos)
  5. Crear CONTRIBUTING.md básico
  
  Criterio: Repo con estructura lista para código, sin node_modules
  ```
- **Éxito**: Estructura creada, ramas configuradas, .gitignore activo
- **Referencias**: IMPLEMENTATION_GUIDE.md Fase 1

### T1.2: Configurar package.json y dependencies
- **Requisitos**: T1.1 completada
- **Tiempo**: 45 min
- **Prompt**:
  ```
  Crear package.json con:
  - Dependencies: @anthropic-ai/sdk, axios, zod, speakeasy, winston, fs-extra, dotenv, cheerio
  - DevDependencies: TypeScript, vitest, nock, @types/node, eslint, prettier, esbuild
  - Scripts: build, dev, test, test:unit, test:integration, test:coverage, lint, type-check
  - Engine: node >=18.0.0, pnpm >=8.0.0
  - Metadata: name=coursera-mcp, version=0.1.0, type=module
  
  Ejecutar: bun install
  Criterio: pnpm lock actualizado, node_modules creado, sin errores
  ```
- **Éxito**: package.json y pnpm-lock.yaml creados, deps instaladas
- **Referencias**: coursera-mcp-config.json

### T1.3: Configurar TypeScript (tsconfig.json)
- **Requisitos**: T1.2 completada
- **Tiempo**: 30 min
- **Prompt**:
  ```
  Crear tsconfig.json con strict mode:
  - target: ES2020
  - module: ESNext
  - strict: true
  - esModuleInterop: true
  - moduleResolution: node
  - resolveJsonModule: true
  - declaration: true
  - sourceMap: true
  - baseUrl: ".", paths: {"@/*": ["src/*"]}
  - outDir: ./dist, rootDir: ./src
  
  Criterio: Archivo creado, sin errores en validación
  ```
- **Éxito**: tsconfig.json válido, path alias `@/` funcionando
- **Referencias**: coursera-mcp-config.json

### T1.4: Configurar ESLint + Prettier
- **Requisitos**: T1.2 completada
- **Tiempo**: 30 min
- **Prompt**:
  ```
  Crear .eslintrc.json y prettier.config.json:
  - ESLint: @typescript-eslint, rules para strict TS
  - Prettier: printWidth: 100, tabWidth: 2, singleQuote: true
  
  Crear script pre-commit: husky install
  Criterio: Linting + formatting funcionando, sin errores
  ```
- **Éxito**: Linting OK, formato consistente
- **Referencias**: coursera-mcp-config.json

### T1.5: Configurar Bun Test (bun test nativo)
- **Requisitos**: T1.3 completada
- **Tiempo**: 30 min
- **Prompt**:
  ```
  Configurar bun test nativo (no vitest):
  - Crear bunfig.toml con test config (opcional, bun lo hace automático)
  - Crear tests/setup.ts con utilidades comunes
  - Bun test busca automáticamente: tests/**/*.test.ts, src/**/*.test.ts
  
  Criterio: bun test --help funciona, setup.ts creado
  ```
- **Éxito**: Bun test configurado, setup.ts creado
- **Referencias**: TESTING_STRATEGY.md, BUN_MIGRATION.md
- **Nota**: Usamos bun test nativo (Jest-compatible, 2-3x más rápido que vitest)

### T1.6: Crear .env.example y variables de entorno
- **Requisitos**: T1.1 completada
- **Tiempo**: 15 min
- **Prompt**:
  ```
  Crear .env.example:
  NODE_ENV=development
  LOG_LEVEL=debug
  
  Crear src/config/env.ts:
  - Validar variables de entorno
  - Exportar configuración tipada
  - Usar zod para validación
  
  Criterio: .env.example documentado, config.ts tipado
  ```
- **Éxito**: .env.example creado, config exportable
- **Referencias**: SECURITY.md

---

## Tipos y Schemas (Fundación de Datos)

### T1.7: Crear tipos base de Coursera
- **Requisitos**: T1.3 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear src/types/coursera.ts con tipos de dominio:
  - Course: id, name, slug, description, duration, level, language, rating, enrollments, instructors[], skills[], certificate
  - Program: id, name, type (specialization|degree|certificate), courses[], totalDuration, price
  - User: id, email, displayName, enrollments, certificates
  - EnrolledCourse: courseId, enrollmentDate, progress, status
  - Progress: courseId, percent, currentWeek, totalWeeks, upcomingDeadlines[]
  
  Usar exported interfaces, NO tipos generados dinámicamente
  Criterio: 20+ tipos principales, exportables, bien organizados
  ```
- **Éxito**: src/types/coursera.ts con tipos principales
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.3

### T1.8: Crear Zod schemas para validación
- **Requisitos**: T1.7 completada
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear src/types/schemas.ts con zod:
  - CourseSchema (validar Course), min/max, enums para level/language
  - ProgramSchema, UserSchema, ProgressSchema, EnrolledCourseSchema
  - SearchCourseParamsSchema (validar inputs)
  - Custom refinements para lógica compleja
  - Exportar type<T> = z.infer<typeof TSchema>
  
  Ejemplo:
  export const CourseSchema = z.object({
    id: z.string().min(1),
    name: z.string().min(1),
    rating: z.number().min(0).max(5).optional(),
  })
  export type Course = z.infer<typeof CourseSchema>
  
  Criterio: 8+ schemas, todos con validaciones, tipo-seguros
  ```
- **Éxito**: Zod schemas completos, inferencia de tipos funcionando
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.3

### T1.9: Crear tipos de errores con discriminated unions
- **Requisitos**: T1.7 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear src/types/errors.ts:
  - Discriminated union: CourseraError = {type: 'AUTH_ERROR'|'NETWORK_ERROR'|'VALIDATION_ERROR'|'RATE_LIMIT'|'SERVICE_UNAVAILABLE', ...}
  - Custom error classes: CourseraException, NotFoundError, AuthenticationError, ValidationError
  - Helper: isCourseraError(err): err is CourseraError
  
  Criterio: Tipos de error comprehensivos, helpers para type guards
  ```
- **Éxito**: Error types completos, type-safe
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.2

---

## Utilidades y Infraestructura

### T1.10: Implementar Logger con Winston
- **Requisitos**: T1.6 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear src/utils/logger.ts:
  - Winston logger configurado
  - Transportes: file (error.log, combined.log) en ~/.coursera-mcp/
  - Formato: JSON + timestamp + errors con stack
  - Sanitización automática (removeFn)
  - Exportar logger y sanitizeForLogging(obj)
  
  Crear src/utils/logSanitizer.ts:
  - Redactar campos sensibles: password, token, email, sessionToken, etc.
  - Recursivo hasta profundidad 5
  
  Criterio: Logs estructurados, sin tokens/passwords, archivos creados
  ```
- **Éxito**: Logger funcionando, logs sanitizados
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.6

### T1.11: Implementar Retry Logic con exponential backoff
- **Requisitos**: T1.10 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear src/utils/retry.ts:
  - Función withRetry<T>(fn, options)
  - Exponential backoff: 1s, 2s, 4s, ... hasta maxDelay
  - Opciones: maxAttempts (default 3), initialDelay (default 1000), maxDelay (default 10000)
  - Solo reintentar en errores transitorios (timeout, 5xx)
  - NO reintentar en 4xx, 401, validation errors
  
  Criterio: Retry logic funcional con exponential backoff
  ```
- **Éxito**: Retry con exponential backoff implementado
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.2

### T1.12: Implementar Circuit Breaker pattern
- **Requisitos**: T1.10 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear src/services/circuitBreaker.ts:
  - Clase CircuitBreaker<T>
  - Estados: closed -> open -> half-open -> closed
  - Propiedades: failureThreshold (5), successThreshold (2), resetTimeout (60s)
  - Método execute<T>(fn, fallback?): Promise<T>
  - Lógica: Si state=open y fallback -> return fallback()
  - Si failures >= threshold -> state=open, resetTimeout
  - Logging de transiciones
  
  Criterio: Circuit breaker funcional, states correctos, logging
  ```
- **Éxito**: CircuitBreaker implementado con todos los estados
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.2

### T1.13: Crear fixtures de prueba (mock data)
- **Requisitos**: T1.8 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/fixtures/index.ts:
  - mockCourses: array de 5 cursos válidos (Course type)
  - mockPrograms: array de 3 programas
  - mockEnrolledCourses: array de 4 cursos inscritos
  - mockUsers: 2 usuarios
  - mockProgress: 3 progresiones
  
  Validar cada fixture contra schema correspondiente
  Criterio: Fixtures comprehensivos, conformes a schemas
  ```
- **Éxito**: tests/fixtures/index.ts con datos válidos
- **Referencias**: TESTING_STRATEGY.md

---

## Servicios Core - HTTP y Caché

### T1.14: Implementar CourseraClient (HTTP básico)
- **Requisitos**: T1.11, T1.12 completadas
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear src/services/courseraClient.ts:
  - Clase CourseraClient
  - Propiedades: axiosInstance, sessionToken, circuitBreaker
  - Métodos: get<T>(url, config), post<T>(url, data), put<T>, delete<T>
  - Integrar circuitBreaker en get() con fallback=null
  - Interceptor: agregar Authorization header si sessionToken existe
  - Setup: timeout=10s, baseURL=https://www.coursera.org
  - Manejo de errores: log + throw CourseraException
  
  Criterio: Cliente HTTP funcional con circuit breaker
  ```
- **Éxito**: CourseraClient con métodos CRUD + circuit breaker
- **Referencias**: IMPLEMENTATION_GUIDE.md Fase 2

### T1.15: Implementar Cache Service
- **Requisitos**: T1.14 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear src/services/cache.ts:
  - Clase CacheService
  - Constructor: crear ~/.coursera-mcp/cache directorio
  - Métodos:
    - set<T>(key, data, ttl): guardar en memoria + disco
    - get<T>(key): retornar si no expirado
    - getStale<T>(key): {data, isStale}
    - getWithStaleCache<T>(key, fetcher, ttl): SWR pattern
    - clear()
  - Persistencia en disco: hashear keys para seguridad
  - Expiración: comprobar fecha vs timestamp + ttl
  
  Criterio: Caché con TTL + stale-while-revalidate pattern
  ```
- **Éxito**: CacheService con SWR implementado
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.5

### T1.16: Implementar Auth Service base (sin TOTP aún)
- **Requisitos**: T1.14, T1.10 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear src/services/auth.ts (parte 1, base sin TOTP):
  - Clase AuthService
  - Propiedades: courseraClient, sessionsPath (~/.coursera-mcp/sessions.json)
  - Métodos stub para:
    - initiateLogin(email, password): para testing
    - loadSession(email): retornar sesión si existe
    - saveSession(email, session): guardar sesión
  - Estructura de sesión: {email, sessionToken, refreshToken, expiresAt, lastRefreshed}
  - Permisos archivo: mode 0o600
  
  Criterio: AuthService base creado, estructura lista para TOTP
  ```
- **Éxito**: AuthService base con file I/O
- **Referencias**: SECURITY.md

---

## Tests Unitarios - Foundation

### T1.17: Tests para logger y log sanitizer
- **Requisitos**: T1.10 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear tests/unit/utils/logger.unit.test.ts:
  - Test: logger.info() escribe a archivo
  - Test: logger.error() incluye stack trace
  - Test: sanitizeForLogging() redacta password, email, token
  - Test: sanitizeForLogging() NO redacta courseName
  - Test: recursión hasta profundidad máxima
  
  Criterio: 6+ tests, todos pasando, coverage >85%
  ```
- **Éxito**: Logger tests completos
- **Referencias**: TESTING_STRATEGY.md 2.2

### T1.18: Tests para retry logic
- **Requisitos**: T1.11 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/unit/utils/retry.unit.test.ts:
  - Test: éxito en primer intento (1 llamada)
  - Test: reintento y éxito (3 llamadas)
  - Test: falla después de max attempts
  - Test: exponential backoff (delays correctos: 1s, 2s)
  - Test: NO reintentar 400 errors
  - Test: maxDelay respetado
  
  Criterio: 8+ tests, todos pasando
  ```
- **Éxito**: Retry tests completos
- **Referencias**: TESTING_STRATEGY.md 2.2

### T1.19: Tests para circuit breaker
- **Requisitos**: T1.12 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/unit/services/circuitBreaker.unit.test.ts:
  - Test: closed state, request pasa
  - Test: open after threshold failures
  - Test: half-open intenta reconectar
  - Test: fallback cuando open
  - Test: reset timeout transitions
  - Test: logging de estado
  
  Criterio: 8+ tests, todos pasando, states correctos
  ```
- **Éxito**: CircuitBreaker tests completos
- **Referencias**: TESTING_STRATEGY.md 2.2

### T1.20: Tests para CacheService
- **Requisitos**: T1.15 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/unit/services/cache.unit.test.ts:
  - Test: set + get básico
  - Test: TTL expiration
  - Test: getStale retorna old data
  - Test: getWithStaleCache sirve stale + refetch background
  - Test: clear() limpia memoria y disco
  - Test: persistencia en disco (cargar al iniciar)
  
  Criterio: 8+ tests, todos pasando, SWR pattern testeado
  ```
- **Éxito**: Cache tests completos
- **Referencias**: TESTING_STRATEGY.md 2.2

---

## Autenticación y Seguridad (TOTP 2FA)

### T1.21: Implementar Encryption Service (AES-256)
- **Requisitos**: T1.10 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear src/services/encryption.ts:
  - Clase EncryptionService
  - Constructor(masterPassword): derivar key con PBKDF2 (100k iterations)
  - Métodos:
    - encrypt(plaintext): return base64({iv, encrypted, authTag})
    - decrypt(ciphertext): return plaintext
  - Algoritmo: aes-256-gcm
  - Usar crypto.randomBytes(16) para IV
  
  Criterio: Encriptación AES-256-GCM funcional
  ```
- **Éxito**: EncryptionService con AES-256-GCM
- **Referencias**: SECURITY.md 1.2

### T1.22: Implementar Auth Service (TOTP 2FA - Parte 2)
- **Requisitos**: T1.16, T1.21 completadas
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Extender src/services/auth.ts con TOTP (NOTA: estos son métodos de servicio, NO comandos CLI):
  - Los comandos CLI (como coursera-mcp init) se implementarán en T4.9
  - Por ahora, crear métodos que los handlers CLI llamarán después
  - Importar speakeasy para TOTP
  - Métodos:
    - generateTOTPSecret(): return {secret, qrCode}
    - validateTOTPCode(secret, code): boolean
    - generateTOTPCode(secret): string (para testing)
    - generateBackupCodes(count=10): string[]
  - Propiedades: encryptionService para tokens
  - verifyTOTP(sessionId, code): verify + return sessionToken
  - saveSession(email): encrypt tokens con EncryptionService
  - encryptSessionToken(token): encrypted
  - decryptSessionToken(encrypted): plaintext
  
  Criterio: TOTP completo, tokens encriptados en disco
  ```
- **Éxito**: TOTP 2FA implementado con encryption
- **Referencias**: SECURITY.md 1.1

### T1.23: Tests para Encryption Service
- **Requisitos**: T1.21 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear tests/unit/services/encryption.unit.test.ts:
  - Test: encrypt + decrypt roundtrip
  - Test: decrypt con wrong password falla
  - Test: encrypted != plaintext
  - Test: IV diferente cada encrypt
  - Test: PBKDF2 key derivation
  
  Criterio: 6+ tests, todos pasando
  ```
- **Éxito**: Encryption tests completos
- **Referencias**: TESTING_STRATEGY.md 2.2

### T1.24: Tests para Auth Service (TOTP)
- **Requisitos**: T1.22 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/unit/services/auth.unit.test.ts:
  - Test: generateTOTPSecret() retorna secret válido
  - Test: validateTOTPCode() correcto/incorrecto
  - Test: generateBackupCodes() 10 códigos únicos
  - Test: encryptSessionToken + decrypt roundtrip
  - Test: saveSession() guarda encriptado en disco
  - Test: loadSession() desencripta correctamente
  
  Criterio: 8+ tests, TOTP flow completo
  ```
- **Éxito**: Auth TOTP tests completos
- **Referencias**: TESTING_STRATEGY.md 2.2

---

## Integration Tests - Servicios Combinados

### T1.25: Integration test: HTTP + Cache
- **Requisitos**: T1.14, T1.15 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/integration/http-cache.integration.test.ts:
  - Usar nock para mock HTTP
  - Test: primer GET request -> HTTP call
  - Test: segundo GET mismo endpoint -> cache (sin HTTP)
  - Test: POST invalidates related GET cache
  - Test: cache TTL expiration
  - Test: stale cache served + background refresh
  
  Criterio: Integration tests completos, nock mocks funcionan
  ```
- **Éxito**: HTTP + Cache integration tests
- **Referencias**: TESTING_STRATEGY.md 3.1

### T1.26: Integration test: Auth flow con TOTP
- **Requisitos**: T1.22 completada, T1.14 completada
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear tests/integration/auth-flow.integration.test.ts:
  - Mock CourseraClient.post() para simulate API
  - Test flow completo:
    1. initiateLogin(email, password) -> totpRequired=true
    2. validateTOTPCode(code) -> sessionToken + refreshToken
    3. sessionToken encriptado en ~/.coursera-mcp/sessions.json
  - Test: refreshSession() refrescas tokens
  - Test: loadSession() desencripta correctamente
  
  Criterio: Auth flow integration testeado
  ```
- **Éxito**: Auth flow integration tests completos
- **Referencias**: TESTING_STRATEGY.md 3.2

### T1.27: Integration test: Circuit breaker + fallback
- **Requisitos**: T1.14, T1.12, T1.15 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/integration/circuit-breaker.integration.test.ts:
  - Setup: CircuitBreaker + CourseraClient + CacheService
  - Test: normal request (closed state)
  - Test: API failures -> circuit opens -> serve stale cache
  - Test: auto recovery (half-open -> closed)
  - Test: circuitBreaker.state logged correctly
  
  Criterio: Circuit breaker con fallback a cache
  ```
- **Éxito**: Circuit breaker integration tests
- **Referencias**: TESTING_STRATEGY.md 3.1

---

## Validación y Parser

### T1.28: Crear Parser Service con Zod validation
- **Requisitos**: T1.8 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear src/services/parser.ts:
  - Función parseCourse(raw): Course (con Zod validation)
  - parseCourses(raw[]): Course[]
  - parseProgram(raw): Program
  - parseUser(raw): User
  - parseProgress(raw): Progress
  - Error handling: ValidationError si schema no match
  - Logging: qué field falló
  
  Criterio: Parsers tipados con Zod validation
  ```
- **Éxito**: Parser service con validación
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.3

### T1.29: Tests para Parser Service
- **Requisitos**: T1.28 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear tests/unit/services/parser.unit.test.ts:
  - Test: parseCourse() válido
  - Test: parseCourse() missing required field -> error
  - Test: parseCourse() invalid enum -> error
  - Test: parseCourses() array correctamente
  - Test: error messages claros (field + reason)
  
  Criterio: 8+ tests, validation robusta
  ```
- **Éxito**: Parser tests completos
- **Referencias**: TESTING_STRATEGY.md 2.2

---

## MCP Server Base

### T1.30: Crear punto de entrada MCP (src/index.ts)
- **Requisitos**: T1.14, T1.15, T1.22 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear src/index.ts:
  - Inicializar CourseraClient, CacheService, AuthService
  - Crear MCP Server con @anthropic-ai/sdk
  - Handler stubs para 7 tools (sin lógica aún):
    - search_courses
    - search_programs
    - get_course_details
    - get_program_details
    - get_enrolled_courses
    - get_progress
    - get_recommendations
  - Error handling genérico
  - Server.start()
  
  Criterio: MCP server runnable, tools registrados (stubs)
  ```
- **Éxito**: MCP server base con tool handlers
- **Referencias**: IMPLEMENTATION_GUIDE.md

---

## Checklist Fase 1

- [x] T1.1: Estructura de proyecto y git
- [x] T1.2: package.json + dependencies
- [x] T1.3: TypeScript config
- [x] T1.4: ESLint + Prettier
- [x] T1.5: vitest config
- [x] T1.6: .env + config
- [x] T1.7: Tipos de Coursera
- [x] T1.8: Zod schemas
- [x] T1.9: Error types
- [x] T1.10: Logger (Winston)
- [x] T1.11: Retry logic
- [x] T1.12: Circuit breaker
- [x] T1.13: Fixtures
- [x] T1.14: CourseraClient
- [x] T1.15: CacheService
- [x] T1.16: AuthService base
- [x] T1.17: Logger tests
- [x] T1.18: Retry tests
- [x] T1.19: CircuitBreaker tests
- [x] T1.20: Cache tests
- [x] T1.21: EncryptionService
- [x] T1.22: AuthService (TOTP)
- [x] T1.23: Encryption tests
- [x] T1.24: Auth TOTP tests
- [x] T1.25: HTTP+Cache integration
- [x] T1.26: Auth flow integration
- [x] T1.27: CircuitBreaker integration
- [x] T1.28: Parser Service
- [x] T1.29: Parser tests
- [x] T1.30: MCP Server base

**Criterio de éxito Fase 1**: `bun test` muestra 50+ tests pasando, coverage >85%

---

# 🟠 FASE 2: Herramientas Públicas + Testing (Semanas 3-5)

## Search Tools

### T2.1: Implementar search_courses tool
- **Requisitos**: T1.30 completada
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear src/tools/search.ts - función searchCourses():
  - Parámetros: query (string), category?, language?, level?, limit?, sortBy?
  - Validar inputs con CourseSearchParamsSchema
  - Cache key: `search:${JSON.stringify(params)}`
  - Usar getWithStaleCache() para SWR
  - Parsear resultados con parseCourses()
  - Retornar: {courses: Course[], total: number, hasMore: boolean}
  - Error handling: ValidationError si inputs inválidos
  
  Criterio: Tool funcional con validación + caché + SWR
  ```
- **Éxito**: search_courses implementado
- **Referencias**: IMPLEMENTATION_GUIDE.md Fase 2

### T2.2: Implementar search_programs tool
- **Requisitos**: T2.1 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear search_programs() en src/tools/search.ts:
  - Parámetros: query, type? (specialization|degree), institution?
  - Similar a search_courses pero para programas
  - Cache: 24h como search_courses
  - Validar con ProgramSearchParamsSchema
  - Retornar: {programs: Program[], total}
  
  Criterio: search_programs funcional
  ```
- **Éxito**: search_programs implementado
- **Referencias**: coursera-mcp-design.md 3.6

### T2.3: Tests para search_courses
- **Requisitos**: T2.1 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/integration/tools/search.integration.test.ts:
  - Mock API con nock
  - Test: search_courses() valida inputs
  - Test: resultado parseado correctamente
  - Test: caché en segundo call
  - Test: invalid inputs retorna error
  - Test: SWR pattern (stale cache served)
  
  Criterio: 8+ tests, search tools completos
  ```
- **Éxito**: Search tools integration tests
- **Referencias**: TESTING_STRATEGY.md 3.3

---

## Details Tools

### T2.4: Implementar get_course_details tool
- **Requisitos**: T2.1 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear getCourseDetails() en src/tools/details.ts:
  - Parámetro: courseId (string)
  - Cache key: `course:${courseId}`, TTL: 24h
  - Parsear respuesta con parseCourse()
  - Retornar completo: Course con syllabus[], instructors[], assessments[]
  - Error: 404 si no existe
  
  Criterio: Tool funcional con detalles completos
  ```
- **Éxito**: get_course_details implementado
- **Referencias**: coursera-mcp-design.md 3.3

### T2.5: Implementar get_program_details tool
- **Requisitos**: T2.4 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear getProgramDetails() en src/tools/details.ts:
  - Parámetro: programId, type?
  - Cache: 24h
  - Parsear con parseProgram()
  - Retornar: Program con courses en orden, capstone info
  
  Criterio: Tool funcional
  ```
- **Éxito**: get_program_details implementado
- **Referencias**: coursera-mcp-design.md 3.4

### T2.6: Tests para details tools
- **Requisitos**: T2.4, T2.5 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/integration/tools/details.integration.test.ts:
  - Test: get_course_details() retorna Course válido
  - Test: get_program_details() retorna Program con courses
  - Test: syllabus incluido
  - Test: instructors incluido
  - Test: caché funciona (24h)
  - Test: 404 si courseId no existe
  
  Criterio: 8+ tests
  ```
- **Éxito**: Details tools integration tests
- **Referencias**: TESTING_STRATEGY.md 3.3

---

## MCP Integration

### T2.7: Registrar search y details tools en MCP server
- **Requisitos**: T2.1, T2.2, T2.4, T2.5 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  En src/index.ts, reemplazar tool handlers stubs:
  - server.setRequestHandler('tools/search_courses', async req => ...)
  - server.setRequestHandler('tools/search_programs', async req => ...)
  - server.setRequestHandler('tools/get_course_details', async req => ...)
  - server.setRequestHandler('tools/get_program_details', async req => ...)
  
  Parámetros: req.params contiene inputs del usuario
  Error handling: try-catch -> return error MCP format
  
  Criterio: Tools registrados, manejable por Claude
  ```
- **Éxito**: Tools públicos registrados en MCP
- **Referencias**: IMPLEMENTATION_GUIDE.md Fase 2

### T2.8: Crear E2E tests contra fixtures
- **Requisitos**: T2.7 completada
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear tests/integration/tools-e2e.integration.test.ts:
  - Simular usuario llamando tools via MCP protocol
  - Test: search_courses('Python') retorna resultados validos
  - Test: get_course_details(id) completo
  - Test: get_program_details(id) completo
  - Test: Chained: search -> get_details en mismo test
  - Test: error handling en MCP format
  
  Criterio: E2E workflow completo
  ```
- **Éxito**: E2E tests para herramientas públicas
- **Referencias**: TESTING_STRATEGY.md 3.3

---

## Documentation

### T2.9: Crear API.md (especificación de tools)
- **Requisitos**: T2.7 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear docs/API.md con especificación de cada tool:
  - search_courses: parámetros, respuesta, ejemplos, caché
  - search_programs: ídem
  - get_course_details: ídem
  - get_program_details: ídem
  
  Ejemplo:
  ## search_courses
  **Parámetros**: query (string), category? (enum), limit? (1-50)
  **Respuesta**: {courses: Course[], total: number}
  **Ejemplo**: search_courses('Python', {limit: 10})
  **Caché**: 24 horas
  
  Criterio: Documentación clara, ejemplos funcionales
  ```
- **Éxito**: API.md documentando herramientas públicas
- **Referencias**: coursera-mcp-design.md 3

---

## Coverage y Quality

### T2.10: Alcanzar 85%+ coverage en Fase 2
- **Requisitos**: Todos los tests anteriores de Fase 2
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Ejecutar: bun test:coverage
  
  Identificar gaps:
  - Líneas no cubiertas en src/tools/ y src/services/
  - Agregar tests para edge cases
  - Apuntar a >85% (idealmente 88%)
  
  Criterio: Coverage report muestra 85%+ líneas, branches, functions
  ```
- **Éxito**: Coverage >=85% en toda Fase 2
- **Referencias**: TESTING_STRATEGY.md 6.1

---

## Checklist Fase 2

- [x] T2.1: search_courses implementado
- [x] T2.2: search_programs implementado
- [x] T2.3: Search tests
- [x] T2.4: get_course_details implementado
- [x] T2.5: get_program_details implementado
- [x] T2.6: Details tests
- [x] T2.7: Tools registrados en MCP
- [x] T2.8: E2E tests completos
- [x] T2.9: API.md creado
- [x] T2.10: Coverage >= 85%

**Criterio de éxito Fase 2**: 4 tools públicos funcionando, 80+ tests, E2E workflow

---

# 🟡 FASE 3: Herramientas Privadas (Semana 5-6)

## Enrolled & Progress Tools

### T3.1: Implementar get_enrolled_courses tool
- **Requisitos**: T2.7 completada (TOTP auth functional)
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear getEnrolledCourses() en src/tools/enrolled.ts:
  - Requiere autenticación (sessionToken)
  - Parámetros: includeProgress? (default true), includeUpcoming?
  - Validar sesión válida (no expirada)
  - Cache: 1h (privado, shorter TTL)
  - Cache key: `enrolled:${userId}`
  - Parsear con parseEnrolledCourse()
  - Retornar: {courses: EnrolledCourse[], totalEnrolled, completedCount}
  
  Criterio: Tool autenticado, caché privado
  ```
- **Éxito**: get_enrolled_courses implementado
- **Referencias**: coursera-mcp-design.md 3.2

### T3.2: Implementar get_progress tool
- **Requisitos**: T3.1 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear getProgress() en src/tools/enrolled.ts:
  - Parámetro: courseId
  - Requiere autenticación
  - Cache: 1h (key: `progress:${courseId}`)
  - Parsear con parseProgress()
  - Retornar: Progress con completion[], upcomingDeadlines, certificateStatus
  
  Criterio: Tool autenticado con progress detallado
  ```
- **Éxito**: get_progress implementado
- **Referencias**: coursera-mcp-design.md 3.5

### T3.3: Implementar get_recommendations tool
- **Requisitos**: T3.2 completada
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear getRecommendations() en src/tools/recommendations.ts:
  - Requiere autenticación
  - Parámetros: limit? (default 10)
  - Cache: 6h (longer TTL, less personal)
  - Logic: simular recomendaciones basadas en enrolled courses + progress
    (en v1.0 simple, en v2.0 ML)
  - Parsear recomendaciones
  - Retornar: {courses: RecommendedCourse[], reason}
  
  Criterio: Tool recomendador funcional (simple logic)
  ```
- **Éxito**: get_recommendations implementado
- **Referencias**: coursera-mcp-design.md 3.7

---

## Authentication Middleware

### T3.4: Crear middleware de autenticación
- **Requisitos**: T1.22 completada (TOTP service)
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear src/middleware/auth.ts:
  - Función requireAuth(handler): valida sessionToken
  - Comprobar si sesión expirada
  - Refrescar automáticamente si expira
  - Retornar error 401 si inválido
  - Inyectar userId en context
  
  Uso en tools privados:
  server.setRequestHandler('tools/get_enrolled_courses', requireAuth(async (req, context) => {
    const userId = context.userId
    // ...
  }))
  
  Criterio: Auth middleware funcional
  ```
- **Éxito**: Auth middleware implementado
- **Referencias**: SECURITY.md 1.3

---

## Integration Tests - Authenticated Tools

### T3.5: Integration tests para enrolled tools
- **Requisitos**: T3.1, T3.2, T3.4 completadas
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear tests/integration/tools/enrolled.integration.test.ts:
  - Mock autenticación (sessionToken válido)
  - Test: get_enrolled_courses() retorna EnrolledCourse[]
  - Test: get_progress(courseId) retorna Progress válido
  - Test: caché 1h respetado
  - Test: sesión expirada -> refresh automático
  - Test: sin auth -> error 401
  
  Criterio: 8+ tests, auth flow completo
  ```
- **Éxito**: Enrolled tools integration tests
- **Referencias**: TESTING_STRATEGY.md 3.2

### T3.6: Integration tests para recommendations
- **Requisitos**: T3.3 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear tests/integration/tools/recommendations.integration.test.ts:
  - Test: get_recommendations() retorna recomendaciones
  - Test: reason incluido
  - Test: caché 6h
  - Test: limits respetados
  - Test: sin auth -> error
  
  Criterio: 6+ tests
  ```
- **Éxito**: Recommendations tests
- **Referencias**: TESTING_STRATEGY.md 3.2

---

## MCP Registration

### T3.7: Registrar tools privados en MCP server
- **Requisitos**: T3.1, T3.2, T3.3, T3.4 completadas
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  En src/index.ts, registrar 3 tools privados:
  - server.setRequestHandler('tools/get_enrolled_courses', requireAuth(...))
  - server.setRequestHandler('tools/get_progress', requireAuth(...))
  - server.setRequestHandler('tools/get_recommendations', requireAuth(...))
  
  Verificar: todos los 7 tools (4 públicos + 3 privados) registrados
  
  Criterio: MCP server con 7 tools funcionales
  ```
- **Éxito**: Todos los 7 tools registrados en MCP
- **Referencias**: IMPLEMENTATION_GUIDE.md Fase 3

---

## Session Management

### T3.8: Implementar session refresh automático
- **Requisitos**: T3.4 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Extender src/services/auth.ts:
  - Método refreshSession(email): obtener nuevo sessionToken
  - Comprobar expiración en middleware
  - Si expirado: llamar refresh automático
  - Actualizar session en disco
  - Error si refresh falla (logout)
  
  Criterio: Session refresh automático
  ```
- **Éxito**: Session refresh implementado
- **Referencias**: SECURITY.md 1.3

---

## Documentation

### T3.9: Actualizar API.md con herramientas privadas
- **Requisitos**: T3.7 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Agregar a docs/API.md:
  - get_enrolled_courses: especificación completa
  - get_progress: especificación
  - get_recommendations: especificación
  
  Incluir: autenticación requerida, cache, ejemplo de uso
  
  Criterio: API.md actualizado
  ```
- **Éxito**: API.md completo con 7 tools
- **Referencias**: coursera-mcp-design.md 3

---

## Checklist Fase 3

- [x] T3.1: get_enrolled_courses implementado
- [x] T3.2: get_progress implementado
- [x] T3.3: get_recommendations implementado
- [x] T3.4: Auth middleware
- [x] T3.5: Enrolled tests
- [x] T3.6: Recommendations tests
- [x] T3.7: Tools registrados en MCP
- [x] T3.8: Session refresh
- [x] T3.9: API.md actualizado

**Criterio de éxito Fase 3**: 7 tools (4 públicos + 3 privados) funcionando, auth completa

---

# 🟢 FASE 4: Polish, CI/CD y Release (Semanas 6-9)

## CI/CD Setup

### T4.1: Crear GitHub Actions workflow
- **Requisitos**: Fase 1-3 completadas
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear .github/workflows/ci.yml:
  - Trigger: push (main, develop), pull_request
  - Matrix: Node 18.x, 20.x
  - Steps:
    1. type-check: bun run type-check
    2. lint: bun run lint
    3. test:unit: bun test:unit --coverage
    4. test:integration: bun test:integration
    5. coverage: codecov upload
  - Fail si coverage < 85%
  - Release job (main only): semantic-release
  
  Criterio: CI/CD pipeline completo
  ```
- **Éxito**: .github/workflows/ci.yml creado
- **Referencias**: TESTING_STRATEGY.md 7.2

### T4.2: Configurar semantic-release y npm
- **Requisitos**: T4.1 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Setup semantic-release:
  - Crear release.config.js (commitizen config)
  - Configurar npm credentials en GitHub (NPM_TOKEN secret)
  - Commits deben usar formato: feat:, fix:, chore:, etc.
  - Versioning automático (major.minor.patch)
  
  Criterio: npm publish automático en main
  ```
- **Éxito**: semantic-release configurado
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 2.7

### T4.3: Configurar Codecov
- **Requisitos**: T4.1 completada
- **Tiempo**: 30 min
- **Prompt**:
  ```
  Setup Codecov:
  - Crear codecov.yml (coverage thresholds)
  - GitHub secrets: CODECOV_TOKEN
  - Fail PR si coverage < 85%
  - Generar coverage reports en CI
  
  Criterio: Coverage tracking en PR
  ```
- **Éxito**: Codecov integrado
- **Referencias**: TESTING_STRATEGY.md 7.2

---

## Documentation Finalization

### T4.4: Crear CONTRIBUTING.md
- **Requisitos**: T1.1 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear CONTRIBUTING.md:
  - Setup local dev (bun install, pnpm dev)
  - Git workflow: feature branches, PRs
  - Commit messages: conventional (feat:, fix:, etc.)
  - Testing: bun test antes de push
  - Code style: bun run lint
  
  Criterio: Guía clara para contributors
  ```
- **Éxito**: CONTRIBUTING.md creado
- **Referencias**: IMPLEMENTATION_GUIDE.md

### T4.5: Crear DEVELOPMENT.md
- **Requisitos**: Fase 1-3 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear docs/DEVELOPMENT.md:
  - Arquitectura de servicios (diagrama)
  - Estructura de directorios explicada
  - Cómo agregar un nuevo tool
  - Debugging tips
  - Common issues y soluciones
  
  Criterio: Documentación para developers
  ```
- **Éxito**: DEVELOPMENT.md creado
- **Referencias**: IMPLEMENTATION_GUIDE.md

### T4.6: Actualizar README.md del proyecto
- **Requisitos**: Fase 1-3 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Crear/actualizar README.md:
  - Descripción del proyecto (1 párrafo)
  - Features (7 tools listados)
  - Installation (npm install -g coursera-mcp)
  - Quick start (setup, uso básico)
  - Tool examples (1 de cada tipo)
  - Docs links (API.md, DEVELOPMENT.md, SECURITY.md)
  - Contributing
  - License
  
  Criterio: README claro y atractivo
  ```
- **Éxito**: README.md profesional
- **Referencias**: coursera-mcp-README.md

### T4.7: Crear SECURITY.md para usuarios
- **Requisitos**: T1.22 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear docs/SECURITY_USERS.md:
  - TOTP 2FA setup (paso a paso)
  - Dónde se guardan credenciales (NO en .env)
  - Cómo cambiar password/2FA
  - Backup codes
  - Reporte de vulnerabilidades
  
  Criterio: Guía de seguridad para usuarios finales
  ```
- **Éxito**: SECURITY_USERS.md creado
- **Referencias**: SECURITY.md

---

## Build y Distribution

### T4.8: Configurar esbuild para bundled executable
- **Requisitos**: T1.3 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Actualizar package.json script build:
  - esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js
  - Minify + sourcemaps
  - Standalone executable (sin node_modules)
  
  Test: node dist/index.js --version debe funcionar
  
  Criterio: Executable bundled funcional
  ```
- **Éxito**: Build process completo
- **Referencias**: IMPLEMENTATION_GUIDE.md Fase 4

### T4.9: Crear binario y NPM entry point
- **Requisitos**: T4.8 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Setup CLI:
  - Crear bin/coursera-mcp.js (shebang + call dist/index.js)
  - Agregar "bin": {"coursera-mcp": "bin/coursera-mcp.js"} en package.json
  - Test: bun install -g (local) -> coursera-mcp --version
  
  Criterio: CLI executable via npm
  ```
- **Éxito**: CLI binario funcional
- **Referencias**: IMPLEMENTATION_GUIDE.md Fase 4

---

## Final Testing y QA

### T4.10: Integration test completo (usuario final)
- **Requisitos**: T4.9 completada
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Crear tests/e2e/user-flow.e2e.test.ts:
  - Simular usuario completo:
    1. coursera-mcp init (TOTP setup)
    2. search_courses('Python')
    3. get_course_details(courseId)
    4. get_enrolled_courses()
    5. get_progress(courseId)
  - Todos los pasos deben funcionar
  - Errores manejados gracefully
  
  Criterio: Full user flow E2E
  ```
- **Éxito**: E2E user flow tests
- **Referencias**: TESTING_STRATEGY.md 4

### T4.11: Performance check
- **Requisitos**: Fase 1-3 completadas
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Performance audit:
  - Medir latencia de search_courses: target <500ms (con cache)
  - Circuit breaker recovery time: <2s
  - Cache hit ratio: >80% en operaciones frecuentes
  - Memory footprint: <50MB
  
  Log resultados en PERFORMANCE.md
  
  Criterio: Performance dentro de targets
  ```
- **Éxito**: Performance audit completado
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md 1

### T4.12: Security audit final
- **Requisitos**: Fase 1-3 completadas
- **Tiempo**: 2 horas
- **Prompt**:
  ```
  Security audit:
  - npm audit (0 vulnerabilities críticas)
  - Verificar NO hay tokens/passwords en código
  - Verificar sanitización de logs
  - Verificar TOTP 2FA funcional end-to-end
  - Verificar AES-256 encryption activo
  - Manual code review de auth.ts + encryption.ts
  
  Log resultados en SECURITY_AUDIT.md
  
  Criterio: 0 vulnerabilidades críticas
  ```
- **Éxito**: Security audit completado
- **Referencias**: SECURITY.md

---

## Release Preparation

### T4.13: Crear CHANGELOG.md (histórico de versiones)
- **Requisitos**: T4.1 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear CHANGELOG.md:
  - [0.1.0] (2026-04-28)
    - Features: 7 tools (search, details, enrolled, progress, recommendations)
    - Security: TOTP 2FA, AES-256 encryption
    - Testing: 85%+ coverage
  - Formato: Keep a Changelog
  
  Criterio: CHANGELOG profesional
  ```
- **Éxito**: CHANGELOG.md creado
- **Referencias**: semantic-release config

### T4.14: Crear .npmignore y publicar
- **Requisitos**: T4.9, T4.13 completadas
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Setup npm publish:
  - Crear .npmignore (excluir tests, docs, src)
  - Verificar package.json "files": ["dist", "bin"]
  - Verificar version correcta (0.1.0)
  - Test publish (npm publish --dry-run)
  - Crear git tag v0.1.0
  
  Criterio: Listo para npm publish
  ```
- **Éxito**: npm publish ready
- **Referencias**: semantic-release

### T4.15: Crear instalación en Claude Desktop
- **Requisitos**: T4.14 completada
- **Tiempo**: 1.5 horas
- **Prompt**:
  ```
  Documentar integración con Claude Desktop:
  - Crear docs/CLAUDE_DESKTOP_SETUP.md
  - Instrucciones paso a paso:
    1. coursera-mcp init (TOTP setup)
    2. Editar ~/.claude/claude.json
    3. Agregar MCP server config
    4. Reiniciar Claude Desktop
  - Ejemplos de uso en Claude
  
  Criterio: Instalación clara
  ```
- **Éxito**: Claude Desktop setup guide creado
- **Referencias**: coursera-mcp-README.md

---

## Post-Release

### T4.16: Crear GitHub Release y anuncio
- **Requisitos**: T4.14 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  GitHub Release:
  - Crear release en GitHub (v0.1.0)
  - Release notes:
    - Features (7 tools)
    - Security highlights (TOTP 2FA)
    - Testing (85%+ coverage)
    - Installation link (npm)
    - Docs link
  
  Criterio: Release profesional en GitHub
  ```
- **Éxito**: GitHub Release creado
- **Referencias**: semantic-release

### T4.17: Crear issues para v1.1 roadmap
- **Requisitos**: T4.16 completada
- **Tiempo**: 1 hora
- **Prompt**:
  ```
  Crear GitHub issues para v1.1:
  - Issue: "2FA backup codes UI"
  - Issue: "Exportar progreso a CSV"
  - Issue: "Google Calendar sync"
  - Issue: "Comparador de cursos"
  
  Criterio: Roadmap documentado
  ```
- **Éxito**: v1.1 roadmap issues creadas
- **Referencias**: ANALYSIS_AND_RECOMMENDATIONS.md Roadmap

---

## Checklist Fase 4

- [x] T4.1: GitHub Actions workflow
- [x] T4.2: semantic-release setup
- [x] T4.3: Codecov setup
- [x] T4.4: CONTRIBUTING.md
- [x] T4.5: DEVELOPMENT.md
- [x] T4.6: README.md
- [x] T4.7: SECURITY_USERS.md
- [x] T4.8: esbuild setup
- [ ] T4.9: CLI binario
- [ ] T4.10: E2E user flow
- [ ] T4.11: Performance check
- [ ] T4.12: Security audit
- [ ] T4.13: CHANGELOG.md
- [ ] T4.14: npm publish ready
- [ ] T4.15: Claude Desktop setup
- [ ] T4.16: GitHub Release
- [ ] T4.17: v1.1 roadmap issues

**Criterio de éxito Fase 4**: Release v0.1.0 en npm, GitHub, y Claude Desktop

---

# 📊 Resumen de Tareas

```
Total de tareas:        68 (divididas en 4 fases)
Fase 1 (Setup):         30 tareas (3 semanas)
Fase 2 (Public tools):  10 tareas (2 semanas)
Fase 3 (Auth tools):     9 tareas (1.5 semanas)
Fase 4 (Release):       17 tareas (2.5 semanas)

Timeline:               7-9 semanas @ 12-15h/semana
Dedicación:             Solo implementación

Tokens estimados:
Fase 1: 120-150K tokens (setup + fundamentos)
Fase 2: 80-100K tokens (tools públicos)
Fase 3: 60-80K tokens (tools privados)
Fase 4: 100-120K tokens (polish + release)
Total: ~350-450K tokens
```

---

# 🎯 Principio de Pareto (80/20)

**El 20% de trabajo que genera 80% de valor**:

1. ✅ **TOTP 2FA + Encryption** (T1.21, T1.22) - Seguridad crítica
2. ✅ **Circuit Breaker** (T1.12) - Resiliencia crítica
3. ✅ **Search Tools** (T2.1, T2.2) - MVP funcional
4. ✅ **Testing Infrastructure** (T1.17-T1.29) - Confianza
5. ✅ **GitHub Actions** (T4.1, T4.2) - Deploy automático

Tareas que SI necesitan hacerse (80% del esfuerzo):
- Setup base (Fase 1): 30 tareas
- Tools implementation (Fase 2-3): 19 tareas
- Testing (toda fase): 20+ tareas
- CI/CD + Release (Fase 4): 17 tareas

Tareas optimizables (potencialmente):
- Documentación redundante (consolidar)
- Tests duplicados (reutilizar fixtures)

---

# 🚀 Cómo Ejecutar

**Workflow recomendado**:

1. Lee este documento por completo
2. Copia cada "Prompt" exactamente
3. Ejecuta en Claude Code: pega el prompt
4. Marca `[x]` cuando completes
5. Commit con mensaje: `feat: T1.1 Crear estructura de proyecto`
6. Pasa a siguiente tarea

**Git workflow**:
```
git checkout -b feat/T1.1
# ... implementación ...
git add .
git commit -m "feat: T1.1 Crear estructura de proyecto"
git push origin feat/T1.1
# Crear PR
```

---

**Última actualización**: Abril 28, 2026  
**Proyecto**: Coursera MCP v0.1.0  
**Estado**: Listo para ejecución
