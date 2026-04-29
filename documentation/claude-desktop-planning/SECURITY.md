# Seguridad: Coursera MCP

**Versión**: 1.0  
**Fecha**: Abril 2026  
**Estado**: Pre-implementación

---

## 1. Estrategia de Autenticación

### 1.1 Cambio de v1.0: TOTP 2FA (CRÍTICO)

#### Problema
- Email/password almacenado en disco es riesgo de seguridad
- Pocas cuentas Coursera sin 2FA en 2026
- Browser session fallback es frágil

#### Solución: TOTP (Time-Based One-Time Password)

**Flujo de Configuración Inicial**:
```
$ coursera-mcp init

1. Solicitar email
   └─ ¿Email? freddy.moreno@gmail.com

2. Solicitar contraseña (sesión única, no guardada)
   └─ ¿Contraseña? ••••••••
   
3. Detectar 2FA habilitado en Coursera
   └─ 2FA detectado ✓
   
4. Generar QR para TOTP
   ┌─────────────────┐
   │  ███████████    │
   │  █ ███████ █    │
   │  █ █████  █ █   │
   │  █ █████  █ █   │
   │  █ ███████ █    │
   │  ███████████    │
   └─────────────────┘
   
   Scanear con Google Authenticator, 1Password, Authy, etc.
   
5. Solicitar código TOTP
   └─ Código 6 dígitos? 123456
   
6. Validar contra Coursera API
   └─ ✓ Autenticación exitosa
   
7. Generar SESSION_TOKEN
   └─ Token: eyJhbGciOiJIUzI1NiI... (encriptado AES-256)
   
8. Guardar sesión
   └─ ~/.coursera-mcp/sessions.json (permisos 600)
   
9. Eliminar credenciales de memoria
   └─ ✓ Credenciales purgadas
   
10. ¡Listo!
    └─ Puedes usar Coursera MCP sin ingresar credenciales nuevamente
```

### 1.2 Almacenamiento Seguro de Sesiones

**Archivo**: `~/.coursera-mcp/sessions.json`

```json
{
  "version": "1.0",
  "sessions": [
    {
      "email": "freddy.moreno@gmail.com",
      "sessionToken": "encrypted_base64_string",
      "refreshToken": "encrypted_base64_string",
      "encryptionMethod": "AES-256-GCM",
      "expiresAt": "2026-05-28T18:50:00Z",
      "lastRefreshed": "2026-04-28T18:50:00Z",
      "totpSecret": "encrypted_base64_string",
      "totpBackupCodes": ["encrypted_base64_string"]
    }
  ]
}
```

**Permisos**: `rw-------` (600)

**Encriptación**:
```typescript
// src/services/encryption.ts
import crypto from 'crypto'

class EncryptionService {
  private masterKey: Buffer
  
  constructor(masterPassword: string) {
    // Derivar master key de contraseña con PBKDF2
    this.masterKey = crypto.pbkdf2Sync(
      masterPassword,
      'coursera-mcp-salt',
      100000, // iteraciones
      32,     // 256 bits
      'sha256'
    )
  }
  
  encrypt(plaintext: string): string {
    const iv = crypto.randomBytes(16)
    const cipher = crypto.createCipheriv(
      'aes-256-gcm',
      this.masterKey,
      iv
    )
    
    let encrypted = cipher.update(plaintext, 'utf8', 'hex')
    encrypted += cipher.final('hex')
    
    const authTag = cipher.getAuthTag()
    
    return Buffer.from(
      JSON.stringify({ iv: iv.toString('hex'), encrypted, authTag: authTag.toString('hex') })
    ).toString('base64')
  }
  
  decrypt(ciphertext: string): string {
    const { iv, encrypted, authTag } = JSON.parse(
      Buffer.from(ciphertext, 'base64').toString('utf8')
    )
    
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.masterKey,
      Buffer.from(iv, 'hex')
    )
    
    decipher.setAuthTag(Buffer.from(authTag, 'hex'))
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  }
}
```

### 1.3 Flujo de Refresh de Sesión

Cuando el session token expira:

```typescript
async function refreshSession(email: string): Promise<string> {
  // 1. Cargar refresh token encriptado
  const session = loadSession(email)
  const refreshToken = decrypt(session.refreshToken)
  
  // 2. Solicitar nuevo session token
  const response = await axios.post('https://www.coursera.org/api/auth/refresh', {
    refreshToken
  })
  
  // 3. Guardar nuevo session token
  session.sessionToken = encrypt(response.sessionToken)
  session.lastRefreshed = new Date().toISOString()
  saveSession(email, session)
  
  return response.sessionToken
}
```

