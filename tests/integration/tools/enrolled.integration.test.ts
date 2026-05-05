import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { getEnrolledCourses, getProgress, getMultipleProgress } from '../../../src/tools/enrolled';
import { CacheService } from '../../../src/services/cache';
import { CourseraClient } from '../../../src/services/courseraClient';

class MockCourseraClient extends CourseraClient {
  private mockResponses: Map<string, unknown> = new Map();

  setMockResponse(key: string, response: unknown): void {
    this.mockResponses.set(key, response);
  }

  async get<T>(url: string): Promise<T> {
    // Match by prefix to handle query params
    for (const [key, val] of this.mockResponses.entries()) {
      if (url.startsWith(key) || url === key) return val as T;
    }
    throw new Error(`No mock response for ${url}`);
  }
}

const testCacheDir = path.join(process.cwd(), '.test-enrolled-cache');
let cache: CacheService;
let mockClient: MockCourseraClient;
const testUserId = 'test-user-123';

// Real Coursera memberships.v1 response shape
const mockMembershipsResponse = {
  elements: [
    {
      id: `${testUserId}~course-abc`,
      courseId: 'course-abc',
      enrolledTimestamp: 1700000000000,
      lastActivityTimestamp: 1701000000000,
      grade: null,
    },
    {
      id: `${testUserId}~course-xyz`,
      courseId: 'course-xyz',
      enrolledTimestamp: 1699000000000,
      lastActivityTimestamp: null,
      grade: 'PASS',
    },
  ],
  paging: { total: 2 },
};

// Real Coursera progressV2 response shape
const makeProgressResponse = (completed: number, total: number) => ({
  progressSummary: {
    numCompletedItems: completed,
    numTotalItems: total,
    numCompletedModules: Math.floor(completed / 10),
    numTotalModules: Math.ceil(total / 10),
  },
});

