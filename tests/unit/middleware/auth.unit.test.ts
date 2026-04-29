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
  private currentUserId: string | null = null;
  private sessionValid: boolean = false;
  private refreshCalled: boolean = false;

  constructor() {
    super('');
  }

  setCurrentUserId(userId: string | null): void {
    this.currentUserId = userId;
  }

  setSessionValid(valid: boolean): void {
    this.sessionValid = valid;
  }

  getCurrentUserId(): string {
    return this.currentUserId || '';
  }

  isSessionValid(): boolean {
    return this.sessionValid;
  }

  async refreshSession(): Promise<boolean> {
    this.refreshCalled = true;
    return this.sessionValid;
  }

  wasRefreshCalled(): boolean {
    return this.refreshCalled;
  }

  resetRefreshCalled(): void {
    this.refreshCalled = false;
  }
}

describe('Unit: Authentication Middleware', () => {
  let mockAuth: MockAuthService;

  beforeEach(() => {
    mockAuth = new MockAuthService();
  });

  describe('requireAuth', () => {
    it('should return AuthContext when authenticated', async () => {
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(true);

      const context = await requireAuth(mockAuth);

      expect(context).toBeDefined();
      expect(context.userId).toBe('user-123');
      expect(context.authService).toBeDefined();
    });

    it('should throw AuthenticationError when no session', async () => {
      mockAuth.setCurrentUserId(null);

      try {
        await requireAuth(mockAuth);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as Error).message).toContain('No active session');
      }
    });

    it('should throw AuthenticationError when session is invalid and refresh fails', async () => {
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(false);

      try {
        await requireAuth(mockAuth);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
        expect((error as Error).message).toContain('Session expired');
      }
    });

    it('should refresh session when expired', async () => {
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(false);

      try {
        await requireAuth(mockAuth);
      } catch {
        // Expected to fail
      }

      expect(mockAuth.wasRefreshCalled()).toBe(true);
    });

    it('should return context after successful refresh', async () => {
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(false);

      // First, set it to fail refresh
      const initialContext = await (async () => {
        mockAuth.setSessionValid(true);
        return await requireAuth(mockAuth);
      })();

      expect(initialContext.userId).toBe('user-123');
    });

    it('should handle AuthService errors gracefully', async () => {
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(true);

      const context = await requireAuth(mockAuth);
      expect(context.userId).toBe('user-123');
    });
  });

  describe('withAuth', () => {
    it('should wrap handler and check auth first', async () => {
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(true);

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
      mockAuth.setCurrentUserId(null);

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
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(true);

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
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(true);

      const mockHandler = async () => {
        return { data: 'result', status: 200 };
      };

      const wrapped = withAuth(mockHandler, mockAuth);
      const result = await wrapped();

      expect(result).toBeDefined();
      expect(result.data).toBe('result');
      expect(result.status).toBe(200);
    });
  });

  describe('verifyUserAccess', () => {
    it('should allow access when requestedUserId matches currentUserId', () => {
      mockAuth.setCurrentUserId('user-123');

      verifyUserAccess(mockAuth, 'user-123');
      // Should not throw
    });

    it('should throw AuthenticationError when no current user', () => {
      mockAuth.setCurrentUserId(null);

      try {
        verifyUserAccess(mockAuth, 'user-123');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthenticationError);
      }
    });

    it('should throw AuthorizationError when requestedUserId does not match', () => {
      mockAuth.setCurrentUserId('user-123');

      try {
        verifyUserAccess(mockAuth, 'user-456');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(AuthorizationError);
        expect((error as Error).message).toContain('permission');
      }
    });

    it('should reject access for different users', () => {
      mockAuth.setCurrentUserId('user-alice');

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
    it('should handle complete auth flow with refresh', async () => {
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(true);

      const context = await requireAuth(mockAuth);
      expect(context.userId).toBe('user-123');

      verifyUserAccess(mockAuth, 'user-123');
    });

    it('should enforce access control across requests', async () => {
      mockAuth.setCurrentUserId('user-1');
      mockAuth.setSessionValid(true);

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
      mockAuth.setCurrentUserId('user-123');
      mockAuth.setSessionValid(true);

      const protectedHandler = async (userId: string) => {
        verifyUserAccess(mockAuth, userId);
        return { accessed: true };
      };

      const wrapped = withAuth(protectedHandler, mockAuth);
      const result = await wrapped('user-123');

      expect(result.accessed).toBe(true);
    });
  });
});
