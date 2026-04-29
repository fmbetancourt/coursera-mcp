# Coursera MCP API Documentation

**Version**: 0.1.0  
**Status**: Fase 2 - 4 of 7 tools implemented  
**Last Updated**: April 28, 2026

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

The following tools require TOTP 2FA authentication and will be implemented in Fase 3:

### get_enrolled_courses
List courses the authenticated user is enrolled in.

### get_progress
Get progress for a specific course (percentage complete, current week, deadlines).

### get_recommendations
Get personalized course/program recommendations based on user history.

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

### Error Handling

```bash
try {
  get_course_details({ courseId: "invalid-id" })
} catch (error) {
  if (error instanceof NotFoundError) {
    console.log(`Course not found: ${error.resourceId}`)
  } else if (error instanceof ValidationError) {
    console.log(`Validation failed: ${error.field} - ${error.reason}`)
  }
}
```

---

## Performance Characteristics

| Tool | Response Time | Cache Hit | Cache Miss |
|------|---------------|-----------|-----------|
| search_courses | 200-500ms | 1-5ms | 300-800ms |
| search_programs | 200-500ms | 1-5ms | 300-800ms |
| get_course_details | 150-400ms | 1-5ms | 200-600ms |
| get_program_details | 150-400ms | 1-5ms | 200-600ms |

*Times vary based on Coursera API latency and circuit breaker state*

---

## Status & Roadmap

**Implemented (Fase 2):**
- ✅ search_courses
- ✅ search_programs
- ✅ get_course_details
- ✅ get_program_details

**Planned (Fase 3):**
- ⏳ get_enrolled_courses (requires auth)
- ⏳ get_progress (requires auth)
- ⏳ get_recommendations (requires auth)

**Testing:**
- ✅ 227 unit & integration tests
- ✅ 85%+ code coverage
- ⏳ E2E tests (Fase 2)