### 1.4 Backup Codes (Códigos de Respaldo)

Si el usuario pierde acceso a su app TOTP:

```typescript
// Durante `coursera-mcp init`, generar 10 códigos de respaldo
const backupCodes = generateBackupCodes() // 10 códigos de 8 caracteres

// Mostrar al usuario UNA SOLA VEZ
console.log(`
⚠️  GUARDAR ESTOS CÓDIGOS EN LUGAR SEGURO
   Úsalos si pierdes acceso a tu app de 2FA
   
${backupCodes.map((code, i) => `${i + 1}. ${code}`).join('\n')}
`)

// Almacenar encriptados
session.totpBackupCodes = backupCodes.map(code => encrypt(code))
```

---

## 2. Protecciones de Datos

### 2.1 Qué NUNCA Loguear

```typescript
// ❌ PROHIBIDO
logger.info('User login', { email, password, sessionToken })
logger.debug('API response', { fullResponse: apiResponse })
logger.error('Auth failed', { token, credentials })

// ✅ CORRECTO
logger.info('User authentication initiated', { 
  email: 'f***o@gmail.com', // Enmascarado
  method: 'TOTP'
})

logger.debug('API endpoint called', {
  endpoint: '/api/courses',
  method: 'GET',
  statusCode: 200,
  durationMs: 234
})

logger.error('Authentication failed', {
  reason: 'INVALID_TOTP_CODE',
  attemptCount: 3
  // NO incluir el código TOTP
})
```

### 2.2 Sanitización de Logs

```typescript
// src/utils/logSanitizer.ts
export function sanitizeForLogging(obj: any, depth = 0): any {
  if (depth > 5) return '[Circular]'
  
  if (typeof obj !== 'object') return obj
  
  const sensitiveKeys = [
    'password', 'token', 'sessionToken', 'refreshToken',
    'authToken', 'apiKey', 'secret', 'totp', 'totpCode',
    'email', 'userId', 'bearerToken', 'credentials'
  ]
  
  const sanitized = Array.isArray(obj) ? [...obj] : { ...obj }
  
  for (const key in sanitized) {
    if (sensitiveKeys.some(sk => key.toLowerCase().includes(sk.toLowerCase()))) {
      sanitized[key] = '[REDACTED]'
    } else if (typeof sanitized[key] === 'object') {
      sanitized[key] = sanitizeForLogging(sanitized[key], depth + 1)
    }
  }
  
  return sanitized
}

// Uso
logger.error('API request failed', sanitizeForLogging(error))
```

### 2.3 Variables de Entorno

**`.env` (NUNCA en git)**:
```bash
# Solo para desarrollo local
# En producción, usar system environment variables o secrets manager

# Deshabilitado en v1.0+
# COURSERA_EMAIL=    # ❌ NO
# COURSERA_PASSWORD= # ❌ NO

# Sessions almacenadas en ~/.coursera-mcp/sessions.json
# Protegidas con AES-256 derivado de PBKDF2

# Opcional para testing/development
NODE_ENV=development
LOG_LEVEL=debug
```

---

## 3. Validación y Sanitización

### 3.1 Validación de Entrada (Zod)

```typescript
// src/types/schemas.ts
import { z } from 'zod'

export const CourseSearchSchema = z.object({
  query: z.string()
    .min(1, 'Query required')
    .max(200, 'Query too long')
    .regex(/^[a-zA-Z0-9\s\-áéíóúñ]*$/, 'Invalid characters'),
  
  category: z.enum([
    'computer-science',
    'business',
    'data-science',
    'arts-humanities',
    'health',
    'physical-science-engineering'
  ]).optional(),
  
  language: z.enum(['en', 'es', 'fr', 'pt', 'de']).optional(),
  
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  
  limit: z.number()
    .int('Must be integer')
    .min(1, 'Minimum 1')
    .max(100, 'Maximum 100')
    .default(20)
})

export type CourseSearchParams = z.infer<typeof CourseSearchSchema>
```

### 3.2 Rate Limiting

```typescript
// src/services/rateLimiter.ts
class RateLimiter {
  private buckets = new Map<string, Bucket>()
  private maxRequests = 100
  private windowMs = 60_000 // 1 minuto
  
  async checkLimit(key: string): Promise<{ allowed: boolean; resetAt: Date }> {
    const bucket = this.buckets.get(key) || this.createBucket(key)
    
    if (bucket.requests >= this.maxRequests) {
      return {
        allowed: false,
        resetAt: new Date(bucket.windowStart + this.windowMs)
      }
    }
    
    bucket.requests++
    return { allowed: true, resetAt: null }
  }
  
  private createBucket(key: string): Bucket {
    const bucket = {
      requests: 0,
      windowStart: Date.now()
    }
    this.buckets.set(key, bucket)
    
    // Limpiar bucket cada ventana
    setTimeout(() => {
      this.buckets.delete(key)
    }, this.windowMs)
    
    return bucket
  }
}
```

