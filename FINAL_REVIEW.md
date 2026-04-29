# Revisión Final del Proyecto: Coursera MCP

**Fecha**: Abril 28, 2026  
**Revisor**: Análisis Exhaustivo Pre-Implementación  
**Estado**: 🔍 Lagunas Identificadas

---

## 🔴 LAGUNAS CRÍTICAS IDENTIFICADAS

### 1. TASKS.md en Ubicación Incorrecta
**Problema**: `TASKS.md` está en `documentation/` pero debería estar en **raíz del proyecto**
- Referencias en documentos apuntan a `TASKS.md` (root)
- CLAUDE.md menciona "TASKS.md" implícitamente
- Workflow: Usuario abre TASKS.md desde raíz

**Acción Requerida**: 
```bash
mv documentation/TASKS.md ./TASKS.md
```

**Impacto**: Alto - Afecta UX de inicio de implementación

---

### 2. Falta .gitignore Completo
**Problema**: `.gitignore` solo tiene 26 bytes (muy minimalista)
```bash
cat .gitignore  # Output: unknown (probablemente vacío o minimal)
```

**Debería incluir**:
```
# Node/Bun
node_modules/
bun.lockb
dist/
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~

# OS
.DS_Store
Thumbs.db

# Logs
*.log
npm-debug.log*
bun-debug.log*

# Coursera MCP
~/.coursera-mcp/
sessions.json
cache/
*.session
error.log
combined.log
```

**Acción Requerida**: Actualizar `.gitignore`

**Impacto**: Medio - Previene commits accidentales

---

### 3. Falta package.json Base
**Problema**: No existe `package.json` en raíz
- IMPLEMENTATION_GUIDE.md describe qué meter, pero no existe
- TASKS.md T1.2 asume que existe o lo crea

**Acción Requerida**: Crear base mínima

```json
{
  "name": "coursera-mcp",
  "version": "0.1.0",
  "description": "Model Context Protocol server integrating Coursera with Claude",
  "type": "module",
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  },
  "keywords": ["mcp", "coursera", "claude", "ai", "learning"],
  "author": "Freddy Betancourt",
  "license": "MIT",
  "homepage": "https://github.com/yourusername/coursera-mcp",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/coursera-mcp"
  },
  "dependencies": {},
  "devDependencies": {},
  "scripts": {
    "build": "echo 'Build not yet implemented'",
    "dev": "echo 'Dev not yet implemented'",
    "test": "echo 'Tests not yet implemented'",
    "lint": "echo 'Lint not yet implemented'",
    "type-check": "echo 'Type-check not yet implemented'"
  }
}
```

**Impacto**: Alto - T1.2 requiere un package.json como punto de partida

---

### 4. Falta tsconfig.json Base
**Problema**: No existe `tsconfig.json` en raíz
- TASKS.md T1.3 lo crea, pero es mejor tener base

**Acción Requerida**: Crear tsconfig.json mínimo (o dejar que T1.3 lo haga)

**Impacto**: Bajo-Medio - T1.3 puede crearla from scratch

---

### 5. Inconsistencia: Prompts en TASKS.md Mencionan "coursera-mcp init"
**Problema**: 
- T3.4 menciona `coursera-mcp init` 
- SECURITY.md menciona `coursera-mcp init`
- Pero esto es un comando CLI que NO existe en Fase 1-3
- Se crea en Fase 4 con `bin/coursera-mcp.js`

**Issue**: Prompts de T1-T3 asumen algo que no existe

**Acción Requerida**: 
- En T1.22 (Auth TOTP), usar `AuthService.initiateLogin()` (método) NO comando
- En TASKS.md, cambiar `coursera-mcp init` → `new AuthService().initiateLogin()`
- O documentar que es para v0.1.1 (post-release)

**Impacto**: Medio - Puede confundir durante implementación

---

### 6. Falta Documentación de .env.example
**Problema**: 
- TASKS.md T1.6 crea `.env.example`
- SECURITY.md menciona variables pero no lista todas
- No hay referencia clara de QUÉ variables son obligatorias

**Debería documentar**:
```
# .env.example
NODE_ENV=development
LOG_LEVEL=debug
COURSERA_STAGING_URL=https://staging.coursera.org  # Only for E2E tests
```

**Acción Requerida**: Actualizar SECURITY.md o crear ENV_VARIABLES.md

**Impacto**: Bajo - TASKS.md T1.6 puede manejar esto

---

