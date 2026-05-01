import { logger } from './utils/logger';
import { CourseraClient } from './services/courseraClient';
import { CacheService } from './services/cache';
import { AuthService } from './services/auth';
import { searchCourses, searchPrograms } from './tools/search';
import { getCourseDetails, getProgramDetails } from './tools/details';
import { getEnrolledCourses, getProgress } from './tools/enrolled';
import { getRecommendations } from './tools/recommendations';
import { requireAuth } from './middleware/auth';
import path from 'path';
import type { SearchCourseParams, SearchProgramParams } from './types/schemas';

// Initialize services
const courseraClient = new CourseraClient();
const cacheDir = path.join(process.env.HOME || '~', '.coursera-mcp', 'cache');
const cache = new CacheService(cacheDir);
const masterPassword = process.env.COURSERA_MASTER_PASSWORD || 'default-master-key';
const authService = new AuthService(courseraClient, masterPassword);

logger.info('Coursera MCP services initialized', {
  services: ['CourseraClient', 'CacheService', 'AuthService'],
});

// Tool handlers
export const toolHandlers = {
  search_courses: async (params: SearchCourseParams & { query: string }) => {
    return searchCourses(courseraClient, cache, params);
  },

  search_programs: async (params: SearchProgramParams & { query: string }) => {
    return searchPrograms(courseraClient, cache, params);
  },

  get_course_details: async (courseId: string) => {
    return getCourseDetails(courseraClient, cache, courseId);
  },

  get_program_details: async (programId: string) => {
    return getProgramDetails(courseraClient, cache, programId);
  },

  get_enrolled_courses: async (_userId: string, params?: Record<string, unknown>) => {
    const context = requireAuth(authService);
    return getEnrolledCourses(courseraClient, cache, context.userId, params);
  },

  get_progress: async (_userId: string, courseId: string) => {
    const context = requireAuth(authService);
    return getProgress(courseraClient, cache, context.userId, courseId);
  },

  get_recommendations: async (_userId: string, params?: { limit?: number }) => {
    const context = requireAuth(authService);
    return getRecommendations(courseraClient, cache, context.userId, params);
  },
};

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
  process.exit(1);
});

export { courseraClient, cache, authService };
