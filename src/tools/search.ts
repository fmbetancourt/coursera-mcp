import { logger } from '../utils/logger';
import { CourseraClient } from '../services/courseraClient';
import { CacheService } from '../services/cache';
import { SearchCourseParamsSchema, SearchProgramParamsSchema } from '../types/schemas';
import type { SearchCourseParams, SearchProgramParams } from '../types/schemas';

// Coursera public API response shapes
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
}

interface CourseraApiSpecialization {
  id: string;
  name: string;
  slug: string;
  description?: string;
  tagline?: string;
  courseIds?: string[];
  partnerLogo?: string;
}

interface CourseraApiResponse<T> {
  elements: T[];
  paging?: { total?: number; next?: string };
}

// Maps Coursera API level strings to our level enum
function mapLevel(raw?: string): 'beginner' | 'intermediate' | 'advanced' | 'mixed' {
  switch (raw?.toUpperCase()) {
    case 'BEGINNER':
      return 'beginner';
    case 'INTERMEDIATE':
      return 'intermediate';
    case 'ADVANCED':
      return 'advanced';
    default:
      return 'mixed';
  }
}

// Parses workload string ("4 weeks of study", "2 hours") to an approximate week count
function parseWeeks(workload?: string): number {
  if (!workload) return 4;
  const lower = workload.toLowerCase();
  const weeks = lower.match(/(\d+)\s*week/);
  if (weeks) return parseInt(weeks[1], 10);
  const hours = lower.match(/(\d+)\s*hour/);
  if (hours) return Math.max(1, Math.round(parseInt(hours[1], 10) / 5));
  return 4;
}

// Transform Coursera API course → our domain type (flexible, avoids strict parser)
function mapApiCourse(raw: CourseraApiCourse) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    description: raw.description || 'No description available.',
    level: mapLevel(raw.level),
    language: raw.primaryLanguages?.[0] ?? 'en',
    duration: parseWeeks(raw.workload),
    certificate: (raw.certificates?.length ?? 0) > 0,
    enrollments: 0,
    rating: undefined as number | undefined,
    instructors: [] as { id: string; name: string }[],
    skills: [] as string[],
    photoUrl: raw.photoUrl,
    domains: raw.domainTypes?.map((d) => d.subdomainId) ?? [],
    courseUrl: `https://www.coursera.org/learn/${raw.slug}`,
  };
}

function mapApiSpecialization(raw: CourseraApiSpecialization) {
  return {
    id: raw.id,
    name: raw.name,
    slug: raw.slug,
    type: 'specialization' as const,
    description: raw.description || raw.tagline || 'No description available.',
    courseCount: raw.courseIds?.length ?? 0,
    courses: [],
    totalDuration: 0,
    price: 0,
    programUrl: `https://www.coursera.org/specializations/${raw.slug}`,
  };
}

const COURSE_FIELDS = 'name,slug,description,level,primaryLanguages,certificates,workload,domainTypes,photoUrl,partnerIds';
const SPEC_FIELDS = 'name,slug,description,tagline,courseIds,partnerLogo';

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  query: string;
  note?: string;
}

export async function searchCourses(
  courseraClient: CourseraClient,
  cache: CacheService,
  params: SearchCourseParams & { query: string }
): Promise<SearchResult<ReturnType<typeof mapApiCourse>>> {
  const validatedParams = SearchCourseParamsSchema.parse(params);
  const query = (validatedParams.query ?? '').toLowerCase().trim();
  const limit = validatedParams.limit ?? 10;
  const cacheKey = `search:courses:${query}:${limit}:${validatedParams.level ?? ''}:${validatedParams.language ?? ''}`;

  logger.info('Searching courses', { query, limit });

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      // Coursera public API has no text search — fetch 3 catalog pages in parallel and filter
      const pages = await Promise.all(
        [0, 100, 200].map((start) =>
          courseraClient.get<CourseraApiResponse<CourseraApiCourse>>(
            `/api/courses.v1?limit=100&start=${start}&fields=${COURSE_FIELDS}`
          )
        )
      );
      const elements = pages.flatMap((p) => p?.elements ?? []);

      // Filter by query against name and description
      let filtered = elements.filter((c) => {
        const haystack = `${c.name} ${c.description ?? ''}`.toLowerCase();
        return haystack.includes(query);
      });

      // Apply level filter
      if (validatedParams.level) {
        filtered = filtered.filter((c) => mapLevel(c.level) === validatedParams.level);
      }

      // Apply language filter
      if (validatedParams.language) {
        filtered = filtered.filter((c) =>
          c.primaryLanguages?.includes(validatedParams.language as string)
        );
      }

      const items = filtered.slice(0, limit).map(mapApiCourse);

      return {
        items,
        total: filtered.length,
        hasMore: filtered.length > limit,
        query: validatedParams.query ?? '',
        note:
          'Results are filtered from the first 150 catalog entries. For full search, Coursera authentication is required.',
      };
    },
    24 * 60 * 60
  );
}

export async function searchPrograms(
  courseraClient: CourseraClient,
  cache: CacheService,
  params: SearchProgramParams & { query: string }
): Promise<SearchResult<ReturnType<typeof mapApiSpecialization>>> {
  const validatedParams = SearchProgramParamsSchema.parse(params);
  const query = (validatedParams.query ?? '').toLowerCase().trim();
  const limit = validatedParams.limit ?? 10;
  const cacheKey = `search:programs:${query}:${limit}`;

  logger.info('Searching programs', { query, limit });

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      const pages = await Promise.all(
        [0, 100, 200].map((start) =>
          courseraClient.get<CourseraApiResponse<CourseraApiSpecialization>>(
            `/api/onDemandSpecializations.v1?limit=100&start=${start}&fields=${SPEC_FIELDS}`
          )
        )
      );
      const elements = pages.flatMap((p) => p?.elements ?? []);

      const filtered = elements.filter((s) => {
        const haystack = `${s.name} ${s.description ?? ''} ${s.tagline ?? ''}`.toLowerCase();
        return haystack.includes(query);
      });

      const items = filtered.slice(0, limit).map(mapApiSpecialization);

      return {
        items,
        total: filtered.length,
        hasMore: filtered.length > limit,
        query: validatedParams.query ?? '',
      };
    },
    24 * 60 * 60
  );
}
