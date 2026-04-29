# MCP Coursera: Análisis y Diseño de Solución

## 1. Análisis de Requisitos

### 1.1 Requisitos Funcionales

| ID | Requisito | Prioridad | Descripción |
|---|---|---|---|
| RF-1 | Búsqueda de cursos | Alta | Buscar cursos por nombre, categoría, idioma, nivel de dificultad |
| RF-2 | Obtener mis cursos | Alta | Listar cursos inscritos con estado de progreso |
| RF-3 | Detalles de curso | Alta | Obtener información completa de un curso (sílabo, duración, certificado) |
| RF-4 | Obtener programas | Alta | Buscar y listar programas (specializations, degrees) |
| RF-5 | Progreso en curso | Alta | Obtener % completado, últimas lecciones, tareas pendientes |
| RF-6 | Certificados | Media | Listar certificados completados y estado de los actuales |
| RF-7 | Recomendaciones | Media | Obtener cursos recomendados basado en historial |
| RF-8 | Filtros avanzados | Media | Filtrar por duración, evaluación, institución, idioma |

### 1.2 Requisitos No Funcionales

- **Autenticación**: Login con credenciales de Coursera (email/password) o reutilizar sesión existente
- **Rate limiting**: Respetar límites de API de Coursera (~100 req/min)
- **Caché**: Implementar caché local para reducir latencia (cursos: 24h, progreso: 1h)
- **Parsing**: Manejar cambios en estructura HTML/JSON de Coursera
- **Error handling**: Reintentos automáticos, mensajes claros al usuario
- **Seguridad**: No almacenar credenciales en disco, usar variables de entorno

### 1.3 Casos de Uso Principales

```
UC-1: Buscar un curso específico
  Actor: Usuario de Claude
  Flujo:
    1. Usuario invoca tool "search_courses" con nombre/categoría
    2. MCP busca en caché (sino, hace request a API)
    3. Retorna lista con título, descripción, institución, duración, rating
    
UC-2: Obtener progreso en mis cursos
  Actor: Usuario autenticado
  Flujo:
    1. Usuario invoca tool "get_enrolled_courses"
    2. MCP autentica con sesión guardada
    3. Retorna cursos inscritos con % completado, lecciones vistas, próximas tareas
    
UC-3: Explorar un programa (specialization)
  Actor: Usuario de Claude
  Flujo:
    1. Usuario invoca tool "get_program_details" con ID
    2. MCP obtiene estructura del programa (cursos que lo componen)
    3. Retorna cursos en secuencia, prerrequisitos, tiempo total, certificado
```

---

## 2. Arquitectura de la Solución

### 2.1 Stack Tecnológico

```
├── Lenguaje: TypeScript (Node.js 18+)
├── Runtime: Node.js
├── MCP Framework: @anthropic-ai/sdk (MCP protocol)
├── HTTP Client: axios o node-fetch con retry logic
├── Parsing: cheerio (para HTML) + parser de JSON
├── Storage: fs-extra (caché en disco local)
├── Config: dotenv (variables de entorno)
└── Testing: vitest + nock (mocking HTTP)
```

### 2.2 Estructura del Proyecto

```
coursera-mcp/
├── src/
│   ├── index.ts                 # Punto de entrada MCP
│   ├── types/
│   │   ├── coursera.ts          # Tipos de Coursera (Course, Program, User)
│   │   ├── cache.ts             # Tipos de caché
│   │   └── mcp.ts               # Tipos de herramientas MCP
│   ├── services/
│   │   ├── courseraClient.ts    # HTTP client con autenticación
│   │   ├── parser.ts            # Parsers de respuestas
│   │   ├── cache.ts             # Lógica de caché
│   │   └── auth.ts              # Manejo de sesiones
│   ├── tools/
│   │   ├── search.ts            # search_courses, search_programs
│   │   ├── enrolled.ts          # get_enrolled_courses, get_progress
│   │   ├── details.ts           # get_course_details, get_program_details
│   │   └── recommendations.ts   # get_recommendations
│   └── utils/
│       ├── logger.ts            # Logging
│       ├── retry.ts             # Retry logic con exponential backoff
│       └── errors.ts            # Clases de error personalizadas
├── tests/
│   ├── services/
│   ├── tools/
│   └── fixtures/
├── .env.example
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

### 2.3 Flujo de Datos

```
[Claude] → [MCP Server] → [Tool Handler] 
                          ↓
                      [Caché válido?]
                      ↙           ↘
                   Si              No
                   ↓               ↓
              [Retorna]    [HTTP Request]
                          ↓
                     [Parse Response]
                     ↓
                  [Actualizar Caché]
                     ↓
                  [Retorna a Claude]
