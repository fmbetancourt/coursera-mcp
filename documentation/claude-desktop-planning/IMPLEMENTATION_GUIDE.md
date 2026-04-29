# Guía de Implementación: Coursera MCP

**Versión**: 1.0  
**Fecha**: Abril 2026  
**Estado**: Pre-implementación - Ready to Code

---

## 1. Preparación del Entorno

### 1.1 Stack de Desarrollo

```bash
# Node.js 18+ (recomendado 20.x)
node --version  # v20.x.x

# bun como package manager
curl -fsSL https://bun.sh/install | bash  # Install bun
bun --version  # 1.x.x

# GitHub (crear repo)
git clone https://github.com/yourusername/coursera-mcp.git
cd coursera-mcp
```

### 1.2 Inicializar Proyecto

```bash
# 1. Crear estructura base
mkdir -p src/{types,services,tools,utils} tests/{unit,integration,fixtures}

# 2. Crear archivos de configuración
cat > package.json << 'EOF'
{
  "name": "coursera-mcp",
  "version": "0.1.0",
  "description": "MCP server integrating Coursera with Claude",
  "main": "dist/index.js",
  "type": "module",
  "engines": {
    "node": ">=18.0.0",
    "bun": ">=1.0.0"
  },
  "scripts": {
    "build": "tsc && esbuild src/index.ts --bundle --platform=node --outfile=dist/index.js",
    "dev": "tsc --watch",
    "test": "bun test",
    "test:unit": "bun test --filter '*.unit.test.ts'",
    "test:integration": "bun test --filter '*.integration.test.ts'",
    "test:coverage": "bun test --coverage",
    "lint": "eslint src --ext .ts --fix",
    "type-check": "tsc --noEmit"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.24.0",
    "axios": "^1.7.0",
    "cheerio": "^1.0.0-rc.12",
    "dotenv": "^16.4.0",
    "fs-extra": "^11.2.0",
    "speakeasy": "^2.0.0",
    "winston": "^3.11.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "eslint": "^8.56.0",
    "prettier": "^3.2.0",
    "typescript": "^5.4.0",
    "vitest": "^1.2.0",
    "nock": "^13.5.0",
    "esbuild": "^0.20.0"
  }
}
EOF

# 3. TypeScript configuration
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020"],
    "moduleResolution": "node",
    "resolveJsonModule": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "tests"]
}
EOF

# 4. Instalar dependencias
bun install
```

---

## 2. Fase 1: Tipos y Utilidades (Semanas 1-2)

### 2.1 Crear Tipos Base

**src/types/schemas.ts** (Zod schemas para validación runtime)
```typescript
import { z } from 'zod'

export const CourseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string(),
  description: z.string().optional(),
  duration: z.number().positive().optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  language: z.string().optional(),
  rating: z.number().min(0).max(5).optional(),
  enrollments: z.number().int().non_negative().optional(),
  instructors: z.array(z.object({
    id: z.string(),
    name: z.string()
  })).optional(),
  hasFreeCertificate: z.boolean().optional()
})

export type Course = z.infer<typeof CourseSchema>

// ... más schemas para Program, User, Progress, etc.
```

**src/types/errors.ts** (Discriminated unions)
```typescript
export type CourseraError = 
  | { type: 'NETWORK_ERROR'; message: string; retries: number }
  | { type: 'AUTH_ERROR'; code: 'INVALID_CREDENTIALS' | 'EXPIRED_SESSION'; message: string }
  | { type: 'VALIDATION_ERROR'; field: string; message: string }
  | { type: 'RATE_LIMIT'; resetAt: Date }
  | { type: 'SERVICE_UNAVAILABLE'; message: string }

export class CourseraException extends Error {
  constructor(
    public error: CourseraError,
    message?: string
  ) {
    super(message || error.message)
    this.name = 'CourseraException'
  }
}

// Custom error classes
export class NotFoundError extends CourseraException {}
export class AuthenticationError extends CourseraException {}
export class ValidationError extends CourseraException {}
```

### 2.2 Crear Utilidades Básicas

