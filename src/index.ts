import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from '@modelcontextprotocol/sdk/types.js';
import { logger } from './utils/logger.js';
import { CourseraClient } from './services/courseraClient.js';
import { CacheService } from './services/cache.js';
import { AuthService } from './services/auth.js';
import { searchCourses, searchPrograms } from './tools/search.js';
import { getCourseDetails, getProgramDetails } from './tools/details.js';
import { getEnrolledCourses, getProgress } from './tools/enrolled.js';
import { getRecommendations } from './tools/recommendations.js';
import { requireAuth, AuthenticationError } from './middleware/auth.js';
import path from 'path';

// Initialize services
const courseraClient = new CourseraClient();
const cacheDir = path.join(process.env.HOME || '~', '.coursera-mcp', 'cache');
const cache = new CacheService(cacheDir);
const masterPassword = process.env.COURSERA_MASTER_PASSWORD || 'default-master-key';
const authService = new AuthService(courseraClient, masterPassword);

logger.info('Coursera MCP services initialized');

// Create MCP server
const server = new Server(
  { name: 'coursera-mcp', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

// Register tool definitions (tools/list)
// eslint-disable-next-line @typescript-eslint/require-await
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_courses',
      description: 'Search for courses on Coursera by keyword, category, level, or language',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (e.g. "Python", "Machine Learning")' },
          category: { type: 'string', description: 'Category filter (e.g. "Computer Science")' },
          language: { type: 'string', description: 'Language filter (e.g. "English", "Spanish")' },
          level: {
            type: 'string',
            enum: ['beginner', 'intermediate', 'advanced', 'mixed'],
            description: 'Difficulty level',
          },
          limit: { type: 'number', description: 'Max results to return (1–50, default 10)' },
          sortBy: {
            type: 'string',
            enum: ['relevance', 'rating', 'enrollments'],
            description: 'Sort order',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'search_programs',
      description: 'Search for Coursera programs: specializations, professional certificates, or degrees',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query' },
          type: {
            type: 'string',
            enum: ['specialization', 'professional-certificate', 'degree'],
            description: 'Program type filter',
          },
          institution: { type: 'string', description: 'Filter by institution (e.g. "Google", "Stanford")' },
          limit: { type: 'number', description: 'Max results (1–50, default 10)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_course_details',
      description: 'Get full details for a specific Coursera course including syllabus, instructors, and ratings',
      inputSchema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Coursera course ID or slug' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_program_details',
      description: 'Get full details for a Coursera program including all courses, duration, and requirements',
      inputSchema: {
        type: 'object',
        properties: {
          programId: { type: 'string', description: 'Coursera program ID or slug' },
        },
        required: ['programId'],
      },
    },
    {
      name: 'get_enrolled_courses',
      description: 'Get the list of courses you are currently enrolled in (requires authentication)',
      inputSchema: {
        type: 'object',
        properties: {
          includeProgress: {
            type: 'boolean',
            description: 'Include progress data for each course (default: true)',
          },
        },
      },
    },
    {
      name: 'get_progress',
      description: 'Get detailed progress for a specific enrolled course (requires authentication)',
      inputSchema: {
        type: 'object',
        properties: {
          courseId: { type: 'string', description: 'Course ID to get progress for' },
        },
        required: ['courseId'],
      },
    },
    {
      name: 'get_recommendations',
      description: 'Get personalized course recommendations based on your enrollment history (requires authentication)',
      inputSchema: {
        type: 'object',
        properties: {
          limit: { type: 'number', description: 'Number of recommendations (default: 10)' },
        },
      },
    },
  ],
}));

// Handle tool calls (tools/call)
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    let result: unknown;

    switch (name) {
      case 'search_courses':
        result = await searchCourses(courseraClient, cache, args as Parameters<typeof searchCourses>[2]);
        break;

      case 'search_programs':
        result = await searchPrograms(courseraClient, cache, args as Parameters<typeof searchPrograms>[2]);
        break;

      case 'get_course_details': {
        const { courseId } = args as { courseId: string };
        result = await getCourseDetails(courseraClient, cache, courseId);
        break;
      }

      case 'get_program_details': {
        const { programId } = args as { programId: string };
        result = await getProgramDetails(courseraClient, cache, programId);
        break;
      }

      case 'get_enrolled_courses': {
        const context = requireAuth(authService);
        result = await getEnrolledCourses(courseraClient, cache, context.userId, args as Record<string, unknown>);
        break;
      }

      case 'get_progress': {
        const { courseId } = args as { courseId: string };
        const context = requireAuth(authService);
        result = await getProgress(courseraClient, cache, context.userId, courseId);
        break;
      }

      case 'get_recommendations': {
        const context = requireAuth(authService);
        result = await getRecommendations(courseraClient, cache, context.userId, args as { limit?: number });
        break;
      }

      default:
        throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
    }

    return {
      content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
    };
  } catch (error: unknown) {
    if (error instanceof McpError) throw error;

    if (error instanceof AuthenticationError) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        `Authentication required. Run "coursera-mcp init" to set up 2FA. Error: ${error.message}`
      );
    }

    const message = error instanceof Error ? error.message : String(error);
    logger.error('Tool call failed', { tool: name, error: message });
    throw new McpError(ErrorCode.InternalError, `Tool "${name}" failed: ${message}`);
  }
});

// Global error handlers
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  process.exit(1);
});

process.on('unhandledRejection', (reason: unknown) => {
  logger.error('Unhandled rejection', { reason: String(reason) });
  process.exit(1);
});

// Exports for testing — toolHandlers mirrors the MCP tool registry for unit/e2e tests
export const toolHandlers = {
  search_courses: (params: Parameters<typeof searchCourses>[2]) =>
    searchCourses(courseraClient, cache, params),
  search_programs: (params: Parameters<typeof searchPrograms>[2]) =>
    searchPrograms(courseraClient, cache, params),
  get_course_details: (courseId: string) =>
    getCourseDetails(courseraClient, cache, courseId),
  get_program_details: (programId: string) =>
    getProgramDetails(courseraClient, cache, programId),
  get_enrolled_courses: (_userId: string, params?: Record<string, unknown>) => {
    const context = requireAuth(authService);
    return getEnrolledCourses(courseraClient, cache, context.userId, params);
  },
  get_progress: (_userId: string, courseId: string) => {
    const context = requireAuth(authService);
    return getProgress(courseraClient, cache, context.userId, courseId);
  },
  get_recommendations: (_userId: string, params?: { limit?: number }) => {
    const context = requireAuth(authService);
    return getRecommendations(courseraClient, cache, context.userId, params);
  },
};

export { courseraClient, cache, authService };

// Self-invoking main — avoids top-level await (required for --format=cjs esbuild output)
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  logger.info('Coursera MCP server started and listening on stdio');
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  process.stderr.write(`Fatal: failed to start coursera-mcp server: ${message}\n`);
  process.exit(1);
});
