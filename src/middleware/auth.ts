/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { AuthService } from '../services/auth';
import { logger } from '../utils/logger';

export interface AuthContext {
  userId: string;
  authService: AuthService;
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export function requireAuth(
  authService: AuthService
): AuthContext {
  try {
    const activeSessions = authService.getActiveSessions();

    if (!activeSessions || activeSessions.length === 0) {
      logger.error('Authentication required but no active session', {});
      throw new AuthenticationError('No active session. Please authenticate first.');
    }

    const userId = activeSessions[0];

    // Check if session is expiring soon (within 5 minutes)
    if (authService.isSessionExpiringSoon(userId, 5)) {
      logger.info('Session expiring soon, attempting auto-refresh', { userId });
      try {
        // Note: This is sync context, so we can't use async refreshSessionWithAPI here
        // The refresh happens on next request, or implement a sync refresh method
        authService.refreshSession(userId);
        logger.info('Session auto-refreshed successfully', { userId });
      } catch (refreshError) {
        logger.warn('Session auto-refresh failed', {
          userId,
          error: refreshError instanceof Error ? refreshError.message : String(refreshError),
        });
        // Continue with current session even if refresh fails
        // The next refresh attempt will try again
      }
    }

    logger.info('Authentication successful', { userId });

    return {
      userId,
      authService,
    };
  } catch (error: unknown) {
    if (error instanceof AuthenticationError || error instanceof AuthorizationError) {
      throw error;
    }

    logger.error('Authentication check failed', {
      error: error instanceof Error ? error.message : String(error),
    });

    throw new AuthenticationError('Authentication failed. Please try again.');
  }
}

export function withAuth<Args extends unknown[], Result>(
  handler: (...args: Args) => Promise<Result>,
  authService: AuthService
) {
  return async (...args: Args): Promise<Result> => {
    requireAuth(authService);
    return handler(...args);
  };
}

export function verifyUserAccess(
  authService: AuthService,
  requestedUserId: string
): void {
  const activeSessions = authService.getActiveSessions();

  if (!activeSessions || activeSessions.length === 0) {
    throw new AuthenticationError('No active session.');
  }

  const currentUserId = activeSessions[0];

  if (currentUserId !== requestedUserId) {
    logger.warn('Unauthorized access attempt', {
      requestedUserId,
      currentUserId,
    });

    throw new AuthorizationError('You do not have permission to access this resource.');
  }
}
