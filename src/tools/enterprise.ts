import { logger } from '../utils/logger.js';
import { CacheService } from '../services/cache.js';
import { EnterpriseAuthService } from '../services/enterpriseAuth.js';

// Spec: components/schemas/BusinessProgram
interface BusinessProgram {
  id: string;
  name: string;
  tagline?: string;
  url: string;
  contentIds: Array<{ contentId: string; contentType: string }>;
}

interface BusinessProgramsResponse {
  elements: BusinessProgram[];
  paging?: { total?: number; next?: string };
}

// Spec: components/schemas/Content
interface EnterpriseContent {
  id: string;
  contentId: string;
  name: string;
  contentType: 'Course' | 'Specialization' | 'Video';
  slug?: string;
  difficultyLevel?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
  description?: string;
  languageCode?: string;
  partners?: Array<{ name: string }>;
  extraMetadata?: Record<string, unknown>;
}

interface EnterpriseContentsResponse {
  elements: EnterpriseContent[];
  paging?: { total?: number; next?: string };
}

// Spec: components/schemas/EnrollmentReport
interface EnrollmentReport {
  id: string;
  externalId: string;
  contentId: string;
  contentType: 'Course' | 'Specialization';
  contentName: string;
  contentSlug: string;
  programName: string;
  programSlug: string;
  partnerNames: string[];
  fullName: string;
  email: string;
  isCompleted: boolean;
  completedAt?: number | null;
  grade?: string | null;
  enrolledAt: number;
  lastActivityAt?: number | null;
  overallProgress?: number | null;
  approxTotalCourseHrs?: number | null;
  membershipState: string;
  contentCertificateUrl?: string | null;
}

interface EnrollmentReportsResponse {
  elements: EnrollmentReport[];
  paging?: { total?: number; next?: string };
}

export interface EnterpriseProgramsResult {
  programs: Array<{
    id: string;
    name: string;
    tagline: string;
    url: string;
    contentCount: number;
    contentIds: Array<{ contentId: string; contentType: string }>;
  }>;
  total: number;
  orgId: string;
}

export interface EnterpriseContentsResult {
  contents: Array<{
    id: string;
    name: string;
    contentType: string;
    slug: string;
    courseUrl: string;
    difficultyLevel: string;
    description: string;
    language: string;
    partners: string[];
  }>;
  total: number;
  orgId: string;
}

export interface EnterpriseEnrollmentsResult {
  enrollments: Array<{
    id: string;
    learnerEmail: string;
    learnerName: string;
    contentName: string;
    contentSlug: string;
    contentType: string;
    programName: string;
    partners: string[];
    isCompleted: boolean;
    overallProgress: number;
    enrolledAt: string;
    completedAt: string | null;
    lastActivityAt: string | null;
    grade: string | null;
    certificateUrl: string | null;
    approxHours: number | null;
  }>;
  total: number;
  orgId: string;
}

export async function getEnterprisePrograms(
  enterpriseAuth: EnterpriseAuthService,
  cache: CacheService,
  params: { limit?: number } = {}
): Promise<EnterpriseProgramsResult> {
  const orgId = enterpriseAuth.getOrgId();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 1000);
  const cacheKey = `enterprise:programs:${orgId}:${limit}`;

  logger.info('Fetching enterprise programs', { orgId });

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      const url = `${EnterpriseAuthService.BASE_URL}/api/businesses.v1/${orgId}/programs?excludeContent=false&limit=${limit}`;
      const response = await enterpriseAuth.makeRequest<BusinessProgramsResponse>(url);

      const programs = (response.elements ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        tagline: p.tagline ?? '',
        url: p.url,
        contentCount: p.contentIds?.length ?? 0,
        contentIds: p.contentIds ?? [],
      }));

      return { programs, total: response.paging?.total ?? programs.length, orgId };
    },
    60 * 60 // 1 hour — program structure changes rarely
  );
}

