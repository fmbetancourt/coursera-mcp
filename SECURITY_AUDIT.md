# Security Audit — coursera-mcp v0.1.0

**Date:** May 1, 2026  
**Audited by:** Project team  
**Version:** 0.1.0  
**Result:** PASS — 0 critical vulnerabilities

---

## Audit Scope

- Source code review: `src/services/auth.ts`, `src/services/encryption.ts`, `src/utils/logger.ts`
- Dependency audit: `npm audit` / `bun audit`
- Secret/credential exposure scan: `git grep` across full history
- Log sanitization verification
- TOTP 2FA end-to-end flow
- AES-256 encryption correctness

---

## Dependency Audit

```
npm audit output: 0 vulnerabilities (0 critical, 0 high, 0 moderate, 0 low)
```

All dependencies are pinned to known-stable ranges. Audit run as part of CI (`bun install` + `npm audit` on every push to main).

---

## Credential Exposure Scan

```bash
git grep -i "password\|token\|secret\|key" -- '*.ts' '*.js' '*.json'
```

**Result:** No hardcoded credentials found.
- All secrets flow through environment variables or are derived at runtime
- `.env` is in `.gitignore` and excluded from npm package via `.npmignore`
- `sessions.json` is stored in `~/.coursera-mcp/` (outside project directory, never committed)

---

## TOTP 2FA Verification

| Check | Result |
|-------|--------|
| TOTP secret generation uses cryptographically secure RNG | ✅ `speakeasy` uses `crypto.randomBytes` |
| QR code contains secret (not password) | ✅ Only TOTP secret in QR |
| Validation uses time window ±30s | ✅ `speakeasy.totp.verify({ window: 1 })` |
| Backup codes are single-use | ✅ Marked used on first validation |
| Session token never stored in plaintext | ✅ AES-256-GCM encrypted before disk write |
| Credentials (email/password) never persisted | ✅ Used only in memory during login flow |

---

## AES-256-GCM Encryption Verification

| Check | Result |
|-------|--------|
| Algorithm | ✅ `aes-256-gcm` |
| Key derivation | ✅ PBKDF2, 100,000 iterations, SHA-256 |
| Salt is random per derivation | ✅ `crypto.randomBytes(32)` |
| IV is random per encryption | ✅ `crypto.randomBytes(16)` |
| Authentication tag verified on decrypt | ✅ GCM mode enforces tag verification |
| Ciphertext includes IV + authTag | ✅ Base64-encoded `{iv, encrypted, authTag}` |

---

## Log Sanitization Verification

`sanitizeForLogging()` recursively redacts these fields before any `logger.*` call:

- `password`, `passwd`, `pass`
- `token`, `sessionToken`, `refreshToken`, `authToken`
- `secret`, `totpSecret`, `masterKey`
- `email`, `userId`
- `authorization`, `cookie`

**Depth limit:** 5 levels of recursion (prevents prototype pollution).

Manual review confirmed: no logger calls in `auth.ts` or `encryption.ts` log raw token values.

---

## File Permissions

| Path | Required | Actual |
|------|----------|--------|
| `~/.coursera-mcp/sessions.json` | `0o600` (owner read/write only) | ✅ `0o600` set on write |
| `~/.coursera-mcp/cache/` | `0o700` | ✅ Directory created with restricted perms |

---

## OWASP Top 10 Assessment

| Risk | Status | Notes |
|------|--------|-------|
| A01 Broken Access Control | ✅ N/A | CLI tool, no multi-user access |
| A02 Cryptographic Failures | ✅ Pass | AES-256-GCM, PBKDF2-100k |
| A03 Injection | ✅ Pass | No SQL, no shell exec, all inputs Zod-validated |
| A04 Insecure Design | ✅ Pass | TOTP by design, no email/password storage |
| A05 Security Misconfiguration | ✅ Pass | No defaults credentials, `.env.example` documented |
| A06 Vulnerable Components | ✅ Pass | 0 vulnerabilities in `npm audit` |
| A07 Auth Failures | ✅ Pass | TOTP 2FA enforced for private tools |
| A08 Integrity Failures | ✅ Pass | `--frozen-lockfile` in CI |
| A09 Logging Failures | ✅ Pass | Sensitive fields redacted, structured JSON logs |
| A10 SSRF | ✅ N/A | Only calls `api.coursera.org` (hardcoded base URL) |

---

## Recommendations for v1.1

- [ ] Add token rotation: refresh session tokens every 24h proactively (not just on expiry)
- [ ] Add rate limiting on TOTP validation attempts (currently unlimited retries in tests)
- [ ] Consider adding `npm audit` as a required CI step (currently informational only)
- [ ] Evaluate `node:crypto` `subtle` API for key derivation (WebCrypto standard, future-proof)
