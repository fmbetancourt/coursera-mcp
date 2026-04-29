import { z } from 'zod';
import { logger } from '../utils/logger';
import { sanitizeForLogging } from '../utils/logSanitizer';
import {
  CourseSchema,
  Course,
  ProgramSchema,
  Program,
  UserSchema,
  User,
  ProgressSchema,
  Progress,
  EnrolledCourseSchema,
  EnrolledCourse,
  CertificateSchema,
  Certificate,
} from '../types/schemas';

export class ValidationError extends Error {
  constructor(
    public field: string,
    public reason: string,
    message?: string
  ) {
    super(message || `Validation failed for field '${field}': ${reason}`);
    this.name = 'ValidationError';
  }
}

function handleZodError(error: z.ZodError, context: string): never {
  const issues = error.flatten();
  const fieldErrors = Object.entries(issues.fieldErrors).map(([field, errors]) => ({
    field,
    errors: errors || [],
  }));

  logger.error(`Validation error in ${context}`, sanitizeForLogging({ fieldErrors }));

  // Report first error
  if (fieldErrors.length > 0 && fieldErrors[0].errors.length > 0) {
    throw new ValidationError(fieldErrors[0].field, fieldErrors[0].errors[0], `Invalid data in ${context}`);
  }

  throw new ValidationError('unknown', 'Validation failed', `Invalid data in ${context}`);
}

export function parseCourse(raw: unknown): Course {
  try {
    return CourseSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      handleZodError(err, 'Course');
    }
    throw err;
  }
}

export function parseCourses(raw: unknown[]): Course[] {
  try {
    return raw.map((item) => parseCourse(item));
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    logger.error('Failed to parse courses array', sanitizeForLogging({ count: raw.length }));
    throw new ValidationError('courses', 'Failed to parse array', 'Invalid courses array');
  }
}

export function parseProgram(raw: unknown): Program {
  try {
    return ProgramSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      handleZodError(err, 'Program');
    }
    throw err;
  }
}

export function parsePrograms(raw: unknown[]): Program[] {
  try {
    return raw.map((item) => parseProgram(item));
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    logger.error('Failed to parse programs array', sanitizeForLogging({ count: raw.length }));
    throw new ValidationError('programs', 'Failed to parse array', 'Invalid programs array');
  }
}

export function parseUser(raw: unknown): User {
  try {
    return UserSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      handleZodError(err, 'User');
    }
    throw err;
  }
}

export function parseUsers(raw: unknown[]): User[] {
  try {
    return raw.map((item) => parseUser(item));
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    logger.error('Failed to parse users array', sanitizeForLogging({ count: raw.length }));
    throw new ValidationError('users', 'Failed to parse array', 'Invalid users array');
  }
}

export function parseProgress(raw: unknown): Progress {
  try {
    return ProgressSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      handleZodError(err, 'Progress');
    }
    throw err;
  }
}

export function parseEnrolledCourse(raw: unknown): EnrolledCourse {
  try {
    return EnrolledCourseSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      handleZodError(err, 'EnrolledCourse');
    }
    throw err;
  }
}

export function parseEnrolledCourses(raw: unknown[]): EnrolledCourse[] {
  try {
    return raw.map((item) => parseEnrolledCourse(item));
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    logger.error('Failed to parse enrolled courses array', sanitizeForLogging({ count: raw.length }));
    throw new ValidationError('enrolledCourses', 'Failed to parse array', 'Invalid enrolled courses array');
  }
}

export function parseCertificate(raw: unknown): Certificate {
  try {
    return CertificateSchema.parse(raw);
  } catch (err) {
    if (err instanceof z.ZodError) {
      handleZodError(err, 'Certificate');
    }
    throw err;
  }
}

export function parseCertificates(raw: unknown[]): Certificate[] {
  try {
    return raw.map((item) => parseCertificate(item));
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    logger.error('Failed to parse certificates array', sanitizeForLogging({ count: raw.length }));
    throw new ValidationError('certificates', 'Failed to parse array', 'Invalid certificates array');
  }
}

export function parseSearchResults<T>(data: unknown, parseItem: (item: unknown) => T): T[] {
  try {
    if (!Array.isArray(data)) {
      throw new Error('Search results must be an array');
    }
    return data.map(parseItem);
  } catch (err) {
    if (err instanceof ValidationError) {
      throw err;
    }
    logger.error('Failed to parse search results', sanitizeForLogging({ dataType: typeof data }));
    throw new ValidationError('searchResults', 'Invalid search results format', 'Failed to parse search results');
  }
}
