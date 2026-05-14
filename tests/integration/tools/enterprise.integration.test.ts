import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import fs from 'fs-extra';
import path from 'path';
import { CacheService } from '../../../src/services/cache';
import { EnterpriseAuthService } from '../../../src/services/enterpriseAuth';
import {
  getEnterprisePrograms,
  getEnterpriseContents,
  getEnterpriseEnrollments,
} from '../../../src/tools/enterprise';

const testCacheDir = path.join(process.cwd(), '.test-enterprise-cache');

const TEST_ORG_ID = 'test-org-abc123';

// Mock that intercepts makeRequest without touching axios
class MockEnterpriseAuth extends EnterpriseAuthService {
  private mockResponses: Map<string, unknown> = new Map();

  constructor() {
    super('test-master-key', '/tmp/mock-enterprise.json');
    // Override orgId via private property
    (this as unknown as Record<string, unknown>)['session'] = { orgId: TEST_ORG_ID };
  }

  setMockResponse(urlSubstring: string, response: unknown): void {
    this.mockResponses.set(urlSubstring, response);
  }

  override async makeRequest<T>(url: string): Promise<T> {
    for (const [key, val] of this.mockResponses.entries()) {
      if (url.includes(key)) return val as T;
    }
    throw new Error(`No mock response for ${url}`);
  }

  override async getAccessToken(): Promise<string> {
    return 'mock-token';
  }

  override hasCredentials(): boolean {
    return true;
  }

  override getOrgId(): string {
    return TEST_ORG_ID;
  }
}

const mockPrograms = {
  elements: [
    {
      id: 'prog-001',
      name: 'ViveMejor Academy',
      tagline: 'Crece con nosotros',
      url: 'https://www.coursera.org/programs/vivemejor-abc',
      contentIds: [
        { contentId: 'course-001', contentType: 'Course' },
        { contentId: 'spec-001', contentType: 'Specialization' },
      ],
    },
    {
      id: 'prog-002',
      name: 'Manager Academy',
      tagline: 'Liderazgo efectivo',
      url: 'https://www.coursera.org/programs/manager-xyz',
      contentIds: [{ contentId: 'course-002', contentType: 'Course' }],
    },
  ],
  paging: { total: 2 },
};

const mockContents = {
  elements: [
    {
      id: 'Course~course-001',
      contentId: 'course-001',
      name: 'Python para Datos',
      contentType: 'Course' as const,
      slug: 'python-para-datos',
      difficultyLevel: 'BEGINNER' as const,
      description: 'Aprende Python desde cero',
      languageCode: 'es',
      partners: [{ name: 'Universidad de Chile' }],
    },
    {
      id: 'Specialization~spec-001',
      contentId: 'spec-001',
      name: 'Data Science Profesional',
      contentType: 'Specialization' as const,
      slug: 'data-science-profesional',
      difficultyLevel: 'INTERMEDIATE' as const,
      description: 'Especialización completa en data science',
      languageCode: 'es',
      partners: [{ name: 'IBM' }],
    },
  ],
  paging: { total: 2 },
};

const mockEnrollments = {
  elements: [
    {
      id: 'user1@walmart.cl~Course~course-001',
      externalId: 'user1@walmart.cl',
      contentId: 'course-001',
      contentType: 'Course' as const,
      contentName: 'Python para Datos',
      contentSlug: 'python-para-datos',
      programName: 'ViveMejor Academy',
      programSlug: 'vivemejor-abc',
      partnerNames: ['Universidad de Chile'],
      fullName: 'Juan Pérez',
      email: 'user1@walmart.cl',
      isCompleted: false,
      completedAt: null,
      grade: null,
      enrolledAt: 1700000000000,
      lastActivityAt: 1701000000000,
      overallProgress: 45,
      approxTotalCourseHrs: 3.5,
      membershipState: 'MEMBER',
      contentCertificateUrl: null,
    },
  ],
  paging: { total: 1 },
};

let cache: CacheService;
let mockAuth: MockEnterpriseAuth;