```

---

## 3. Especificación de Herramientas (Tools)

### 3.1 search_courses

**Propósito**: Buscar cursos en Coursera por keywords, categoría, idioma

**Parámetros**:

```typescript
{
  query: string                 // "Python", "Machine Learning"
  category?: string            // "computer-science", "business"
  language?: string            // "es", "en"
  level?: string              // "beginner", "intermediate", "advanced"
  sortBy?: string             // "relevance", "popularity", "rating"
  limit?: number              // 1-50 (default: 20)
}
```

**Respuesta**:

```typescript
{
  results: [
    {
      id: string
      name: string
      description: string
      institution: string
      rating: number            // 4.5
      enrollments: number       // 150,000
      duration: string          // "4 weeks"
      level: string
      language: string
      url: string
      hasFreeCertificate: boolean
    }
  ],
  total: number
  hasMore: boolean
}
```

**Caché**: 24 horas (key: `search:${query}:${category}:${language}`)

---

### 3.2 get_enrolled_courses

**Propósito**: Obtener lista de cursos en los que estoy inscrito

**Parámetros**:

```typescript
{
  includeProgress?: boolean    // default: true
  includeUpcoming?: boolean    // default: false
  sortBy?: string             // "enrollmentDate", "progress", "name"
}
```

**Respuesta**:

```typescript
{
  courses: [
    {
      id: string
      name: string
      institution: string
      enrollmentDate: string    // ISO date
      completionDate?: string
      progress: {
        percent: number         // 0-100
        coursesCompleted: number
        lastAccessedDate: string
        nextDeadline?: string
        currentWeek?: number
      },
      status: "in-progress" | "completed" | "dropped"
      certificateStatus: "earned" | "in-progress" | "none"
    }
  ],
  totalEnrolled: number
  completedCount: number
}
```

**Caché**: 1 hora (requiere autenticación, key: `enrolled:${userId}`)

**Autenticación requerida**: Sí

---

### 3.3 get_course_details

**Propósito**: Obtener información completa de un curso

**Parámetros**:

```typescript
{
  courseId: string             // ID o slug del curso
}
```

**Respuesta**:

```typescript
{
  id: string
  name: string
  description: string
  instructors: [
    {
      name: string
      institution: string
      bio?: string
    }
  ],
  institution: string
  rating: number
  enrollments: number
  duration: string             // "4 weeks, 3-5 hours per week"
  level: string
  language: string
  prerequisites: string[]
  skills: string[]             // ["Python", "Data Analysis", ...]
  syllabus: [
    {
      week: number
      title: string
      description: string
      topics: string[]
    }
  ],
  assessments: [
    {
      type: string             // "quiz", "assignment", "exam"
      weight: number           // 20 (%)
    }
  ],
  certificate: {
    included: boolean
    details: string
  },
  url: string
}
```

**Caché**: 24 horas (key: `course:${courseId}`)

---

### 3.4 get_program_details

**Propósito**: Obtener estructura completa de un programa (specialization, degree)

**Parámetros**:

```typescript
{
  programId: string            // ID o slug
  type?: string               // "specialization" | "degree" (default: ambos)
}
```

**Respuesta**:

```typescript
{
  id: string
  name: string
  type: "specialization" | "degree" | "professional-certificate"
  description: string
  institution: string
  rating: number
  enrollments: number
  courses: [
    {
      position: number         // 1, 2, 3...
      courseId: string
      name: string
      duration: string
      isCapstone: boolean
    }
  ],
  totalDuration: string        // "3 months"
  capstone?: {
    name: string
    description: string
  },
  certificate: {
    included: boolean
    shareable: boolean
  },
  price: {
    currency: string
    amount: number
    isFree: boolean
  },
  url: string
}
```

**Caché**: 24 horas (key: `program:${programId}`)

---

### 3.5 get_progress

**Propósito**: Obtener estado detallado de un curso inscrito

**Parámetros**:

```typescript
{
  courseId: string
}
```

**Respuesta**:

```typescript
{
  courseId: string
  courseName: string
  enrollmentDate: string
  progress: {
    percent: number
    currentWeek: number
    totalWeeks: number
  },
  completion: [
    {
      week: number
      lecturesWatched: number
      lecturesTotal: number
      quizzesCompleted: number
      quizzesTotal: number
      assignmentSubmitted: boolean
      assignmentGraded: boolean
      assignmentScore?: number
    }
  ],
  upcomingDeadlines: [
    {
      type: string             // "quiz", "assignment", "exam"
      name: string
      dueDate: string          // ISO date
      daysRemaining: number
    }
  ],
  certificateStatus: "earned" | "in-progress" | "requirements-pending" | "none"
  certificateEarnedDate?: string
}
```

**Caché**: 1 hora (requiere autenticación, key: `progress:${courseId}`)

**Autenticación requerida**: Sí

---

### 3.6 search_programs

**Propósito**: Buscar programas (specializations, degrees)

**Parámetros**:

```typescript
{
  query: string                // "Data Science", "Business"
  type?: string               // "specialization" | "degree"
  institution?: string        // "Stanford", "MIT"
  sortBy?: string             // "relevance", "enrollment", "rating"
  limit?: number              // 1-50 (default: 20)
}
```

**Respuesta**: Similar a `search_courses`, pero con `courses: number` y `type`

**Caché**: 24 horas

---

### 3.7 get_recommendations

**Propósito**: Obtener recomendaciones personalizadas (requiere autenticación)

**Parámetros**:

```typescript
{
  basedOn?: string            // "enrollmentHistory" | "skills" | "careerGoal"
  limit?: number              // 1-20 (default: 10)
}
```

**Respuesta**:

```typescript
{
  recommendations: [
    {
      id: string
      name: string
      reason: string          // "Similar to courses you've taken"
      relevanceScore: number  // 0-100
      // ... otros campos de curso
    }
  ]
}
```

**Caché**: 6 horas (requiere autenticación)

**Autenticación requerida**: Sí

---

## 4. Autenticación y Manejo de Sesiones

### 4.1 Estrategia de Autenticación

**Opción A: Email + Password (con 2FA)**
- Pro: Acceso completo, incluye datos privados (progreso detallado)
- Contra: Requiere almacenamiento seguro, 2FA puede ser problema

**Opción B: OAuth2 (si Coursera lo soporta)**
- Pro: Más seguro, no almacena contraseñas
- Contra: Requiere setup adicional, cliente secreto

**Opción C: Cookies de sesión (navegador existente)**
- Pro: Reutiliza sesión activa, más seguro
- Contra: Funciona solo si hay navegador con sesión activa

**Recomendación**: Implementar **Opción A** (con validaciones) + **Opción C** (como fallback)

### 4.2 Implementación

```typescript
// .env
COURSERA_EMAIL=your@email.com
COURSERA_PASSWORD=encrypted_or_vault_reference
COURSERA_SESSION_COOKIE=optional_cookie

