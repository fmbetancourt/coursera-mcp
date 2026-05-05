import { logger } from '../utils/logger.js';
import { CourseraClient } from '../services/courseraClient.js';
import { CacheService } from '../services/cache.js';
import { CatalogIndex, type CatalogCourse } from '../services/catalogIndex.js';
import { getEnrolledCourses } from './enrolled.js';

export interface RecommendedCourse {
  id: string;
  name: string;
  slug: string;
  description: string;
  level: string;
  language: string;
  certificate: boolean;
  courseUrl: string;
  domains: string[];
  recommendationReason: string;
}

export interface RecommendationsResult {
  courses: RecommendedCourse[];
  reason: string;
  basedOnEnrollments: number;
}

export async function getRecommendations(
  courseraClient: CourseraClient,
  cache: CacheService,
  catalogIndex: CatalogIndex,
  userId: string,
  params?: { limit?: number }
): Promise<RecommendationsResult> {
  if (!userId?.trim()) throw new Error('userId is required');

  const limit = Math.min(Math.max(params?.limit ?? 10, 1), 50);

  logger.info('Fetching recommendations', { userId, limit });

  const cacheKey = `recommendations:v2:${userId}:${limit}`;

  return cache.getWithStaleCache(
    cacheKey,
    async () => {
      // Step 1: get enrolled courses to find their IDs
      const enrolled = await getEnrolledCourses(courseraClient, cache, userId);
      const enrolledCourseIds = new Set(enrolled.courses.map((c) => c.courseId));

      if (enrolledCourseIds.size === 0) {
        return {
          courses: [],
          reason: 'No enrolled courses found. Enroll in some courses to get recommendations.',
          basedOnEnrollments: 0,
        };
      }

      // Step 2: find domains from enrolled courses in the catalog
      await catalogIndex.ensureIndex();
      const domainFrequency = new Map<string, number>();

      for (const courseId of enrolledCourseIds) {
        const catalogCourse = catalogIndex.getCourseBySlug(courseId);
        if (catalogCourse?.domainTypes) {
          for (const dt of catalogCourse.domainTypes) {
            const domain = dt.subdomainId || dt.domainId;
            domainFrequency.set(domain, (domainFrequency.get(domain) ?? 0) + 1);
          }
        }
      }

      // Step 3: search catalog for courses in those domains, exclude already enrolled
      let candidates: CatalogCourse[];

      if (domainFrequency.size > 0) {
        const topDomains = [...domainFrequency.entries()]
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([d]) => d);

        const allCatalogCourses = await catalogIndex.search('', {});
        candidates = allCatalogCourses.filter((c) => {
          if (enrolledCourseIds.has(c.id) || enrolledCourseIds.has(c.slug)) return false;
          return c.domainTypes?.some(
            (dt) => topDomains.includes(dt.subdomainId) || topDomains.includes(dt.domainId)
          );
        });
      } else {
        // Fallback: return popular courses (first N from catalog that aren't enrolled)
        const allCatalogCourses = await catalogIndex.search('', {});
        candidates = allCatalogCourses.filter(
          (c) => !enrolledCourseIds.has(c.id) && !enrolledCourseIds.has(c.slug)
        );
      }

      const courses: RecommendedCourse[] = candidates.slice(0, limit).map((c) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        description: c.description ?? 'No description available.',
        level: mapLevel(c.level),
        language: c.primaryLanguages?.[0] ?? 'en',
        certificate: (c.certificates?.length ?? 0) > 0,
        courseUrl: `https://www.coursera.org/learn/${c.slug}`,
        domains: c.domainTypes?.map((d) => d.subdomainId ?? d.domainId) ?? [],
        recommendationReason:
          domainFrequency.size > 0
            ? 'Matches domains from your enrolled courses'
            : 'Popular course you haven\'t tried yet',
      }));

      return {
        courses,
        reason:
          domainFrequency.size > 0
            ? `Based on ${enrolledCourseIds.size} enrolled course(s) — matching your domain interests`
            : `Based on ${enrolledCourseIds.size} enrolled course(s) — explore new areas`,
        basedOnEnrollments: enrolledCourseIds.size,
      };
    },
    6 * 60 * 60 // 6 hours
  );
}

function mapLevel(raw?: string): string {
  switch (raw?.toUpperCase()) {
    case 'BEGINNER': return 'beginner';
    case 'INTERMEDIATE': return 'intermediate';
    case 'ADVANCED': return 'advanced';
    default: return 'mixed';
  }
}
