import { describe, it, expect, beforeEach } from 'bun:test';
import { AuthService } from '../../../src/services/auth';
import {
  requireAuth,
  withAuth,
  verifyUserAccess,
  AuthenticationError,
  AuthorizationError,
  AuthContext,
} from '../../../src/middleware/auth';

class MockAuthService extends AuthService {
  private activeSessions: string[] = [];

  constructor() {
    super('');
  }

  setActiveSessions(sessions: string[]): void {
    this.activeSessions = sessions;
  }

  getActiveSessions(): string[] {
    return this.activeSessions;
  }
}

describe('Unit: Authentication Middleware', () => {
  let mockAuth: MockAuthService;

  beforeEach(() => {
    mockAuth = new MockAuthService();
  });

  describe('requireAuth', () => {
    it('should return AuthContext when authenticated', () => {
      mockAuth.setActiveSessions(['user-123']);

      const context = requireAuth(mockAuth);

      expect(context).toBeDefined();
      expect(context.userId).toBe('user-123');
      expect(context.authService).toBeDefined();
    });

    it('should throw AuthenticationError when no session', () => {
      mockAuth.setActiveSessions([]);

      try {
        requireAuth(mockAuth);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as Error).message).toContain('No active session');
      }
    });

    it('should return context with first active session', () => {
      mockAuth.setActiveSessions(['user-123', 'user-456']);

      const context = requireAuth(mockAuth);

      expect(context.userId).toBe('user-123');
    });

    it('should handle empty sessions array', () => {
      mockAuth.setActiveSessions([]);

      try {
        requireAuth(mockAuth);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
      }
    });

    it('should return context when sessions exist', () => {
      mockAuth.setActiveSessions(['user-123']);

      const context = requireAuth(mockAuth);
      expect(context).toBeDefined();
    });
  });

  describe('withAuth', () => {
    it('should wrap handler and check auth first', async () => {
      mockAuth.setActiveSessions(['user-123']);

      let handlerCalled = false;
      const mockHandler = async () => {
        handlerCalled = true;
        return 'success';
      };

      const wrapped = withAuth(mockHandler, mockAuth);
      const result = await wrapped();

      expect(handlerCalled).toBe(true);
      expect(result).toBe('success');
    });

    it('should not call handler if auth fails', async () => {
      mockAuth.setActiveSessions([]);

      let handlerCalled = false;
      const mockHandler = async () => {
        handlerCalled = true;
        return 'success';
      };

      const wrapped = withAuth(mockHandler, mockAuth);

      try {
        await wrapped();
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect(handlerCalled).toBe(false);
      }
    });

    it('should pass arguments to handler', async () => {
      mockAuth.setActiveSessions(['user-123']);

      let receivedArg: string | null = null;
      const mockHandler = async (arg: string) => {
        receivedArg = arg;
        return `echo: ${arg}`;
      };

      const wrapped = withAuth(mockHandler, mockAuth);
      const result = await wrapped('test-arg');

      expect(receivedArg).toBe('test-arg');
      expect(result).toBe('echo: test-arg');
    });

    it('should return handler result', async () => {
      mockAuth.setActiveSessions(['user-123']);

      const mockHandler = async () => {
        return { data: 'result', status: 200 };
      };

      const wrapped = withAuth(mockHandler, mockAuth);
      const result = await wrapped();

      expect(result).toBeDefined();
      expect((result as Record<string, unknown>).data).toBe('result');
      expect((result as Record<string, unknown>).status).toBe(200);
    });
  });

  describe('verifyUserAccess', () => {
    it('should allow access when requestedUserId matches currentUserId', () => {
      mockAuth.setActiveSessions(['user-123']);

      verifyUserAccess(mockAuth, 'user-123');
      // Should not throw
    });

    it('should throw AuthenticationError when no current user', () => {
      mockAuth.setActiveSessions([]);

      try {
        verifyUserAccess(mockAuth, 'user-123');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
      }
    });

    it('should throw AuthorizationError when requestedUserId does not match', () => {
      mockAuth.setActiveSessions(['user-123']);

      try {
        verifyUserAccess(mockAuth, 'user-456');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError);
        expect((error as Error).message).toContain('permission');
      }
    });

    it('should reject access for different users', () => {
      mockAuth.setActiveSessions(['user-alice']);

      try {
        verifyUserAccess(mockAuth, 'user-bob');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError);
      }
    });
  });

  describe('Error Types', () => {
    it('should have proper error name for AuthenticationError', () => {
      const error = new AuthenticationError('test');
      expect(error.name).toBe('AuthenticationError');
      expect(error instanceof Error).toBe(true);
    });

    it('should have proper error name for AuthorizationError', () => {
      const error = new AuthorizationError('test');
      expect(error.name).toBe('AuthorizationError');
      expect(error instanceof Error).toBe(true);
    });
  });

  describe('Integration Scenarios', () => {
    it('should handle complete auth flow', async () => {
      mockAuth.setActiveSessions(['user-123']);

      const context = await requireAuth(mockAuth);
      expect(context.userId).toBe('user-123');

      verifyUserAccess(mockAuth, 'user-123');
    });

    it('should enforce access control across requests', async () => {
      mockAuth.setActiveSessions(['user-1']);

      // Allow access for own data
      verifyUserAccess(mockAuth, 'user-1');

      // Deny access for other users data
      try {
        verifyUserAccess(mockAuth, 'user-2');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError);
      }
    });

    it('should combine withAuth and verifyUserAccess', async () => {
      mockAuth.setActiveSessions(['user-123']);

      const protectedHandler = async (userId: string) => {
        verifyUserAccess(mockAuth, userId);
        return { accessed: true };
      };

      const wrapped = withAuth(protectedHandler, mockAuth);
      const result = await wrapped('user-123');

      expect((result as Record<string, unknown>).accessed).toBe(true);
    });
  });
});
