import { logger } from '../utils/logger';
import { sanitizeForLogging } from '../utils/logSanitizer';
import { CourseraClient } from '../services/courseraClient';
import { CacheService } from '../services/cache';
import { parseCourses } from '../services/parser';
import { SearchCourseParamsSchema, SearchProgramParamsSchema } from '../types/schemas';
import type { Course, Program, SearchCourseParams, SearchProgramParams } from '../types/schemas';

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  query: string;
}

export async function searchCourses(
  courseraClient: CourseraClient,
  cache: CacheService,
  params: SearchCourseParams & { query: string }
): Promise<SearchResult<Course>> {
  try {
    // Validate inputs
    const validatedParams = SearchCourseParamsSchema.parse(params);

    logger.info('Searching courses', sanitizeForLogging({ query: params.query }));

    // Create cache key from params
    const cacheKey = `search:courses:${JSON.stringify(validatedParams)}`;

    // Use stale-while-revalidate pattern
    const result = await cache.getWithStaleCache(
      cacheKey,
      async () => {
        // Fetch from API
        const apiResponse = await courseraClient.get<{
          courses: unknown[];
          meta: { total: number };
        }>('/api/search/courses', {
          params: {
            q: validatedParams.query,
            level: validatedParams.level,
            language: validatedParams.language,
            limit: validatedParams.limit,
            offset: validatedParams.offset,
            sort: validatedParams.sortBy,
            order: validatedParams.sortOrder,
          },
        });

        if (!apiResponse) {
          throw new Error('Failed to fetch courses from API');
        }

        // Parse courses
        const courses = parseCourses(apiResponse.courses || []);

        return {
          items: courses,
          total: apiResponse.meta?.total || 0,
          hasMore: (validatedParams.offset || 0) + (validatedParams.limit || 20) < (apiResponse.meta?.total || 0),
          query: validatedParams.query || '',
        };
      },
      24 * 60 * 60 // 24 hour TTL for search results
    );

    logger.info('Search completed', {
      query: params.query,
      resultsCount: result.items.length,
      total: result.total,
    });

    return result;
  } catch (error) {
    logger.error('Course search failed', {
      query: params.query,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function searchPrograms(
  courseraClient: CourseraClient,
  cache: CacheService,
  params: SearchProgramParams & { query: string }
): Promise<SearchResult<Program>> {
  try {
    // Validate inputs
    const validatedParams = SearchProgramParamsSchema.parse(params);

    logger.info('Searching programs', sanitizeForLogging({ query: params.query }));

    // Create cache key from params
    const cacheKey = `search:programs:${JSON.stringify(validatedParams)}`;

    // Use stale-while-revalidate pattern
    const result = await cache.getWithStaleCache(
      cacheKey,
      async () => {
        // Fetch from API
        const apiResponse = await courseraClient.get<{
          programs: unknown[];
          meta: { total: number };
        }>('/api/search/programs', {
          params: {
            q: validatedParams.query,
            type: validatedParams.type,
            limit: validatedParams.limit,
            offset: validatedParams.offset,
            sort: validatedParams.sortBy,
            order: validatedParams.sortOrder,
          },
        });

        if (!apiResponse) {
          throw new Error('Failed to fetch programs from API');
        }

        // Parse programs - need to handle each program's courses
        const programs = (apiResponse.programs || []).map((raw: unknown) => {
          const program = raw as Record<string, unknown>;
          return {
            ...program,
            // Ensure courses are properly structured for parsing
            courses: Array.isArray(program.courses) ? program.courses : [],
          };
        });

        // Import parsePrograms here to avoid circular dependency
        const { parsePrograms } = await import('../services/parser');
        const parsedPrograms = parsePrograms(programs);

        return {
          items: parsedPrograms,
          total: apiResponse.meta?.total || 0,
          hasMore: (validatedParams.offset || 0) + (validatedParams.limit || 20) < (apiResponse.meta?.total || 0),
          query: validatedParams.query || '',
        };
      },
      24 * 60 * 60 // 24 hour TTL for search results
    );

    logger.info('Program search completed', {
      query: params.query,
      resultsCount: result.items.length,
      total: result.total,
    });

    return result;
  } catch (error) {
    logger.error('Program search failed', {
      query: params.query,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
