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

export async function requireAuth(
  authService: AuthService
): Promise<AuthContext> {
  try {
    const userId = authService.getCurrentUserId();

    if (!userId) {
      logger.error('Authentication required but no active session', {});
      throw new AuthenticationError('No active session. Please authenticate first.');
    }

    const isValid = authService.isSessionValid();
    if (!isValid) {
      logger.info('Session expired, attempting refresh', { userId });
      const refreshed = await (authService.refreshSession() as Promise<boolean>);

      if (!refreshed) {
        logger.error('Failed to refresh session', { userId });
        throw new AuthenticationError('Session expired. Please re-authenticate.');
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
    await requireAuth(authService);
    return handler(...args);
  };
}

export function verifyUserAccess(
  authService: AuthService,
  requestedUserId: string
): void {
  const currentUserId = authService.getCurrentUserId();

  if (!currentUserId) {
    throw new AuthenticationError('No active session.');
  }

  if (currentUserId !== requestedUserId) {
    logger.warn('Unauthorized access attempt', {
      requestedUserId,
      currentUserId,
    });

    throw new AuthorizationError('You do not have permission to access this resource.');
  }
}
