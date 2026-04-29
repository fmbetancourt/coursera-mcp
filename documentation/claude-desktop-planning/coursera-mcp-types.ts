// src/types/coursera.ts

/**
 * Tipos de dominio para Coursera
 */

export interface Course {
  id: string
  name: string
  description: string
  slug?: string
  institution: string
  instructors: Instructor[]
  rating: number // 4.5
  enrollments: number
  duration: string // "4 weeks"
  level: "beginner" | "intermediate" | "advanced"
  language: string // "en", "es"
  prerequisites: string[]
  skills: string[]
  syllabus: CourseSyllabus[]
  assessments: Assessment[]
  certificate: CertificateInfo
  url: string
  hasFreeCertificate: boolean
  createdDate?: string
  lastUpdatedDate?: string
  reviews?: Review[]
}

export interface Instructor {
  id: string
  name: string
  title?: string
  institution: string
  bio?: string
  image?: string
}

export interface CourseSyllabus {
  week: number
  title: string
  description: string
  topics: string[]
  duration?: string
}

export interface Assessment {
  type: "quiz" | "assignment" | "exam" | "project"
  name?: string
  weight: number // porcentaje
  description?: string
}

export interface CertificateInfo {
  included: boolean
  details?: string
  shareable?: boolean
}

export interface Review {
  rating: number
  comment: string
  authorName: string
}

export interface Program {
  id: string
  name: string
  slug?: string
  type: "specialization" | "degree" | "professional-certificate"
  description: string
  institution: string
  rating: number
  enrollments: number
  courses: ProgramCourse[]
  totalDuration: string // "3 months"
  totalCourses: number
  capstone?: Capstone
  certificate: CertificateInfo
  price: PricingInfo
  url: string
}

export interface ProgramCourse {
  position: number
  courseId: string
  name: string
  duration: string
  isCapstone: boolean
}

export interface Capstone {
  name: string
  description: string
  instructions?: string
}

export interface PricingInfo {
  currency: string // "USD", "CLP"
  amount: number
  isFree: boolean
  discountPercentage?: number
}

export interface EnrolledCourse {
  id: string
  name: string
  slug?: string
  institution: string
  enrollmentDate: string // ISO
  completionDate?: string // ISO
  progress: CourseProgress
  status: "in-progress" | "completed" | "dropped"
  certificateStatus: "earned" | "in-progress" | "requirements-pending" | "none"
  currentGrade?: number
}

export interface CourseProgress {
  percent: number // 0-100
  coursesCompleted?: number
  courseLecturesCompleted?: number
  courseLecturesTotal?: number
  lastAccessedDate: string // ISO
  nextDeadline?: string // ISO
  currentWeek?: number
  totalWeeks?: number
}

export interface DetailedProgress {
  courseId: string
  courseName: string
  enrollmentDate: string
  progress: CourseProgress
  completion: WeekCompletion[]
  upcomingDeadlines: Deadline[]
  certificateStatus: string
  certificateEarnedDate?: string
}

export interface WeekCompletion {
  week: number
  lecturesWatched: number
  lecturesTotal: number
  quizzesCompleted: number
  quizzesTotal: number
  assignmentSubmitted: boolean
  assignmentGraded: boolean
  assignmentScore?: number
}

export interface Deadline {
  type: string // "quiz", "assignment", "exam", "project"
  name: string
  dueDate: string // ISO
  daysRemaining: number
}

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  profileImage?: string
  enrollmentCount: number
  completionCount: number
  learningGoals?: string[]
  membershipStatus?: "free" | "premium"
}

export interface SessionToken {
  token: string
  userId: string
  email: string
  expiresAt: string // ISO
  csrfToken?: string
}

export interface CourseSearchResult {
  results: Course[]
  total: number
  hasMore: boolean
  currentPage?: number
  pageSize?: number
}

export interface ProgramSearchResult {
  results: Program[]
  total: number
  hasMore: boolean
}

export interface EnrollmentResponse {
  courses: EnrolledCourse[]
  totalEnrolled: number
  completedCount: number
  inProgressCount: number
}

export interface RecommendationResult {
  recommendations: RecommendedCourse[]
}

export interface RecommendedCourse extends Course {
  reason: string
  relevanceScore: number // 0-100
}

// src/types/cache.ts

export interface CacheEntry<T> {
  data: T
  timestamp: number
  ttl: number // en ms
  key: string
}

export interface CacheConfig {
  enabled: boolean
  ttlMs: {
    courses: number
    programs: number
    enrolled: number
    progress: number
    recommendations: number
  }
}

export interface CacheStats {
  hits: number
  misses: number
  evictions: number
  entriesCount: number
}

// src/types/mcp.ts

export interface MCPTool {
  name: string
  description: string
  inputSchema: InputSchema
}

export interface InputSchema {
  type: "object"
  properties: Record<string, SchemaProperty>
  required?: string[]
}

export interface SchemaProperty {
  type: string
  description: string
  enum?: string[]
  minimum?: number
  maximum?: number
  minLength?: number
  maxLength?: number
  default?: unknown
}

export interface ToolResult {
  content: Array<{
    type: "text" | "image"
    text?: string
    data?: string
    mimeType?: string
  }>
}

export interface ToolError {
  code: string
  message: string
  details?: Record<string, unknown>
}

// src/types/http.ts

export interface HttpRequest {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH"
  url: string
  headers?: Record<string, string>
  body?: Record<string, unknown>
  timeout?: number
}

export interface HttpResponse<T = unknown> {
  status: number
  statusText: string
  headers: Record<string, string>
  data: T
}

export interface RetryConfig {
  maxAttempts: number
  initialDelayMs: number
  backoffMultiplier: number
  maxDelayMs: number
  timeoutMs: number
  shouldRetry: (status: number) => boolean
}

// src/types/errors.ts

export class CourseraError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode?: number,
    public originalError?: Error
  ) {
    super(message)
    this.name = "CourseraError"
  }
}

export class AuthenticationError extends CourseraError {
  constructor(message: string = "Authentication failed") {
    super("AUTH_ERROR", message, 401)
    this.name = "AuthenticationError"
  }
}

export class NetworkError extends CourseraError {
  constructor(message: string = "Network request failed") {
    super("NETWORK_ERROR", message)
    this.name = "NetworkError"
  }
}

export class RateLimitError extends CourseraError {
  constructor(
    public retryAfterSeconds: number = 60,
    message: string = `Rate limit exceeded. Retry after ${retryAfterSeconds}s`
  ) {
    super("RATE_LIMIT_ERROR", message, 429)
    this.name = "RateLimitError"
  }
}

export class NotFoundError extends CourseraError {
  constructor(resource: string) {
    super("NOT_FOUND", `Resource not found: ${resource}`, 404)
    this.name = "NotFoundError"
  }
}

export class ValidationError extends CourseraError {
  constructor(
    message: string,
    public fieldErrors?: Record<string, string>
  ) {
    super("VALIDATION_ERROR", message, 400)
    this.name = "ValidationError"
  }
}

export class ParsingError extends CourseraError {
  constructor(message: string, public rawData?: string) {
    super("PARSING_ERROR", message)
    this.name = "ParsingError"
  }
}

// src/types/config.ts

export interface CourseraConfig {
  email?: string
  password?: string
  sessionCookie?: string
  cacheDir: string
  debug: boolean
  apiBaseUrl: string
  timeout: number
  retryConfig: RetryConfig
}

export interface AppConfig extends CourseraConfig {
  mcp: {
    name: string
    version: string
  }
}