export async function getEnterpriseContents(
  enterpriseAuth: EnterpriseAuthService,
  cache: CacheService,
  params: { programId?: string; contentType?: string; limit?: number } = {}
): Promise<EnterpriseContentsResult> {
  const orgId = enterpriseAuth.getOrgId();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 1000);
  const cacheKey = `enterprise:contents:${orgId}:${params.programId ?? 'all'}:${params.contentType ?? 'all'}:${limit}`;

  logger.info('Fetching enterprise contents', { orgId, ...params });

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      const qs = new URLSearchParams({ limit: String(limit) });
      if (params.contentType) qs.set('contentType', params.contentType);

      const url = `${EnterpriseAuthService.BASE_URL}/api/businesses.v1/${orgId}/contents?${qs.toString()}`;
      const response = await enterpriseAuth.makeRequest<EnterpriseContentsResponse>(url);

      const contents = (response.elements ?? []).map((c) => ({
        id: c.id,
        name: c.name,
        contentType: c.contentType,
        slug: c.slug ?? c.contentId,
        courseUrl: c.contentType === 'Course'
          ? `https://www.coursera.org/learn/${c.slug ?? c.contentId}`
          : `https://www.coursera.org/specializations/${c.slug ?? c.contentId}`,
        difficultyLevel: c.difficultyLevel ?? 'UNKNOWN',
        description: c.description ?? '',
        language: c.languageCode ?? 'en',
        partners: (c.partners ?? []).map((p) => p.name),
      }));

      return { contents, total: response.paging?.total ?? contents.length, orgId };
    },
    60 * 60 * 24 // 24 hours — catalog changes rarely
  );
}

export async function getEnterpriseEnrollments(
  enterpriseAuth: EnterpriseAuthService,
  cache: CacheService,
  params: { programId?: string; externalId?: string; limit?: number } = {}
): Promise<EnterpriseEnrollmentsResult> {
  const orgId = enterpriseAuth.getOrgId();
  const limit = Math.min(Math.max(params.limit ?? 100, 1), 1000);
  const cacheKey = `enterprise:enrollments:${orgId}:${params.programId ?? 'all'}:${params.externalId ?? 'all'}:${limit}`;

  logger.info('Fetching enterprise enrollments', { orgId, ...params });

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      const qs = new URLSearchParams({ limit: String(limit) });

      if (params.programId && params.externalId) {
        qs.set('q', 'byUserProgramId');
        qs.set('programId', params.programId);
        qs.set('externalId', params.externalId);
      } else if (params.programId) {
        qs.set('q', 'byProgramId');
        qs.set('programId', params.programId);
      }

      const url = `${EnterpriseAuthService.BASE_URL}/api/businesses.v1/${orgId}/enrollmentReports?${qs.toString()}`;
      const response = await enterpriseAuth.makeRequest<EnrollmentReportsResponse>(url);

      const enrollments = (response.elements ?? []).map((e) => ({
        id: e.id,
        learnerEmail: e.email,
        learnerName: e.fullName,
        contentName: e.contentName,
        contentSlug: e.contentSlug,
        contentType: e.contentType,
        programName: e.programName,
        partners: e.partnerNames,
        isCompleted: e.isCompleted,
        overallProgress: e.overallProgress ?? 0,
        enrolledAt: new Date(e.enrolledAt).toISOString(),
        completedAt: e.completedAt ? new Date(e.completedAt).toISOString() : null,
        lastActivityAt: e.lastActivityAt ? new Date(e.lastActivityAt).toISOString() : null,
        grade: e.grade ?? null,
        certificateUrl: e.contentCertificateUrl ?? null,
        approxHours: e.approxTotalCourseHrs ?? null,
      }));

      return { enrollments, total: response.paging?.total ?? enrollments.length, orgId };
    },
    60 * 30 // 30 min — enrollment data is more dynamic
  );
}
