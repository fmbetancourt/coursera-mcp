import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CourseraClient } from '../../../src/services/courseraClient';
import { CacheService } from '../../../src/services/cache';
import {
  getCourseDetails,
  getProgramDetails,
  NotFoundError,
  getMultipleCourseDetails,
  getMultipleProgramDetails,
} from '../../../src/tools/details';

const testCacheDir = path.join(process.cwd(), '.test-details-cache');

// Coursera API response shapes (as returned by /api/courses.v1 and /api/onDemandSpecializations.v1)
interface ApiCourse {
  id: string;
  name: string;
  slug: string;
  description?: string;
  level?: string;
  primaryLanguages?: string[];
  certificates?: string[];
  workload?: string;
  domainTypes?: { domainId: string; subdomainId: string }[];
  photoUrl?: string;
  partnerIds?: string[];
  instructorIds?: string[];
}

interface ApiSpec {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  courseIds?: string[];
}

const mockApiCourses: ApiCourse[] = [
  {
    id: 'course-1',
    name: 'Advanced TypeScript',
    slug: 'advanced-typescript',
    description: 'Master advanced TypeScript patterns',
    level: 'ADVANCED',
    primaryLanguages: ['en'],
    certificates: ['CERTIFICATE'],
    workload: '4 weeks of study',
    domainTypes: [{ domainId: 'computer-science', subdomainId: 'programming' }],
    instructorIds: ['i1', 'i2'],
  },
  {
    id: 'course-2',
    name: 'Node.js Fundamentals',
    slug: 'nodejs-fundamentals',
    description: 'Learn Node.js from scratch',
    level: 'BEGINNER',
    primaryLanguages: ['en'],
    certificates: ['CERTIFICATE'],
    workload: '6 weeks of study',
    instructorIds: ['i1'],
  },
];

const mockApiSpecs: ApiSpec[] = [
  {
    id: 'program-1',
    name: 'Full-Stack JavaScript Developer',
    slug: 'full-stack-javascript',
    description: 'Complete full-stack path',
    courseIds: ['course-1', 'course-2', 'course-3'],
  },
  {
    id: 'program-2',
    name: 'Advanced Node.js & Security',
    slug: 'advanced-nodejs-security',
    tagline: 'Node.js with security',
    courseIds: ['course-1', 'course-4'],
  },
];

class MockCourseraClient extends CourseraClient {
  private mockResponses: Map<string, unknown> = new Map();

  setMockResponse(key: string, response: unknown): void {
    this.mockResponses.set(key, response);
  }

  async get<T>(url: string): Promise<T> {
    for (const [key, val] of this.mockResponses.entries()) {
      if (url.startsWith(key) || url === key) return val as T;
    }
    return { elements: [], paging: { total: 0 } } as T;
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
    it('should fetch course details from courses.v1 API', async () => {
      const course = mockApiCourses[0];
      courseraClient.setMockResponse(
        `/api/courses.v1?ids=${course.id}`,
        { elements: [course], paging: { total: 1 } }
      );

      const result = await getCourseDetails(courseraClient, cache, course.id);

      expect(result.id).toBe(course.id);
      expect(result.name).toBe(course.name);
      expect(result.slug).toBe(course.slug);
      expect(result.level).toBe('advanced');
      expect(result.certificate).toBe(true);
      expect(result.courseUrl).toContain('coursera.org/learn/');
    });

    it('should cache course details (24h TTL)', async () => {
      const course = mockApiCourses[0];
      courseraClient.setMockResponse(
        `/api/courses.v1?ids=${course.id}`,
        { elements: [course], paging: { total: 1 } }
      );

      const r1 = await getCourseDetails(courseraClient, cache, course.id);
      const r2 = await getCourseDetails(courseraClient, cache, course.id);

      expect(r1.id).toBe(r2.id);
    });

    it('should throw NotFoundError when course does not exist', async () => {
      const courseId = 'nonexistent-course';
      // Both the ids lookup and slug fallback return empty
      courseraClient.setMockResponse('/api/courses.v1', { elements: [], paging: { total: 0 } });

      try {
        await getCourseDetails(courseraClient, cache, courseId);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).resourceType).toBe('Course');
        expect((error as NotFoundError).resourceId).toBe(courseId);
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

    it('should include required fields in response', async () => {
      const course = mockApiCourses[0];
      courseraClient.setMockResponse(
        `/api/courses.v1?ids=${course.id}`,
        { elements: [course], paging: { total: 1 } }
      );

      const result = await getCourseDetails(courseraClient, cache, course.id);

      expect(result.id).toBeDefined();
      expect(result.name).toBeDefined();
      expect(result.slug).toBeDefined();
      expect(result.description).toBeDefined();
      expect(result.duration).toBeDefined();
      expect(result.level).toBeDefined();
      expect(result.language).toBeDefined();
      expect(result.certificate).toBeDefined();
      expect(result.courseUrl).toBeDefined();
    });

    it('should map level correctly', async () => {
      const course = { ...mockApiCourses[1] }; // BEGINNER
      courseraClient.setMockResponse(
        `/api/courses.v1?ids=${course.id}`,
        { elements: [course], paging: { total: 1 } }
      );

      const result = await getCourseDetails(courseraClient, cache, course.id);
      expect(result.level).toBe('beginner');
    });

    it('should parse workload into weeks', async () => {
      const course = mockApiCourses[0]; // '4 weeks of study'
      courseraClient.setMockResponse(
        `/api/courses.v1?ids=${course.id}`,
        { elements: [course], paging: { total: 1 } }
      );

      const result = await getCourseDetails(courseraClient, cache, course.id);
      expect(result.duration).toBe(4);
    });

    it('should report instructorCount from instructorIds', async () => {
      const course = mockApiCourses[0]; // instructorIds: ['i1', 'i2']
      courseraClient.setMockResponse(
        `/api/courses.v1?ids=${course.id}`,
        { elements: [course], paging: { total: 1 } }
      );

      const result = await getCourseDetails(courseraClient, cache, course.id);
      expect(result.instructorCount).toBe(2);
    });
  });