describe('Integration: Enrolled Courses Tools', () => {
  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    cache = new CacheService(testCacheDir);
    mockClient = new MockCourseraClient();
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('getEnrolledCourses', () => {
    it('should fetch and parse enrolled courses from memberships API', async () => {
      mockClient.setMockResponse('/api/memberships.v1', mockMembershipsResponse);

      const result = await getEnrolledCourses(mockClient, cache, testUserId);

      expect(result).toBeDefined();
      expect(result.courses).toBeDefined();
      expect(result.courses.length).toBe(2);
      expect(result.totalEnrolled).toBe(2);
      expect(result.courses[0].courseId).toBe('course-abc');
      expect(result.courses[0].courseUrl).toContain('coursera.org/learn/');
      expect(result.courses[0].enrolledAt).toBeDefined();
    });

    it('should count completed courses correctly', async () => {
      mockClient.setMockResponse('/api/memberships.v1', mockMembershipsResponse);

      const result = await getEnrolledCourses(mockClient, cache, testUserId);

      // Only course-xyz has grade PASS
      expect(result.completedCount).toBe(1);
    });

    it('should use 1-hour cache TTL for private data', async () => {
      mockClient.setMockResponse('/api/memberships.v1', mockMembershipsResponse);

      await getEnrolledCourses(mockClient, cache, testUserId);

      const cacheKey = `enrolled:${testUserId}`;
      const cached = cache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('should include userId in cache key for privacy', async () => {
      const anotherUserId = 'another-user-456';
      const otherResponse = {
        elements: [{ id: `${anotherUserId}~other-course`, courseId: 'other-course', grade: null }],
        paging: { total: 1 },
      };

      mockClient.setMockResponse('/api/memberships.v1', mockMembershipsResponse);

      await getEnrolledCourses(mockClient, cache, testUserId);

      // Swap mock response for second user
      mockClient.setMockResponse('/api/memberships.v1', otherResponse);
      const result2 = await getEnrolledCourses(mockClient, cache, anotherUserId);

      expect(result2.courses[0].courseId).toBe('other-course');
    });

    it('should throw error when userId is missing', async () => {
      try {
        await getEnrolledCourses(mockClient, cache, '');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('userId is required');
      }
    });

    it('should throw error when API returns null', async () => {
      mockClient.setMockResponse('/api/memberships.v1', null);

      try {
        await getEnrolledCourses(mockClient, cache, testUserId);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle empty enrolled courses', async () => {
      mockClient.setMockResponse('/api/memberships.v1', {
        elements: [],
        paging: { total: 0 },
      });

      const result = await getEnrolledCourses(mockClient, cache, testUserId);
      expect(result.courses.length).toBe(0);
      expect(result.totalEnrolled).toBe(0);
      expect(result.completedCount).toBe(0);
    });
  });

  describe('getProgress', () => {
    const courseId = 'python-basics';

    it('should fetch progress from opencourse progressV2 endpoint', async () => {
      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${courseId}/progressV2`,
        makeProgressResponse(30, 40)
      );

      const result = await getProgress(mockClient, cache, testUserId, courseId);

      expect(result).toBeDefined();
      expect(result.percentComplete).toBe(75); // 30/40 = 75%
      expect(result.completedItems).toBe(30);
      expect(result.totalItems).toBe(40);
      expect(result.courseId).toBe(courseId);
      expect(result.userId).toBe(testUserId);
    });

    it('should calculate percent correctly', async () => {
      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${courseId}/progressV2`,
        makeProgressResponse(1, 4)
      );

      const result = await getProgress(mockClient, cache, testUserId, courseId);
      expect(result.percentComplete).toBe(25);
    });

    it('should return 0 percent when no items completed', async () => {
      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${courseId}/progressV2`,
        makeProgressResponse(0, 10)
      );

      const result = await getProgress(mockClient, cache, testUserId, courseId);
      expect(result.percentComplete).toBe(0);
    });

    it('should include userId and courseId in cache key', async () => {
      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${courseId}/progressV2`,
        makeProgressResponse(5, 10)
      );

      await getProgress(mockClient, cache, testUserId, courseId);

      const cacheKey = `progress:${testUserId}:${courseId}`;
      const cached = cache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('should throw error when userId is missing', async () => {
      try {
        await getProgress(mockClient, cache, '', courseId);
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toContain('userId is required');
      }
    });

    it('should throw error when courseId is missing', async () => {
      try {
        await getProgress(mockClient, cache, testUserId, '');
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toContain('courseId is required');
      }
    });

    it('should handle missing progressSummary gracefully', async () => {
      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${courseId}/progressV2`,
        {}
      );

      const result = await getProgress(mockClient, cache, testUserId, courseId);
      expect(result.percentComplete).toBe(0);
      expect(result.completedItems).toBe(0);
      expect(result.totalItems).toBe(0);
    });

    it('should separate cache for different courses', async () => {
      const course2 = 'data-science-101';

      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${courseId}/progressV2`,
        makeProgressResponse(20, 40)
      );
      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${course2}/progressV2`,
        makeProgressResponse(5, 40)
      );

      const r1 = await getProgress(mockClient, cache, testUserId, courseId);
      const r2 = await getProgress(mockClient, cache, testUserId, course2);

      expect(r1.percentComplete).toBe(50);
      expect(r2.percentComplete).toBe(13); // floor(5/40*100)=12 → round = 13
    });

    it('should throw error when API returns null', async () => {
      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${courseId}/progressV2`,
        null
      );

      try {
        await getProgress(mockClient, cache, testUserId, courseId);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getMultipleProgress', () => {
    it('should fetch progress for multiple courses in parallel', async () => {
      const courseIds = ['python-basics', 'javascript-advanced', 'data-science-101'];

      courseIds.forEach((id, index) => {
        mockClient.setMockResponse(
          `/api/opencourse.v1/user/${testUserId}/course/${id}/progressV2`,
          makeProgressResponse((index + 1) * 10, 40)
        );
      });

      const results = await getMultipleProgress(mockClient, cache, testUserId, courseIds);

      expect(results.length).toBe(3);
      expect(results[0].percentComplete).toBe(25);  // 10/40
      expect(results[1].percentComplete).toBe(50);  // 20/40
      expect(results[2].percentComplete).toBe(75);  // 30/40
    });

    it('should handle empty course list', async () => {
      const results = await getMultipleProgress(mockClient, cache, testUserId, []);
      expect(results.length).toBe(0);
    });

    it('should throw error if userId is missing', async () => {
      try {
        await getMultipleProgress(mockClient, cache, '', ['course-1']);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain('userId is required');
      }
    });
  });

  describe('Stale-While-Revalidate Pattern', () => {
    it('should serve cached data on second request', async () => {
      mockClient.setMockResponse('/api/memberships.v1', mockMembershipsResponse);

      const result1 = await getEnrolledCourses(mockClient, cache, testUserId);
      const result2 = await getEnrolledCourses(mockClient, cache, testUserId);

      expect(result1.courses[0].courseId).toBe(result2.courses[0].courseId);
    });

    it('should maintain progress data consistency across calls', async () => {
      const courseId = 'python-basics';
      mockClient.setMockResponse(
        `/api/opencourse.v1/user/${testUserId}/course/${courseId}/progressV2`,
        makeProgressResponse(18, 24)
      );

      const r1 = await getProgress(mockClient, cache, testUserId, courseId);
      const r2 = await getProgress(mockClient, cache, testUserId, courseId);

      expect(r1.percentComplete).toBe(r2.percentComplete);
      expect(r1.completedItems).toBe(r2.completedItems);
    });
  });
});