**src/utils/logger.ts** (Winston logger configurado)
```typescript
import winston from 'winston'
import fs from 'fs-extra'
import path from 'path'

const homeDir = process.env.HOME || process.env.USERPROFILE || ''
const logDir = path.join(homeDir, '.coursera-mcp')

fs.ensureDirSync(logDir)

export const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'coursera-mcp' },
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, 'error.log'),
      level: 'error'
    }),
    new winston.transports.File({
      filename: path.join(logDir, 'combined.log')
    })
  ]
})

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }))
}
```

**src/utils/retry.ts** (Exponential backoff)
```typescript
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: {
    maxAttempts?: number
    initialDelay?: number
    maxDelay?: number
  } = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    initialDelay = 1000,
    maxDelay = 10000
  } = options
  
  let lastError: Error | null = null
  
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (err) {
      lastError = err as Error
      
      if (attempt < maxAttempts - 1) {
        const delay = Math.min(
          initialDelay * Math.pow(2, attempt),
          maxDelay
        )
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }
  
  throw lastError
}
```

**src/utils/circuitBreaker.ts** (Patrón circuit breaker)
```typescript
export type CircuitState = 'closed' | 'open' | 'half-open'

export class CircuitBreaker<T> {
  private state: CircuitState = 'closed'
  private failures = 0
  private lastFailureTime: number | null = null
  
  constructor(
    private failureThreshold: number = 5,
    private successThreshold: number = 2,
    private resetTimeout: number = 60_000
  ) {}
  
  async execute(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime || 0) > this.resetTimeout) {
        this.state = 'half-open'
      } else if (fallback) {
        return fallback()
      } else {
        throw new Error('Circuit breaker is OPEN')
      }
    }
    
    try {
      const result = await fn()
      this.onSuccess()
      return result
    } catch (err) {
      this.onFailure()
      throw err
    }
  }
  
  private onSuccess() {
    this.failures = 0
    if (this.state === 'half-open') {
      this.state = 'closed'
    }
  }
  
  private onFailure() {
    this.failures++
    this.lastFailureTime = Date.now()
    
    if (this.failures >= this.failureThreshold) {
      this.state = 'open'
    }
  }
  
  getState() {
    return this.state
  }
}
```

### 2.3 Escribir Tests Unitarios

Para cada servicio/utilidad, crear su archivo `.unit.test.ts` correspondiente usando los ejemplos de `TESTING_STRATEGY.md`.

```bash
# Crear fixtures
touch tests/fixtures/index.ts

# Crear tests unitarios
touch tests/unit/services/{courseraClient,cache,auth,parser}.unit.test.ts
touch tests/unit/utils/{retry,circuitBreaker}.unit.test.ts

# Ejecutar tests
bun test:unit
```

---

## 3. Fase 2: Servicios Core (Semana 2)

### 3.1 HTTP Client con Autenticación

**src/services/courseraClient.ts**
```typescript
import axios, { AxiosInstance, AxiosError } from 'axios'
import { withRetry } from '@/utils/retry'
import { CircuitBreaker } from '@/utils/circuitBreaker'
import { logger } from '@/utils/logger'

export class CourseraClient {
  private axiosInstance: AxiosInstance
  private sessionToken: string | null = null
  private circuitBreaker: CircuitBreaker<any>
  
  constructor(baseURL = 'https://www.coursera.org') {
    this.axiosInstance = axios.create({
      baseURL,
      timeout: 10_000
    })
    
    this.circuitBreaker = new CircuitBreaker(
      5,    // failureThreshold
      2,    // successThreshold
      60000 // resetTimeout (1 min)
    )
    
    this.setupInterceptors()
  }
  
  private setupInterceptors() {
    this.axiosInstance.interceptors.request.use(config => {
      if (this.sessionToken) {
        config.headers.Authorization = `Bearer ${this.sessionToken}`
      }
      return config
    })
  }
  
  setSessionToken(token: string) {
    this.sessionToken = token
  }
  
  async get<T>(url: string, config?: any): Promise<T> {
    return this.circuitBreaker.execute(
      () => withRetry(
        () => this.axiosInstance.get(url, config),
        { maxAttempts: 3 }
      ).then(res => res.data),
      () => Promise.resolve(null) // Fallback: null si circuit open
    )
  }
  
  // ... métodos POST, PUT, DELETE
}
```

### 3.2 Sistema de Caché

