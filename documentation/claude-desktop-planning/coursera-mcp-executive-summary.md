# Resumen Ejecutivo: MCP Coursera

## Visión General

Servidor **Model Context Protocol (MCP)** que integra Coursera con Claude, permitiendo:
- Búsqueda de cursos públicos
- Exploración de programas (specializations, degrees)
- Acceso a cursos inscritos con progreso detallado
- Recomendaciones personalizadas basadas en historial
- Análisis de certificados y deadlines

## Valor Propuesto

1. **Acceso integrado en Claude**: Buscar y explorar Coursera sin salir de Claude.ai
2. **Tracking de progreso**: Ver estado actual de cursos inscritos en tiempo real.
3. **Recomendaciones smart**: Descubrir nuevos cursos basados en patrones de aprendizaje.
4. **Caché inteligente**: Reduce latencia y respeta rate limits de Coursera.
5. **Seguridad**: Credenciales protegidas, sesiones encriptadas, sin logs de datos sensibles.

## Arquitectura de Alto Nivel

```
                    ┌──────────────┐
                    │   Claude     │
                    │ (Desktop/Web)│
                    └───────┬──────┘
                            │
                            │ MCP Protocol
                            ↓
                    ┌─────────────────────┐
                    │  MCP Server (Node)  │
                    │  - Tool Handlers    │
                    │  - Cache Manager    │
                    │  - HTTP Client      │
                    └──────────┬──────────┘
                               │
                ┌──────────────┼──────────────┐
                │              │              │
         ┌──────↓──────┐  ┌───↓────┐  ┌────↓──────┐
         │ Caché Local │  │Coursera│  │Sesión /   │
         │ (24h/1h/6h) │  │ APIs   │  │Auth Token │
         └─────────────┘  └────────┘  └───────────┘
```

## Herramientas Implementadas

### Públicas (sin autenticación)

| Herramienta | Descripción | Caché |
|---|---|---|
| `search_courses` | Busca cursos por keywords, categoría, idioma, nivel | 24h |
| `search_programs` | Busca specializations, degrees, professional certificates | 24h |
| `get_course_details` | Obtiene info completa: sílabo, instructores, certificado | 24h |
| `get_program_details` | Estructura del programa, cursos en secuencia | 24h |

### Privadas (requieren autenticación)

| Herramienta | Descripción | Caché |
|---|---|---|
| `get_enrolled_courses` | Mis cursos inscritos con progreso | 1h |
| `get_progress` | Estado detallado: semanas, quizzes, assignments | 1h |
| `get_recommendations` | Cursos recomendados personalizados | 6h |

## 🎯 Mejoras Clave en v1.0 (Actualizadas Abril 2026)

| Mejora | Anterior | v1.0 | Impacto |
|--------|----------|------|---------|
| **Autenticación** | Email/password | TOTP 2FA + encrypted tokens | 🔒 Seguridad crítica |
| **Resiliencia** | Sin fallback | Circuit breaker + stale cache | ⚡ UX mejorada |
| **Validación** | Tipos solo TypeScript | Zod runtime validation | 🛡️ API changes safe |
| **Testing** | 85% target | 85%+ + integration + E2E | ✅ Confianza aumentada |
| **Logging** | Basic console | Winston structured JSON | 🔍 Debugging mejorado |
| **CI/CD** | Mencionar solo | GitHub Actions completo | 🚀 Deploy automático |

## Stack Tecnológico (ACTUALIZADO)

```
├── Lenguaje: TypeScript 5.4+ (Node.js 18+, strict mode)
├── MCP: @anthropic-ai/sdk (MCP protocol)
├── HTTP: axios (con retry automático + circuit breaker)
├── Validación: zod (runtime schemas + type inference)
├── Parsing: cheerio (HTML) + JSON nativo
├── Autenticación: speakeasy (TOTP), crypto (AES-256 encryption)
├── Storage: fs-extra (caché en disco local)
├── Logging: winston (structured JSON logs)
├── Testing: vitest + nock (mocks HTTP) + codecov
└── Deploy: esbuild (bundled executable) + semantic-release (npm)
```

## Implementación por Fases (ACTUALIZADO)

### ✅ Fase 1: Fundamentos + Seguridad (3 semanas) [ANTES: 1-2 semanas]

