# Changelog: Proyecto Coursera MCP

## Actualización Abril 2026 - Mejoras Críticas Integradas

**Resumen**: Integración de 7 mejoras críticas identificadas en análisis de optimización pre-implementación. El proyecto cambia de "viable" a "production-ready".

---

## 📋 Historial de Cambios

### Cambios Arquitectónicos

#### 1. Autenticación TOTP 2FA ✅ CRÍTICO
**Estado Anterior**: v1.1 (no soportado en v1.0)  
**Estado Nuevo**: v1.0 (requerido)

**Cambios**:
- Email/password ❌ → TOTP 2FA ✅
- Sesiones guardadas en disco (sin credenciales) ✅
- Encriptación AES-256 de session tokens ✅
- Soporte para Google Authenticator, 1Password, Authy ✅

**Por qué**: 
- 2026: Pocas cuentas sin 2FA
- Mayor seguridad para datos personales
- Browser session fallback es frágil

**Impacto**:
- `src/services/auth.ts` completamente reescrito
- Nueva clase `EncryptionService`
- Flujo `coursera-mcp init` con TOTP setup
- Tests para TOTP validation

---

#### 2. Circuit Breaker Pattern ✅ CRÍTICO
**Estado Anterior**: No existe  
**Estado Nuevo**: Patrón implementado

**Cambios**:
- Nueva clase `src/services/circuitBreaker.ts` (130 líneas)
- Estados: closed → open → half-open
- Fallback: servir caché stale en lugar de fallar
- Auto-recovery: intenta reconectar cada 60s

**Código Agregado**:
```typescript
class CourseraCircuitBreaker {
  state: 'closed' | 'open' | 'half-open'
  failures: number
  failureThreshold: 5
  resetTimeout: 60_000
  
  async execute(fn, fallback?)
  // Si state='open' y existe fallback → return fallback()
  // Si failures >= threshold → state='open'
}
```

**Por qué**: Cuando Coursera API cae, los usuarios ven datos stale vs error abruptamente

**Impacto**:
- Mejor UX bajo fallos
- CourseraClient integra circuit breaker
- Tests de circuit breaker (2KB test)

---

#### 3. Zod Runtime Validation ✅ MEDIO
**Estado Anterior**: TypeScript types solo (no runtime)  
**Estado Nuevo**: Zod schemas + type inference

**Cambios**:
- Nuevo archivo `src/types/schemas.ts` (120 líneas)
- CourseSchema, ProgramSchema, UserSchema, etc.
- Validación automática en parsers
- Errores claros ("field X missing")

**Código Agregado**:
```typescript
export const CourseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string(),
  rating: z.number().min(0).max(5).optional(),
  // ...
})

export type Course = z.infer<typeof CourseSchema>

export function parseCourse(raw: unknown): Course {
  return CourseSchema.parse(raw)
}
```

**Por qué**: Coursera cambia JSON ocasionalmente sin avisar

**Impacto**:
- `src/services/parser.ts` usa Zod validation
- `-ValidationError` si datos no coinciden con schema
- Logs detallados de qué campo falla

---

#### 4. Stale-While-Revalidate Cache ✅ BAJO
**Estado Anterior**: Caché simple (expirado = error)  
**Estado Nuevo**: Patrón SWR

**Cambios**:
- Nuevo método `cache.getWithStaleCache<T>()`
- Sirve datos viejos + refetch en background
- Mejor UX en latencias altas

**Código Agregado**:
```typescript
async function getWithStaleCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttl: number
): Promise<T> {
  const cached = cache.get<T>(key)
  if (cached) return cached
  
  const stale = cache.getStale<T>(key)
  if (stale?.isStale) {
    // Servir stale, refetch en background
    fetcher().then(data => cache.set(key, data, ttl))
    return stale.data
  }
  
  const data = await fetcher()
  cache.set(key, data, ttl)
  return data
}
```

