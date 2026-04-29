// src/index.ts - Punto de entrada MCP

import { Server } from '@anthropic-ai/sdk/lib/mcp/server/sse.js'
import { Tool } from '@anthropic-ai/sdk/lib/mcp/index.js'
import { logger } from './utils/logger'
import { initializeConfig } from './config'
import * as searchTools from './tools/search'
import * as enrolledTools from './tools/enrolled'
import * as detailsTools from './tools/details'
import * as recommendationTools from './tools/recommendations'

async function main() {
  try {
    // Inicializar configuración
    const config = initializeConfig()
    logger.info('Configuration initialized', { cacheDir: config.cacheDir })

    // Crear servidor MCP
    const server = new Server({
      name: 'coursera-mcp',
      version: '1.0.0',
    })

    // Registrar herramientas públicas
    server.tool(
      'search_courses',
      'Search for courses on Coursera by keywords, category, language, and level',
      searchTools.searchCoursesSchema,
      searchTools.searchCoursesHandler
    )

    server.tool(
      'search_programs',
      'Search for programs (specializations, degrees) on Coursera',
      searchTools.searchProgramsSchema,
      searchTools.searchProgramsHandler
    )

    server.tool(
      'get_course_details',
      'Get detailed information about a specific course including syllabus and instructors',
      detailsTools.getCourseDetailsSchema,
      detailsTools.getCourseDetailsHandler
    )

    server.tool(
      'get_program_details',
      'Get detailed information about a program including courses and requirements',
      detailsTools.getProgramDetailsSchema,
      detailsTools.getProgramDetailsHandler
    )

    // Registrar herramientas privadas (requieren autenticación)
    server.tool(
      'get_enrolled_courses',
      'Get list of courses you are enrolled in with progress information (requires authentication)',
      enrolledTools.getEnrolledCoursesSchema,
      enrolledTools.getEnrolledCoursesHandler
    )

    server.tool(
      'get_progress',
      'Get detailed progress information for a specific enrolled course (requires authentication)',
      enrolledTools.getProgressSchema,
      enrolledTools.getProgressHandler
    )

    server.tool(
      'get_recommendations',
      'Get personalized course recommendations based on your enrollment history (requires authentication)',
      recommendationTools.getRecommendationsSchema,
      recommendationTools.getRecommendationsHandler
    )

    // Iniciar servidor
    const transport = new StdioServerTransport()
    await server.connect(transport)
    logger.info('Coursera MCP Server started')
  } catch (error) {
    logger.error('Server initialization failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    process.exit(1)
  }
}

main()

// src/services/courseraClient.ts - Cliente HTTP

import axios, { AxiosInstance, AxiosError } from 'axios'
import {
  NetworkError,
  RateLimitError,
  AuthenticationError,
  ParsingError,
} from '../types/errors'
import { logger } from '../utils/logger'
import { RetryConfig } from '../types'
import { retryWithBackoff } from '../utils/retry'

export class CourseraClient {
  private client: AxiosInstance
  private sessionToken?: string
  private retryConfig: RetryConfig

  constructor(
    baseUrl: string,
    retryConfig: RetryConfig,
    sessionToken?: string
  ) {
    this.retryConfig = retryConfig
    this.sessionToken = sessionToken

    this.client = axios.create({
      baseURL: baseUrl,
      timeout: retryConfig.timeoutMs,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    })

    if (sessionToken) {
      this.client.defaults.headers.common['Authorization'] = `Bearer ${sessionToken}`
    }
  }

  async get<T>(url: string): Promise<T> {
    return retryWithBackoff(
      async () => {
        try {
          const response = await this.client.get<T>(url)
          return response.data
        } catch (error) {
          this.handleError(error)
        }
      },
      this.retryConfig,
      logger
    )
  }

  async post<T>(url: string, data: unknown): Promise<T> {
    return retryWithBackoff(
      async () => {
        try {
          const response = await this.client.post<T>(url, data)
          return response.data
        } catch (error) {
          this.handleError(error)
        }
      },
      this.retryConfig,
      logger
    )
  }

  private handleError(error: unknown): never {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status

      if (status === 401) {
        throw new AuthenticationError('Invalid or expired session')
      }
      if (status === 429) {
        const retryAfter = parseInt(
          axiosError.response?.headers['retry-after'] ?? '60'
        )
        throw new RateLimitError(retryAfter)
      }
      if (status === 404) {
        throw new ParsingError('Resource not found')
      }

      throw new NetworkError(axiosError.message)
    }

    throw new NetworkError(
      error instanceof Error ? error.message : 'Unknown error'
    )
  }
}

// src/tools/search.ts - Herramientas de búsqueda

import { Course, CourseSearchResult, Program, ProgramSearchResult } from '../types/coursera'
import { cacheManager } from '../services/cache'
import { courseraClient } from '../index'
import { logger } from '../utils/logger'

