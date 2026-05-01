# Coursera MCP API Documentation

**Version**: 0.1.0  
**Status**: Fase 3 Complete - All 7 tools implemented (4 public + 3 private)  
**Last Updated**: May 1, 2026

---

## Overview

The Coursera MCP (Model Context Protocol) server exposes 7 tools for interacting with Coursera:

- **4 Public Tools** (no authentication required)
  - `search_courses` - Search for courses
  - `search_programs` - Search for programs  
  - `get_course_details` - Get detailed course information
  - `get_program_details` - Get detailed program information

- **3 Private Tools** (TOTP 2FA required, Fase 3)
  - `get_enrolled_courses` - List user's enrolled courses
  - `get_progress` - Get progress for a specific course
  - `get_recommendations` - Get personalized recommendations

---

## Public Tools

### 1. search_courses

Search for courses by query with optional filters.

**Parameters:**

```typescript
{
  query: string;              // Required: search term
  level?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  language?: 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'pt' | 'ru';
  limit?: number;             // Default: 20, Max: 100
  offset?: number;            // Default: 0
  sortBy?: 'rating' | 'enrollments' | 'recent';
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

**Response:**

```typescript
{
  items: Course[];
  total: number;        // Total courses matching query
  hasMore: boolean;     // Whether more results available
  query: string;        // The search query used
}
```

**Course Type:**

```typescript
{
  id: string;
  name: string;
  slug: string;
  description: string;
  duration: number;           // weeks
  level: string;              // 'beginner' | 'intermediate' | 'advanced' | 'professional'
  language: string;           // ISO 639-1 code
  rating?: number;            // 0-5
  enrollments: number;
  instructors: Instructor[]; // Name, bio, profile image
  skills: Skill[];           // Required and learned skills
  certificate: boolean;
  prerequisites?: string[];
  syllabus?: string;
  reviewCount?: number;
}
```

**Cache:** 24 hours  
**Error Cases:**
- `ValidationError`: Invalid parameters (level, language, limit out of range)
- `CourseraException`: API failure (circuit breaker open → returns cached data)

**Example:**

```bash
# Search for Python beginner courses
search_courses({
  query: "Python",
  level: "beginner",
  limit: 10
})