**Impacto**:
- Todos los tools usan SWR pattern
- Mejor UX con red débil
- Usuarios ven datos recientes en background

---

### Cambios en Testing

#### 5. Three-Tier Testing Strategy ✅ MEDIO
**Estado Anterior**: "85%+ coverage" (vago)  
**Estado Nuevo**: Pirámide clara (unit/integration/E2E)

**Nuevo Documento**: `TESTING_STRATEGY.md` (14KB)

**Cambios**:
- **Unit Tests** (75%): vitest, mocked dependencies
  - courseraClient.test.ts, cache.test.ts, auth.test.ts, parser.test.ts
  - retry.test.ts, circuitBreaker.test.ts
  - 70+ tests

- **Integration Tests** (24%): vitest + nock
  - http-cache.integration.test.ts
  - auth-flow.integration.test.ts (TOTP flow completo)
  - tools-workflow.integration.test.ts

- **E2E Tests** (1%): contra staging API
  - Ejecutar 1x/week, no en CI principal
  - Requiere credenciales staging

**Estructura**:
```
tests/
├── unit/
│   ├── services/ (4 archivos)
│   ├── tools/ (3 archivos)
│   └── utils/ (2 archivos)
├── integration/ (3 archivos)
└── fixtures/ (data de mock)
```

**CI/CD**:
```yaml
- run: pnpm test:unit --coverage
- run: pnpm test:integration
- uses: codecov/codecov-action@v3
  with:
    min_coverage_percentage: 85
```

**Impacto**:
- Coverage enforced en CI/CD (85% minimum)
- Tests de seguridad (TOTP, encriptación)
- Tests de resiliencia (circuit breaker)

---

### Cambios en Logging

#### 6. Structured Logging (Winston) ✅ BAJO
**Estado Anterior**: Console.log básico  
**Estado Nuevo**: Winston structured JSON

**Cambios**:
- `src/utils/logger.ts` con Winston
- Logs a disco: `~/.coursera-mcp/error.log` y `combined.log`
- Formato JSON para parsing automático
- Sanitización automática de datos sensibles

**Código Agregado**:
```typescript
// Sanitización automática
const sanitized = sanitizeForLogging({
  email: 'user@example.com',     // [REDACTED]
  sessionToken: 'secret',         // [REDACTED]
  courseName: 'Python 101'        // OK
})

logger.error('API request failed', sanitized)
```

**Impacto**:
- Todos los servicios usan logger
- Zero tokens/passwords en logs
- Debugging más fácil en producción

---

### Cambios en DevOps

#### 7. GitHub Actions CI/CD Completo ✅ MEDIO
**Estado Anterior**: "Publicar en npm" (sin detalles)  
**Estado Nuevo**: Pipeline completo

**Nuevo Documento**: `.github/workflows/ci.yml`

**Cambios**:
- Matrix testing: Node 18.x + 20.x
- Type check + linting en cada push
- Unit + integration tests (con coverage)
- Codecov integration
- semantic-release para npm

**Pipeline**:
```yaml
on: [push, pull_request]

jobs:
  test:
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - type-check
      - lint
      - test:unit (with coverage)
      - test:integration
      - upload to codecov (fail if <85%)

  release:
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    - semantic-release (auto bump version)
    - npm publish
```

**Impacto**:
- Deploy automático en push a main
- Versionado semántico automático
- Coverage enforced (85%)

---

## 📊 Tabla de Cambios

| Aspecto | Antes | Después | Cambio |
|---------|-------|---------|--------|
| **Autenticación** | Email/pwd (v1.1) | TOTP 2FA (v1.0) | 🔒 Crítico |
| **Resiliencia** | Sin fallback | Circuit breaker | ⚡ Crítico |
| **Validación** | TypeScript only | Zod runtime | 🛡️ Medio |
| **Caché** | Simple TTL | SWR pattern | 📈 UX |
| **Testing** | 85% goal | Unit/integration/E2E | ✅ Confianza |
| **Logging** | console.log | Winston JSON | 🔍 Debug |
| **CI/CD** | Mención solo | GitHub Actions | 🚀 Auto |
| **Timeline** | 5-7w | 7-9w | 📅 Realista |