### 7. Falta Fixture de Usuarios/Sesiones en Tests
**Problema**: 
- TASKS.md T1.13 crea fixtures de cursos
- Pero NO menciona fixtures para usuarios autenticados
- T3.5-T3.6 (auth tests) necesitarán usuarios fake

**Acción Requerida**: Agregar a fixtures:
```typescript
export const mockUsers = [
  {
    id: 'user_1',
    email: 'test1@example.com',
    displayName: 'Test User 1',
    enrollments: ['python-101', 'data-science-spec']
  }
]

export const mockSessions = [
  {
    email: 'test1@example.com',
    sessionToken: 'encrypted_token_123',
    refreshToken: 'encrypted_refresh_123',
    expiresAt: new Date(Date.now() + 86400000).toISOString()
  }
]
```

**Impacto**: Medio - Afecta T3.5-T3.6

---

### 8. Falta Estrategia para Rate Limiting
**Problema**:
- ANALYSIS_AND_RECOMMENDATIONS.md menciona rate limiting
- SECURITY.md NO tiene detalles implementación
- TASKS.md NO incluye tarea para implementar TokenBucket/RateLimiter

**Acción Requerida**: 
- Agregar T1.X: "Implementar RateLimiter con Token Bucket"
- O documentar que es v1.1 (post-launch)

**Impacto**: Bajo-Medio - Opcional para v1.0 si caché es suficiente

---

### 9. Falta Estrategia de Error Mapping Coursera → MCP
**Problema**:
- TASKS.md menciona errores generales
- NO hay mapeo específico de errores HTTP → MCP errors
- Ejemplo: ¿Qué hace si Coursera retorna 429 (rate limit)?

**Debería documentar**:
```
HTTP 429 → CourseraError.RATE_LIMIT (con Retry-After)
HTTP 401 → CourseraError.AUTH_ERROR (sesión expirada)
HTTP 404 → CourseraError.NOT_FOUND
HTTP 503 → Circuit breaker opens
```

**Acción Requerida**: Agregar a coursera-mcp-design.md o crear ERROR_MAPPING.md

**Impacto**: Bajo - Puede inferirse del contexto

---

### 10. Falta Especificación de Respuesta MCP Format
**Problema**:
- TASKS.md describe qué retorna cada tool
- PERO no documentada formato MCP standard
- ¿Cómo se estructura error en MCP? ¿Qué campos son obligatorios?

**Referencia**: `src/index.ts` debería documentar

```typescript
// Error response format para MCP
{
  type: 'error',
  code: string,      // e.g., 'VALIDATION_ERROR'
  message: string,   // User-friendly message
  details?: any      // Extra context
}

// Success response format
{
  type: 'result',
  data: any          // Tool result
}
```

**Acción Requerida**: Documentar en IMPLEMENTATION_GUIDE.md Fase 1 o coursera-mcp-design.md

**Impacto**: Bajo-Medio - Afecta T1.30 (MCP Server base)

---

### 11. Falta Documentación de Bun Test Filtering
**Problema**:
- TASKS.md usa `bun test --filter '*.unit.test.ts'`
- PERO bun test usa `--match` o `--test-prefix`, no `--filter`
- Sintaxis correcta: `bun test --match '*.unit.test.ts'`

**Acción Requerida**: Corregir en TASKS.md

**Impacto**: Alto - Tests no correrán si sintaxis es incorrecta

---

### 12. Falta vitest.config.ts en TASKS.md
**Problema**:
- TASKS.md T1.5 menciona crear `vitest.config.ts`
- PERO bun usa su propio test runner
- Necesitamos aclarar: ¿Usamos vitest o bun test?

**Opciones**:
A) **Bun test nativo** (recomendado)
   - Más rápido, menos dependencias
   - Cambiar `vitest` references → `bun test`

B) **vitest compatibility layer**
   - Si necesitamos vitest features específicas
   - Documentar qué necesitamos

**Acción Requerida**: Decidir y actualizar TASKS.md + IMPLEMENTATION_GUIDE.md

**Impacto**: Alto - Afecta T1.5 y todos los tests

---

### 13. Falta Configuración de ESLint para Bun
**Problema**:
- TASKS.md T1.4 configura ESLint
- PERO no especifica preset para bun/Node.js
- ESLint config debería excluir incompatibilidades

**Debería incluir**:
```json
{
  "env": {
    "node": true,
    "es2020": true
  },
  "extends": ["eslint:recommended", "@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "parserOptions": {
    "ecmaVersion": "latest",
    "sourceType": "module"
  }
}
```

**Impacto**: Bajo - Standard Node.js config debería funcionar

---