// auth.ts
class CourseraAuth {
  async login(): Promise<SessionToken>
  async validateSession(): Promise<boolean>
  async refreshSession(): Promise<SessionToken>
  async logout(): Promise<void>
}

// Guardará sesiones en: ~/.coursera-mcp/sessions.json
```

### 4.3 Endpoints de Autenticación

```
POST /api/auth/login
  - Body: { email, password }
  - Response: { sessionToken, expires, csrf }

POST /api/auth/logout
  - Headers: Authorization: Bearer {token}
  - Response: { success }

GET /api/me
  - Headers: Authorization: Bearer {token}
  - Response: { id, email, firstName, lastName, enrollmentCount }
```

---

## 5. Gestión de Caché

### 5.1 Estrategia de Caché

| Recurso | TTL | Clave | Condición |
|---------|-----|----|----|
| Búsqueda de cursos | 24h | `search:${query}:${filters}` | Pública |
| Detalles de curso | 24h | `course:${id}` | Pública |
| Programas | 24h | `program:${id}` | Pública |
| Mis cursos | 1h | `enrolled:${userId}` | Requiere auth |
| Progreso de curso | 1h | `progress:${userId}:${courseId}` | Requiere auth |
| Recomendaciones | 6h | `recommendations:${userId}` | Requiere auth |

### 5.2 Invalidación de Caché

```typescript
// Invalidar manualmente
cacheManager.invalidate("search:python:*")
cacheManager.invalidateLike("progress:*")

// Limpiar todo después de login
cacheManager.clear()

// Expiración automática basada en TTL
```

### 5.3 Ubicación del Caché

```
~/.coursera-mcp/
├── cache/
│   ├── search.json
│   ├── courses.json
│   ├── programs.json
│   └── enrolled.json
└── sessions.json
```

---

## 6. Manejo de Errores y Reintentos

### 6.1 Clasificación de Errores

```typescript
// AuthenticationError: Credenciales inválidas, sesión expirada
// NetworkError: Timeout, conexión rechazada
// RateLimitError: 429 Too Many Requests
// NotFoundError: 404 recurso no existe
// ValidationError: Parámetros inválidos
// ParsingError: No se pudo parsear respuesta
```

### 6.2 Estrategia de Reintentos

```
Reintento 1: Después de 1s
Reintento 2: Después de 2s
Reintento 3: Después de 4s
Máximo: 3 reintentos

Excepciones (sin reintentos):
  - 401 / 403 (auth)
  - 400 (validación)
  - 404 (no existe)
