import { logger } from '../utils/logger.js';
import { CourseraClient } from '../services/courseraClient.js';
import { CacheService } from '../services/cache.js';

// Real Coursera membership response shape from /api/memberships.v1?q=me
interface CourseraMembership {
  id: string; // "userId~courseId"
  courseId: string;
  enrolledTimestamp?: number;
  lastActivityTimestamp?: number;
  grade?: string;
}

interface MembershipsResponse {
  elements: CourseraMembership[];
  paging?: { total?: number };
}

// Real Coursera progress response from /api/opencourse.v1/user/{userId}/course/{slug}/progressV2
interface CourseProgressV2 {
  progressSummary?: {
    numCompletedItems?: number;
    numTotalItems?: number;
    numCompletedModules?: number;
    numTotalModules?: number;
  };
}

export interface EnrolledCoursesResult {
  courses: Array<{
    courseId: string;
    membershipId: string;
    enrolledAt: string | null;
    lastActivityAt: string | null;
    grade: string | null;
    courseUrl: string;
  }>;
  totalEnrolled: number;
  completedCount: number;
}

export interface ProgressResult {
  courseId: string;
  userId: string;
  completedItems: number;
  totalItems: number;
  completedModules: number;
  totalModules: number;
  percentComplete: number;
}

export async function getEnrolledCourses(
  courseraClient: CourseraClient,
  cache: CacheService,
  userId: string,
  _params?: Record<string, unknown>
): Promise<EnrolledCoursesResult> {
  if (!userId?.trim()) throw new Error('userId is required');

  logger.info('Fetching enrolled courses', { userId });

  const cacheKey = `enrolled:${userId}`;

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      const response = await courseraClient.get<MembershipsResponse>(
        '/api/memberships.v1?q=me&includes=courseId,grade&fields=courseId,enrolledTimestamp,lastActivityTimestamp,grade&limit=100'
      );

      if (!response) throw new Error('Failed to fetch enrollments from Coursera');

      const memberships = response.elements ?? [];
      const completed = memberships.filter(
        (m) => m.grade === 'PASS' || m.grade === 'DISTINCTION'
      );

      const courses = memberships.map((m) => ({
        courseId: m.courseId,
        membershipId: m.id,
        enrolledAt: m.enrolledTimestamp ? new Date(m.enrolledTimestamp).toISOString() : null,
        lastActivityAt: m.lastActivityTimestamp ? new Date(m.lastActivityTimestamp).toISOString() : null,
        grade: m.grade ?? null,
        courseUrl: `https://www.coursera.org/learn/${m.courseId}`,
      }));

      return {
        courses,
        totalEnrolled: response.paging?.total ?? courses.length,
        completedCount: completed.length,
      };
    },
    60 * 60 // 1 hour TTL for private data
  );
}

export async function getProgress(
  courseraClient: CourseraClient,
  cache: CacheService,
  userId: string,
  courseId: string
): Promise<ProgressResult> {
  if (!userId?.trim()) throw new Error('userId is required');
  if (!courseId?.trim()) throw new Error('courseId is required');

  logger.info('Fetching course progress', { userId, courseId });

  const cacheKey = `progress:${userId}:${courseId}`;

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      const response = await courseraClient.get<{ progressSummary?: CourseProgressV2['progressSummary'] }>(
        `/api/opencourse.v1/user/${encodeURIComponent(userId)}/course/${encodeURIComponent(courseId)}/progressV2?fields=progressSummary`
      );

      if (!response) throw new Error('Failed to fetch progress from Coursera');

      const summary = response.progressSummary ?? {};
      const completed = summary.numCompletedItems ?? 0;
      const total = summary.numTotalItems ?? 0;
      const percent = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        courseId,
        userId,
        completedItems: completed,
        totalItems: total,
        completedModules: summary.numCompletedModules ?? 0,
        totalModules: summary.numTotalModules ?? 0,
        percentComplete: percent,
      };
    },
    60 * 60 // 1 hour TTL
  );
}

export async function getMultipleProgress(
  courseraClient: CourseraClient,
  cache: CacheService,
  userId: string,
  courseIds: string[]
): Promise<ProgressResult[]> {
  if (!userId?.trim()) throw new Error('userId is required');

  logger.info('Fetching progress for multiple courses', { userId, count: courseIds.length });

  return Promise.all(courseIds.map((id) => getProgress(courseraClient, cache, userId, id)));
}