### 14. Falta Documentación de CircuitBreaker Reset Logic
**Problema**:
- ANALYSIS_AND_RECOMMENDATIONS.md describe states
- PERO no aclara: ¿Qué hace si half-open request falla?
  - ¿Vuelve a open inmediatamente?
  - ¿O incrementa contador?

**Especificación debería ser**:
```
- half-open request succeeds → state = closed, failures = 0
- half-open request fails → state = open, failures++, resetTimeout = 60s
```

**Acción Requerida**: Aclarar en ANALYSIS_AND_RECOMMENDATIONS.md 2.2

**Impacto**: Bajo - Inferible pero mejor explícito

---

### 15. Falta Documentación de Cache Invalidation Strategy
**Problema**:
- ANALYSIS_AND_RECOMMENDATIONS.md menciona POST invalida GET cache
- PERO no especifica qué exactamente se invalida
- Ejemplo: POST /api/courses invalida `search:*` o solo `search:query-específico`?

**Estrategia debería ser**:
```
POST /api/something → invalidate `search:*` (wildcard)
PUT /api/course/:id → invalidate `course:{id}`
DELETE /api/resource/:id → invalidate `resource:{id}`, `list:*`
```

**Acción Requerida**: Documentar en coursera-mcp-design.md

**Impacto**: Bajo - Puede decidirse durante T1.15

---

### 16. Falta Documentación de TOTP Secret Storage
**Problema**:
- SECURITY.md describe flujo TOTP
- PERO no especifica: ¿El secret se guarda en sessions.json?
- ¿O solo sessionToken?

**Especificación debería ser**:
```json
{
  "email": "user@example.com",
  "sessionToken": "encrypted_base64",
  "refreshToken": "encrypted_base64",
  "totpSecret": "encrypted_base64",  // ¿Se guarda?
  "totpBackupCodes": ["encrypted_base64", ...]
}
```

**Acción Requerida**: Aclarar en SECURITY.md 1.1

**Impacto**: Medio - Afecta T1.22 (Auth Service)

---

### 17. Falta Integración de Middleware en MCP Server
**Problema**:
- TASKS.md T3.4 crea middleware
- T3.7 registra tools con middleware
- PERO no clara la integración: ¿Cómo pasa context entre middleware → handler?

**Especificación debería ser**:
```typescript
// src/middleware/auth.ts
export async function requireAuth(handler) {
  return async (request, context) => {
    // 1. Validate sessionToken
    // 2. Refresh if needed
    // 3. Inyectar userId en context
    return handler(request, {...context, userId: ...})
  }
}

// src/index.ts
server.setRequestHandler('tools/get_enrolled_courses', 
  requireAuth(async (request, context) => {
    // context.userId está disponible aquí
  })
)
```

**Acción Requerida**: Documentar patrón en IMPLEMENTATION_GUIDE.md o T3.4

**Impacto**: Medio - Afecta T3.4, T3.7

---

### 18. Falta Documentación de Logging Levels por Módulo
**Problema**:
- ANALYSIS_AND_RECOMMENDATIONS.md menciona logging
- PERO no especifica qué debería loguear qué nivel

**Debería documentar**:
```
DEBUG:   Entrada a funciones, valores de cache, retry attempts
INFO:    Tool invocations, cache hits/misses
WARN:    Circuit breaker state changes, session refreshes
ERROR:   API failures, auth errors, validation errors
```

**Acción Requerida**: Agregar a IMPLEMENTATION_GUIDE.md o T1.10

**Impacto**: Bajo - Estándar, pero útil para debugging

---

### 19. Falta Documentación de Timeout Defaults
**Problema**:
- TASKS.md T1.14 menciona timeout=10s
- PERO no especifica timeouts para otros servicios
- Circuito breaker resetTimeout es 60s, ¿es suficiente?

**Debería documentar**:
```
HTTP timeout: 10s (axios default)
Circuit breaker reset: 60s
Retry max duration: 1s + 2s + 4s = 7s (antes de fallo)
Cache TTL: 24h (público), 1h (privado), 6h (recomendaciones)
```

**Acción Requerida**: Documentar en coursera-mcp-design.md

**Impacto**: Bajo - Puede ajustarse post-v1.0

---

### 20. Falta Test de Integración Completa: Auth + Search + Details
**Problema**:
- TASKS.md T4.10 hace E2E pero no hay test de flow completo
- ¿Qué pasa si usuario: login → search → get_details → get_enrolled?

**Debería agregar**:
- T4.10 (actual) solo simula usuario completo
- Pero no hay test de error recovery
- Ejemplo: ¿Qué pasa si search falla en mitad del flow?