**Deliverables**:
- Estructura TypeScript completa con strict mode
- Tipos de datos con **Zod schemas** para validación runtime
- Sistema de caché con TTL + **stale-while-revalidate**
- HTTP client con retry logic + **circuit breaker**
- Autenticación **TOTP 2FA** (no email/password)
- **Encriptación AES-256** para session tokens
- Tests unitarios (85%+ coverage)
- Structured logging (JSON)

**Cambios Críticos en v1.0**:
- ✅ **TOTP 2FA**: Mueve de v1.1 a v1.0 (seguridad personal)
- ✅ **Circuit Breaker**: Resiliencia cuando API de Coursera cae
- ✅ **Zod Schemas**: Validación runtime contra cambios de API
- ✅ **Stale Cache**: Mejor UX, sirve datos viejos vs error

**Archivos**:
- `src/types/schemas.ts` - **NEW: Zod schemas** para validación
- `src/types/coursera.ts` - Tipos de dominio
- `src/types/errors.ts` - Discriminated unions para errores
- `src/services/courseraClient.ts` - HTTP client
- `src/services/cache.ts` - Caché con stale-while-revalidate
- `src/services/circuitBreaker.ts` - **NEW: Circuit breaker**
- `src/services/auth.ts` - **NEW: TOTP 2FA + encryption**
- `src/utils/retry.ts` - Retry logic
- `src/utils/logger.ts` - Winston structured logging

### 📝 Fase 2: Herramientas Públicas + Testing (2-3 semanas) [ANTES: 1 semana]

**Deliverables**:
- `search_courses`, `search_programs` con validación Zod
- `get_course_details`, `get_program_details`
- MCP server integration con handler registration
- **Integration tests** (HTTP + cache + circuit breaker)
- **E2E tests** contra fixtures reales
- Documentación de cada tool

**Cambios**:
- ✅ Todas las tools usan validación Zod
- ✅ Tests de integración cubren caché + reintentos + fallbacks
- ✅ Circuit breaker testeado bajo carga

**Archivos**:
- `src/tools/search.ts` - search_courses, search_programs (con Zod)
- `src/tools/details.ts` - get_course_details, get_program_details
- `tests/integration/http-cache.integration.test.ts` - HTTP + cache
- `tests/integration/tools-workflow.integration.test.ts` - E2E workflows
- `docs/API.md` - **NEW: Especificación de cada tool**

### 🔐 Fase 3: Herramientas Autenticadas (1 semana)

**Deliverables**:
- `get_enrolled_courses`: Listar mis cursos con progreso
- `get_progress`: Estado detallado (semanas, quizzes, deadlines)
- `get_recommendations`: Cursos recomendados personalizados
- Session management y refresh tokens
- Invalidación de caché post-login

**Archivos**:
- `src/tools/enrolled.ts` - Cursos inscritos y progreso
- `src/tools/recommendations.ts` - Recomendaciones
- `tests/tools/enrolled.test.ts` - Tests

### 🚀 Fase 4: Polish, CI/CD y Release (2-3 semanas) [ANTES: 1 semana]

**Deliverables**:
- **GitHub Actions con semantic-release**
- **Codecov integration** para coverage tracking
- **Security audit** (npm audit, OWASP Top 10)
- **Documentación completa**: README, SECURITY.md, TESTING_STRATEGY.md, IMPLEMENTATION_GUIDE.md
- **Ejemplos de uso** y troubleshooting
- **npm publish** con versioning automático

**Cambios**:
- ✅ CI/CD detallado con matrix testing (Node 18 + 20)
- ✅ Coverage minimum 85% enforced en CI
- ✅ Security scanning en cada push
- ✅ 4 documentos nuevos de referencia

**Archivos**:
- `.github/workflows/ci.yml` - **NEW: GitHub Actions robusto**
- `SECURITY.md` - **NEW: Guía de seguridad + TOTP**
- `TESTING_STRATEGY.md` - **NEW: Estrategia de testing en profundidad**
- `IMPLEMENTATION_GUIDE.md` - **NEW: Guía paso a paso**
- `README.md` - Documentación principal (actualizado)
- `CONTRIBUTING.md` - Guía de contribución

## Flujo de Datos por Herramienta

### search_courses

```
Usuario: "search_courses('Python', {category: 'cs', limit: 20})"
         ↓
    [Crear clave caché]
         ↓
    [¿Existe en caché?]
         ├─ Sí → [Retornar]
         └─ No → [HTTP GET /api/courses?q=Python&...]
              ↓
         [Parsear JSON]
              ↓
         [Actualizar caché (24h)]
              ↓
         [Retornar resultados]
```

