import { logger } from '../utils/logger';
import { CourseraClient } from '../services/courseraClient';
import { CacheService } from '../services/cache';

export class NotFoundError extends Error {
  constructor(
    public resourceType: string,
    public resourceId: string
  ) {
    super(`${resourceType} not found: ${resourceId}`);
    this.name = 'NotFoundError';
  }
}

interface CourseraApiCourse {
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

interface CourseraApiSpecialization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  courseIds?: string[];
}

interface CourseraApiResponse<T> {
  elements: T[];
  paging?: { total?: number };
}

function mapLevel(raw?: string): 'beginner' | 'intermediate' | 'advanced' | 'mixed' {
  switch (raw?.toUpperCase()) {
    case 'BEGINNER': return 'beginner';
    case 'INTERMEDIATE': return 'intermediate';
    case 'ADVANCED': return 'advanced';
    default: return 'mixed';
  }
}

function parseWeeks(workload?: string): number {
  if (!workload) return 4;
  const lower = workload.toLowerCase();
  const weeks = lower.match(/(\d+)\s*week/);
  if (weeks) return parseInt(weeks[1], 10);
  const hours = lower.match(/(\d+)\s*hour/);
  if (hours) return Math.max(1, Math.round(parseInt(hours[1], 10) / 5));
  return 4;
}

const COURSE_FIELDS = 'name,slug,description,level,primaryLanguages,certificates,workload,domainTypes,photoUrl,partnerIds,instructorIds';
const SPEC_FIELDS = 'name,slug,description,tagline,courseIds';

export async function getCourseDetails(
  courseraClient: CourseraClient,
  cache: CacheService,
  courseId: string
): Promise<Record<string, unknown>> {
  if (!courseId?.trim()) throw new Error('courseId is required');

  logger.info('Fetching course details', { courseId });

  return cache.getWithStaleCache(
    `course:${courseId}`,
    async () => {
      const response = await courseraClient.get<CourseraApiResponse<CourseraApiCourse>>(
        `/api/courses.v1?ids=${encodeURIComponent(courseId)}&fields=${COURSE_FIELDS}`
      );

      const course = response?.elements?.[0];

      if (!course) {
        // Try searching by slug as fallback
        const searchResponse = await courseraClient.get<CourseraApiResponse<CourseraApiCourse>>(
          `/api/courses.v1?limit=150&fields=${COURSE_FIELDS}`
        );
        const bySlug = searchResponse?.elements?.find(
          (c) => c.slug === courseId || c.slug.includes(courseId)
        );
        if (!bySlug) throw new NotFoundError('Course', courseId);

        return formatCourse(bySlug);
      }

      return formatCourse(course);
    },
    24 * 60 * 60
  );
}

function formatCourse(course: CourseraApiCourse): Record<string, unknown> {
  return {
    id: course.id,
    name: course.name,
    slug: course.slug,
    description: course.description ?? 'No description available.',
    level: mapLevel(course.level),
    language: course.primaryLanguages?.[0] ?? 'en',
    allLanguages: course.primaryLanguages ?? [],
    duration: parseWeeks(course.workload),
    workload: course.workload ?? 'Self-paced',
    certificate: (course.certificates?.length ?? 0) > 0,
    certificateTypes: course.certificates ?? [],
    domains: course.domainTypes?.map((d) => `${d.domainId} / ${d.subdomainId}`) ?? [],
    photoUrl: course.photoUrl,
    courseUrl: `https://www.coursera.org/learn/${course.slug}`,
    instructorCount: course.instructorIds?.length ?? 0,
  };
}

export async function getProgramDetails(
  courseraClient: CourseraClient,
  cache: CacheService,
  programId: string
): Promise<Record<string, unknown>> {
  if (!programId?.trim()) throw new Error('programId is required');

  logger.info('Fetching program details', { programId });

  return cache.getWithStaleCache(
    `program:${programId}`,
    async () => {
      const response = await courseraClient.get<CourseraApiResponse<CourseraApiSpecialization>>(
        `/api/onDemandSpecializations.v1?ids=${encodeURIComponent(programId)}&fields=${SPEC_FIELDS}`
      );

      let spec = response?.elements?.[0];

      if (!spec) {
        // Fallback: search by slug
        const listResponse = await courseraClient.get<CourseraApiResponse<CourseraApiSpecialization>>(
          `/api/onDemandSpecializations.v1?limit=150&fields=${SPEC_FIELDS}`
        );
        const found = listResponse?.elements?.find(
          (s) => s.slug === programId || s.slug.includes(programId)
        );
        if (!found) throw new NotFoundError('Program', programId);
        spec = found;
      }

      return {
        id: spec.id,
        name: spec.name,
        slug: spec.slug,
        type: 'specialization',
        description: spec.description ?? spec.tagline ?? 'No description available.',
        courseCount: spec.courseIds?.length ?? 0,
        courseIds: spec.courseIds ?? [],
        programUrl: `https://www.coursera.org/specializations/${spec.slug}`,
      };
    },
    24 * 60 * 60
  );
}

// Keep for backward compat with tests that import these
export async function getMultipleCourseDetails(
  courseraClient: CourseraClient,
  cache: CacheService,
  courseIds: string[]
): Promise<Record<string, unknown>[]> {
  return Promise.all(courseIds.map((id) => getCourseDetails(courseraClient, cache, id)));
}

export async function getMultipleProgramDetails(
  courseraClient: CourseraClient,
  cache: CacheService,
  programIds: string[]
): Promise<Record<string, unknown>[]> {
  return Promise.all(programIds.map((id) => getProgramDetails(courseraClient, cache, id)));
}