**Acción Requerida**: Ampliar T4.10 o agregar T4.11

**Impacto**: Bajo - Puede hacerse post-v1.0 o ampliar T4.10

---

## 🟡 LAGUNAS MENORES (Clarificaciones)

### 21. Documentación de Semana 4 en IMPLEMENTATION_GUIDE
- T4.5 menciona "Actualizar README.md"
- PERO README ya existe en `coursera-mcp-README.md`
- ¿Crear nuevo README.md raíz? ¿O actualizar el existente?

### 22. Falta Documentación de CLI Comandos Post-Build
- T4.9 crea CLI ejecutable
- PERO no documentado qué comandos acepta
- `coursera-mcp --version`? `coursera-mcp search --help`?
- O solo funciona como servidor MCP?

### 23. Falta Estrategia de Versionado en package.json
- TASKS.md T4.14 menciona version 0.1.0
- PERO semantic-release genera versiones automáticas
- ¿Qué valor inicial debería tener `version` en package.json?

### 24. Inconsistencia: "Dedicación 12-15h/semana" 
- Timeline total: 7-9 semanas = 84-135 horas total
- ¿Es realista para proyecto con 68 tareas?
- Algunas tareas (T1.7-T1.8: Tipos) pueden tomar 2-3h

### 25. Falta Documentación de cómo Manejar Cambios en API de Coursera Post-Launch
- ¿Qué pasa si Coursera cambia endpoint de /api/courses → /api/v2/courses?
- ¿Cómo users saben que necesitan actualizar?

---

## 🟢 FORTALEZAS IDENTIFICADAS (NO LAGUNAS)

✅ **Arquitectura clara**: Separación de concerns bien definida  
✅ **Testing exhaustivo**: Pirámide de tests clara (unit/int/E2E)  
✅ **Seguridad robusta**: TOTP 2FA + AES-256 + sanitización logs  
✅ **Documentación completa**: 16 documentos, bien organizados  
✅ **Plan atomizado**: 68 tareas pequeñas y dependencias claras  
✅ **Bun migration**: Completamente documentada  
✅ **CLAUDE.md**: Excelente para futuros devs  
✅ **Error handling**: Discriminated unions, circuit breaker  
✅ **Resiliencia**: Stale-while-revalidate, exponential backoff  

---

## ⚠️ ACCIÓN INMEDIATA REQUERIDA (Antes de T1.1)

### CRÍTICA (Bloqueante)
- [ ] **#1**: Mover `TASKS.md` a raíz (de documentation/ → .)
- [ ] **#11**: Corregir sintaxis de `bun test --filter` → `bun test --match`
- [ ] **#12**: Decidir vitest vs bun test nativo

### IMPORTANTE (Debería hacerse)
- [ ] **#2**: Actualizar `.gitignore` completo
- [ ] **#3**: Crear `package.json` base mínimo
- [ ] **#5**: Cambiar prompts TASKS.md `coursera-mcp init` → método auth
- [ ] **#10**: Documentar MCP response format

### RECOMENDADO (Mejoraría calidad)
- [ ] **#6**: Documentar `.env.example` variables
- [ ] **#8**: Incluir RateLimiter en TASKS.md o marcar como v1.1
- [ ] **#9**: Documentar error HTTP → MCP mapping
- [ ] **#14**: Aclarar CircuitBreaker reset logic

---

## 📊 Resumen de Lagunas

| Severidad | Cantidad | Ejemplos |
|-----------|----------|----------|
| 🔴 Crítica | 3 | TASKS.md ubicación, bun test sintaxis, vitest vs bun |
| 🟠 Importante | 4 | .gitignore, package.json, prompts init, MCP format |
| 🟡 Recomendado | 8+ | Documentación clarificaciones |
| 🟢 Fortalezas | 8+ | Arquitectura, testing, seguridad |

---

## ✅ CONCLUSIÓN

**El proyecto está 85-90% listo para implementación.**

### Antes de comenzar T1.1:

1. ✅ Mover `TASKS.md` a raíz
2. ✅ Corregir sintaxis bun test
3. ✅ Crear package.json base
4. ✅ Actualizar .gitignore
5. ✅ Decidir vitest vs bun test

### Después de arreglar lo anterior:

El proyecto está **100% listo** para comenzar implementación.

**Tiempo estimado para arregloss**: 30-45 minutos.

---

**Siguiente paso**: ¿Arreglar las 5 críticas antes de T1.1 o comenzar ahora?
