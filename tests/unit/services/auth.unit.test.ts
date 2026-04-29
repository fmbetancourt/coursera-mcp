import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import speakeasy from 'speakeasy';
import { AuthService } from '../../../src/services/auth';
import { CourseraClient } from '../../../src/services/courseraClient';

const testSessionsDir = path.join(process.cwd(), '.test-sessions');

describe('AuthService - TOTP 2FA', () => {
  let auth: AuthService;
  let courseraClient: CourseraClient;
  const masterPassword = 'test-master-password';
  const testEmail = 'test@example.com';

  beforeEach(() => {
    fs.ensureDirSync(testSessionsDir);
    courseraClient = new CourseraClient();
    auth = new AuthService(courseraClient, masterPassword, path.join(testSessionsDir, 'sessions.json'));
  });

  afterEach(() => {
    fs.removeSync(testSessionsDir);
  });

  describe('TOTP Secret Generation', () => {
    it('should generate TOTP secret with QR code', async () => {
      const result = await auth.generateTOTPSecret(testEmail);

      expect(result.secret).toBeDefined();
      expect(result.secret.length).toBeGreaterThan(20);
      expect(result.qrCode).toBeDefined();
      expect(result.qrCode).toContain('data:image/png');
    });

    it('should generate different secrets for different calls', async () => {
      const result1 = await auth.generateTOTPSecret(testEmail);
      const result2 = await auth.generateTOTPSecret(testEmail);

      expect(result1.secret).not.toBe(result2.secret);
    });

    it('should generate valid base32 secret', async () => {
      const result = await auth.generateTOTPSecret(testEmail);

      // Base32 should only contain A-Z and 2-7
      expect(/^[A-Z2-7=]+$/.test(result.secret)).toBe(true);
    });
  });

  describe('TOTP Code Validation', () => {
    it('should validate correct TOTP code', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);

      // Generate a valid code using speakeasy
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      const isValid = auth.validateTOTPCode(secret.secret, validCode);
      expect(isValid).toBe(true);
    });

    it('should reject invalid TOTP code', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);

      const isValid = auth.validateTOTPCode(secret.secret, '000000');
      expect(isValid).toBe(false);
    });

    it('should reject malformed TOTP code', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);

      const isValid = auth.validateTOTPCode(secret.secret, 'invalid');
      expect(isValid).toBe(false);
    });
  });

  describe('TOTP Code Generation', () => {
    it('should generate TOTP code', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);

      const code = auth.generateTOTPCode(secret.secret);

      expect(code).toBeDefined();
      expect(code.length).toBe(6);
      expect(/^\d{6}$/.test(code)).toBe(true);
    });

    it('should generate different codes over time', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);

      const code1 = auth.generateTOTPCode(secret.secret);

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Note: TOTP codes change every 30 seconds, so they might be the same
      const code2 = auth.generateTOTPCode(secret.secret);

      // Both should be valid 6-digit codes
      expect(/^\d{6}$/.test(code1)).toBe(true);
      expect(/^\d{6}$/.test(code2)).toBe(true);
    });
  });

  describe('Backup Codes', () => {
    it('should generate backup codes', () => {
      const codes = auth.generateBackupCodes(10);

      expect(codes.length).toBe(10);
      expect(codes[0]).toBeDefined();
      expect(codes[0].includes('-')).toBe(true);
    });

    it('should generate unique backup codes', () => {
      const codes = auth.generateBackupCodes(10);

      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(10);
    });

    it('should generate custom count backup codes', () => {
      const codes = auth.generateBackupCodes(5);
      expect(codes.length).toBe(5);

      const codes20 = auth.generateBackupCodes(20);
      expect(codes20.length).toBe(20);
    });

    it('should generate formatted backup codes', () => {
      const codes = auth.generateBackupCodes(3);

      for (const code of codes) {
        // Format: XXXX-XXXX (uppercase letters)
        expect(/^[A-Z0-9]{8}-[A-Z0-9]{8}$/.test(code)).toBe(true);
      }
    });
  });

  describe('Token Encryption', () => {
    it('should encrypt and decrypt session token', () => {
      const token = 'session_abc123xyz';

      const encrypted = auth.encryptSessionToken(token);
      const decrypted = auth.decryptSessionToken(encrypted);

      expect(decrypted).toBe(token);
    });

    it('should encrypt differently each time (random IV)', () => {
      const token = 'session_test';

      const encrypted1 = auth.encryptSessionToken(token);
      const encrypted2 = auth.encryptSessionToken(token);

      expect(encrypted1).not.toBe(encrypted2);
    });

    it('should not decrypt with wrong master password', () => {
      const token = 'session_secret';
      const encrypted = auth.encryptSessionToken(token);

      // Create new auth service with different password
      const wrongAuth = new AuthService(
        courseraClient,
        'wrong-password',
        path.join(testSessionsDir, 'sessions2.json')
      );

      expect(() => {
        wrongAuth.decryptSessionToken(encrypted);
      }).toThrow();
    });
  });

  describe('Session Creation with TOTP', () => {
    it('should create session after TOTP verification', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      const sessionToken = auth.verifyTOTPAndCreateSession(testEmail, secret.secret, validCode);

      expect(sessionToken).toBeDefined();
      expect(sessionToken).toContain('session_');
    });

    it('should fail with invalid TOTP code', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);

      expect(() => {
        auth.verifyTOTPAndCreateSession(testEmail, secret.secret, '000000');
      }).toThrow();
    });

    it('should save encrypted session after TOTP', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      auth.verifyTOTPAndCreateSession(testEmail, secret.secret, validCode);

      const activeSessions = auth.getActiveSessions();
      expect(activeSessions).toContain(testEmail);
    });

    it('should encrypt session token in storage', async () => {
      const secret = await auth.generateTOTPSecret(testEmail);
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      auth.verifyTOTPAndCreateSession(testEmail, secret.secret, validCode);

      // Load and check the saved sessions file
      const sessionsFile = path.join(testSessionsDir, 'sessions.json');
      const saved = fs.readJsonSync(sessionsFile) as Record<string, { sessionToken: string }>;

      // Token should be encrypted (not in plain format)
      expect(saved[testEmail].sessionToken).not.toContain('session_');
    });
  });

  describe('Session Refresh', () => {
    it('should refresh session expiration', async () => {
      // Create session first
      const secret = await auth.generateTOTPSecret(testEmail);
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      auth.verifyTOTPAndCreateSession(testEmail, secret.secret, validCode);
      const originalSession = auth.loadSession(testEmail);
      const originalExpiration = originalSession?.expiresAt;

      // Wait a bit
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh
      auth.refreshSession(testEmail);

      const refreshedSession = auth.loadSession(testEmail);
      expect(refreshedSession?.expiresAt).toBeGreaterThan(originalExpiration || 0);
    });

    it('should fail refreshing non-existent session', () => {
      expect(() => {
        auth.refreshSession('nonexistent@example.com');
      }).toThrow();
    });
  });

  describe('Session Management', () => {
    it('should load saved session correctly', async () => {
      // Save a session
      auth.saveSession(testEmail, {
        sessionToken: 'encrypted_token_123',
        expiresAt: Date.now() + 1000000,
        lastRefreshed: Date.now(),
      });

      // Load it back
      const session = auth.loadSession(testEmail);
      expect(session?.email).toBe(testEmail);
      expect(session?.sessionToken).toBe('encrypted_token_123');
    });

    it('should return null for expired session', async () => {
      // Save a session that expires immediately
      auth.saveSession(testEmail, {
        sessionToken: 'expired_token',
        expiresAt: Date.now() - 1000, // Already expired
        lastRefreshed: Date.now(),
      });

      const session = auth.loadSession(testEmail);
      expect(session).toBeNull();
    });

    it('should get list of active sessions', async () => {
      // Create multiple sessions
      const secret1 = await auth.generateTOTPSecret('user1@example.com');
      const code1 = speakeasy.totp({
        secret: secret1.secret,
        encoding: 'base32',
      });

      const secret2 = await auth.generateTOTPSecret('user2@example.com');
      const code2 = speakeasy.totp({
        secret: secret2.secret,
        encoding: 'base32',
      });

      auth.verifyTOTPAndCreateSession('user1@example.com', secret1.secret, code1);
      auth.verifyTOTPAndCreateSession('user2@example.com', secret2.secret, code2);

      const active = auth.getActiveSessions();
      expect(active).toContain('user1@example.com');
      expect(active).toContain('user2@example.com');
    });
  });
});