---

## 🎯 Nuevos Documentos

### Guías Técnicas
- ✅ **IMPLEMENTATION_GUIDE.md** (12KB)
  - Setup paso a paso
  - Fases 1-4 con checklist
  - Código starter para cada módulo

- ✅ **TESTING_STRATEGY.md** (14KB)
  - Pirámide de pruebas
  - Ejemplos con vitest + nock
  - Coverage requirements por módulo

- ✅ **SECURITY.md** (10KB)
  - TOTP 2FA (flujo completo)
  - AES-256 encryption
  - Sanitización de logs
  - OWASP Top 10

- ✅ **ANALYSIS_AND_RECOMMENDATIONS.md** (15KB)
  - Análisis de 7 mejoras
  - Timeline revisado
  - Codigo de ejemplo para cada mejora

### Índices y Navegación
- ✅ **documentation/README.md** (Tabla de contenidos principal)
- ✅ **CHANGELOG.md** (este archivo)

---

## 📈 Impacto en Estimaciones

### Original (Diciembre 2024)
```
Fase 1: 1-2 semanas (tipos, cliente, caché)
Fase 2: 1 semana   (tools públicos)
Fase 3: 1 semana   (tools privados)
Fase 4: 2 semanas  (polish, docs, CI/CD)
────────────────────────
Total:  5-7 semanas
```

### Revisado (Abril 2026)
```
Fase 1: 3 semanas  (tipos, cliente, caché, TOTP, circuit breaker)
Fase 2: 2 semanas  (tools públicos + integration tests)
Fase 3: 1 semana   (tools privados)
Fase 4: 2 semanas  (polish, CI/CD, security, docs)
────────────────────────
Total:  7-9 semanas
```

### Justificación del +2 semanas
- TOTP 2FA setup: +3 días
- Circuit breaker: +2 días
- Zod validation: +2 días
- Integration tests: +3 días
- GitHub Actions: +1 día
- Documentación nueva: +2 días
- **Total**: +13 días (~2 semanas)

---

## 🚀 Cómo Usar Este Changelog

1. **Si implementabas con plan original**: Lee este changelog completo
2. **Si es la primera vez**: No necesitas este archivo, usa IMPLEMENTATION_GUIDE
3. **Si necesitas context de decisiones**: Mira ANALYSIS_AND_RECOMMENDATIONS.md

---

## 📌 Decisiones Clave

### 1. TOTP en v1.0 (no v1.1)
**Razón**: Seguridad personal + viabilidad (pocas cuentas sin 2FA en 2026)

### 2. Circuit Breaker Pattern
**Razón**: Cuando API cae, mejor servir datos stale que error

### 3. Zod Runtime Validation
**Razón**: Coursera cambia JSON ocasionalmente; runtime validation lo detecta

### 4. Stale-While-Revalidate
**Razón**: Mejor UX bajo latencia alta o fallos transitorios

### 5. GitHub Actions Automático
**Razón**: Deploy seguro + versionado automático = menos fricción

---

## ✅ Checklist de Transición

Si estabas usando el plan original:

- [ ] Revisar `ANALYSIS_AND_RECOMMENDATIONS.md` (secciones 2.1-2.7)
- [ ] Leer `SECURITY.md` para entender TOTP 2FA
- [ ] Revisar `TESTING_STRATEGY.md` para tests de integración
- [ ] Usar `IMPLEMENTATION_GUIDE.md` como referencia actualizada
- [ ] Actualizar tu plan local con timeline revisado (7-9w)
- [ ] Crear issues en GitHub basado en Fase 1-4 actualizada

---

**Documento generado**: Abril 28, 2026  
**Versión**: 1.0 + Mejoras  
**Estado**: Listo para implementación