### get_progress

```
Usuario: "get_progress('course-123')" (requiere auth)
         ↓
    [Validar sesión]
         ↓
    [Crear clave caché]
         ↓
    [¿Existe en caché?]
         ├─ Sí → [Retornar]
         └─ No → [HTTP GET /api/progress?courseId=...]
              ├─ Sesión expirada → [Refresh + Reintentar]
              ├─ Rate limit → [Backoff exponencial]
              └─ OK → [Parsear + Caché (1h)]
                   ↓
              [Retornar progreso]
```

## Manejo de Errores

### Estrategia de Reintentos

| Error | Reintentos | Acción |
|---|---|---|
| Timeout | 3x | Backoff: 1s, 2s, 4s |
| 429 (Rate Limit) | Según header | Exponential backoff |
| 500 (Server Error) | 3x | Backoff: 1s, 2s, 4s |
| 401 (Auth) | No | Mensaje: "Sesión expirada" |
| 400 (Validation) | No | Mensaje: "Parámetros inválidos" |
| 404 (Not Found) | No | Mensaje: "No encontrado" |

### Ejemplos de Mensajes

```
❌ Network timeout después de 3 reintentos. Intenta de nuevo.
❌ Sesión expirada. Por favor, vuelve a iniciar sesión con get_login.
❌ Coursera está limitando solicitudes. Esperando 60 segundos...
❌ Curso no encontrado: "data-science-101" (verifica el ID)
❌ Parámetro inválido: 'category' debe ser una de: [computer-science, business, health]
```

## Seguridad

### ✅ Implementado

- Credenciales en `.env` (nunca en código)
- Sesiones encriptadas en `~/.coursera-mcp/sessions.json`
- No loguear tokens ni contraseñas
- CSRF tokens manejados automáticamente
- Validación de esquemas de entrada (zod)

### ⚠️ Consideraciones

- **2FA**: No soportado en v1.0 (en roadmap)
- **OAuth2**: Requeriría setup backend (investigar Coursera support)
- **Browser session reutilización**: Fallback si email/password no funciona

## Testing

### Cobertura Objetivo

- **Unit tests**: 85%+ (servicios, parsers, cache)
- **Integration tests**: 75%+ (HTTP client con mocks)
- **E2E tests**: Herramientas MCP completamente

### Ejemplo de Test

```typescript
describe('search_courses', () => {
  it('should return courses matching query', async () => {
    nock('https://www.coursera.org')
      .get('/api/courses')
      .query({ q: 'Python' })
      .reply(200, mockCourseResponse)

    const result = await searchCourses('Python', { limit: 5 })

    expect(result.results).toHaveLength(5)
    expect(result.results[0].name).toContain('Python')
  })

  it('should use cache on second call', async () => {
    const result1 = await searchCourses('Python')
    const result2 = await searchCourses('Python')

    // Segundo call no hace HTTP request
    expect(result1).toEqual(result2)
  })
})
```

## Métricas de Éxito

### v1.0 Launch

- ✅ 7 herramientas funcionando
- ✅ 85%+ unit test coverage
- ✅ Documentación completa
- ✅ 0 vulnerabilidades de seguridad
- ✅ <500ms respuesta promedio (con caché)

### Adopción

- Uso en 100+ sesiones de Claude en primer mes
- GitHub: 50+ stars
- npm downloads: 500+/mes

## Roadmap Futuro

### v1.1 (Trimestre 2)

- [ ] Soporte 2FA con TOTP
- [ ] Exportar progreso a CSV/JSON
- [ ] Sincronizar deadlines con Google Calendar
- [ ] Comparador de cursos lado a lado
- [ ] Análisis de skills adquiridas vs objetivo

### v2.0 (Trimestre 3-4)

- [ ] Dashboard web de progreso
- [ ] ML-based recomendaciones
- [ ] Integración con FC Barcelona calendar (ya mapeado con Freddy)
- [ ] Sync con HackerRank/LeetCode
- [ ] Notificaciones de deadlines inminentes

### v2.1+

- [ ] Análisis de carrera profesional
- [ ] Planificador de aprendizaje (basado en objetivos)
- [ ] Comunidad: compartir logros, badges
- [ ] API pública para integraciones de terceros