export const searchCoursesSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string',
      description: 'Search term (e.g., "Python", "Data Science")',
    },
    category: {
      type: 'string',
      description:
        'Category filter (e.g., "computer-science", "business", "health")',
      enum: ['computer-science', 'business', 'health', 'language', 'arts'],
    },
    language: {
      type: 'string',
      description: 'Language (e.g., "en", "es")',
      enum: ['en', 'es', 'fr', 'de', 'zh', 'ja'],
    },
    level: {
      type: 'string',
      description: 'Difficulty level',
      enum: ['beginner', 'intermediate', 'advanced'],
    },
    sortBy: {
      type: 'string',
      description: 'Sort results by',
      enum: ['relevance', 'popularity', 'rating', 'newest'],
    },
    limit: {
      type: 'number',
      description: 'Number of results (1-50)',
      minimum: 1,
      maximum: 50,
      default: 20,
    },
  },
  required: ['query'],
}

export async function searchCoursesHandler(
  params: Record<string, unknown>
): Promise<CourseSearchResult> {
  const { query, category, language, level, sortBy = 'relevance', limit = 20 } = params

  // Crear clave de caché
  const cacheKey = `search:courses:${query}:${category}:${language}:${level}`
  
  // Intentar obtener del caché
  const cached = cacheManager.get<CourseSearchResult>(cacheKey)
  if (cached) {
    logger.info('Cache hit for course search', { cacheKey })
    return cached
  }

  logger.info('Searching courses', { query, category, language, level, limit })

  try {
    // Construir URL con parámetros
    const params = new URLSearchParams({
      q: query as string,
      limit: String(limit),
      sortBy: sortBy as string,
      ...(category && { category: category as string }),
      ...(language && { language: language as string }),
      ...(level && { level: level as string }),
    })

    const result = await courseraClient.get<CourseSearchResult>(
      `/api/courses?${params.toString()}`
    )

    // Guardar en caché
    cacheManager.set(cacheKey, result, 24 * 60 * 60 * 1000)

    return result
  } catch (error) {
    logger.error('Course search failed', {
      error: error instanceof Error ? error.message : String(error),
      query,
    })
    throw error
  }
}

export const searchProgramsSchema = {
  type: 'object' as const,
  properties: {
    query: {
      type: 'string',
      description: 'Search term (e.g., "Data Science")',
    },
    type: {
      type: 'string',
      description: 'Program type',
      enum: ['specialization', 'degree', 'professional-certificate'],
    },
    institution: {
      type: 'string',
      description: 'Filter by institution (e.g., "Stanford")',
    },
    sortBy: {
      type: 'string',
      description: 'Sort results',
      enum: ['relevance', 'enrollment', 'rating'],
    },
    limit: {
      type: 'number',
      description: 'Number of results (1-50)',
      minimum: 1,
      maximum: 50,
      default: 20,
    },
  },
  required: ['query'],
}

export async function searchProgramsHandler(
  params: Record<string, unknown>
): Promise<ProgramSearchResult> {
  const { query, type, institution, sortBy = 'relevance', limit = 20 } = params

  const cacheKey = `search:programs:${query}:${type}:${institution}`

  const cached = cacheManager.get<ProgramSearchResult>(cacheKey)
  if (cached) {
    logger.info('Cache hit for program search', { cacheKey })
    return cached
  }

  logger.info('Searching programs', { query, type, institution, limit })

  try {
    const searchParams = new URLSearchParams({
      q: query as string,
      limit: String(limit),
      sortBy: sortBy as string,
      ...(type && { type: type as string }),
      ...(institution && { institution: institution as string }),
    })

    const result = await courseraClient.get<ProgramSearchResult>(
      `/api/programs?${searchParams.toString()}`
    )

    cacheManager.set(cacheKey, result, 24 * 60 * 60 * 1000)
    return result
  } catch (error) {
    logger.error('Program search failed', {
      error: error instanceof Error ? error.message : String(error),
      query,
    })
    throw error
  }
}

// src/tools/enrolled.ts - Cursos inscritos y progreso

import { EnrolledCourse, DetailedProgress, EnrollmentResponse } from '../types/coursera'
import { logger } from '../utils/logger'
import { courseraClient } from '../index'
import { cacheManager } from '../services/cache'

export const getEnrolledCoursesSchema = {
  type: 'object' as const,
  properties: {
    includeProgress: {
      type: 'boolean',
      description: 'Include detailed progress',
      default: true,
    },
    sortBy: {
      type: 'string',
      description: 'Sort results',
      enum: ['enrollmentDate', 'progress', 'name'],
      default: 'progress',
    },
  },
}