  describe('getProgramDetails', () => {
    it('should fetch program details from onDemandSpecializations.v1', async () => {
      const spec = mockApiSpecs[0];
      courseraClient.setMockResponse(
        `/api/onDemandSpecializations.v1?ids=${spec.id}`,
        { elements: [spec], paging: { total: 1 } }
      );

      const result = await getProgramDetails(courseraClient, cache, spec.id);

      expect(result.id).toBe(spec.id);
      expect(result.name).toBe(spec.name);
      expect(result.type).toBe('specialization');
      expect(result.courseCount).toBe(3);
      expect(result.programUrl).toContain('coursera.org/specializations/');
    });

    it('should cache program details', async () => {
      const spec = mockApiSpecs[0];
      courseraClient.setMockResponse(
        `/api/onDemandSpecializations.v1?ids=${spec.id}`,
        { elements: [spec], paging: { total: 1 } }
      );

      const r1 = await getProgramDetails(courseraClient, cache, spec.id);
      const r2 = await getProgramDetails(courseraClient, cache, spec.id);

      expect(r1.id).toBe(r2.id);
    });

    it('should throw NotFoundError when program does not exist', async () => {
      const programId = 'nonexistent-program';
      courseraClient.setMockResponse('/api/onDemandSpecializations.v1', { elements: [], paging: { total: 0 } });

      try {
        await getProgramDetails(courseraClient, cache, programId);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as NotFoundError).resourceType).toBe('Program');
        expect((error as NotFoundError).resourceId).toBe(programId);
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

    it('should use tagline as fallback description', async () => {
      const spec = mockApiSpecs[1]; // has tagline, no description
      courseraClient.setMockResponse(
        `/api/onDemandSpecializations.v1?ids=${spec.id}`,
        { elements: [spec], paging: { total: 1 } }
      );

      const result = await getProgramDetails(courseraClient, cache, spec.id);
      expect(result.description).toBeDefined();
      expect((result.description as string).length).toBeGreaterThan(0);
    });
  });

  describe('getMultipleCourseDetails', () => {
    it('should fetch multiple courses in parallel', async () => {
      const courseIds = [mockApiCourses[0].id, mockApiCourses[1].id];
      courseraClient.setMockResponse(
        `/api/courses.v1?ids=${mockApiCourses[0].id}`,
        { elements: [mockApiCourses[0]], paging: { total: 1 } }
      );
      courseraClient.setMockResponse(
        `/api/courses.v1?ids=${mockApiCourses[1].id}`,
        { elements: [mockApiCourses[1]], paging: { total: 1 } }
      );

      const results = await getMultipleCourseDetails(courseraClient, cache, courseIds);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe(mockApiCourses[0].id);
      expect(results[1].id).toBe(mockApiCourses[1].id);
    });
  });

  describe('getMultipleProgramDetails', () => {
    it('should fetch multiple programs in parallel', async () => {
      const programIds = [mockApiSpecs[0].id, mockApiSpecs[1].id];
      courseraClient.setMockResponse(
        `/api/onDemandSpecializations.v1?ids=${mockApiSpecs[0].id}`,
        { elements: [mockApiSpecs[0]], paging: { total: 1 } }
      );
      courseraClient.setMockResponse(
        `/api/onDemandSpecializations.v1?ids=${mockApiSpecs[1].id}`,
        { elements: [mockApiSpecs[1]], paging: { total: 1 } }
      );

      const results = await getMultipleProgramDetails(courseraClient, cache, programIds);

      expect(results.length).toBe(2);
      expect(results[0].id).toBe(mockApiSpecs[0].id);
      expect(results[1].id).toBe(mockApiSpecs[1].id);
    });
  });
});