## Instalación Rápida (Post-Launch)

```bash
# 1. Instalar
npm install -g coursera-mcp

# 2. Configurar
coursera-mcp init  # Guía interactiva

# 3. Configurar Claude Desktop
# Editar ~/.claude/claude.json:
{
  "mcpServers": {
    "coursera": {
      "command": "coursera-mcp",
      "args": ["--stdio"]
    }
  }
}

# 4. ¡Listo! En Claude: "search_courses('Python')"
```

## Preguntas Clave (ACTUALIZADAS)

1. **✅ Autenticación TOTP**: ¿Aceptas usar Google Authenticator/1Password para 2FA en lugar de email/password?**
   - **CAMBIO v1.0**: TOTP es REQUERIDO, no email/password
   - Más seguro, sin guardar credenciales
   - User-friendly con apps como Google Authenticator

2. **✅ Caché TTL**: 24h público, 1h privado. ¿Suficiente o necesitas más frecuencia?**
   - Stale-while-revalidate asegura datos recientes en background
   - Puede ajustarse por tipo de herramienta

3. **✅ Google Calendar Sync**: ¿Priorizar en v1.0 o puede esperar a v1.1?**
   - Roadmap v1.1, bajo prioridad para launch

4. **✅ Exportar Progreso**: ¿Necesitas CSV para análisis (como Fintual)?**
   - Roadmap v1.1, estructura lista

5. **✅ Skills Analysis**: ¿Deseas análisis de skills adquiridas vs objetivos?**
   - v2.0, bajo prioridad para launch

## Próximos Pasos

### Esta semana
- [ ] Revisar este análisis y diseño
- [ ] Ajustes basados en feedback
- [ ] Crear repo GitHub
- [ ] Iniciar Fase 1

### Semana siguiente
- [ ] Implementar tipos TypeScript
- [ ] Setup MCP server base
- [ ] HTTP client con retry logic
- [ ] Sistema de caché

### Sprint 1 (Semanas 3-4)
- [ ] Herramientas públicas funcionando
- [ ] E2E tests
- [ ] Documentación

### Sprint 2 (Semanas 5-6)
- [ ] Autenticación completa
- [ ] Herramientas privadas
- [ ] Manejo de sesiones

### Pre-launch (Semana 7)
- [ ] Polish, logging, tests
- [ ] README + ejemplos
- [ ] CI/CD setup
- [ ] Publicar en npm

**Timeline REVISADO**: **7-9 semanas** (vs original 5-7 semanas)
- Inversión adicional: +11 días en seguridad + robustez
- **Distribución**: 3w + 2w + 1w + 2w (fases)
- **Dedicación**: 12-15h/semana (paralelo a otros proyectos)

## 📚 Documentación (Actualizada Abril 2026)

### Análisis y Diseño
- **`coursera-mcp-design.md`** - Análisis completo (requisitos, arquitectura, tools)
- **`ANALYSIS_AND_RECOMMENDATIONS.md`** - Análisis de mejoras + recomendaciones detalladas

### Implementación
- **`IMPLEMENTATION_GUIDE.md`** - Guía paso a paso para desarrollo (NEW)
- **`TESTING_STRATEGY.md`** - Estrategia de testing (unit/integration/e2e) (NEW)
- **`SECURITY.md`** - TOTP 2FA, encriptación, mitigación de riesgos (NEW)

### Usuario Final
- **`coursera-mcp-README.md`** - Documentación para usuarios finales
- **`coursera-mcp-config.json`** - package.json, tsconfig.json, .env.example

### Código Base
- **`coursera-mcp-types.ts`** - Tipos TypeScript + Zod schemas (actualizado)
- **`coursera-mcp-implementation.ts`** - Código inicial + circuit breaker (actualizado)

## Conclusión

El MCP de Coursera es un proyecto **altamente viable** que:

1. **Toca el sweet spot**: Busca + detalles públicos (simple) + progreso autenticado (seguro)
2. **Usa tech conocida**: TypeScript + Node.js + axios (tu stack)
3. **Escalable**: Arquitectura de servicios, caché, retry logic
4. **Segura**: Credenciales protegidas, sesiones encriptadas
5. **Testeable**: 80%+ coverage factible
6. **Documentada**: Esta guía es completa

**Timeline realista**: 5-7 semanas a dedicación parcial (~10-15h/semana)

**¿Listo para empezar?** 🚀