describe('Integration: Enterprise Tools', () => {
  beforeEach(() => {
    fs.ensureDirSync(testCacheDir);
    cache = new CacheService(testCacheDir);
    mockAuth = new MockEnterpriseAuth();
  });

  afterEach(() => {
    fs.removeSync(testCacheDir);
    fs.removeSync(testCacheDir + '-2');
    fs.removeSync(testCacheDir + '-3');
  });

  describe('getEnterprisePrograms', () => {
    it('should return list of enterprise programs', async () => {
      mockAuth.setMockResponse('/programs', mockPrograms);

      const result = await getEnterprisePrograms(mockAuth, cache);

      expect(result.programs).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.orgId).toBe(TEST_ORG_ID);
      expect(result.programs[0].name).toBe('ViveMejor Academy');
      expect(result.programs[0].contentCount).toBe(2);
    });

    it('should include contentIds in each program', async () => {
      mockAuth.setMockResponse('/programs', mockPrograms);

      const result = await getEnterprisePrograms(mockAuth, cache);

      expect(result.programs[0].contentIds).toHaveLength(2);
      expect(result.programs[0].contentIds[0].contentType).toBe('Course');
    });

    it('should include program URL and tagline', async () => {
      mockAuth.setMockResponse('/programs', mockPrograms);

      const result = await getEnterprisePrograms(mockAuth, cache);

      expect(result.programs[0].url).toContain('coursera.org/programs/');
      expect(result.programs[0].tagline).toBe('Crece con nosotros');
    });

    it('should cache results on second call', async () => {
      mockAuth.setMockResponse('/programs', mockPrograms);

      const r1 = await getEnterprisePrograms(mockAuth, cache);
      const r2 = await getEnterprisePrograms(mockAuth, cache);

      expect(r1.programs[0].id).toBe(r2.programs[0].id);
    });

    it('should throw when no enterprise credentials configured', async () => {
      const noCredAuth = new EnterpriseAuthService('test-key', '/nonexistent/path.json');

      try {
        await getEnterprisePrograms(noCredAuth, cache);
        expect.unreachable();
      } catch (error) {
        expect((error as Error).message).toContain('No enterprise credentials');
      }
    });
  });

  describe('getEnterpriseContents', () => {
    it('should return enterprise content catalog', async () => {
      mockAuth.setMockResponse('/contents', mockContents);

      const result = await getEnterpriseContents(mockAuth, cache);

      expect(result.contents).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.orgId).toBe(TEST_ORG_ID);
    });

    it('should build correct courseUrl for courses', async () => {
      mockAuth.setMockResponse('/contents', mockContents);

      const result = await getEnterpriseContents(mockAuth, cache);
      const course = result.contents.find((c) => c.contentType === 'Course');

      expect(course?.courseUrl).toContain('coursera.org/learn/python-para-datos');
    });

    it('should build correct courseUrl for specializations', async () => {
      mockAuth.setMockResponse('/contents', mockContents);

      const result = await getEnterpriseContents(mockAuth, cache);
      const spec = result.contents.find((c) => c.contentType === 'Specialization');

      expect(spec?.courseUrl).toContain('coursera.org/specializations/');
    });

    it('should include partner names', async () => {
      mockAuth.setMockResponse('/contents', mockContents);

      const result = await getEnterpriseContents(mockAuth, cache);

      expect(result.contents[0].partners).toContain('Universidad de Chile');
    });

    it('should respect limit parameter', async () => {
      mockAuth.setMockResponse('/contents', { elements: mockContents.elements.slice(0, 1), paging: { total: 1 } });

      const result = await getEnterpriseContents(mockAuth, cache, { limit: 1 });

      expect(result.contents.length).toBeLessThanOrEqual(1);
    });
  });

  describe('getEnterpriseEnrollments', () => {
    it('should return enrollment reports', async () => {
      mockAuth.setMockResponse('/enrollmentReports', mockEnrollments);

      const result = await getEnterpriseEnrollments(mockAuth, cache);

      expect(result.enrollments).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.orgId).toBe(TEST_ORG_ID);
    });

    it('should include learner info', async () => {
      mockAuth.setMockResponse('/enrollmentReports', mockEnrollments);

      const result = await getEnterpriseEnrollments(mockAuth, cache);

      expect(result.enrollments[0].learnerEmail).toBe('user1@walmart.cl');
      expect(result.enrollments[0].learnerName).toBe('Juan Pérez');
    });

    it('should include progress data', async () => {
      mockAuth.setMockResponse('/enrollmentReports', mockEnrollments);

      const result = await getEnterpriseEnrollments(mockAuth, cache);

      expect(result.enrollments[0].overallProgress).toBe(45);
      expect(result.enrollments[0].isCompleted).toBe(false);
      expect(result.enrollments[0].approxHours).toBe(3.5);
    });

    it('should format timestamps as ISO strings', async () => {
      mockAuth.setMockResponse('/enrollmentReports', mockEnrollments);

      const result = await getEnterpriseEnrollments(mockAuth, cache);

      expect(result.enrollments[0].enrolledAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.enrollments[0].lastActivityAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.enrollments[0].completedAt).toBeNull();
    });

    it('should pass programId filter in query string', async () => {
      let capturedUrl = '';
      mockAuth.setMockResponse('/enrollmentReports', mockEnrollments);
      mockAuth.makeRequest = async <T>(url: string): Promise<T> => {
        capturedUrl = url;
        return mockEnrollments as T;
      };

      await getEnterpriseEnrollments(mockAuth, new CacheService(testCacheDir + '-2'), {
        programId: 'prog-001',
      });

      expect(capturedUrl).toContain('q=byProgramId');
      expect(capturedUrl).toContain('programId=prog-001');
    });

    it('should pass programId + externalId filter in query string', async () => {
      let capturedUrl = '';
      mockAuth.makeRequest = async <T>(url: string): Promise<T> => {
        capturedUrl = url;
        return mockEnrollments as T;
      };

      await getEnterpriseEnrollments(mockAuth, new CacheService(testCacheDir + '-3'), {
        programId: 'prog-001',
        externalId: 'user1@walmart.cl',
      });

      expect(capturedUrl).toContain('q=byUserProgramId');
      expect(capturedUrl).toContain('externalId=user1%40walmart.cl');
    });
  });
});
