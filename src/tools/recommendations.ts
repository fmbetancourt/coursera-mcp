import { logger } from '../utils/logger';
import { CourseraClient } from '../services/courseraClient';
import { CacheService } from '../services/cache';
import { parseCourses } from '../services/parser';
import type { Course } from '../types/schemas';

export interface RecommendedCourse extends Course {
  recommendationReason: string;
  matchScore?: number;
}

export interface RecommendationsResult {
  courses: RecommendedCourse[];
  reason: string;
}

export interface RecommendationsParams {
  limit?: number;
}

export async function getRecommendations(
  courseraClient: CourseraClient,
  cache: CacheService,
  userId: string,
  params?: RecommendationsParams
): Promise<RecommendationsResult> {
  try {
    if (!userId || userId.length === 0) {
      throw new Error('userId is required');
    }

    const limit = params?.limit !== undefined ? params.limit : 10;

    if (limit < 1 || limit > 100) {
      throw new Error('limit must be between 1 and 100');
    }

    logger.info('Fetching recommendations', { userId, limit });

    // Create cache key - includes userId for privacy
    const cacheKey = `recommendations:${userId}`;

    // Use stale-while-revalidate pattern with longer TTL (6h)
    // Recommendations are less personal than progress, but still private
    const result = await cache.getWithStaleCache(
      cacheKey,
      async () => {
        // Fetch from API
        const apiResponse = await courseraClient.get<{
          recommendations: unknown[];
          reason: string;
        }>(`/api/users/${userId}/recommendations`, {
          params: { limit },
        });

        if (!apiResponse) {
          throw new Error('Failed to fetch recommendations');
        }

        // Parse courses
        const courses = parseCourses(apiResponse.recommendations || []) as RecommendedCourse[];

        // Add recommendation reasons (v1.0: simple, v2.0: would use ML)
        const recommendedCoursesWithReason = courses.map((course, index) => ({
          ...course,
          recommendationReason: generateRecommendationReason(course, index),
          matchScore: calculateMatchScore(course),
        }));

        return {
          courses: recommendedCoursesWithReason.slice(0, limit),
          reason: apiResponse.reason || 'Based on your learning history and skills',
        };
      },
      6 * 60 * 60 // 6 hour TTL for recommendations
    );

    logger.info('Recommendations fetched', {
      userId,
      count: result.courses.length,
      reason: result.reason,
    });

    return result;
  } catch (error) {
    logger.error('Failed to fetch recommendations', {
      userId,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Simple recommendation reason generation (v1.0)
 * In v2.0, this would use machine learning based on user preferences
 */
function generateRecommendationReason(course: Course, position: number): string {
  if (position === 0) {
    return 'Top match for your skill level';
  }

  if (course.rating && course.rating > 4.7) {
    return 'Highly rated by learners like you';
  }

  if (course.enrollments > 100000) {
    return 'Popular course in your interest area';
  }

  if (course.skills && course.skills.length > 0) {
    return `Teaches ${course.skills[0].name} skills`;
  }

  return 'Recommended based on your profile';
}

/**
 * Simple match score calculation (v1.0)
 * In v2.0, this would use ML algorithms
 */
function calculateMatchScore(course: Course): number {
  let score = 50; // Base score

  // Rating factor
  if (course.rating) {
    score += Math.min(course.rating * 10, 25);
  }

  // Popularity factor
  if (course.enrollments > 50000) {
    score += 10;
  } else if (course.enrollments > 10000) {
    score += 5;
  }

  // Level factor (assuming intermediate users)
  if (course.level === 'intermediate') {
    score += 10;
  }

  return Math.min(score, 100);
}
