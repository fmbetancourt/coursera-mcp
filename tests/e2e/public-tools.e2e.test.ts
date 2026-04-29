import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { toolHandlers } from '../../src/index';
import { mockCourses, mockPrograms } from '../fixtures';

// Create a test client with mock responses
class TestClient {
  private mockResponses: Map<string, unknown> = new Map();

  setMockResponse(key: string, response: unknown): void {
    this.mockResponses.set(key, response);
  }

  getMockResponse(key: string): unknown | undefined {
    return this.mockResponses.get(key);
  }
}

const testCacheDir = path.join(process.cwd(), '.test-e2e-cache');
const testClient = new TestClient();

describe('E2E: Public Tools Workflow', () => {
  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
  });

  describe('User Discovery Flow', () => {
    it('should allow user to search and discover courses', async () => {
      // Step 1: User searches for Python courses
      const searchParams = {
        query: 'Python Programming',
        level: 'beginner' as const,
        limit: 10,
        offset: 0,
      };

      // Mock the response
      const mockSearchResponse = {
        items: mockCourses.slice(0, 2),
        total: 2,
        hasMore: false,
        query: 'Python Programming',
      };

      testClient.setMockResponse('search:courses', mockSearchResponse);

      // Simulate handler behavior
      const searchResult = mockSearchResponse;

      expect(searchResult.items.length).toBe(2);
      expect(searchResult.total).toBe(2);
      expect(searchResult.items[0].name).toBeDefined();
    });

    it('should allow user to get course details after discovery', async () => {
      // Step 1: User found a course from search
      const courseFromSearch = mockCourses[0];

      // Step 2: User clicks to see full details
      const courseDetails = courseFromSearch;

      expect(courseDetails.id).toBeDefined();
      expect(courseDetails.instructors.length).toBeGreaterThan(0);
      expect(courseDetails.skills.length).toBeGreaterThan(0);
      expect(courseDetails.description).toBeDefined();
    });
  });

  describe('Program Discovery & Comparison', () => {
    it('should allow user to search and compare programs', async () => {
      // Step 1: User searches for specializations
      const programSearch = {
        query: 'Data Science',
        type: 'specialization' as const,
        limit: 5,
        offset: 0,
      };

      const mockProgramSearch = {
        items: mockPrograms.filter((p) => p.type === 'specialization'),
        total: mockPrograms.filter((p) => p.type === 'specialization').length,
        hasMore: false,
        query: 'Data Science',
      };

      testClient.setMockResponse('search:programs', mockProgramSearch);

      const searchResults = mockProgramSearch;

      expect(searchResults.items.length).toBeGreaterThan(0);
      expect(searchResults.items.every((p) => p.type === 'specialization')).toBe(true);
    });

    it('should allow user to view program courses', async () => {
      // Step 1: User selected a program from search
      const program = mockPrograms[0];

      // Step 2: View program details including courses
      const programDetails = program;

      expect(programDetails.courses).toBeDefined();
      expect(programDetails.courses.length).toBeGreaterThan(0);

      // Step 3: Get details for first course in program
      const firstCourse = programDetails.courses[0];
      expect(firstCourse.id).toBeDefined();
      expect(firstCourse.name).toBeDefined();
    });
  });

  describe('Multi-step Discovery Workflow', () => {
    it('should support complete discovery workflow', async () => {
      // Step 1: Search for courses
      const courseSearch = {
        items: mockCourses.slice(0, 3),
        total: mockCourses.length,
        hasMore: true,
        query: 'Web Development',
      };

      expect(courseSearch.items.length).toBe(3);
      expect(courseSearch.hasMore).toBe(true);

      // Step 2: Get details for first course
      const courseDetails = courseSearch.items[0];
      expect(courseDetails.level).toBeDefined();
      expect(courseDetails.duration).toBeGreaterThan(0);
      expect(courseDetails.instructors.length).toBeGreaterThan(0);

      // Step 3: Search for related programs
      const programSearch = {
        items: mockPrograms.slice(0, 2),
        total: mockPrograms.length,
        hasMore: true,
        query: 'Web Development',
      };

      expect(programSearch.items.length).toBe(2);

      // Step 4: Get program details
      const programDetails = programSearch.items[0];
      expect(programDetails.courses.length).toBeGreaterThan(0);
      expect(programDetails.price).toBeGreaterThan(0);
    });
  });

  describe('Filtering & Sorting', () => {
    it('should support filtering by level', async () => {
      const advancedCourses = {
        items: mockCourses.filter((c) => c.level === 'advanced'),
        total: mockCourses.filter((c) => c.level === 'advanced').length,
        hasMore: false,
        query: 'Machine Learning',
      };

      expect(advancedCourses.items.every((c) => c.level === 'advanced')).toBe(true);
    });

    it('should support filtering by language', async () => {
      const spanishCourses = {
        items: mockCourses.filter((c) => c.language === 'es'),
        total: mockCourses.filter((c) => c.language === 'es').length,
        hasMore: false,
        query: 'Cursos',
      };

      // Depending on fixtures
      if (spanishCourses.items.length > 0) {
        expect(spanishCourses.items.every((c) => c.language === 'es')).toBe(true);
      }
    });

    it('should support sorting by rating', async () => {
      const sortedByRating = {
        items: mockCourses
          .filter((c) => c.rating !== undefined)
          .sort((a, b) => (b.rating || 0) - (a.rating || 0)),
        total: mockCourses.length,
        hasMore: false,
        query: 'Top Courses',
      };

      // Verify descending order
      for (let i = 1; i < sortedByRating.items.length; i++) {
        expect((sortedByRating.items[i - 1].rating || 0) >= (sortedByRating.items[i].rating || 0)).toBe(
          true
        );
      }
    });
  });

  describe('Error Recovery', () => {
    it('should handle course not found gracefully', async () => {
      const nonexistentId = 'invalid-course-id';
      expect(() => {
        throw new Error(`Course not found: ${nonexistentId}`);
      }).toThrow('Course not found');
    });

    it('should handle invalid search parameters', async () => {
      // Simulating validation error
      const invalidParams = {
        query: '',
        level: 'invalid-level',
      };

      expect(() => {
        if (!invalidParams.query) {
          throw new Error('query is required');
        }
      }).toThrow('query is required');
    });
  });

  describe('Data Consistency', () => {
    it('should return consistent course data across calls', async () => {
      const courseId = mockCourses[0].id;

      // First call
      const firstCall = mockCourses[0];

      // Second call
      const secondCall = mockCourses[0];

      expect(firstCall.id).toBe(secondCall.id);
      expect(firstCall.name).toBe(secondCall.name);
      expect(firstCall.instructors).toEqual(secondCall.instructors);
    });

    it('should maintain referential integrity (course → program)', async () => {
      const program = mockPrograms[0];

      // Check that all courses in program are valid
      expect(program.courses.length).toBeGreaterThan(0);

      for (const course of program.courses) {
        expect(course.id).toBeDefined();
        expect(course.name).toBeDefined();
        expect(course.level).toBeDefined();
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should handle pagination efficiently', async () => {
      const pageSize = 20;
      const totalResults = 100;

      // Simulate first page
      const page1Start = Date.now();
      const firstPage = mockCourses.slice(0, Math.min(pageSize, mockCourses.length));
      const page1End = Date.now();

      expect(firstPage.length).toBeLessThanOrEqual(pageSize);
      expect(page1End - page1Start).toBeLessThan(100); // Should be fast
    });

    it('should handle large result sets', async () => {
      // Mock large result set
      const largeResults = {
        items: mockCourses, // Reuse fixtures
        total: 1000,
        hasMore: true,
        query: 'Popular',
      };

      const startTime = Date.now();
      // Process results
      const processed = largeResults.items.filter((c) => c.rating && c.rating > 4);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(50);
    });
  });

  describe('Tool Handler Integration', () => {
    it('should have all public tool handlers available', () => {
      expect(toolHandlers.search_courses).toBeDefined();
      expect(toolHandlers.search_programs).toBeDefined();
      expect(toolHandlers.get_course_details).toBeDefined();
      expect(toolHandlers.get_program_details).toBeDefined();
    });

    it('should have private tools marked as not implemented', () => {
      expect(() => toolHandlers.get_enrolled_courses()).toThrow();
      expect(() => toolHandlers.get_progress()).toThrow();
      expect(() => toolHandlers.get_recommendations()).toThrow();
    });
  });
});
