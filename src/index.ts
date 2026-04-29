import { logger } from './utils/logger';
import { CourseraClient } from './services/courseraClient';
import { CacheService } from './services/cache';
import { AuthService } from './services/auth';
import path from 'path';

// Initialize services
const courseraClient = new CourseraClient();
const cacheDir = path.join(process.env.HOME || '~', '.coursera-mcp', 'cache');
const cache = new CacheService(cacheDir);
const masterPassword = process.env.COURSERA_MASTER_PASSWORD || 'default-master-key';
const authService = new AuthService(courseraClient, masterPassword);

logger.info('Coursera MCP services initialized', {
  services: ['CourseraClient', 'CacheService', 'AuthService'],
});

// Tool handler stubs
export const toolHandlers = {
  search_courses: () => 'search_courses not yet implemented',
  search_programs: () => 'search_programs not yet implemented',
  get_course_details: () => 'get_course_details not yet implemented',
  get_program_details: () => 'get_program_details not yet implemented',
  get_enrolled_courses: () => 'get_enrolled_courses not yet implemented',
  get_progress: () => 'get_progress not yet implemented',
  get_recommendations: () => 'get_recommendations not yet implemented',
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