```

### 6.3 Mensajes de Error

```
❌ Network timeout después de 3 reintentos. Intenta de nuevo.
❌ Sesión expirada. Por favor, vuelve a iniciar sesión.
❌ Coursera está limitando las solicitudes. Espera 30 segundos.
❌ Curso no encontrado: "Python 101" (verifica el ID)
```

---

## 7. Parsing de Respuestas

### 7.1 Fuentes de Datos

**API REST** (JSON) - Preferida
- `/api/courses`
- `/api/me/enrolled`
- `/api/learnerState`

**HTML Scraping** (Fallback)
- Página del curso (sílabo, duración)
- Página de progreso (si no hay API)

### 7.2 Estrategia de Parsing

```typescript
// Intentar JSON primero
try {
  const data = JSON.parse(response);
  return parseJsonResponse(data);
} catch {
  // Fallback a HTML si la API cambió
  return parseHtmlResponse(response);
}
```

---

## 8. Plan de Implementación

### Fase 1: Fundamentos (Semana 1-2)

- [ ] Estructura base del proyecto (TypeScript, MCP setup)
- [ ] Tipos TypeScript completos
- [ ] HTTP client con retry logic
- [ ] Sistema de caché
- [ ] Autenticación básica (email/password)
- [ ] Tests unitarios para servicios

### Fase 2: Herramientas públicas (Semana 3)

- [ ] `search_courses`
- [ ] `search_programs`
- [ ] `get_course_details`
- [ ] `get_program_details`
- [ ] Integración con MCP server
- [ ] Tests E2E

### Fase 3: Herramientas autenticadas (Semana 4)

- [ ] `get_enrolled_courses`
- [ ] `get_progress`
- [ ] `get_recommendations`
- [ ] Manejo de sesiones
- [ ] Invalidación de caché post-login

### Fase 4: Polish y deployment (Semana 5)

- [ ] Logging estructurado
- [ ] Documentación API completa
- [ ] README con ejemplos de uso
- [ ] GitHub Actions para CI/CD
- [ ] Publicar en npm

---

## 9. Consideraciones de Seguridad

### 9.1 Almacenamiento de Credenciales

✅ **Hacer**:
- Usar variables de entorno (.env)
- Guardar sesiones en `~/.coursera-mcp/` con permisos 600
- Usar Node.js crypto para encriptar datos sensibles

❌ **No hacer**:
- Hardcodear credenciales en código
- Loguear contraseñas o tokens
- Enviar credenciales en recursos MCP

### 9.2 Manejo de Tokens

```typescript
// Token nunca aparece en logs
logger.info(`Sesión autenticada para ${email}`)  // ✅

// Encriptar token en reposo
const encrypted = encrypt(sessionToken)

// Token con expiración
const token = jwt.sign(payload, secret, { expiresIn: '24h' })
```

---

## 10. Pruebas

### 10.1 Cobertura

- Unit tests: Servicios, parsers, cache (80%+)
- Integration tests: HTTP client con mocks (70%+)
- E2E tests: Herramientas MCP completas

### 10.2 Testing con fixtures

```typescript
// tests/fixtures/courseMockData.ts
export const mockCourseResponse = {
  courseId: "test-course",
  name: "Python for Data Science",
  // ...
}

// tests/services/courseraClient.test.ts
nock('https://www.coursera.org')
  .get('/api/courses')
  .reply(200, mockCourseResponse)
```

---

## 11. Roadmap Futuro

### v1.0 MVP (Esta iteración)
- Búsqueda de cursos/programas
- Detalles completos
- Progreso en cursos inscritos

### v1.1 Características
- [ ] Integración con calendario (FC Barcelona fixtures + deadlines de cursos)
- [ ] Exportar progreso a CSV
- [ ] Comparar cursos lado a lado

### v2.0 Expansión
- [ ] Análisis de skills adquiridas vs. objetivo profesional
- [ ] Recomendaciones ML basadas en learning style
- [ ] Integración con LeetCode / HackerRank
- [ ] Dashboard web con visualización de progreso

---

## 12. Referencias y Recursos

### Documentación
- Coursera API: (requiere reverse engineering o acceso oficial)
- MCP Protocol: https://modelcontextprotocol.io/
- Node.js Best Practices: https://github.com/goldbergyoni/nodebestpractices

### Librerías
- `@anthropic-ai/sdk`: MCP framework
- `axios`: HTTP client con retry
- `cheerio`: HTML parsing
- `zod`: Validación de tipos en runtime
- `winston`: Logging
- `dotenv`: Configuración

### Similar Projects
- Twitter MCP, HackerNews MCP, Notion MCP (como referencia arquitectónica)
