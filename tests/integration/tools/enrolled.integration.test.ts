import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { getEnrolledCourses, getProgress, getMultipleProgress } from '../../../src/tools/enrolled';
import { CacheService } from '../../../src/services/cache';
import { CourseraClient } from '../../../src/services/courseraClient';
import { mockEnrolledCourses, mockProgress, mockPrograms } from '../../fixtures';

// Mock CourseraClient for integration tests
class MockCourseraClient extends CourseraClient {
  private mockResponses: Map<string, unknown> = new Map();

  constructor() {
    super('https://api.coursera.org', '');
  }

  setMockResponse(key: string, response: unknown): void {
    this.mockResponses.set(key, response);
  }

  getMockResponse(key: string): unknown | undefined {
    return this.mockResponses.get(key);
  }

  async get<T>(url: string, config?: any): Promise<T> {
    const response = this.getMockResponse(url);
    if (!response) {
      throw new Error(`No mock response for ${url}`);
    }
    return response as T;
  }
}

const testCacheDir = path.join(process.cwd(), '.test-enrolled-cache');
let cache: CacheService;
let mockClient: MockCourseraClient;
const testUserId = 'test-user-123';

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
    it('should fetch and parse enrolled courses', async () => {
      const mockResponse = {
        enrolledCourses: mockEnrolledCourses.slice(0, 2),
        meta: {
          totalEnrolled: 5,
          completedCount: 1,
        },
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/enrolled-courses`,
        mockResponse
      );

      const result = await getEnrolledCourses(mockClient, cache, testUserId);

      expect(result).toBeDefined();
      expect(result.courses).toBeDefined();
      expect(result.courses.length).toBe(2);
      expect(result.totalEnrolled).toBe(5);
      expect(result.completedCount).toBe(1);
      expect(result.courses[0].courseId).toBeDefined();
    });

    it('should use 1-hour cache TTL for private data', async () => {
      const mockResponse = {
        enrolledCourses: mockEnrolledCourses.slice(0, 1),
        meta: {
          totalEnrolled: 3,
          completedCount: 0,
        },
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/enrolled-courses`,
        mockResponse
      );

      // First call
      const result1 = await getEnrolledCourses(mockClient, cache, testUserId);
      expect(result1.courses.length).toBe(1);

      // Verify cache key includes userId
      const cacheKey = `enrolled:${testUserId}`;
      const cached = cache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('should include userId in cache key for privacy', async () => {
      const mockResponse = {
        enrolledCourses: mockEnrolledCourses.slice(0, 1),
        meta: { totalEnrolled: 1, completedCount: 0 },
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/enrolled-courses`,
        mockResponse
      );

      const anotherUserId = 'another-user-456';
      mockClient.setMockResponse(
        `/api/users/${anotherUserId}/enrolled-courses`,
        {
          enrolledCourses: mockEnrolledCourses.slice(1, 2),
          meta: { totalEnrolled: 1, completedCount: 0 },
        }
      );

      // Different users should have separate cache entries
      const result1 = await getEnrolledCourses(mockClient, cache, testUserId);
      const result2 = await getEnrolledCourses(mockClient, cache, anotherUserId);

      expect(result1.courses[0].courseId).not.toBe(result2.courses[0].courseId);
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

    it('should handle API error gracefully', async () => {
      mockClient.setMockResponse(
        `/api/users/${testUserId}/enrolled-courses`,
        null
      );

      try {
        await getEnrolledCourses(mockClient, cache, testUserId);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should handle empty enrolled courses', async () => {
      const mockResponse = {
        enrolledCourses: [],
        meta: { totalEnrolled: 0, completedCount: 0 },
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/enrolled-courses`,
        mockResponse
      );

      const result = await getEnrolledCourses(mockClient, cache, testUserId);
      expect(result.courses.length).toBe(0);
      expect(result.totalEnrolled).toBe(0);
      expect(result.completedCount).toBe(0);
    });
  });

  describe('getProgress', () => {
    it('should fetch course progress with completion percent', async () => {
      const courseId = 'python-basics';
      const progressData = {
        courseId,
        userId: testUserId,
        percent: 75,
        currentWeek: 3,
        totalWeeks: 4,
        upcomingDeadlines: [],
        lastAccessedDate: new Date(),
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/courses/${courseId}/progress`,
        progressData
      );

      const result = await getProgress(mockClient, cache, testUserId, courseId);

      expect(result).toBeDefined();
      expect(result.percent).toBeDefined();
      expect(result.percent).toBeGreaterThanOrEqual(0);
      expect(result.percent).toBeLessThanOrEqual(100);
      expect(result.currentWeek).toBeDefined();
    });

    it('should include userId and courseId in cache key', async () => {
      const courseId = 'python-basics';
      const progressData = {
        courseId,
        userId: testUserId,
        percent: 50,
        currentWeek: 2,
        totalWeeks: 4,
        upcomingDeadlines: [],
        lastAccessedDate: new Date(),
      };
      mockClient.setMockResponse(
        `/api/users/${testUserId}/courses/${courseId}/progress`,
        progressData
      );

      await getProgress(mockClient, cache, testUserId, courseId);

      const cacheKey = `progress:${testUserId}:${courseId}`;
      const cached = cache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('should throw error when userId is missing', async () => {
      try {
        await getProgress(mockClient, cache, '', 'course-123');
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

    it('should return progress with current week and completion', async () => {
      const courseId = 'data-science-101';
      const progressData = {
        courseId,
        userId: testUserId,
        percent: 45,
        currentWeek: 3,
        totalWeeks: 8,
        upcomingDeadlines: [],
        lastAccessedDate: new Date(),
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/courses/${courseId}/progress`,
        progressData
      );

      const result = await getProgress(mockClient, cache, testUserId, courseId);

      expect(result.percent).toBe(45);
      expect(result.currentWeek).toBe(3);
    });

    it('should separate cache for different courses', async () => {
      const course1 = 'python-basics';
      const course2 = 'javascript-advanced';

      mockClient.setMockResponse(
        `/api/users/${testUserId}/courses/${course1}/progress`,
        {
          courseId: course1,
          userId: testUserId,
          percent: 50,
          currentWeek: 4,
          totalWeeks: 8,
          upcomingDeadlines: [],
          lastAccessedDate: new Date(),
        }
      );

      mockClient.setMockResponse(
        `/api/users/${testUserId}/courses/${course2}/progress`,
        {
          courseId: course2,
          userId: testUserId,
          percent: 25,
          currentWeek: 2,
          totalWeeks: 8,
          upcomingDeadlines: [],
          lastAccessedDate: new Date(),
        }
      );

      const result1 = await getProgress(mockClient, cache, testUserId, course1);
      const result2 = await getProgress(mockClient, cache, testUserId, course2);

      expect(result1.percent).toBe(50);
      expect(result2.percent).toBe(25);
    });

    it('should handle API error gracefully', async () => {
      mockClient.setMockResponse(
        `/api/users/${testUserId}/courses/invalid-course/progress`,
        null
      );

      try {
        await getProgress(mockClient, cache, testUserId, 'invalid-course');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });
  });

  describe('getMultipleProgress', () => {
    it('should fetch progress for multiple courses', async () => {
      const courseIds = ['python-basics', 'javascript-advanced', 'data-science-101'];

      courseIds.forEach((courseId, index) => {
        mockClient.setMockResponse(
          `/api/users/${testUserId}/courses/${courseId}/progress`,
          {
            courseId,
            userId: testUserId,
            percent: 25 * (index + 1),
            currentWeek: index + 1,
            totalWeeks: 8,
            upcomingDeadlines: [],
            lastAccessedDate: new Date(),
          }
        );
      });

      const results = await getMultipleProgress(mockClient, cache, testUserId, courseIds);

      expect(results).toBeDefined();
      expect(results.length).toBe(3);
      expect(results[0].percent).toBe(25);
      expect(results[1].percent).toBe(50);
      expect(results[2].percent).toBe(75);
    });

    it('should handle empty course list', async () => {
      const results = await getMultipleProgress(mockClient, cache, testUserId, []);
      expect(results.length).toBe(0);
    });

    it('should handle single course in batch', async () => {
      const courseId = 'python-basics';
      mockClient.setMockResponse(
        `/api/users/${testUserId}/courses/${courseId}/progress`,
        {
          courseId,
          userId: testUserId,
          percent: 60,
          currentWeek: 5,
          totalWeeks: 8,
          upcomingDeadlines: [],
          lastAccessedDate: new Date(),
        }
      );

      const results = await getMultipleProgress(mockClient, cache, testUserId, [courseId]);

      expect(results.length).toBe(1);
      expect(results[0].percent).toBe(60);
    });

    it('should use parallel requests for multiple courses', async () => {
      const courseIds = ['course-1', 'course-2', 'course-3', 'course-4'];

      courseIds.forEach((courseId) => {
        mockClient.setMockResponse(
          `/api/users/${testUserId}/courses/${courseId}/progress`,
          {
            courseId,
            userId: testUserId,
            percent: Math.random() * 100,
            currentWeek: 1,
            totalWeeks: 8,
            upcomingDeadlines: [],
            lastAccessedDate: new Date(),
          }
        );
      });

      const startTime = Date.now();
      await getMultipleProgress(mockClient, cache, testUserId, courseIds);
      const elapsed = Date.now() - startTime;

      expect(elapsed).toBeLessThan(5000);
    });

    it('should throw error if userId is missing', async () => {
      try {
        await getMultipleProgress(mockClient, cache, '', ['course-1']);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should batch requests efficiently', async () => {
      const courseIds = Array.from({ length: 10 }, (_, i) => `course-${i}`);

      courseIds.forEach((courseId) => {
        mockClient.setMockResponse(
          `/api/users/${testUserId}/courses/${courseId}/progress`,
          {
            courseId,
            userId: testUserId,
            percent: 50,
            currentWeek: 4,
            totalWeeks: 8,
            upcomingDeadlines: [],
            lastAccessedDate: new Date(),
          }
        );
      });

      const results = await getMultipleProgress(mockClient, cache, testUserId, courseIds);
      expect(results.length).toBe(10);
    });
  });

  describe('Stale-While-Revalidate Pattern', () => {
    it('should serve cached data on second request', async () => {
      const mockResponse = {
        enrolledCourses: mockEnrolledCourses.slice(0, 1),
        meta: { totalEnrolled: 1, completedCount: 0 },
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/enrolled-courses`,
        mockResponse
      );

      const result1 = await getEnrolledCourses(mockClient, cache, testUserId);
      const result2 = await getEnrolledCourses(mockClient, cache, testUserId);

      expect(result1.courses[0].id).toBe(result2.courses[0].id);
    });

    it('should maintain data consistency across calls', async () => {
      const courseId = 'python-basics';
      const progressData = {
        courseId,
        userId: testUserId,
        percent: 55,
        currentWeek: 5,
        totalWeeks: 8,
        upcomingDeadlines: [],
        lastAccessedDate: new Date(),
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/courses/${courseId}/progress`,
        progressData
      );

      const result1 = await getProgress(mockClient, cache, testUserId, courseId);
      const result2 = await getProgress(mockClient, cache, testUserId, courseId);

      expect(result1.percent).toBe(result2.percent);
      expect(result1.currentWeek).toBe(result2.currentWeek);
    });
  });

  describe('Error Recovery', () => {
    it('should handle missing metadata gracefully', async () => {
      const mockResponse = {
        enrolledCourses: mockEnrolledCourses.slice(0, 1),
        meta: {},
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/enrolled-courses`,
        mockResponse
      );

      const result = await getEnrolledCourses(mockClient, cache, testUserId);
      expect(result.totalEnrolled).toBe(0);
      expect(result.completedCount).toBe(0);
    });

    it('should handle missing enrolledCourses array', async () => {
      const mockResponse = {
        meta: { totalEnrolled: 0, completedCount: 0 },
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/enrolled-courses`,
        mockResponse
      );

      const result = await getEnrolledCourses(mockClient, cache, testUserId);
      expect(result.courses.length).toBe(0);
    });
  });
});