**src/services/cache.ts**
```typescript
import fs from 'fs-extra'
import path from 'path'

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number
}

export class CacheService {
  private memory = new Map<string, CacheEntry<any>>()
  private diskPath: string
  
  constructor() {
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    this.diskPath = path.join(homeDir, '.coursera-mcp', 'cache')
    fs.ensureDirSync(this.diskPath)
    
    // Cargar caché del disco al iniciar
    this.loadFromDisk()
  }
  
  set<T>(key: string, data: T, ttl: number) {
    this.memory.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    })
    
    // Guardar a disco para persistencia
    const filename = this.hashKey(key)
    fs.writeJsonSync(
      path.join(this.diskPath, filename),
      { data, timestamp: Date.now(), ttl }
    )
  }
  
  get<T>(key: string): T | null {
    const entry = this.memory.get(key)
    if (!entry) return null
    
    if (this.isExpired(entry)) {
      this.memory.delete(key)
      return null
    }
    
    return entry.data
  }
  
  getStale<T>(key: string): { data: T; isStale: boolean } | null {
    const entry = this.memory.get(key)
    if (!entry) return null
    
    return {
      data: entry.data,
      isStale: this.isExpired(entry)
    }
  }
  
  async getWithStaleCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    ttl: number
  ): Promise<T> {
    const cached = this.get<T>(key)
    if (cached) return cached
    
    const stale = this.getStale<T>(key)
    if (stale?.isStale) {
      // Servir stale, refetch en background
      fetcher()
        .then(data => this.set(key, data, ttl))
        .catch(err => logger.warn(`Background fetch failed for ${key}:`, err))
      
      return stale.data
    }
    
    // Sin caché: fetch normal
    const data = await fetcher()
    this.set(key, data, ttl)
    return data
  }
  
  private isExpired(entry: CacheEntry<any>): boolean {
    return Date.now() - entry.timestamp > entry.ttl
  }
  
  private hashKey(key: string): string {
    return Buffer.from(key).toString('hex')
  }
  
  private loadFromDisk() {
    // Cargar archivos de caché en memoria
  }
  
  clear() {
    this.memory.clear()
  }
}
```

### 3.3 Autenticación con TOTP

**src/services/auth.ts**
```typescript
import speakeasy from 'speakeasy'
import crypto from 'crypto'
import fs from 'fs-extra'
import path from 'path'
import { CourseraClient } from './courseraClient'
import { logger } from '@/utils/logger'

export class AuthService {
  private sessionsPath: string
  private encryptionKey: Buffer | null = null
  
  constructor(private client: CourseraClient) {
    const homeDir = process.env.HOME || process.env.USERPROFILE || ''
    this.sessionsPath = path.join(homeDir, '.coursera-mcp', 'sessions.json')
    fs.ensureDirSync(path.dirname(this.sessionsPath))
  }
  
  async initiateLogin(email: string, password: string) {
    try {
      // POST credenciales a Coursera
      const response = await this.client.post('/api/auth/login', {
        email,
        password
      })
      
      if (response.totpRequired) {
        return {
          sessionId: response.sessionId,
          totpRequired: true
        }
      }
      
      // Si no requiere TOTP, retornar token directamente
      return {
        sessionToken: response.sessionToken,
        refreshToken: response.refreshToken
      }
    } catch (err) {
      logger.error('Login initiation failed', { error: err })
      throw err
    }
  }
  
  async verifyTOTP(sessionId: string, totpCode: string, secret?: string) {
    // Validar TOTP code
    if (!this.isValidTOTPCode(secret || '', totpCode)) {
      throw new Error('Invalid TOTP code')
    }
    
    // POST código TOTP a Coursera
    const response = await this.client.post('/api/auth/totp-verify', {
      sessionId,
      totpCode
    })
    
    return {
      sessionToken: response.sessionToken,
      refreshToken: response.refreshToken,
      expiresIn: response.expiresIn
    }
  }
  
  private isValidTOTPCode(secret: string, code: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 2 // Permitir código anterior/siguiente
    })
  }
  
  encryptSessionToken(token: string): string {
    if (!this.encryptionKey) throw new Error('Encryption key not set')
    
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv)
    
    let encrypted = cipher.update(token, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return Buffer.from(
      JSON.stringify({
        iv: iv.toString('hex'),
        encrypted,
        authTag: authTag.toString('hex')
      })
    ).toString('base64')
  }
  
  decryptSessionToken(encrypted: string): string {
    if (!this.encryptionKey) throw new Error('Encryption key not set')
    
    const { iv, encrypted: ciphertext, authTag } = JSON.parse(
      Buffer.from(encrypted, 'base64').toString('utf8')
    )
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'hex')
    )
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
  
  saveSession(email: string, session: any) {
    const encrypted = this.encryptSessionToken(session.sessionToken)
    
    const sessions = fs.readJsonSync(this.sessionsPath, { throws: false }) || { sessions: [] }
    
    sessions.sessions = sessions.sessions.filter((s: any) => s.email !== email)
    sessions.sessions.push({
      email,
      sessionToken: encrypted,
      refreshToken: encrypted,
      expiresAt: new Date(Date.now() + session.expiresIn * 1000).toISOString(),
      lastRefreshed: new Date().toISOString()
    })
    
    fs.writeJsonSync(this.sessionsPath, sessions, { mode: 0o600 })
  }
  
  loadSession(email: string): any | null {
    try {
      const sessions = fs.readJsonSync(this.sessionsPath)
      return sessions.sessions.find((s: any) => s.email === email)
    } catch {
      return null
    }
  }
}
```

