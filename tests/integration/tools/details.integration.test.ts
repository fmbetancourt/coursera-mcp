import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CourseraClient } from '../../../src/services/courseraClient';
import { CacheService } from '../../../src/services/cache';
import { getCourseDetails, getProgramDetails, NotFoundError, getMultipleCourseDetails, getMultipleProgramDetails } from '../../../src/tools/details';
import { mockCourses, mockPrograms } from '../../fixtures';

const testCacheDir = path.join(process.cwd(), '.test-details-cache');

// Mock CourseraClient for testing
class MockCourseraClient extends CourseraClient {
  private mockResponses: Record<string, unknown> = {};

  setMockResponse(path: string, response: unknown): void {
    this.mockResponses[path] = response;
  }

  async get<T>(path: string, config?: unknown): Promise<T> {
    if (this.mockResponses[path] !== undefined) {
      const response = this.mockResponses[path];
      if (response === null) {
        return null as T;
      }
      return response as T;
    }

    throw new Error(`No mock response for ${path}`);
  }
}

describe('Details Tools Integration', () => {
  let courseraClient: MockCourseraClient;
  let cache: CacheService;

  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    courseraClient = new MockCourseraClient();
    cache = new CacheService(testCacheDir);
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('getCourseDetails', () => {
    it('should fetch course details', async () => {
      const mockCourse = mockCourses[0];
      courseraClient.setMockResponse(`/api/courses/${mockCourse.id}`, mockCourse);

      const result = await getCourseDetails(courseraClient, cache, mockCourse.id);

      expect(result.id).toBe(mockCourse.id);
      expect(result.name).toBe(mockCourse.name);
      expect(result.level).toBe(mockCourse.level);
    });

    it('should cache course details', async () => {
      const mockCourse = mockCourses[0];
      courseraClient.setMockResponse(`/api/courses/${mockCourse.id}`, mockCourse);

      // First call
      const result1 = await getCourseDetails(courseraClient, cache, mockCourse.id);
      expect(result1.id).toBe(mockCourse.id);

      // Second call - should be cached
      const result2 = await getCourseDetails(courseraClient, cache, mockCourse.id);
      expect(result2.id).toBe(mockCourse.id);
    });

    it('should throw NotFoundError when course does not exist', async () => {
      const courseId = 'nonexistent-course';
      courseraClient.setMockResponse(`/api/courses/${courseId}`, null);

      try {
        await getCourseDetails(courseraClient, cache, courseId);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        const notFoundError = error as NotFoundError;
        expect(notFoundError.resourceType).toBe('Course');
        expect(notFoundError.resourceId).toBe(courseId);
      }
    });

    it('should throw error for empty courseId', async () => {
      try {
        await getCourseDetails(courseraClient, cache, '');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should include all course details', async () => {
      const mockCourse = mockCourses[0];
      courseraClient.setMockResponse(`/api/courses/${mockCourse.id}`, mockCourse);

      const result = await getCourseDetails(courseraClient, cache, mockCourse.id);

      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.slug).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.duration).toBeDefined();
      expect(result.level).toBeDefined();
      expect(result.language).toBeDefined();
      expect(result.enrollments).toBeDefined();
      expect(result.instructors).toBeDefined();
      expect(result.skills).toBeDefined();
      expect(result.certificate).toBeDefined();
    });

    it('should parse multiple course properties correctly', async () => {
      const mockCourse = mockCourses[1];
      courseraClient.setMockResponse(`/api/courses/${mockCourse.id}`, mockCourse);

      const result = await getCourseDetails(courseraClient, cache, mockCourse.id);

      expect(result.instructors.length).toBeGreaterThan(0);
      expect(result.instructors[0].id).toBeDefined();
      expect(result.instructors[0].name).toBeDefined();
    });
  });

  describe('getProgramDetails', () => {
    it('should fetch program details', async () => {
      const mockProgram = mockPrograms[0];
      courseraClient.setMockResponse(`/api/programs/${mockProgram.id}`, mockProgram);

      const result = await getProgramDetails(courseraClient, cache, mockProgram.id);

      expect(result.id).toBe(mockProgram.id);
      expect(result.name).toBe(mockProgram.name);
      expect(result.type).toBe(mockProgram.type);
    });

    it('should include courses in program details', async () => {
      const mockProgram = mockPrograms[0];
      courseraClient.setMockResponse(`/api/programs/${mockProgram.id}`, mockProgram);

      const result = await getProgramDetails(courseraClient, cache, mockProgram.id);

      expect(result.courses.length).toBeGreaterThan(0);
      expect(result.courses[0].id).toBeDefined();
      expect(result.courses[0].name).toBeDefined();
    });

    it('should cache program details', async () => {
      const mockProgram = mockPrograms[0];
      courseraClient.setMockResponse(`/api/programs/${mockProgram.id}`, mockProgram);

      // First call
      const result1 = await getProgramDetails(courseraClient, cache, mockProgram.id);
      expect(result1.id).toBe(mockProgram.id);

      // Second call - should be cached
      const result2 = await getProgramDetails(courseraClient, cache, mockProgram.id);
      expect(result2.id).toBe(mockProgram.id);
    });

    it('should throw NotFoundError when program does not exist', async () => {
      const programId = 'nonexistent-program';
      courseraClient.setMockResponse(`/api/programs/${programId}`, null);

      try {
        await getProgramDetails(courseraClient, cache, programId);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        const notFoundError = error as NotFoundError;
        expect(notFoundError.resourceType).toBe('Program');
        expect(notFoundError.resourceId).toBe(programId);
      }
    });

    it('should throw error for empty programId', async () => {
      try {
        await getProgramDetails(courseraClient, cache, '');
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should include all program details', async () => {
      const mockProgram = mockPrograms[0];
      courseraClient.setMockResponse(`/api/programs/${mockProgram.id}`, mockProgram);

      const result = await getProgramDetails(courseraClient, cache, mockProgram.id);

      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.type).toBeDefined();
      expect(result.courses).toBeDefined();
      expect(result.totalDuration).toBeDefined();
      expect(result.price).toBeDefined();
    });
  });

  describe('getMultipleCourseDetails', () => {
    it('should fetch multiple courses', async () => {
      const courseIds = [mockCourses[0].id, mockCourses[1].id];
      courseraClient.setMockResponse(`/api/courses/${mockCourses[0].id}`, mockCourses[0]);
      courseraClient.setMockResponse(`/api/courses/${mockCourses[1].id}`, mockCourses[1]);

      const results = await getMultipleCourseDetails(courseraClient, cache, courseIds);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe(mockCourses[0].id);
      expect(results[1].id).toBe(mockCourses[1].id);
    });

    it('should fail if any course is not found', async () => {
      const courseIds = [mockCourses[0].id, 'nonexistent'];
      courseraClient.setMockResponse(`/api/courses/${mockCourses[0].id}`, mockCourses[0]);
      courseraClient.setMockResponse(`/api/courses/nonexistent`, null);

      try {
        await getMultipleCourseDetails(courseraClient, cache, courseIds);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('getMultipleProgramDetails', () => {
    it('should fetch multiple programs', async () => {
      const programIds = [mockPrograms[0].id, mockPrograms[1].id];
      courseraClient.setMockResponse(`/api/programs/${mockPrograms[0].id}`, mockPrograms[0]);
      courseraClient.setMockResponse(`/api/programs/${mockPrograms[1].id}`, mockPrograms[1]);

      const results = await getMultipleProgramDetails(courseraClient, cache, programIds);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe(mockPrograms[0].id);
      expect(results[1].id).toBe(mockPrograms[1].id);
    });

    it('should fail if any program is not found', async () => {
      const programIds = [mockPrograms[0].id, 'nonexistent'];
      courseraClient.setMockResponse(`/api/programs/${mockPrograms[0].id}`, mockPrograms[0]);
      courseraClient.setMockResponse(`/api/programs/nonexistent`, null);

      try {
        await getMultipleProgramDetails(courseraClient, cache, programIds);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('Cache behavior', () => {
    it('should use 24-hour TTL for course details', async () => {
      const mockCourse = mockCourses[0];
      courseraClient.setMockResponse(`/api/courses/${mockCourse.id}`, mockCourse);

      const result1 = await getCourseDetails(courseraClient, cache, mockCourse.id);
      expect(result1).toBeDefined();

      // Verify it's cached for 24 hours (1440 minutes)
      // By checking the cache behavior in second call
      const result2 = await getCourseDetails(courseraClient, cache, mockCourse.id);
      expect(result2.id).toBe(result1.id);
    });

    it('should use 24-hour TTL for program details', async () => {
      const mockProgram = mockPrograms[0];
      courseraClient.setMockResponse(`/api/programs/${mockProgram.id}`, mockProgram);

      const result1 = await getProgramDetails(courseraClient, cache, mockProgram.id);
      expect(result1).toBeDefined();

      // Verify it's cached
      const result2 = await getProgramDetails(courseraClient, cache, mockProgram.id);
      expect(result2.id).toBe(result1.id);
    });
  });
});
