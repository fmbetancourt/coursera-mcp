import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import speakeasy from 'speakeasy';
import { AuthService } from '../../../src/services/auth';
import { CourseraClient } from '../../../src/services/courseraClient';

const testSessionsDir = path.join(process.cwd(), '.test-sessions-integration');

describe('AuthService Integration - Session Refresh', () => {
  let auth: AuthService;
  let courseraClient: CourseraClient;
  const masterPassword = 'test-master-password';
  const testEmail = 'integration@example.com';

  beforeEach(() => {
    fs.ensureDirSync(testSessionsDir);
    courseraClient = new CourseraClient();
    auth = new AuthService(courseraClient, masterPassword, path.join(testSessionsDir, 'sessions.json'));
  });

  afterEach(() => {
    fs.removeSync(testSessionsDir);
  });

  describe('Session Expiration and Refresh', () => {
    it('should detect sessions expiring within threshold', async () => {
      // Create session with short expiration
      const expiresIn3Minutes = Date.now() + 3 * 60 * 1000;
      auth.saveSession(testEmail, {
        sessionToken: 'token_integration_123',
        expiresAt: expiresIn3Minutes,
        lastRefreshed: Date.now(),
      });

      // Should detect as expiring soon (5 min threshold)
      expect(auth.isSessionExpiringSoon(testEmail, 5)).toBe(true);

      // Should not detect as expiring soon (2 min threshold)
      expect(auth.isSessionExpiringSoon(testEmail, 2)).toBe(false);
    });

    it('should extend session expiration on refresh', async () => {
      // Create session
      const secret = await auth.generateTOTPSecret(testEmail);
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      auth.verifyTOTPAndCreateSession(testEmail, secret.secret, validCode);
      const sessionBefore = auth.loadSession(testEmail);
      expect(sessionBefore).toBeDefined();

      // Wait briefly
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Refresh
      auth.refreshSession(testEmail);
      const sessionAfter = auth.loadSession(testEmail);

      // Expiration should be newer or equal
      expect(sessionAfter?.expiresAt || 0).toBeGreaterThanOrEqual(
        sessionBefore?.expiresAt || 0
      );
      expect(sessionAfter?.lastRefreshed || 0).toBeGreaterThanOrEqual(
        sessionBefore?.lastRefreshed || 0
      );
    });

    it('should persist refreshed session to disk', async () => {
      // Create session
      const secret = await auth.generateTOTPSecret(testEmail);
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      auth.verifyTOTPAndCreateSession(testEmail, secret.secret, validCode);

      // Refresh
      auth.refreshSession(testEmail);

      // Create new AuthService instance to verify persistence
      const auth2 = new AuthService(
        courseraClient,
        masterPassword,
        path.join(testSessionsDir, 'sessions.json')
      );

      const persistedSession = auth2.loadSession(testEmail);
      expect(persistedSession).toBeDefined();
      expect(persistedSession?.email).toBe(testEmail);
    });

    it('should handle multiple sessions with mixed expiration states', async () => {
      // Create session 1 (expiring soon)
      const expiresIn2Min = Date.now() + 2 * 60 * 1000;
      auth.saveSession('user1@example.com', {
        sessionToken: 'token_user1',
        expiresAt: expiresIn2Min,
        lastRefreshed: Date.now(),
      });

      // Create session 2 (not expiring soon)
      const expiresIn23Hours = Date.now() + 23 * 60 * 60 * 1000;
      auth.saveSession('user2@example.com', {
        sessionToken: 'token_user2',
        expiresAt: expiresIn23Hours,
        lastRefreshed: Date.now(),
      });

      // Check expiration status
      expect(auth.isSessionExpiringSoon('user1@example.com', 5)).toBe(true);
      expect(auth.isSessionExpiringSoon('user2@example.com', 5)).toBe(false);

      // Both should be in active sessions
      const active = auth.getActiveSessions();
      expect(active).toContain('user1@example.com');
      expect(active).toContain('user2@example.com');

      // Refresh user1
      auth.refreshSession('user1@example.com');

      // User1 should no longer be expiring soon
      expect(auth.isSessionExpiringSoon('user1@example.com', 5)).toBe(false);
    });

    it('should handle rapid refresh calls', async () => {
      // Create session
      const secret = await auth.generateTOTPSecret(testEmail);
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      auth.verifyTOTPAndCreateSession(testEmail, secret.secret, validCode);

      // Refresh multiple times
      const refreshCount = 5;
      for (let i = 0; i < refreshCount; i++) {
        auth.refreshSession(testEmail);
      }

      // Session should still be valid
      const session = auth.loadSession(testEmail);
      expect(session).toBeDefined();
      expect(session?.email).toBe(testEmail);
    });

    it('should maintain session data during refresh', async () => {
      // Create session with custom data
      const secret = await auth.generateTOTPSecret(testEmail);
      const validCode = speakeasy.totp({
        secret: secret.secret,
        encoding: 'base32',
      });

      const sessionToken = auth.verifyTOTPAndCreateSession(testEmail, secret.secret, validCode);
      const sessionBefore = auth.loadSession(testEmail);

      // Refresh
      auth.refreshSession(testEmail);
      const sessionAfter = auth.loadSession(testEmail);

      // Core data should be preserved
      expect(sessionAfter?.email).toBe(sessionBefore?.email);
      expect(sessionAfter?.totpEnabled).toBe(sessionBefore?.totpEnabled);
    });
  });

  describe('Session Expiration Lifecycle', () => {
    it('should handle session lifecycle from creation to expiration', async () => {
      // Create session with very short TTL
      auth.saveSession(testEmail, {
        sessionToken: 'short_lived_token',
        expiresAt: Date.now() + 1000, // 1 second
        lastRefreshed: Date.now(),
      });

      // Should be active immediately
      expect(auth.loadSession(testEmail)).toBeDefined();

      // Should expire after timeout
      await new Promise((resolve) => setTimeout(resolve, 1100));

      // Should now be null (expired)
      expect(auth.loadSession(testEmail)).toBeNull();
    });

    it('should clear expired session from active list', async () => {
      // Create two sessions
      auth.saveSession('active@example.com', {
        sessionToken: 'active_token',
        expiresAt: Date.now() + 24 * 60 * 60 * 1000,
        lastRefreshed: Date.now(),
      });

      auth.saveSession('expired@example.com', {
        sessionToken: 'expired_token',
        expiresAt: Date.now() - 1000, // Already expired
        lastRefreshed: Date.now(),
      });

      const active = auth.getActiveSessions();

      // Only active session should be in list
      expect(active).toContain('active@example.com');
      expect(active).not.toContain('expired@example.com');
    });
  });
});
