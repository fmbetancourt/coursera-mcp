import { logger } from '../utils/logger';
import { CourseraClient } from '../services/courseraClient';
import { CacheService } from '../services/cache';
import { parseCourse, parseProgram } from '../services/parser';
import type { Course, Program } from '../types/schemas';

export class NotFoundError extends Error {
  constructor(public resourceType: string, public resourceId: string) {
    super(`${resourceType} not found: ${resourceId}`);
    this.name = 'NotFoundError';
  }
}

export async function getCourseDetails(
  courseraClient: CourseraClient,
  cache: CacheService,
  courseId: string
): Promise<Course> {
  try {
    if (!courseId || courseId.length === 0) {
      throw new Error('courseId is required');
    }

    logger.info('Fetching course details', { courseId });

    // Create cache key
    const cacheKey = `course:${courseId}`;

    // Use stale-while-revalidate pattern
    const course = await cache.getWithStaleCache(
      cacheKey,
      async () => {
        // Fetch from API
        const apiResponse = await courseraClient.get<unknown>(
          `/api/courses/${courseId}`
        );

        if (!apiResponse) {
          throw new NotFoundError('Course', courseId);
        }

        // Parse course
        return parseCourse(apiResponse);
      },
      24 * 60 * 60 // 24 hour TTL
    );

    logger.info('Course details fetched', {
      courseId,
      name: course.name,
      level: course.level,
    });

    return course;
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn('Course not found', { courseId });
      throw error;
    }

    logger.error('Failed to fetch course details', {
      courseId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getProgramDetails(
  courseraClient: CourseraClient,
  cache: CacheService,
  programId: string
): Promise<Program> {
  try {
    if (!programId || programId.length === 0) {
      throw new Error('programId is required');
    }

    logger.info('Fetching program details', { programId });

    // Create cache key
    const cacheKey = `program:${programId}`;

    // Use stale-while-revalidate pattern
    const program = await cache.getWithStaleCache(
      cacheKey,
      async () => {
        // Fetch from API
        const apiResponse = await courseraClient.get<unknown>(
          `/api/programs/${programId}`
        );

        if (!apiResponse) {
          throw new NotFoundError('Program', programId);
        }

        // Parse program
        return parseProgram(apiResponse);
      },
      24 * 60 * 60 // 24 hour TTL
    );

    logger.info('Program details fetched', {
      programId,
      name: program.name,
      type: program.type,
      courseCount: program.courses.length,
    });

    return program;
  } catch (error) {
    if (error instanceof NotFoundError) {
      logger.warn('Program not found', { programId });
      throw error;
    }

    logger.error('Failed to fetch program details', {
      programId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getMultipleCourseDetails(
  courseraClient: CourseraClient,
  cache: CacheService,
  courseIds: string[]
): Promise<Course[]> {
  try {
    logger.info('Fetching details for multiple courses', { count: courseIds.length });

    const courses = await Promise.all(
      courseIds.map((id) => getCourseDetails(courseraClient, cache, id))
    );

    logger.info('Multiple course details fetched', { count: courses.length });
    return courses;
  } catch (error) {
    logger.error('Failed to fetch multiple course details', {
      count: courseIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getMultipleProgramDetails(
  courseraClient: CourseraClient,
  cache: CacheService,
  programIds: string[]
): Promise<Program[]> {
  try {
    logger.info('Fetching details for multiple programs', { count: programIds.length });

    const programs = await Promise.all(
      programIds.map((id) => getProgramDetails(courseraClient, cache, id))
    );

    logger.info('Multiple program details fetched', { count: programs.length });
    return programs;
  } catch (error) {
    logger.error('Failed to fetch multiple program details', {
      count: programIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
