# 📚 Índice del Proyecto: Coursera MCP

**Versión**: 1.0 + Mejoras (Abril 2026)  
**Fecha**: Diciembre 2024 (Original) → Abril 2026 (Actualizado)  
**Estado**: 🚀 Ready for Implementation (Mejoras Integradas)  

---

## 🎯 Descripción Rápida

Construcción de un servidor **Model Context Protocol (MCP)** que integra Coursera con Claude, permitiendo:

- ✅ Búsqueda de cursos y programas
- ✅ Consulta de progreso en cursos inscritos
- ✅ Exploración de detalles (sílabos, instructores, certificados)
- ✅ Recomendaciones personalizadas
- ✅ Caché inteligente + reintentos automáticos
- ✅ Seguridad: credenciales protegidas, sesiones encriptadas

---

## 📖 Guía de Lectura

### Para entender rápido (15 minutos)
1. **Este archivo** (índice)
2. [`coursera-mcp-executive-summary.md`](#ejecutivo) - Resumen ejecutivo
3. Diagrama de arquitectura más abajo

### Para implementación técnica (1-2 horas)
1. [`coursera-mcp-design.md`](#análisis) - Especificación completa
2. [`coursera-mcp-types.ts`](#tipos) - Tipos TypeScript
3. [`coursera-mcp-implementation.ts`](#código) - Código inicial
4. [`coursera-mcp-config.json`](#configuración) - Setup del proyecto

### Para usuario final (después de launch)
1. [`coursera-mcp-README.md`](#documentación) - Instrucciones de instalación y uso

---

## 📂 Archivos Generados (ACTUALIZADO)

### 0. **Análisis de Mejoras (NUEVO)** {#mejoras}

📄 **`ANALYSIS_AND_RECOMMENDATIONS.md`** (15KB)
- Análisis detallado de 7 áreas de mejora críticas
- Comparación: plan original vs revisado
- Recomendaciones con código y timeline
- TOTP 2FA, circuit breaker, Zod validation
- Stale-while-revalidate cache pattern
- Checklist pre-implementación

**Secciones principales**:
- 1. Análisis de 7 áreas críticas
- 2. Soluciones detalladas con código
- 3. Timeline revisado (5-7w → 7-9w)
- 4. Ajustes al diseño (nuevos servicios)
- 5. Checklist pre-implementación

**Cuándo leer**: PRIMERO, después del índice

---

### 1. **Análisis y Diseño** {#análisis}

📄 **`coursera-mcp-design.md`** (15KB)
- Análisis de requisitos (RF y RNF)
- Arquitectura de solución (capas, flujo de datos)
- Especificación de 7 herramientas MCP con parámetros y respuestas
- Estrategia de autenticación y sesiones
- Gestión de caché (TTL, invalidación)
- Manejo de errores y reintentos
- Plan de implementación por fases (4 semanas)
- Consideraciones de seguridad
- Estrategia de testing

**Secciones principales**:
- 1. Análisis de Requisitos
- 2. Arquitectura de Solución
- 3. Especificación de Herramientas (7 tools detalladas)
- 4. Autenticación y Sesiones
- 5. Gestión de Caché
- 6. Manejo de Errores
- 7. Parsing de Respuestas
- 8. Plan de Implementación
- 9. Consideraciones de Seguridad
- 10. Pruebas
- 11. Roadmap Futuro
- 12. Referencias

**Cuándo leer**: Primero si necesitas entender toda la arquitectura

---

### 2. **Resumen Ejecutivo** {#ejecutivo}

📄 **`coursera-mcp-executive-summary.md`** (8KB)
- Visión general del proyecto
- Valor propuesto
- Stack tecnológico
- Implementación por fases (4 semanas)
- Herramientas a implementar (7 públicas + privadas)
- Ejemplos de flujo de datos
- Estrategia de testing
- Métricas de éxito
- Roadmap futuro (v1.1, v2.0, v2.1+)
- Preguntas clave para Freddy
- Próximos pasos

**Cuándo leer**: Para obtener visión de negocio y timeline

---

### 3. **Guías de Implementación** {#guías}

📄 **`IMPLEMENTATION_GUIDE.md`** (12KB) - NUEVO
- Instrucciones paso a paso para desarrollo
- Setup inicial (Node.js, pnpm, TypeScript)
- Fase 1: Tipos, utilidades, tests (2 semanas)
- Fase 2: Servicios core (HTTP, caché, auth)
- Fase 3-4: Tools y MCP server
- Checklist de implementación por semana

**Cuándo leer**: Durante implementación, como referencia

---

📄 **`TESTING_STRATEGY.md`** (14KB) - NUEVO
- Pirámide de pruebas (unit/integration/e2E)
- Ejemplos de tests con vitest + nock
- Coverage requirements por módulo
- CI/CD pipeline en GitHub Actions
- Best practices y antipatterns

**Cuándo leer**: Antes de escribir tests

---

📄 **`SECURITY.md`** (10KB) - NUEVO
- Autenticación TOTP 2FA (flujo completo)
- Encriptación AES-256 de session tokens
- Validación Zod para prevenir injection
- Sanitización de logs (sin tokens/emails)
- Rate limiting y circuit breaker
- Checklist de seguridad pre-release
- OWASP Top 10 mitigations

**Cuándo leer**: Antes de seguridad crítica

---

### 4. **Documentación para Usuarios** {#documentación}

📄 **`coursera-mcp-README.md`** (6KB)
- Características principales
- Instalación y configuración
- Variables de entorno
- Uso con Claude (Desktop y CLI)
- Especificación de cada herramienta con ejemplos
- Estructura del proyecto
- Comandos útiles de desarrollo
- Debugging
- Arquitectura (diagrama ASCII)
- Limites y rate limiting
- Seguridad
- Troubleshooting común
- Roadmap futuro
- Contribuciones

**Cuándo leer**: Después del launch, para usuarios finales

---

### 4. **Tipos TypeScript** {#tipos}

📄 **`coursera-mcp-types.ts`** (8KB)
- Tipos de dominio:
  - `Course` - Estructura completa de curso
  - `Program` - Specializations, degrees, certificates
  - `User` - Info de usuario
  - `EnrolledCourse` - Cursos inscritos
  - `DetailedProgress` - Progreso detallado
  - Y 20+ tipos más
- Tipos de caché, MCP, HTTP, config
- Clases de error personalizadas

**Estructura**:
```
src/types/
├── coursera.ts      // Tipos de dominio
├── cache.ts         // Tipos de caché
├── mcp.ts           // Tipos de herramientas MCP
├── http.ts          // Tipos de requests/responses
├── errors.ts        // Clases de error
└── config.ts        // Tipos de configuración
```

**Cuándo leer**: Para entender la estructura de datos

---

### 5. **Código Inicial** {#código}

📄 **`coursera-mcp-implementation.ts`** (12KB)
- `src/index.ts` - Punto de entrada MCP server
- `src/services/courseraClient.ts` - Cliente HTTP con retry logic
- `src/tools/search.ts` - Búsqueda de cursos y programas
- `src/tools/enrolled.ts` - Cursos inscritos y progreso
- `src/tools/details.ts` - Detalles de cursos y programas
- `src/tools/recommendations.ts` - Recomendaciones

**Características**:
- Manejo de errores con clases personalizadas
- Caché con TTL configurable
- Retry automático con exponential backoff
- Logging estructurado
- Validación de esquemas

**Cuándo leer**: Para empezar a implementar

---

### 6. **Configuración del Proyecto** {#configuración}

📄 **`coursera-mcp-config.json`** (5KB)
- **`package.json`** - Dependencias, scripts, metadata
- **`tsconfig.json`** - Configuración de TypeScript (strict mode)
- **`.env.example`** - Variables de entorno
- **`.eslintrc.json`** - Reglas de linting
- **`prettier.config.json`** - Formateo de código
- **`.gitignore`** - Archivos a ignorar

**Scripts principales**:
```bash
pnpm build          # Compilar TypeScript
pnpm dev            # Dev mode con watch
pnpm test           # Ejecutar tests
pnpm lint           # Linter + fix
pnpm type-check     # Verificar tipos
```

**Cuándo leer**: Al inicializar el proyecto

---

## 🏗️ Arquitectura Visual

```
┌─────────────────────────────────────────────┐
│              Claude Interface               │
│   (Desktop, Web, CLI)                       │
└────────────────────┬────────────────────────┘
                     │
              MCP Protocol
                     │
                     ↓
    ┌────────────────────────────────┐
    │     MCP Server (Node.js)       │
    │  ┌──────────────────────────┐  │
    │  │  Tool Handlers           │  │
    │  ├─ search_courses          │  │
    │  ├─ search_programs         │  │
    │  ├─ get_course_details      │  │
    │  ├─ get_program_details     │  │
    │  ├─ get_enrolled_courses    │  │
    │  ├─ get_progress            │  │
    │  └─ get_recommendations     │  │
    │  └──────────────────────────┘  │
    │  ┌──────────────────────────┐  │
    │  │  Cache Manager           │  │
    │  │  (Local disk, 24h/1h/6h) │  │
    │  └──────────────────────────┘  │
    │  ┌──────────────────────────┐  │
    │  │  HTTP Client             │  │
    │  │  - Retry Logic           │  │
    │  │  - Session Management    │  │
    │  └──────────────────────────┘  │
    └────────┬─────────────┬─────────┘
             │             │
             ↓             ↓
      ┌──────────────┐  ┌────────────────┐
      │  Coursera    │  │  Local Storage │
      │  REST APIs   │  │  ~/.coursera-  │
      │              │  │  mcp/          │
      │ - /api/      │  │  - cache/      │
      │   courses    │  │  - sessions.json
      │ - /api/      │  │                │
      │   programs   │  └────────────────┘
      │ - /api/me/   │
      │   enrolled   │
      │ - /api/      │
      │   progress   │
      └──────────────┘
```

---

## 🛠️ Herramientas MCP Especificadas

### Públicas (Sin Autenticación)

| # | Tool | Descripción | Caché |
|---|------|---|---|
| 1 | `search_courses` | Búsqueda de cursos (query, categoría, idioma, nivel) | 24h |
| 2 | `search_programs` | Búsqueda de programas (specialization, degree) | 24h |
| 3 | `get_course_details` | Info completa: sílabo, instructores, certificado | 24h |
| 4 | `get_program_details` | Estructura del programa y cursos | 24h |

### Privadas (Requieren Autenticación)

| # | Tool | Descripción | Caché |
|---|------|---|---|
| 5 | `get_enrolled_courses` | Mis cursos inscritos con progreso | 1h |
| 6 | `get_progress` | Estado detallado: semanas, quizzes, deadlines | 1h |
| 7 | `get_recommendations` | Cursos recomendados personalizados | 6h |

---

## 📅 Plan de Implementación (REVISADO)

### Fase 1: Fundamentos + Seguridad (Semana 1-3)
- ✅ Tipos TypeScript + **Zod schemas**
- ✅ HTTP client con retry + **circuit breaker**
- ✅ Sistema de caché + **stale-while-revalidate**
- ✅ **Autenticación TOTP 2FA** (no email/password)
- ✅ **Encriptación AES-256** para tokens
- ✅ Logger estructurado (Winston JSON)
- ✅ Tests unitarios (85%+ coverage)

### Fase 2: Herramientas Públicas + Testing (Semana 3-5)
- ✅ `search_courses` + `search_programs` (con Zod)
- ✅ `get_course_details` + `get_program_details`
- ✅ **Integration tests** (HTTP + cache + circuit breaker)
- ✅ **E2E tests** contra fixtures
- ✅ Integración MCP server

### Fase 3: Herramientas Privadas (Semana 5-6)
- ✅ `get_enrolled_courses`
- ✅ `get_progress`
- ✅ `get_recommendations`
- ✅ Session management robusto

### Fase 4: Polish + Release (Semana 6-9)
- ✅ **GitHub Actions con semantic-release**
- ✅ **Codecov integration** (85% minimum)
- ✅ **Security audit** (npm audit, OWASP)
- ✅ Documentación completa
- ✅ README + ejemplos + troubleshooting
- ✅ npm publish

**Timeline REVISADO**: **7-9 semanas** (vs original 5-7)
- Cambio: +11 días invertidos en seguridad + robustez
- Dedicación: 12-15h/semana
- Resultado: Production-ready desde v1.0

---

## 🔐 Seguridad

✅ **Implementado**:
- Credenciales en `.env` (nunca en código)
- Sesiones encriptadas en disco
- No loguear tokens/passwords
- CSRF tokens automáticos
- Validación de esquemas (zod)

⚠️ **Limitaciones**:
- 2FA no soportado en v1.0 (roadmap v1.1)
- OAuth2 requiere backend adicional
- Browser session reutilización como fallback

---

## 📊 Métricas de Éxito

### v1.0 Launch
- ✅ 7 herramientas funcionando
- ✅ 85%+ unit test coverage
- ✅ Documentación completa
- ✅ 0 vulnerabilidades
- ✅ <500ms respuesta promedio

### Adopción (3 meses)
- 100+ sesiones Claude en primer mes
- 50+ GitHub stars
- 500+ npm downloads/mes

---

## 🚀 Roadmap Futuro

### v1.1 (Trimestre 2)
- [ ] Soporte 2FA
- [ ] Exportar progreso a CSV
- [ ] Sync deadlines con Google Calendar
- [ ] Comparador de cursos

### v2.0 (Trimestre 3-4)
- [ ] Dashboard web
- [ ] ML-based recomendaciones
- [ ] Integración FC Barcelona calendar (para Freddy)
- [ ] Sync con HackerRank/LeetCode

### v2.1+
- [ ] Análisis de carrera profesional
- [ ] Planificador de aprendizaje
- [ ] Comunidad de usuarios
- [ ] API pública

---

## ❓ Preguntas Clave para Freddy

1. **¿Caché de 24h para cursos públicos es suficiente?**
   - Puede ajustarse según necesidad

2. **¿Syncear deadlines de Coursera con tu Google Calendar?**
   - Roadmap v1.1, pero puede priorizarse

3. **¿Exportar progreso para análisis (similar a Fintual CSV)?**
   - Roadmap v1.1

4. **¿Autenticación: email/password o browser session?**
   - Implementar ambas

5. **¿Análisis de skills adquiridas vs objetivos?**
   - v2.0, pero estructura lista

---

## 📚 Referencias

### Documentación Oficial
- MCP Protocol: https://modelcontextprotocol.io/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices
- TypeScript Handbook: https://www.typescriptlang.org/docs/

### Librerías Clave
- `@anthropic-ai/sdk` - MCP framework
- `axios` - HTTP client
- `zod` - Validación de tipos en runtime
- `winston` - Logging

### Proyectos Similares (Referencias)
- Twitter MCP
- HackerNews MCP
- Notion MCP
- (Arquitectura y patrones como referencia)

---

## 🎯 Próximos Pasos

### Ahora mismo
- [ ] Revisar este análisis y diseño
- [ ] Feedback de Freddy
- [ ] Ajustes basados en feedback
- [ ] Crear repo GitHub

### Esta semana
- [ ] Inicializar proyecto Node.js
- [ ] Copiar tipos TypeScript
- [ ] Setup CI/CD básico

### Próxima semana
- [ ] HTTP client con retry logic
- [ ] Sistema de caché
- [ ] Tests unitarios

### Semana 3
- [ ] Herramientas públicas
- [ ] MCP server integration
- [ ] E2E tests

---

## 📞 Contacto y Feedback

**Dudas sobre el análisis?** 
- Abre los documentos y busca la sección específica
- Usa Cmd+F para buscar términos clave

**Cambios en requisitos?**
- Actualizar `coursera-mcp-design.md` primero
- Luego ajustar tipos y código

**Listo para empezar implementación?**
- Copiar `coursera-mcp-types.ts` a `src/types/`
- Copiar `coursera-mcp-implementation.ts` a `src/`
- Instalar dependencias: `pnpm install`

---

## 📋 Checklist de Lectura (ACTUALIZADO)

### Para Entender Rápido (30 minutos)
- [ ] Este archivo (índice)
- [ ] `coursera-mcp-executive-summary.md` (5 min)
- [ ] `ANALYSIS_AND_RECOMMENDATIONS.md` - Sección 1 (resumen) (15 min)

### Para Implementación (2-3 horas)
- [ ] `IMPLEMENTATION_GUIDE.md` - Setup y Fase 1 (30 min)
- [ ] `TESTING_STRATEGY.md` - Entender pirámide de tests (30 min)
- [ ] `SECURITY.md` - Entender TOTP + encriptación (30 min)
- [ ] `ANALYSIS_AND_RECOMMENDATIONS.md` - Completo (30 min)

### Durante Desarrollo (Referencia)
- [ ] `coursera-mcp-design.md` - Especificación de tools
- [ ] `coursera-mcp-types.ts` - Estructuras de datos
- [ ] `coursera-mcp-implementation.ts` - Código inicial
- [ ] `coursera-mcp-config.json` - Configuración del proyecto

### Antes de Release
- [ ] `coursera-mcp-README.md` - Documentación usuario
- [ ] Checklist de seguridad en `SECURITY.md`
- [ ] Checklist de testing en `TESTING_STRATEGY.md`

---

## 🎯 Estado Actual

**Proyecto**: Coursera MCP  
**Estado**: ✅ Análisis + Diseño + **Mejoras Integradas**  
**Versión**: 1.0 (con optimizaciones Abril 2026)  
**Última actualización**: Abril 28, 2026

## 📊 Cambios Principales (Abril 2026)

| Aspecto | Cambio | Valor |
|---------|--------|-------|
| **Autenticación** | Email/password → TOTP 2FA | 🔒 Mayor seguridad |
| **Resiliencia** | Agregar circuit breaker | ⚡ Mejor UX |
| **Validación** | Agregar Zod runtime | 🛡️ API-safe |
| **Testing** | Expandir a integration/E2E | ✅ Mayor confianza |
| **Documentación** | +3 guías nuevas | 📚 Más completo |
| **Timeline** | 5-7 semanas → 7-9 semanas | 📅 Realista |

## 🚀 Próximos Pasos

1. **✅ Revisar** este análisis y documentación
2. **✅ Ajustar** según feedback
3. **🔜 Crear** repo GitHub
4. **🔜 Iniciar** Fase 1 (tipos + servicios core)

---

**¡Ready para implementación production-ready!** 🎓
