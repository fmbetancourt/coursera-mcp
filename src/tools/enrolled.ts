import { logger } from '../utils/logger';
import { CourseraClient } from '../services/courseraClient';
import { CacheService } from '../services/cache';
import { parseEnrolledCourses, parseProgress } from '../services/parser';
import type { EnrolledCourse, Progress } from '../types/schemas';

export interface EnrolledCoursesResult {
  courses: EnrolledCourse[];
  totalEnrolled: number;
  completedCount: number;
}

export interface EnrolledCoursesParams {
  includeProgress?: boolean;
  includeUpcoming?: boolean;
}

export async function getEnrolledCourses(
  courseraClient: CourseraClient,
  cache: CacheService,
  userId: string,
  _params?: EnrolledCoursesParams
): Promise<EnrolledCoursesResult> {
  try {
    if (!userId || userId.length === 0) {
      throw new Error('userId is required');
    }

    logger.info('Fetching enrolled courses', { userId });

    // Create cache key - includes userId for privacy
    const cacheKey = `enrolled:${userId}`;

    // Use stale-while-revalidate pattern with shorter TTL for private data (1h)
    const result = await cache.getWithStaleCache(
      cacheKey,
      async () => {
        // Fetch from API
        const apiResponse = await courseraClient.get<{
          enrolledCourses: unknown[];
          meta: { totalEnrolled: number; completedCount: number };
        }>(`/api/users/${userId}/enrolled-courses`);

        if (!apiResponse) {
          throw new Error('Failed to fetch enrolled courses');
        }

        // Parse enrolled courses
        const enrolledCourses = parseEnrolledCourses(apiResponse.enrolledCourses || []);

        return {
          courses: enrolledCourses,
          totalEnrolled: apiResponse.meta?.totalEnrolled || 0,
          completedCount: apiResponse.meta?.completedCount || 0,
        };
      },
      1 * 60 * 60 // 1 hour TTL for private data
    );

    logger.info('Enrolled courses fetched', {
      userId,
      count: result.courses.length,
      completed: result.completedCount,
    });

    return result;
  } catch (error) {
    logger.error('Failed to fetch enrolled courses', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getProgress(
  courseraClient: CourseraClient,
  cache: CacheService,
  userId: string,
  courseId: string
): Promise<Progress> {
  try {
    if (!userId || userId.length === 0) {
      throw new Error('userId is required');
    }

    if (!courseId || courseId.length === 0) {
      throw new Error('courseId is required');
    }

    logger.info('Fetching course progress', { userId, courseId });

    // Create cache key including userId for privacy
    const cacheKey = `progress:${userId}:${courseId}`;

    // Use stale-while-revalidate pattern with 1h TTL
    const progress = await cache.getWithStaleCache(
      cacheKey,
      async () => {
        // Fetch from API
        const apiResponse = await courseraClient.get<unknown>(
          `/api/users/${userId}/courses/${courseId}/progress`
        );

        if (!apiResponse) {
          throw new Error('Failed to fetch progress');
        }

        // Parse progress
        return parseProgress(apiResponse);
      },
      1 * 60 * 60 // 1 hour TTL for private data
    );

    logger.info('Progress fetched', {
      userId,
      courseId,
      percent: progress.percent,
      currentWeek: progress.currentWeek,
    });

    return progress;
  } catch (error) {
    logger.error('Failed to fetch progress', {
      userId,
      courseId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

export async function getMultipleProgress(
  courseraClient: CourseraClient,
  cache: CacheService,
  userId: string,
  courseIds: string[]
): Promise<Progress[]> {
  try {
    logger.info('Fetching progress for multiple courses', {
      userId,
      count: courseIds.length,
    });

    const progressList = await Promise.all(
      courseIds.map((id) => getProgress(courseraClient, cache, userId, id))
    );

    logger.info('Multiple progress fetched', {
      userId,
      count: progressList.length,
    });

    return progressList;
  } catch (error) {
    logger.error('Failed to fetch multiple progress', {
      userId,
      count: courseIds.length,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}