# Search and sort by rating
search_courses({
  query: "Machine Learning",
  sortBy: "rating",
  sortOrder: "desc"
})
```

---

### 2. search_programs

Search for programs (specializations, degrees, certificates).

**Parameters:**

```typescript
{
  query: string;              // Required: search term
  type?: 'specialization' | 'degree' | 'certificate' | 'professional-certificate';
  limit?: number;             // Default: 20, Max: 100
  offset?: number;            // Default: 0
  sortBy?: 'rating' | 'price' | 'recent';
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

**Response:**

```typescript
{
  items: Program[];
  total: number;
  hasMore: boolean;
  query: string;
}
```

**Program Type:**

```typescript
{
  id: string;
  name: string;
  type: 'specialization' | 'degree' | 'certificate' | 'professional-certificate';
  courses: Course[];          // Array of courses in program
  totalDuration: number;      // weeks
  price: number;              // USD
  description?: string;
  targetAudience?: string;
  partnerUniversity?: string;
}
```

**Cache:** 24 hours  
**Error Cases:**
- `ValidationError`: Invalid program type
- `CourseraException`: API failure

**Example:**

```bash
# Find AI specializations
search_programs({
  query: "Artificial Intelligence",
  type: "specialization"
})

# Find affordable degrees
search_programs({
  query: "Computer Science",
  type: "degree",
  sortBy: "price",
  sortOrder: "asc"
})
```

---

### 3. get_course_details

Get comprehensive details for a specific course.

**Parameters:**

```typescript
{
  courseId: string;  // Required: course identifier
}
```

**Response:**

```typescript
{
  // All Course fields
  id: string;
  name: string;
  slug: string;
  description: string;
  duration: number;
  level: string;
  language: string;
  rating?: number;
  enrollments: number;
  instructors: Instructor[];
  skills: Skill[];
  certificate: boolean;
  prerequisites?: string[];
  syllabus?: string;
  reviewCount?: number;
}
```

**Cache:** 24 hours per courseId  
**Error Cases:**
- `NotFoundError`: Course not found (404)
- `CourseraException`: API failure (returns stale data if available)

**Example:**

```bash
# Get Python for Data Science details
get_course_details({
  courseId: "python-for-data-science"
})
```

---

### 4. get_program_details

Get comprehensive details for a specific program.

**Parameters:**

```typescript
{
  programId: string;  // Required: program identifier
}
```

**Response:**

```typescript
{
  // All Program fields
  id: string;
  name: string;
  type: string;
  courses: Course[];
  totalDuration: number;
  price: number;
  description?: string;
  targetAudience?: string;
  partnerUniversity?: string;
}
```

**Cache:** 24 hours per programId  
**Error Cases:**
- `NotFoundError`: Program not found (404)
- `CourseraException`: API failure (returns stale data if available)

**Example:**

```bash
# Get AI specialization details
get_program_details({
  programId: "ai-specialization"
})
```

---

## Private Tools (Fase 3)

The following tools require TOTP 2FA authentication. Users must complete the setup process before using these tools.

### 5. get_enrolled_courses

List all courses the authenticated user is currently enrolled in.

**Authentication:** Required (TOTP 2FA)

**Parameters:**

```typescript
{
  limit?: number;             // Default: 50, Max: 500
  offset?: number;            // Default: 0
  status?: 'active' | 'completed' | 'dropped';  // Filter by enrollment status
  sortBy?: 'enrollmentDate' | 'progress' | 'name';
  sortOrder?: 'asc' | 'desc'; // Default: 'desc'
}
```

**Response:**

```typescript
{
  items: EnrolledCourse[];
  total: number;              // Total enrolled courses
  hasMore: boolean;           // Whether more results available
}
```

**EnrolledCourse Type:**

```typescript
{
  id: string;                 // Course ID
  name: string;
  slug: string;
  enrollmentDate: string;     // ISO 8601 date
  progress: number;           // Percentage complete (0-100)
  currentWeek: number;        // Current week number
  totalWeeks: number;         // Total weeks in course
  status: 'active' | 'completed' | 'dropped';
  lastAccessedDate?: string;  // ISO 8601 date
  certificate?: boolean;      // Certificate earned?
  rating?: number;            // User's rating (0-5)
}
```

**Cache:** 1 hour per userId (shorter TTL for personal data)  
**Cache Key:** `enrolled:${userId}`  

**Error Cases:**
- `AuthenticationError`: No valid session (must authenticate first)
- `CourseraException`: API failure (returns cached data if available)

**Example:**

```bash
# Get user's active enrolled courses
get_enrolled_courses({
  status: "active",
  limit: 20
})

# Get recently completed courses
get_enrolled_courses({
  status: "completed",
  sortBy: "enrollmentDate",
  sortOrder: "desc"
})
```

---

### 6. get_progress

Get detailed progress information for a specific course.

**Authentication:** Required (TOTP 2FA)

**Parameters:**

```typescript
{
  courseId: string;           // Required: course identifier
}
```

**Response:**

```typescript
{
  courseId: string;
  userId: string;
  percent: number;            // Percentage complete (0-100)
  currentWeek: number;        // Current week number (1-indexed)
  totalWeeks: number;         // Total weeks in course
  completedWeeks: number;     // Number of completed weeks
  upcomingDeadlines: Deadline[];
  lastAccessedDate: string;   // ISO 8601 date
  estimatedCompletionDate?: string;
}
```

**Deadline Type:**

```typescript
{
  week: number;
  dueDate: string;            // ISO 8601 date
  type: 'quiz' | 'assignment' | 'project' | 'exam';
  completed: boolean;
}
```

**Cache:** 1 hour per `${userId}:${courseId}`  
**Cache Key:** `progress:${userId}:${courseId}`  

**Error Cases:**
- `AuthenticationError`: No valid session
- `NotFoundError`: Course not found or user not enrolled
- `CourseraException`: API failure

**Example:**

```bash
# Get progress for a specific course
get_progress({
  courseId: "python-for-data-science"
})

# Returns:
{
  percent: 65,
  currentWeek: 7,
  totalWeeks: 10,
  upcomingDeadlines: [
    {
      week: 7,
      dueDate: "2026-05-15T23:59:59Z",
      type: "quiz",
      completed: false
    }
  ]
}
```

---

### 7. get_recommendations

Get personalized course and program recommendations based on user's enrollment history and learning patterns.

**Authentication:** Required (TOTP 2FA)

**Parameters:**

```typescript
{
  limit?: number;             // Default: 10, Max: 100 (1-100 validation)
  includePrograms?: boolean;  // Default: true
  includeCourses?: boolean;   // Default: true
}
```

**Response:**

```typescript
{
  recommendations: Recommendation[];
  total: number;
  generatedAt: string;        // ISO 8601 date
}
```

**Recommendation Type:**

```typescript
{
  id: string;                 // Course or Program ID
  name: string;
  type: 'course' | 'program';
  matchScore: number;         // 0-100 (higher = more relevant)
  reason: string;             // Why this is recommended
  relevantSkills: string[];   // Skills user can learn
  estimatedDuration: number;  // weeks
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rating?: number;            // Course/program rating (0-5)
  enrollments?: number;       // Number of enrollments
}
```

**Recommendation Scoring:**

```
matchScore = baseScore (50)
           + skillMatch (0-20)
           + rating (0-15)
           + popularity (0-10)
           + difficulty (0-5)
```

**Cache:** 6 hours per userId (personal but expensive to compute)  
**Cache Key:** `recommendations:${userId}`  

**Error Cases:**
- `AuthenticationError`: No valid session
- `ValidationError`: Invalid limit parameter (must be 1-100)
- `CourseraException`: API failure

**Example:**

```bash
# Get top 10 recommendations (courses and programs)
get_recommendations({
  limit: 10
})

# Get only course recommendations
get_recommendations({
  includeCourses: true,
  includePrograms: false,
  limit: 5
})

# Returns:
{
  recommendations: [
    {
      id: "machine-learning-advanced",
      name: "Advanced Machine Learning",
      type: "course",
      matchScore: 92,
      reason: "You've completed Python fundamentals and Data Science - this advances those skills",
      difficulty: "advanced",
      rating: 4.8
    }
  ]
}
```

---

### Authentication Flow for Private Tools

To use private tools, users must authenticate once:

```
1. Session starts → No active session
2. Call any private tool → AuthenticationError
3. User runs: coursera-mcp auth setup
4. Email/password entered (memory only, not stored)
5. TOTP QR code displayed
6. User scans with Authenticator app
7. User enters 6-digit code
8. Session token encrypted and saved to ~/.coursera-mcp/sessions.json
9. Private tools now accessible
```

**Automatic Session Refresh:**

The system automatically refreshes sessions that are expiring soon (within 5 minutes):

- On each private tool call, session expiration is checked
- If expiring soon, an automatic refresh is triggered
- If refresh fails, user is logged out (AuthenticationError)
- User must re-authenticate with `coursera-mcp auth setup`

---

### Session Management

**Session Expiration:**
- Tokens expire after 24 hours
- Automatic refresh triggered at 5 minute warning
- Refresh fails gracefully (user is logged out)

**Multiple Sessions:**
- Users can maintain multiple active sessions (different devices)
- Each session is managed independently
- Session data stored in `~/.coursera-mcp/sessions.json` (mode 0o600)

**Security:**
- Session tokens encrypted with AES-256-GCM
- Master password derived with PBKDF2 (100k iterations)
- No credentials stored on disk (only after TOTP setup)

---

## Error Handling

### Error Types

**ValidationError**
- Thrown when parameters fail Zod schema validation
- Fields: `field` (which field failed), `reason` (why it failed)

```typescript
{
  name: "ValidationError",
  field: "limit",
  reason: "Must be between 1 and 100"
}
```

**NotFoundError**
- Thrown when a course/program doesn't exist
- Fields: `resourceType`, `resourceId`

```typescript
{
  name: "NotFoundError",
  resourceType: "Course",
  resourceId: "course-123"
}
```

**CourseraException**
- Thrown on API failures (network, 5xx, etc)
- Circuit breaker pattern: returns cached data on repeated failures

---

## Caching Strategy

### Public Tools Cache TTL
- **Search results**: 24 hours
  - Cache key: `search:courses:{params}` / `search:programs:{params}`
- **Course details**: 24 hours per course
  - Cache key: `course:{courseId}`
- **Program details**: 24 hours per program
  - Cache key: `program:{programId}`

### Stale-While-Revalidate (SWR)
When data is expired, the system:
1. Returns the expired (stale) data immediately
2. Refetches in the background
3. Updates cache with fresh data

This ensures users get fast responses even during API outages.

### Cache Invalidation
- Manual: `cache.clear()` (clears all)
- Automatic: TTL expiration
- POST operations: may trigger related cache invalidation

---

## Rate Limiting & Resilience

### Circuit Breaker
- **Threshold**: 5 consecutive failures
- **Timeout**: 60 seconds
- **States**: Closed (normal) → Open (failing) → Half-Open (recovering)

When open, the circuit breaker:
- Rejects new requests immediately (fail fast)
- Returns cached data if available
- Auto-recovers after timeout

### Retry Logic
- **Strategy**: Exponential backoff (1s, 2s, 4s, ...)
- **Max attempts**: 3
- **Retryable errors**: Transient (timeout, 5xx)
- **Non-retryable**: 4xx validation errors

---

## Authentication (Fase 3)

Private tools require TOTP 2FA authentication:

1. User initiates login with email/password
2. System displays QR code for TOTP setup
3. User scans with authenticator app
4. User confirms with 6-digit code
5. Session token stored (encrypted with AES-256-GCM)

**Session Storage:** `~/.coursera-mcp/sessions.json` (mode 0o600)

---

## Usage Examples

### Search & Filter

```bash
# Find beginner Python courses
search_courses({
  query: "Python",
  level: "beginner",
  limit: 5
})

# Find top-rated AI specializations
search_programs({
  query: "Artificial Intelligence",
  type: "specialization",
  sortBy: "rating",
  sortOrder: "desc",
  limit: 10
})
```

### Get Details

```bash
# Get full course information
get_course_details({
  courseId: "python-3-programming"
})

# Get program with all courses
get_program_details({
  programId: "full-stack-web-dev"
})
```

### Authenticated Tools (Fase 3)

```bash
# Get user's enrolled courses (requires authentication)
get_enrolled_courses({
  status: "active",
  limit: 20
})

# Get progress in a course
get_progress({
  courseId: "python-for-data-science"
})

# Get personalized recommendations
get_recommendations({
  limit: 10,
  includeCourses: true,
  includePrograms: true
})
```

### Error Handling

```bash
try {
  get_course_details({ courseId: "invalid-id" })
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`Course not found: ${error.resourceId}`)
  } else if (error instanceof ValidationError) {
    console.log(`Validation failed: ${error.field} - ${error.reason}`)
  } else if (error instanceof AuthenticationError) {
    console.log("Please authenticate: coursera-mcp auth setup")
  }
}
```

---

## Performance Characteristics

| Tool | Response Time | Cache Hit | Cache Miss | Cache TTL |
|------|---------------|-----------|-----------|-----------|
| search_courses | 200-500ms | 1-5ms | 300-800ms | 24h |
| search_programs | 200-500ms | 1-5ms | 300-800ms | 24h |
| get_course_details | 150-400ms | 1-5ms | 200-600ms | 24h |
| get_program_details | 150-400ms | 1-5ms | 200-600ms | 24h |
| get_enrolled_courses | 200-600ms | 1-5ms | 400-1000ms | 1h |
| get_progress | 150-500ms | 1-5ms | 300-800ms | 1h |
| get_recommendations | 300-800ms | 1-5ms | 600-1500ms | 6h |

*Times vary based on Coursera API latency and circuit breaker state*  
*Private tools (get_enrolled_courses, get_progress, get_recommendations) require active session*

---

## Status & Roadmap

**Implemented (Fase 2 - Public Tools):**
- ✅ search_courses
- ✅ search_programs
- ✅ get_course_details
- ✅ get_program_details

**Implemented (Fase 3 - Private Tools):**
- ✅ get_enrolled_courses (with TOTP 2FA)
- ✅ get_progress (with TOTP 2FA)
- ✅ get_recommendations (with TOTP 2FA)

**Authentication & Session Management:**
- ✅ TOTP 2FA setup and validation
- ✅ Encrypted session token storage (AES-256-GCM)
- ✅ Automatic session refresh (within 5 min of expiration)
- ✅ Multi-session support

**Testing:**
- ✅ 326 unit & integration tests
- ✅ 85%+ code coverage
- ⏳ E2E tests (Fase 4)

**Infrastructure:**
- ⏳ GitHub Actions CI/CD (Fase 4)
- ⏳ npm publish (Fase 4)
- ⏳ Claude Desktop integration (Fase 4)
