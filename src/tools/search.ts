import { logger } from '../utils/logger.js';
import { CourseraClient } from '../services/courseraClient.js';
import { CacheService } from '../services/cache.js';
import { CatalogIndex, type CatalogCourse } from '../services/catalogIndex.js';
import { SearchCourseParamsSchema, SearchProgramParamsSchema } from '../types/schemas.js';
import type { SearchCourseParams, SearchProgramParams } from '../types/schemas.js';

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

function mapApiCourse(raw: CatalogCourse) {
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

const SPEC_FIELDS = 'name,slug,description,tagline,courseIds,partnerLogo';

export interface SearchResult<T> {
  items: T[];
  total: number;
  hasMore: boolean;
  query: string;
  catalogSize?: number;
  note?: string;
}

export async function searchCourses(
  _courseraClient: CourseraClient,
  cache: CacheService,
  catalogIndex: CatalogIndex,
  params: SearchCourseParams & { query: string }
): Promise<SearchResult<ReturnType<typeof mapApiCourse>>> {
  const validatedParams = SearchCourseParamsSchema.parse(params);
  const query = (validatedParams.query ?? '').toLowerCase().trim();
  const limit = validatedParams.limit ?? 10;
  const cacheKey = `search:courses:v2:${query}:${limit}:${validatedParams.level ?? ''}:${validatedParams.language ?? ''}`;

  // Map schema level (includes 'professional') to catalog index level
  const catalogLevel = (() => {
    const l = validatedParams.level;
    if (l === 'beginner' || l === 'intermediate' || l === 'advanced') return l;
    return undefined; // 'mixed' and 'professional' → no level filter
  })();

  logger.info('Searching courses via catalog index', { query, limit });

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      const filtered = await catalogIndex.search(query, {
        level: catalogLevel,
        language: validatedParams.language ?? undefined,
      });

      const status = await catalogIndex.getStatus();
      const items = filtered.slice(0, limit).map(mapApiCourse);

      return {
        items,
        total: filtered.length,
        hasMore: filtered.length > limit,
        query: validatedParams.query ?? '',
        catalogSize: status.total,
      };
    },
    // Short cache TTL for search results (catalog index handles its own freshness)
    60 * 60 // 1 hour
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
