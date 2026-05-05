import fs from 'fs-extra';
import path from 'path';
import { logger } from '../utils/logger.js';
import { CourseraClient } from './courseraClient.js';

export interface CatalogCourse {
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

export interface SearchFilters {
  level?: 'beginner' | 'intermediate' | 'advanced' | 'mixed';
  language?: string;
}

interface CatalogIndexFile {
  courses: CatalogCourse[];
  builtAt: number;
}

interface CourseraApiResponse<T> {
  elements: T[];
  paging?: { total?: number; next?: string };
}

const COURSE_FIELDS =
  'name,slug,description,level,primaryLanguages,certificates,workload,domainTypes,photoUrl,partnerIds';
const PAGE_SIZE = 100;
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 250;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class CatalogIndex {
  private indexPath: string;
  private courses: CatalogCourse[] = [];
  private builtAt = 0;
  private loaded = false;
  private building = false;
  private courseraClient: CourseraClient;

  constructor(
    courseraClient: CourseraClient,
    indexPath?: string
  ) {
    this.courseraClient = courseraClient;
    this.indexPath = indexPath ?? path.join(process.env.HOME ?? '~', '.coursera-mcp', 'catalog-index.json');
  }

  async ensureIndex(): Promise<void> {
    if (!this.loaded) {
      await this.loadFromDisk();
    }

    const isStale = Date.now() - this.builtAt > TTL_MS;

    if (this.courses.length === 0) {
      await this.buildIndex();
    } else if (isStale && !this.building) {
      // Serve stale, rebuild in background
      this.buildIndex().catch((err: unknown) =>
        logger.warn('Background catalog rebuild failed', { error: String(err) })
      );
    }
  }

  async search(query: string, filters: SearchFilters = {}): Promise<CatalogCourse[]> {
    await this.ensureIndex();

    const q = query.toLowerCase().trim();
    let results = this.courses.filter((c) => {
      if (!q) return true;
      const haystack = `${c.name} ${c.description ?? ''} ${c.slug}`.toLowerCase();
      return haystack.includes(q);
    });

    if (filters.level) {
      const targetLevel = filters.level;
      results = results.filter((c) => mapLevel(c.level) === targetLevel);
    }

    if (filters.language) {
      const lang = filters.language;
      results = results.filter((c) => c.primaryLanguages?.includes(lang));
    }

    return results;
  }

  async getStatus(): Promise<{ total: number; builtAt: Date; isStale: boolean }> {
    if (!this.loaded) await this.loadFromDisk();
    return {
      total: this.courses.length,
      builtAt: new Date(this.builtAt),
      isStale: Date.now() - this.builtAt > TTL_MS,
    };
  }

  getCourseBySlug(slug: string): CatalogCourse | undefined {
    return this.courses.find((c) => c.slug === slug || c.id === slug);
  }

  private async loadFromDisk(): Promise<void> {
    try {
      if (await fs.pathExists(this.indexPath)) {
        const data = (await fs.readJson(this.indexPath)) as CatalogIndexFile;
        this.courses = data.courses ?? [];
        this.builtAt = data.builtAt ?? 0;
        logger.info('Catalog index loaded from disk', { total: this.courses.length });
      }
    } catch (err) {
      logger.warn('Failed to load catalog index from disk', { error: String(err) });
    }
    this.loaded = true;
  }

  async buildIndex(): Promise<void> {
    if (this.building) return;
    this.building = true;

    logger.info('Building full Coursera catalog index — this may take ~30 seconds on first run...');

    try {
      // Fetch first page to get total count
      const firstPage = await this.courseraClient.get<CourseraApiResponse<CatalogCourse>>(
        `/api/courses.v1?limit=${PAGE_SIZE}&start=0&fields=${COURSE_FIELDS}`
      );

      const total = firstPage?.paging?.total ?? PAGE_SIZE;
      const allCourses: CatalogCourse[] = [...(firstPage?.elements ?? [])];

      logger.info('Catalog total from API', { total });

      // Build list of remaining start offsets
      const starts: number[] = [];
      for (let start = PAGE_SIZE; start < total; start += PAGE_SIZE) {
        starts.push(start);
      }

      // Fetch in batches of BATCH_SIZE concurrent requests
      for (let i = 0; i < starts.length; i += BATCH_SIZE) {
        const batch = starts.slice(i, i + BATCH_SIZE);
        const pages = await Promise.all(
          batch.map((start) =>
            this.courseraClient.get<CourseraApiResponse<CatalogCourse>>(
              `/api/courses.v1?limit=${PAGE_SIZE}&start=${start}&fields=${COURSE_FIELDS}`
            )
          )
        );
        pages.forEach((p) => allCourses.push(...(p?.elements ?? [])));

        if (i + BATCH_SIZE < starts.length) {
          await delay(BATCH_DELAY_MS);
        }
      }

      this.courses = allCourses;
      this.builtAt = Date.now();
      await this.saveToDisk();

      logger.info('Catalog index build complete', { total: this.courses.length });
    } finally {
      this.building = false;
    }
  }

  private async saveToDisk(): Promise<void> {
    await fs.ensureDir(path.dirname(this.indexPath));
    const data: CatalogIndexFile = { courses: this.courses, builtAt: this.builtAt };
    await fs.writeJson(this.indexPath, data);
    logger.info('Catalog index saved to disk', { path: this.indexPath });
  }
}

function mapLevel(raw?: string): 'beginner' | 'intermediate' | 'advanced' | 'mixed' {
  switch (raw?.toUpperCase()) {
    case 'BEGINNER': return 'beginner';
    case 'INTERMEDIATE': return 'intermediate';
    case 'ADVANCED': return 'advanced';
    default: return 'mixed';
  }
}