---

## 4. Fase 3-4: Tools y Polish

### 4.1 Implementar Tools

Para cada herramienta (search_courses, get_enrolled_courses, etc.):

**src/tools/search.ts**
```typescript
import { CourseraClient } from '@/services/courseraClient'
import { CacheService } from '@/services/cache'
import { CourseSchema } from '@/types/schemas'
import { logger } from '@/utils/logger'

export async function searchCourses(
  client: CourseraClient,
  cache: CacheService,
  query: string,
  options?: any
) {
  const cacheKey = `search:${query}:${JSON.stringify(options)}`
  
  try {
    const cached = cache.get(cacheKey)
    if (cached) {
      logger.debug('Search results from cache', { query })
      return cached
    }
    
    const result = await cache.getWithStaleCache(
      cacheKey,
      () => client.get('/api/courses', { params: { q: query, ...options } }),
      24 * 3600_000 // 24 horas
    )
    
    // Validar y parsear resultados
    const courses = result.courses.map(c => CourseSchema.parse(c))
    
    return {
      courses,
      total: result.total,
      hasMore: result.hasMore
    }
  } catch (err) {
    logger.error('Search failed', { query, error: err })
    throw err
  }
}
```

### 4.2 Crear MCP Server

**src/index.ts**
```typescript
import { Server } from '@anthropic-ai/sdk/lib/resources/messages/mcp'
import { CourseraClient } from './services/courseraClient'
import { CacheService } from './services/cache'
import { searchCourses } from './tools/search'
import { logger } from './utils/logger'

const server = new Server({
  name: 'coursera-mcp',
  version: '0.1.0'
})

const courseraClient = new CourseraClient()
const cache = new CacheService()

// Registrar tools
server.setRequestHandler('tools/search_courses', async (request) => {
  const { query, ...options } = request.params
  return await searchCourses(courseraClient, cache, query, options)
})

// ... registrar más tools

server.start()
```

### 4.3 Setup CI/CD

Crear `.github/workflows/ci.yml` basado en `TESTING_STRATEGY.md`.

---

## 5. Checklist de Implementación

### Semana 1-2 (Fase 1)
- [ ] Tipos y schemas TypeScript
- [ ] Utilidades base (logger, retry, circuit breaker)
- [ ] Tests unitarios (70+ unit tests)
- [ ] CI/CD básico

### Semana 2-3 (Fase 2)
- [ ] HTTP Client + Caché
- [ ] Autenticación TOTP
- [ ] Tests de integración

### Semana 3-5 (Fase 3-4)
- [ ] Tools públicos y privados
- [ ] MCP server
- [ ] Tests E2E
- [ ] Documentación

### Semana 5-7 (Polish)
- [ ] GitHub Actions completo
- [ ] npm publish
- [ ] Integration con Claude Desktop

---

**Guía paso a paso lista para implementación. Comenzar con Fase 1.**
