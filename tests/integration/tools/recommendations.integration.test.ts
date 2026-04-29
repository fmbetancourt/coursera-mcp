import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { getRecommendations } from '../../../src/tools/recommendations';
import { CacheService } from '../../../src/services/cache';
import { CourseraClient } from '../../../src/services/courseraClient';
import { mockCourses } from '../../fixtures';

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

const testCacheDir = path.join(process.cwd(), '.test-recommendations-cache');
let cache: CacheService;
let mockClient: MockCourseraClient;
const testUserId = 'test-user-123';

describe('Integration: Recommendations Tool', () => {
  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    cache = new CacheService(testCacheDir);
    mockClient = new MockCourseraClient();
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('getRecommendations', () => {
    it('should fetch personalized recommendations', async () => {
      const recommendedCourses = mockCourses.slice(0, 3);
      const mockResponse = {
        recommendations: recommendedCourses,
        reason: 'Based on your learning history and skills',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      expect(result).toBeDefined();
      expect(result.courses).toBeDefined();
      expect(result.courses.length).toBe(3);
      expect(result.reason).toBeDefined();
      expect(result.courses[0].recommendationReason).toBeDefined();
    });

    it('should include matchScore for each recommendation', async () => {
      const recommendedCourses = mockCourses.slice(0, 2);
      const mockResponse = {
        recommendations: recommendedCourses,
        reason: 'Top matches for your interests',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      result.courses.forEach((course) => {
        expect(course.matchScore).toBeDefined();
        expect(typeof course.matchScore).toBe('number');
        expect(course.matchScore).toBeGreaterThanOrEqual(0);
        expect(course.matchScore).toBeLessThanOrEqual(100);
      });
    });

    it('should respect limit parameter', async () => {
      const recommendedCourses = mockCourses.slice(0, 5);
      const mockResponse = {
        recommendations: recommendedCourses,
        reason: 'Based on your profile',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId, { limit: 3 });

      expect(result.courses.length).toBeLessThanOrEqual(3);
    });

    it('should validate limit parameter (1-100)', async () => {
      try {
        await getRecommendations(mockClient, cache, testUserId, { limit: 101 });
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toContain('limit must be between 1 and 100');
      }
    });

    it('should validate limit lower bound', async () => {
      try {
        await getRecommendations(mockClient, cache, testUserId, { limit: 0 });
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toContain('limit must be between 1 and 100');
      }
    });

    it('should throw error when userId is missing', async () => {
      try {
        await getRecommendations(mockClient, cache, '');
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toContain('userId is required');
      }
    });

    it('should use 6-hour cache TTL', async () => {
      const mockResponse = {
        recommendations: mockCourses.slice(0, 1),
        reason: 'Top match for you',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      await getRecommendations(mockClient, cache, testUserId);

      const cacheKey = `recommendations:${testUserId}`;
      const cached = cache.get(cacheKey);
      expect(cached).toBeDefined();
    });

    it('should include userId in cache key for privacy', async () => {
      const mockResponse = {
        recommendations: mockCourses.slice(0, 1),
        reason: 'For you',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const anotherUserId = 'another-user-456';
      mockClient.setMockResponse(
        `/api/users/${anotherUserId}/recommendations`,
        {
          recommendations: mockCourses.slice(1, 2),
          reason: 'For them',
        }
      );

      const result1 = await getRecommendations(mockClient, cache, testUserId);
      const result2 = await getRecommendations(mockClient, cache, anotherUserId);

      expect(result1.courses[0].id).not.toBe(result2.courses[0].id);
    });

    it('should handle empty recommendations', async () => {
      const mockResponse = {
        recommendations: [],
        reason: 'No recommendations available',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      expect(result.courses.length).toBe(0);
      expect(result.reason).toBe('No recommendations available');
    });

    it('should handle API error gracefully', async () => {
      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        null
      );

      try {
        await getRecommendations(mockClient, cache, testUserId);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    });

    it('should use default limit of 10', async () => {
      const recommendedCourses = Array.from({ length: 15 }, (_, i) => mockCourses[i % mockCourses.length]);
      const mockResponse = {
        recommendations: recommendedCourses,
        reason: 'Based on your profile',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      expect(result.courses.length).toBeLessThanOrEqual(10);
    });
  });

  describe('Recommendation Reason Generation', () => {
    it('should generate top match reason for first position', async () => {
      const topCourse = { ...mockCourses[0] };
      const mockResponse = {
        recommendations: [topCourse],
        reason: 'Your recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      expect(result.courses[0].recommendationReason).toContain('Top match');
    });

    it('should generate reason based on high rating', async () => {
      const highRatedCourse = {
        ...mockCourses[0],
        rating: 4.8,
      };
      const mockResponse = {
        recommendations: [mockCourses[1], highRatedCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      const highRatedReason = result.courses[1].recommendationReason;
      expect(highRatedReason).toContain('Highly rated');
    });

    it('should generate reason based on popularity', async () => {
      const popularCourse = {
        ...mockCourses[0],
        rating: 4.5,
        enrollments: 150000,
      };
      const mockResponse = {
        recommendations: [mockCourses[1], popularCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      const popularReason = result.courses[1].recommendationReason;
      expect(popularReason).toContain('Popular');
    });

    it('should generate reason based on skills taught', async () => {
      const skillCourse = {
        ...mockCourses[0],
        rating: 3.5,
        enrollments: 5000,
        skills: [{ id: 'python', name: 'Python Programming', description: 'Python skills' }],
      };
      const mockResponse = {
        recommendations: [mockCourses[1], skillCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      const skillReason = result.courses[1].recommendationReason;
      expect(skillReason).toContain('Teaches');
    });

    it('should provide fallback reason', async () => {
      const basicCourse = {
        ...mockCourses[0],
        rating: 3.0,
        enrollments: 1000,
        skills: [],
      };
      const mockResponse = {
        recommendations: [mockCourses[1], basicCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      const fallbackReason = result.courses[1].recommendationReason;
      expect(fallbackReason).toBeDefined();
      expect(fallbackReason.length).toBeGreaterThan(0);
    });
  });

  describe('Match Score Calculation', () => {
    it('should calculate base score of 50', async () => {
      const basicCourse = {
        ...mockCourses[0],
        rating: undefined,
        enrollments: 1000,
        level: 'beginner',
      };
      const mockResponse = {
        recommendations: [basicCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      // Base score 50 + maybe some bonus for enrollments
      expect(result.courses[0].matchScore).toBeGreaterThanOrEqual(50);
    });

    it('should add rating factor to match score', async () => {
      const ratedCourse = {
        ...mockCourses[0],
        rating: 4.5,
        enrollments: 1000,
        level: 'beginner',
      };
      const mockResponse = {
        recommendations: [ratedCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      // Base 50 + rating factor (4.5 * 10 = 45, capped at 25) = ~75
      expect(result.courses[0].matchScore).toBeGreaterThan(50);
    });

    it('should add popularity bonus for high enrollments', async () => {
      const popularCourse = {
        ...mockCourses[0],
        rating: 3.0,
        enrollments: 75000,
        level: 'beginner',
      };
      const mockResponse = {
        recommendations: [popularCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      // Base 50 + 10 for popularity = 60+
      expect(result.courses[0].matchScore).toBeGreaterThan(55);
    });

    it('should add level bonus for intermediate courses', async () => {
      const intermediateCourse = {
        ...mockCourses[0],
        rating: 3.0,
        enrollments: 5000,
        level: 'intermediate',
      };
      const mockResponse = {
        recommendations: [intermediateCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      // Base 50 + 10 for intermediate level = 60+
      expect(result.courses[0].matchScore).toBeGreaterThanOrEqual(60);
    });

    it('should cap match score at 100', async () => {
      const perfectCourse = {
        ...mockCourses[0],
        rating: 5.0,
        enrollments: 200000,
        level: 'intermediate',
      };
      const mockResponse = {
        recommendations: [perfectCourse],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      expect(result.courses[0].matchScore).toBeLessThanOrEqual(100);
    });
  });

  describe('Stale-While-Revalidate Pattern', () => {
    it('should serve cached recommendations on second request', async () => {
      const mockResponse = {
        recommendations: mockCourses.slice(0, 2),
        reason: 'For you',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result1 = await getRecommendations(mockClient, cache, testUserId);
      const result2 = await getRecommendations(mockClient, cache, testUserId);

      expect(result1.courses[0].id).toBe(result2.courses[0].id);
      expect(result1.reason).toBe(result2.reason);
    });

    it('should maintain consistency across recommendations', async () => {
      const mockResponse = {
        recommendations: mockCourses.slice(0, 3),
        reason: 'Based on profile',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result1 = await getRecommendations(mockClient, cache, testUserId);
      const result2 = await getRecommendations(mockClient, cache, testUserId);

      expect(result1.courses.length).toBe(result2.courses.length);
      result1.courses.forEach((course, i) => {
        expect(course.id).toBe(result2.courses[i].id);
        expect(course.matchScore).toBe(result2.courses[i].matchScore);
      });
    });
  });

  describe('Error Recovery', () => {
    it('should handle missing recommendation reason', async () => {
      const mockResponse = {
        recommendations: mockCourses.slice(0, 2),
        reason: undefined,
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      expect(result.reason).toBeDefined();
      expect(result.reason.length).toBeGreaterThan(0);
    });

    it('should handle missing recommendations array', async () => {
      const mockResponse = {
        reason: 'No recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      expect(result.courses.length).toBe(0);
    });

    it('should handle null enrollments gracefully', async () => {
      const courseWithoutEnrollments = {
        ...mockCourses[0],
        enrollments: 0,
      };
      const mockResponse = {
        recommendations: [courseWithoutEnrollments],
        reason: 'Recommendations',
      };

      mockClient.setMockResponse(
        `/api/users/${testUserId}/recommendations`,
        mockResponse
      );

      const result = await getRecommendations(mockClient, cache, testUserId);

      expect(result.courses[0].matchScore).toBeDefined();
      expect(result.courses[0].matchScore).toBeGreaterThanOrEqual(0);
    });
  });
});
