import { describe, it, expect, beforeEach, afterEach } from 'bun:test';

// Re-export bun:test utilities for convenience
export { describe, it, expect, beforeEach, afterEach };

// Global test utilities
export function createMockFetch(): {
  fetch: typeof global.fetch;
  calls: Array<{ url: string; options: RequestInit }>;
  reset: () => void;
} {
  const calls: Array<{ url: string; options: RequestInit }> = [];
  const fetch = async (url: string, options: RequestInit = {}) => {
    calls.push({ url, options });
    return new Response('{}', { status: 200 });
  };
  return {
    fetch: fetch as typeof global.fetch,
    calls,
    reset: () => {
      calls.length = 0;
    },
  };
}

// Fixture helpers
export function createMockCourse() {
  return {
    id: 'test-course-1',
    name: 'Test Course',
    slug: 'test-course',
    description: 'A test course',
    duration: 4,
    level: 'beginner' as const,
    language: 'en',
    rating: 4.5,
    enrollments: 1000,
    instructors: [{ id: 'instructor-1', name: 'Test Instructor' }],
    skills: ['TypeScript', 'Testing'],
    certificate: true,
  };
}

export function createMockUser() {
  return {
    id: 'test-user-1',
    email: 'test@example.com',
    displayName: 'Test User',
    enrollments: [],
    certificates: [],
  };
}

export function createMockProgram() {
  return {
    id: 'test-program-1',
    name: 'Test Specialization',
    type: 'specialization' as const,
    courses: [createMockCourse()],
    totalDuration: 4,
    price: 39,
  };
}
