# coursera-mcp

Servidor MCP para Coursera que permite buscar cursos, obtener progreso, explorar programas y más.

## Características

- **Búsqueda de cursos**: Por keywords, categoría, idioma, nivel
- **Mis cursos**: Listar inscritos con progreso detallado
- **Detalles**: Información completa (sílabo, instructores, certificado)
- **Programas**: Specializations, degrees, professional certificates
- **Progreso**: Estado actual, próximas tareas, deadlines
- **Recomendaciones**: Personalizadas basado en historial
- **Caché inteligente**: Reduce latencia y respeta rate limits

## Instalación

```bash
# Clonar repositorio
git clone https://github.com/tusuario/coursera-mcp.git
cd coursera-mcp

# Instalar dependencias con pnpm
pnpm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tus credenciales de Coursera
```

## Configuración

### Variables de entorno (.env)

```env
# Autenticación (requerido para herramientas privadas)
COURSERA_EMAIL=your@email.com
COURSERA_PASSWORD=your_password

# Opcional: Session cookie si ya tienes sesión activa
COURSERA_SESSION_COOKIE=value_here

# Directorio de caché
COURSERA_CACHE_DIR=~/.coursera-mcp

# Debug logging
DEBUG=coursera-mcp:*
```

## Uso con Claude

### Via Claude Desktop

```json
// ~/.claude/claude.json
{
  "mcpServers": {
    "coursera": {
      "command": "node",
      "args": ["/path/to/coursera-mcp/dist/index.js"]
    }
  }
}
```

### Via Claude CLI

```bash
claude mcp add --name coursera --command "node /path/to/coursera-mcp/dist/index.js"
```

## Herramientas Disponibles

### Públicas (sin autenticación)

#### `search_courses`
Buscar cursos en Coursera

```
search_courses(
  query: "Python Machine Learning",
  category: "computer-science",
  language: "es",
  level: "beginner",
  limit: 20
)
```

**Respuesta**:
```json
{
  "results": [
    {
      "id": "abc123",
      "name": "Machine Learning A-Z",
      "institution": "Kirill Eremenko",
      "rating": 4.5,
      "enrollments": 1500000,
      "duration": "22 hours",
      "level": "beginner",
      "url": "https://..."
    }
  ],
  "total": 45,
  "hasMore": true
}
```

#### `search_programs`
Buscar programas (specializations, degrees)

```
search_programs(
  query: "Data Science",
  type: "specialization",
  institution: "Stanford"
)
```

#### `get_course_details`
Detalles completos de un curso

```
get_course_details(courseId: "abc123")
```

**Respuesta**: Incluye sílabo, instructores, evaluaciones, certificado, etc.

#### `get_program_details`
Estructura de un programa

```
get_program_details(programId: "data-science-spec")
```

### Privadas (requieren autenticación)

#### `get_enrolled_courses`
Mis cursos inscritos

```
get_enrolled_courses(
  includeProgress: true,
  sortBy: "progress"
)
```

**Respuesta**:
```json
{
  "courses": [
    {
      "id": "course-1",
      "name": "Deep Learning Specialization",
      "enrollmentDate": "2024-01-15",
      "progress": {
        "percent": 65,
        "currentWeek": 3,
        "lastAccessedDate": "2024-12-10",
        "nextDeadline": "2024-12-20"
      },
      "status": "in-progress",
      "certificateStatus": "in-progress"
    }
  ],
  "totalEnrolled": 5,
  "completedCount": 2
}
```

#### `get_progress`
Estado detallado de un curso

```
get_progress(courseId: "abc123")
```

Incluye: semanas completadas, quizzes, assignments, próximas tareas, deadlines.

#### `get_recommendations`
Recomendaciones personalizadas

```
get_recommendations(
  basedOn: "enrollmentHistory",
  limit: 10
)
```

## Desarrollo

### Estructura del proyecto

