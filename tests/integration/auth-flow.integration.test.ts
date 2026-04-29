import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CourseraClient } from '../../src/services/courseraClient';
import { AuthService } from '../../src/services/auth';
import { EncryptionService } from '../../src/services/encryption';

const testSessionDir = path.join(process.cwd(), '.test-auth-sessions');
const testMasterPassword = 'test-master-password-123';

describe('Auth Flow Integration', () => {
  let courseraClient: CourseraClient;
  let authService: AuthService;
  let encryptionService: EncryptionService;

  beforeEach(() => {
    fs.ensureDirSync(testSessionDir);
    courseraClient = new CourseraClient();
    authService = new AuthService(courseraClient, testMasterPassword, path.join(testSessionDir, 'sessions.json'));
    encryptionService = new EncryptionService(testMasterPassword);
  });

  afterEach(() => {
    fs.removeSync(testSessionDir);
  });

  describe('TOTP 2FA complete flow', () => {
    it('should generate TOTP secret with QR code', async () => {
      const email = 'test@example.com';
      const { secret, qrCode } = await authService.generateTOTPSecret(email);

      expect(secret).toBeDefined();
      expect(secret.length).toBeGreaterThan(0);
      expect(qrCode).toBeDefined();
      expect(qrCode).toContain('data:image/png');
    });

    it('should validate TOTP code', () => {
      const secret = 'JBSWY3DPEBLW64TMMQ======'; // Test secret
      const code = authService.generateTOTPCode(secret);

      expect(code).toBeDefined();
      expect(code.length).toBe(6);
      expect(authService.validateTOTPCode(secret, code)).toBe(true);
    });

    it('should reject invalid TOTP code', () => {
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const invalidCode = '000000';

      expect(authService.validateTOTPCode(secret, invalidCode)).toBe(false);
    });

    it('should generate unique backup codes', () => {
      const codes1 = authService.generateBackupCodes(10);
      const codes2 = authService.generateBackupCodes(10);

      expect(codes1.length).toBe(10);
      expect(codes2.length).toBe(10);

      // Check uniqueness within batch
      const uniqueCodes = new Set(codes1);
      expect(uniqueCodes.size).toBe(10);

      // Check format: XXXX-XXXX
      for (const code of codes1) {
        expect(code).toMatch(/^[A-Z0-9]{8}-[A-Z0-9]{8}$/);
      }
    });

    it('should verify TOTP and create encrypted session', () => {
      const email = 'user@example.com';
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const code = authService.generateTOTPCode(secret);

      const sessionToken = authService.verifyTOTPAndCreateSession(email, secret, code);

      expect(sessionToken).toBeDefined();
      expect(sessionToken).toContain('session_');

      // Verify session was saved
      const savedSession = authService.loadSession(email);
      expect(savedSession).toBeDefined();
      expect(savedSession?.email).toBe(email);
      expect(savedSession?.totpEnabled).toBe(true);
    });

    it('should reject invalid TOTP code during verification', () => {
      const email = 'user@example.com';
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const invalidCode = '000000';

      expect(() => {
        authService.verifyTOTPAndCreateSession(email, secret, invalidCode);
      }).toThrow('Invalid TOTP code');
    });
  });

  describe('Session management', () => {
    it('should encrypt session token via verifyTOTPAndCreateSession', () => {
      const email = 'secure@example.com';
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const code = authService.generateTOTPCode(secret);
      const plainToken = authService.verifyTOTPAndCreateSession(email, secret, code);

      const savedSession = authService.loadSession(email);
      expect(savedSession).toBeDefined();

      // Session token should be encrypted (not equal to plain)
      if (savedSession) {
        expect(savedSession.sessionToken).not.toBe(plainToken);
        expect(savedSession.sessionToken).toBeDefined();
      }
    });

    it('should load and decrypt session correctly', () => {
      const email = 'decrypt@example.com';
      const sessionToken = 'test-token-xyz';

      // Save encrypted
      authService.saveSession(email, {
        sessionToken,
        refreshToken: undefined,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        lastRefreshed: Date.now(),
        totpEnabled: false,
      });

      // Load and verify
      const loaded = authService.loadSession(email);
      expect(loaded).toBeDefined();
      expect(loaded?.email).toBe(email);
    });

    it('should return null for expired session', () => {
      const email = 'expired@example.com';

      authService.saveSession(email, {
        sessionToken: 'token',
        refreshToken: undefined,
        expiresAt: Date.now() - 1000, // Already expired
        lastRefreshed: Date.now(),
        totpEnabled: false,
      });

      const loaded = authService.loadSession(email);
      expect(loaded).toBeNull();
    });

    it('should refresh session correctly', () => {
      const email = 'refresh@example.com';
      const originalExpiresAt = Date.now() + 1 * 60 * 60 * 1000; // 1 hour

      authService.saveSession(email, {
        sessionToken: 'original-token',
        refreshToken: undefined,
        expiresAt: originalExpiresAt,
        lastRefreshed: Date.now(),
        totpEnabled: false,
      });

      // Small delay to ensure time difference
      const before = Date.now();
      authService.refreshSession(email);
      const after = Date.now();

      const refreshed = authService.loadSession(email);
      expect(refreshed).toBeDefined();
      if (refreshed) {
        expect(refreshed.expiresAt).toBeGreaterThan(originalExpiresAt);
        expect(refreshed.lastRefreshed).toBeGreaterThanOrEqual(before);
      }
    });

    it('should throw when refreshing non-existent session', () => {
      expect(() => {
        authService.refreshSession('nonexistent@example.com');
      }).toThrow('No session found');
    });
  });

  describe('Multiple user sessions', () => {
    it('should manage multiple user sessions independently', () => {
      const user1 = 'user1@example.com';
      const user2 = 'user2@example.com';
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const code = authService.generateTOTPCode(secret);

      // Create sessions for both users
      authService.verifyTOTPAndCreateSession(user1, secret, code);
      authService.verifyTOTPAndCreateSession(user2, secret, code);

      // Verify both sessions exist
      const session1 = authService.loadSession(user1);
      const session2 = authService.loadSession(user2);

      expect(session1?.email).toBe(user1);
      expect(session2?.email).toBe(user2);
      expect(session1?.sessionToken).not.toBe(session2?.sessionToken);
    });

    it('should list active sessions', () => {
      const user1 = 'active1@example.com';
      const user2 = 'active2@example.com';
      const user3 = 'expired@example.com';
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const code = authService.generateTOTPCode(secret);

      // Create active sessions
      authService.verifyTOTPAndCreateSession(user1, secret, code);
      authService.verifyTOTPAndCreateSession(user2, secret, code);

      // Create expired session
      authService.saveSession(user3, {
        sessionToken: 'old-token',
        refreshToken: undefined,
        expiresAt: Date.now() - 1000,
        lastRefreshed: Date.now(),
        totpEnabled: false,
      });

      const activeSessions = authService.getActiveSessions();
      expect(activeSessions.length).toBe(2);
      expect(activeSessions).toContain(user1);
      expect(activeSessions).toContain(user2);
      expect(activeSessions).not.toContain(user3);
    });
  });

  describe('Session persistence', () => {
    it('should persist encrypted sessions to disk', () => {
      const email = 'persist@example.com';
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const code = authService.generateTOTPCode(secret);

      authService.verifyTOTPAndCreateSession(email, secret, code);

      // Verify file exists
      const sessionsPath = path.join(testSessionDir, 'sessions.json');
      expect(fs.existsSync(sessionsPath)).toBe(true);

      // Load session from disk
      const fileContent = fs.readJsonSync(sessionsPath) as Record<string, unknown>;
      expect(fileContent[email]).toBeDefined();
    });

    it('should load sessions from disk on initialization', () => {
      const email = 'disk@example.com';
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const code = authService.generateTOTPCode(secret);

      // Create and save session with first instance
      authService.verifyTOTPAndCreateSession(email, secret, code);

      // Create new AuthService instance (should load from disk)
      const authService2 = new AuthService(courseraClient, testMasterPassword, path.join(testSessionDir, 'sessions.json'));

      const loaded = authService2.loadSession(email);
      expect(loaded).toBeDefined();
      expect(loaded?.email).toBe(email);
      expect(loaded?.totpEnabled).toBe(true);
    });
  });

  describe('Clear session', () => {
    it('should clear specific user session', () => {
      const email = 'clear@example.com';
      const secret = 'JBSWY3DPEBLW64TMMQ======';
      const code = authService.generateTOTPCode(secret);

      authService.verifyTOTPAndCreateSession(email, secret, code);
      expect(authService.loadSession(email)).toBeDefined();

      authService.clearSession(email);
      expect(authService.loadSession(email)).toBeNull();
    });

    it('should handle clearing non-existent session gracefully', () => {
      expect(() => {
        authService.clearSession('nonexistent@example.com');
      }).not.toThrow();
    });
  });

  describe('Encryption integration', () => {
    it('should encrypt and decrypt tokens with same master password', () => {
      const plainToken = 'secret-token-xyz-12345';

      const encrypted = authService.encryptSessionToken(plainToken);
      expect(encrypted).not.toBe(plainToken);

      // Use same encryption service to decrypt
      const decrypted = authService.decryptSessionToken(encrypted);
      expect(decrypted).toBe(plainToken);
    });

    it('should fail to decrypt with different master password', () => {
      const plainToken = 'secret-token-xyz-12345';
      const encrypted = authService.encryptSessionToken(plainToken);

      // Create new service with different password
      const differentAuth = new AuthService(
        courseraClient,
        'different-password-456',
        path.join(testSessionDir, 'sessions-2.json')
      );

      let decryptionFailed = false;
      try {
        differentAuth.decryptSessionToken(encrypted);
      } catch {
        decryptionFailed = true;
      }

      expect(decryptionFailed).toBe(true);
    });
  });
});