---

## 4. Consideraciones de OWASP

### 4.1 Prevención de Ataques Comunes

| Vulnerabilidad | Mitigación |
|---|---|
| **Injection (SQL/Command)** | Validación zod + Typed queries |
| **Broken Authentication** | TOTP 2FA + session tokens encriptados |
| **Sensitive Data Exposure** | AES-256 en disco, TLS en red, sanitización de logs |
| **XML External Entities (XXE)** | Parsear JSON/HTML de forma segura con librerías confiables |
| **CSRF** | Coursera API maneja CSRF tokens automáticamente |
| **Insecure Deserialization** | Validación zod antes de usar datos |

### 4.2 Auditoría de Seguridad

```typescript
// src/services/auditLog.ts
class AuditLogger {
  async logSecurityEvent(event: SecurityEvent) {
    const timestamp = new Date().toISOString()
    const sanitized = sanitizeForLogging(event)
    
    // Guardar en archivo local (no rotado por HTTP)
    await fs.appendFile(
      `${homeDir}/.coursera-mcp/audit.log`,
      `${timestamp} ${JSON.stringify(sanitized)}\n`
    )
    
    // Eventos críticos
    if (event.severity === 'critical') {
      logger.error('SECURITY EVENT', sanitized)
    }
  }
}

// Eventos auditados
interface SecurityEvent {
  timestamp: Date
  eventType: 'LOGIN' | 'LOGOUT' | 'SESSION_REFRESH' | 'INVALID_AUTH' | 'RATE_LIMIT'
  email: string // Enmascarado
  success: boolean
  reason?: string
  severity: 'info' | 'warning' | 'critical'
}
```

---

## 5. Testing de Seguridad

### 5.1 Tests de Encriptación

```typescript
// tests/unit/services/encryption.test.ts
describe('EncryptionService', () => {
  it('should encrypt and decrypt correctly', () => {
    const service = new EncryptionService('master-password')
    const plaintext = 'sessionToken_123456'
    
    const encrypted = service.encrypt(plaintext)
    expect(encrypted).not.toEqual(plaintext)
    
    const decrypted = service.decrypt(encrypted)
    expect(decrypted).toEqual(plaintext)
  })
  
  it('should fail with wrong master password', () => {
    const service1 = new EncryptionService('password1')
    const service2 = new EncryptionService('password2')
    
    const encrypted = service1.encrypt('secret')
    expect(() => service2.decrypt(encrypted)).toThrow()
  })
})
```

### 5.2 Tests de Sanitización

```typescript
// tests/unit/utils/logSanitizer.test.ts
describe('logSanitizer', () => {
  it('should redact sensitive keys', () => {
    const obj = {
      email: 'user@example.com',
      sessionToken: 'secret123',
      courseName: 'Python 101'
    }
    
    const sanitized = sanitizeForLogging(obj)
    
    expect(sanitized.email).toBe('[REDACTED]')
    expect(sanitized.sessionToken).toBe('[REDACTED]')
    expect(sanitized.courseName).toBe('Python 101')
  })
})
```

---

## 6. Checklist de Seguridad Pre-Release

- [ ] Todas las credenciales removidas de código
- [ ] TOTP 2FA implementado y testeado
- [ ] Encriptación AES-256 en ~/.coursera-mcp/
- [ ] Sanitización de logs en todos los loggers
- [ ] Rate limiting implementado
- [ ] Validación zod en todos los inputs
- [ ] Audit logs grabando eventos críticos
- [ ] Permisos de archivos correctos (600)
- [ ] Zero secretos en .env.example
- [ ] Security review completado
- [ ] Dependencias auditadas (npm audit)
- [ ] OWASP Top 10 verificado

---

## 7. Recomendaciones Post-v1.0

### v1.1
- [ ] 2FA backup codes management UI
- [ ] Device management (listar sesiones activas)
- [ ] Logout remoto (invalidar sesiones)

### v2.0
- [ ] OAuth2 si Coursera lo soporta
- [ ] Hardware security keys (WebAuthn)
- [ ] Encryption key rotation

---

**Documento crítico para seguridad de datos personales. Revisar antes de implementación.**