```
src/
├── index.ts              # Punto de entrada MCP
├── types/
│   ├── coursera.ts       # Tipos de datos de Coursera
│   ├── mcp.ts           # Tipos de herramientas MCP
│   └── cache.ts         # Tipos de caché
├── services/
│   ├── courseraClient.ts # HTTP client
│   ├── parser.ts        # Parsers
│   ├── cache.ts         # Caché
│   └── auth.ts          # Autenticación
├── tools/
│   ├── search.ts        # search_courses, search_programs
│   ├── enrolled.ts      # get_enrolled_courses, get_progress
│   ├── details.ts       # get_course_details, get_program_details
│   └── recommendations.ts # get_recommendations
└── utils/
    ├── logger.ts        # Logging
    ├── retry.ts         # Retry logic
    └── errors.ts        # Errores personalizados
```

### Comandos útiles

```bash
# Desarrollo con watch mode
pnpm dev

# Build
pnpm build

# Tests
pnpm test
pnpm test:watch
pnpm test:coverage

# Lint
pnpm lint
pnpm format

# Tipo check
pnpm type-check

# Ver caché
pnpm cache:inspect

# Limpiar caché
pnpm cache:clear
```

### Debugging

```bash
# Ver logs detallados
DEBUG=coursera-mcp:* node dist/index.js

# Ver solo errores
DEBUG=coursera-mcp:error node dist/index.js

# Profiling HTTP requests
DEBUG=coursera-mcp:http node dist/index.js
```

## Arquitectura

```
[Claude] 
   ↓
[MCP Server] (Node.js + TypeScript)
   ├─ Tool Handlers
   ├─ Cache Manager (24h/1h/6h)
   └─ HTTP Client
        ├─ Retry logic (exponential backoff)
        ├─ Rate limiting
        └─ Session management
             ↓
        [Coursera APIs]
```

## Limites y Rate Limiting

- Límite API Coursera: ~100 requests/minuto
- Caché local reduce requests significativamente:
  - Cursos públicos: 24 horas
  - Progreso personal: 1 hora
  - Recomendaciones: 6 horas
- Si se alcanza rate limit: reintentos automáticos con backoff exponencial

## Seguridad

- Credenciales guardadas solo en `.env` (no en código)
- Sesiones encriptadas en `~/.coursera-mcp/sessions.json`
- No se logguean tokens ni contraseñas
- CSRF tokens manejados automáticamente

## Troubleshooting

### Error: "401 Unauthorized"
- Verifica que `COURSERA_EMAIL` y `COURSERA_PASSWORD` sean correctas
- Si tienes 2FA habilitado, puede ser un problema (en progreso)

### Error: "429 Too Many Requests"
- Estás siendo rate limitado por Coursera
- El MCP reintentará automáticamente con backoff
- Espera 30-60 segundos antes de reintentar

### Error: "Invalid cache directory"
- Asegúrate que `~/.coursera-mcp/` existe y es escribible
- Corre: `mkdir -p ~/.coursera-mcp && chmod 700 ~/.coursera-mcp`

### Error: "Failed to parse response"
- Coursera puede haber cambiado su estructura
- Abre un issue con la URL y la respuesta fallida

## Roadmap

### v1.0 (MVP actual)
- [x] Búsqueda pública de cursos/programas
- [x] Detalles de cursos/programas
- [x] Mis cursos y progreso (autenticado)
- [x] Recomendaciones básicas

### v1.1
- [ ] Soporte 2FA
- [ ] Exportar progreso a CSV/JSON
- [ ] Integración con calendario (deadlines)
- [ ] Comparador de cursos

### v2.0
- [ ] Dashboard web de progreso
- [ ] Análisis de skills
- [ ] Sync con Google Calendar
- [ ] Notificaciones de deadlines

## Contribuir

Las contribuciones son bienvenidas. Por favor:

1. Fork el repo
2. Crea una rama (`git checkout -b feature/mi-feature`)
3. Commit cambios (`git commit -m 'Add mi-feature'`)
4. Push a la rama (`git push origin feature/mi-feature`)
5. Abre un Pull Request

## Testing de cambios

```bash
# Testing local
pnpm build
DEBUG=coursera-mcp:* node dist/index.js

# Con ejemplos
node -e "
const { searchCourses } = require('./dist/tools/search');
searchCourses('Python', { limit: 5 }).then(console.log);
"
```

## License

MIT

## Autor

[Tu nombre]

## Contacto

- GitHub: [@tusuario](https://github.com/tusuario)
- Email: tu@email.com

---

**¿Problemas o sugerencias?** Abre un [issue](https://github.com/tusuario/coursera-mcp/issues)