export async function getEnrolledCoursesHandler(
  params: Record<string, unknown>
): Promise<EnrollmentResponse> {
  const cacheKey = 'enrolled:courses'

  const cached = cacheManager.get<EnrollmentResponse>(cacheKey)
  if (cached) {
    logger.info('Cache hit for enrolled courses')
    return cached
  }

  logger.info('Fetching enrolled courses')

  try {
    const result = await courseraClient.get<EnrollmentResponse>(
      '/api/me/enrolled'
    )

    // Caché por 1 hora para datos sensibles
    cacheManager.set(cacheKey, result, 60 * 60 * 1000)
    return result
  } catch (error) {
    logger.error('Failed to fetch enrolled courses', {
      error: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}

export const getProgressSchema = {
  type: 'object' as const,
  properties: {
    courseId: {
      type: 'string',
      description: 'Course ID',
    },
  },
  required: ['courseId'],
}

export async function getProgressHandler(
  params: Record<string, unknown>
): Promise<DetailedProgress> {
  const { courseId } = params

  const cacheKey = `progress:${courseId}`

  const cached = cacheManager.get<DetailedProgress>(cacheKey)
  if (cached) {
    logger.info('Cache hit for course progress', { courseId })
    return cached
  }

  logger.info('Fetching course progress', { courseId })

  try {
    const result = await courseraClient.get<DetailedProgress>(
      `/api/progress?courseId=${courseId}`
    )

    cacheManager.set(cacheKey, result, 60 * 60 * 1000) // 1 hora
    return result
  } catch (error) {
    logger.error('Failed to fetch progress', {
      error: error instanceof Error ? error.message : String(error),
      courseId,
    })
    throw error
  }
}

// src/tools/details.ts - Detalles de cursos y programas

import { Course, Program } from '../types/coursera'
import { NotFoundError } from '../types/errors'
import { logger } from '../utils/logger'
import { courseraClient } from '../index'
import { cacheManager } from '../services/cache'

export const getCourseDetailsSchema = {
  type: 'object' as const,
  properties: {
    courseId: {
      type: 'string',
      description: 'Course ID or slug',
    },
  },
  required: ['courseId'],
}

export async function getCourseDetailsHandler(
  params: Record<string, unknown>
): Promise<Course> {
  const { courseId } = params

  const cacheKey = `course:${courseId}`

  const cached = cacheManager.get<Course>(cacheKey)
  if (cached) {
    logger.info('Cache hit for course details', { courseId })
    return cached
  }

  logger.info('Fetching course details', { courseId })

  try {
    const result = await courseraClient.get<Course>(
      `/api/courses/${courseId}`
    )

    if (!result) {
      throw new NotFoundError(`Course ${courseId}`)
    }

    cacheManager.set(cacheKey, result, 24 * 60 * 60 * 1000) // 24 horas
    return result
  } catch (error) {
    logger.error('Failed to fetch course details', {
      error: error instanceof Error ? error.message : String(error),
      courseId,
    })
    throw error
  }
}

export const getProgramDetailsSchema = {
  type: 'object' as const,
  properties: {
    programId: {
      type: 'string',
      description: 'Program ID or slug',
    },
  },
  required: ['programId'],
}

export async function getProgramDetailsHandler(
  params: Record<string, unknown>
): Promise<Program> {
  const { programId } = params

  const cacheKey = `program:${programId}`

  const cached = cacheManager.get<Program>(cacheKey)
  if (cached) {
    logger.info('Cache hit for program details', { programId })
    return cached
  }

  logger.info('Fetching program details', { programId })

  try {
    const result = await courseraClient.get<Program>(
      `/api/programs/${programId}`
    )

    if (!result) {
      throw new NotFoundError(`Program ${programId}`)
    }

    cacheManager.set(cacheKey, result, 24 * 60 * 60 * 1000)
    return result
  } catch (error) {
    logger.error('Failed to fetch program details', {
      error: error instanceof Error ? error.message : String(error),
      programId,
    })
    throw error
  }
}

// src/tools/recommendations.ts - Recomendaciones

import { RecommendationResult } from '../types/coursera'
import { logger } from '../utils/logger'
import { courseraClient } from '../index'
import { cacheManager } from '../services/cache'

export const getRecommendationsSchema = {
  type: 'object' as const,
  properties: {
    basedOn: {
      type: 'string',
      description: 'Recommendation basis',
      enum: ['enrollmentHistory', 'skills', 'careerGoal'],
      default: 'enrollmentHistory',
    },
    limit: {
      type: 'number',
      description: 'Number of recommendations (1-20)',
      minimum: 1,
      maximum: 20,
      default: 10,
    },
  },
}

export async function getRecommendationsHandler(
  params: Record<string, unknown>
): Promise<RecommendationResult> {
  const { basedOn = 'enrollmentHistory', limit = 10 } = params

  const cacheKey = `recommendations:${basedOn}`

  const cached = cacheManager.get<RecommendationResult>(cacheKey)
  if (cached) {
    logger.info('Cache hit for recommendations', { basedOn })
    return cached
  }

  logger.info('Fetching recommendations', { basedOn, limit })

  try {
    const result = await courseraClient.get<RecommendationResult>(
      `/api/recommendations?basedOn=${basedOn}&limit=${limit}`
    )

    cacheManager.set(cacheKey, result, 6 * 60 * 60 * 1000) // 6 horas
    return result
  } catch (error) {
    logger.error('Failed to fetch recommendations', {
      error: error instanceof Error ? error.message : String(error),
      basedOn,
    })
    throw error
  }
}
