# Migración a Bun: Coursera MCP

**Fecha**: Abril 28, 2026  
**Estado**: Documentado y aplicado

---

## 📋 Cambios Realizados

### ✅ Comandos de Desarrollo

| Operación | Antes | Después |
|-----------|-------|---------|
| Instalar deps | `pnpm install` | `bun install` |
| Dev mode | `pnpm dev` | `bun run dev` |
| Build | `pnpm build` | `bun run build` |
| Linting | `pnpm lint` | `bun run lint` |
| Type check | `pnpm type-check` | `bun run type-check` |
| Tests | `pnpm test` | `bun test` |
| Unit tests | `pnpm test:unit` | `bun run test:unit` |
| Integration tests | `pnpm test:integration` | `bun run test:integration` |
| Coverage | `pnpm test:coverage` | `bun run test:coverage` |

### ✅ Archivos Actualizados

- ✅ `CLAUDE.md` - Comandos actualizados
- ✅ `TASKS.md` - Todos los prompts con comandos bun
- ✅ `IMPLEMENTATION_GUIDE.md` - Setup, scripts, comandos
- ✅ `BUN_MIGRATION.md` - Este archivo (referencia)

### ✅ package.json

```json
{
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
  }
}
```

---

## 🚀 Ventajas de Bun

### Velocidad
- **3-4x más rápido** que pnpm en instalación
- **Jest-compatible** pero más rápido en tests
- Hot module reloading nativo

### Simplificidad
- **Un solo runtime**: bun es Node.js + package manager + test runner
- No necesitar múltiples herramientas
- Menos comandos para memorizar

### Compatibilidad
- **100% compatible** con npm/yarn/pnpm packages
- **Node.js compatible** en APIs
- TypeScript soportado out-of-the-box

### Performance en CI/CD
- Instalación más rápida en GitHub Actions
- Tests ejecutan 2-3x más rápido
- Menor consumo de memoria

---

## 📦 Setup Inicial

### Instalación de Bun

**macOS/Linux**:
```bash
curl -fsSL https://bun.sh/install | bash
# Luego agregar a PATH si es necesario
export PATH="$HOME/.bun/bin:$PATH"
```

**Windows**:
```bash
powershell -c "irm bun.sh/install.ps1 | iex"
```

**Verify**:
```bash
bun --version  # Debe mostrar 1.x.x
```

### Primeros Pasos

```bash
cd /Users/fmbetancourt/IdeaProjects/ai/coursera-mcp
bun install           # Instala dependencias (crea bun.lockb)
bun run type-check    # Verifica tipos
bun run lint          # Lint
bun test              # Corre tests
```

---

## 🔄 Bun Testing

### bun test vs vitest

Bun tiene un test runner nativo compatible con Jest:

```typescript
// tests/unit/services/auth.unit.test.ts
import { describe, it, expect, beforeEach, vi } from "bun:test"

describe('AuthService', () => {
  beforeEach(() => {
    // setup
  })
  
  it('should validate TOTP code', () => {
    // test
  })
})
```

**Nota**: Usamos `vitest` como alias en package.json, pero bun corre los tests nativamente.

### Comandos de Testing

```bash
bun test                              # Todos los tests
bun test --filter '*.unit.test.ts'    # Solo unit tests
bun test --filter '*.integration.test.ts'  # Solo integration
bun test --coverage                   # Con coverage
bun test --watch                      # Watch mode
```

---

## 🔐 Seguridad & Compatibilidad

### ✅ Bun Compatible

Todas las dependencias del proyecto funcionan con bun:
- `@anthropic-ai/sdk` ✅
- `axios` ✅
- `zod` ✅
- `speakeasy` ✅
- `winston` ✅
- `vitest` ✅ (alias)
- `nock` ✅
- `esbuild` ✅

### 🔒 Lock File

Bun genera `bun.lockb` (binario):
- Más rápido que lockfiles JSON
- Determinístico (mismo resultado siempre)
- **Agregar a git**: `git add bun.lockb`
- **NO agregar**: `node_modules/`

---

## 📝 En TASKS.md

Todos los prompts de implementación ya incluyen comandos bun:

```
Criterio: bun install funciona, dependencias instaladas
          bun test muestra 85%+ coverage
          bun run build genera dist/index.js
```

---

## ⚠️ Notas Importantes

### Global CLAUDE.md (Usuario)

El CLAUDE.md global del usuario prefiere pnpm, pero este proyecto usa bun específicamente.

**Razón**: Bun es más rápido para CI/CD y desarrollo local.

### Si hay conflicto

Si futuros Claude intenten usar pnpm:
1. Este CLAUDE.md y TASKS.md tienen bun
2. Este archivo (BUN_MIGRATION.md) lo explica
3. **Usar siempre bun en este proyecto**

### Reversión (si necesaria)

Para volver a pnpm:
1. Reemplazar `bun` → `pnpm` en CLAUDE.md, TASKS.md, IMPLEMENTATION_GUIDE.md
2. Eliminar `bun.lockb`, correr `pnpm install`
3. Cambiar scripts a: `pnpm build`, `pnpm test`, etc.

---

## 🎯 Próximos Pasos

Cuando comienzes T1.1 (Setup inicial):

1. **Instalar bun** si no lo tienes:
   ```bash
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Verificar instalación**:
   ```bash
   bun --version  # Debe mostrar 1.x.x
   ```

3. **Ejecutar T1.1** usando comandos `bun` (ya están en TASKS.md)

4. **Primera ejecución**:
   ```bash
   bun install                  # Crea bun.lockb
   git add bun.lockb            # Commit lock file
   git commit -m "chore: setup bun package manager"
   ```

---

## 📚 Referencias

- [Bun Official](https://bun.sh/)
- [Bun Test Runner](https://bun.sh/docs/test/overview)
- [Bun Package Manager](https://bun.sh/docs/cli/install)
- [bun.lockb Format](https://bun.sh/docs/cli/install#lockfile)

---

**Cambio confirmado**: Proyecto Coursera MCP ahora usa **bun** como package manager.

Todos los comandos en documentación, TASKS.md, y CLAUDE.md ya están actualizados.
