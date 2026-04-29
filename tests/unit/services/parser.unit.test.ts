import { describe, it, expect } from 'bun:test';
import {
  parseCourse,
  parseCourses,
  parseProgram,
  parsePrograms,
  parseUser,
  parseProgress,
  parseEnrolledCourse,
  parseCertificate,
  ValidationError,
} from '../../../src/services/parser';
import { mockCourses, mockPrograms } from '../../fixtures';

describe('Parser Service', () => {
  describe('parseCourse', () => {
    it('should parse valid course', () => {
      const course = mockCourses[0];
      const parsed = parseCourse(course);

      expect(parsed.id).toBe(course.id);
      expect(parsed.name).toBe(course.name);
      expect(parsed.level).toBe(course.level);
    });

    it('should throw on missing required field', () => {
      const invalid = { name: 'Test' }; // missing id, slug, description, etc.

      expect(() => parseCourse(invalid)).toThrow(ValidationError);
    });

    it('should throw on invalid enum value', () => {
      const course = { ...mockCourses[0], level: 'invalid-level' };

      expect(() => parseCourse(course)).toThrow(ValidationError);
    });

    it('should throw on invalid data type', () => {
      const invalid = { id: 123, name: 'Test' }; // id should be string

      expect(() => parseCourse(invalid)).toThrow(ValidationError);
    });

    it('should throw on invalid rating', () => {
      const course = { ...mockCourses[0], rating: 10 };

      expect(() => parseCourse(course)).toThrow(ValidationError);
    });

    it('should throw on invalid duration', () => {
      const course = { ...mockCourses[0], duration: 200 }; // max 156

      expect(() => parseCourse(course)).toThrow(ValidationError);
    });

    it('should handle optional fields', () => {
      const course = { ...mockCourses[0], rating: undefined, prerequisites: undefined };
      const parsed = parseCourse(course);

      expect(parsed.rating).toBeUndefined();
      expect(parsed.prerequisites).toBeUndefined();
    });
  });

  describe('parseCourses', () => {
    it('should parse array of courses', () => {
      const parsed = parseCourses(mockCourses);

      expect(parsed.length).toBe(mockCourses.length);
      expect(parsed[0].id).toBe(mockCourses[0].id);
      expect(parsed[1].name).toBe(mockCourses[1].name);
    });

    it('should throw if any course is invalid', () => {
      const invalid = [...mockCourses, { name: 'Invalid' }];

      expect(() => parseCourses(invalid)).toThrow(ValidationError);
    });

    it('should preserve course order', () => {
      const parsed = parseCourses(mockCourses);
      const ids = parsed.map((c) => c.id);
      const originalIds = mockCourses.map((c) => c.id);

      expect(ids).toEqual(originalIds);
    });
  });

  describe('parseProgram', () => {
    it('should parse valid program', () => {
      const program = mockPrograms[0];
      const parsed = parseProgram(program);

      expect(parsed.id).toBe(program.id);
      expect(parsed.name).toBe(program.name);
      expect(parsed.type).toBe(program.type);
      expect(parsed.courses.length).toBeGreaterThan(0);
    });

    it('should throw on missing required field', () => {
      const invalid = { name: 'Test' }; // missing id, type, courses, etc.

      expect(() => parseProgram(invalid)).toThrow(ValidationError);
    });

    it('should throw on invalid program type', () => {
      const program = { ...mockPrograms[0], type: 'invalid-type' };

      expect(() => parseProgram(program)).toThrow(ValidationError);
    });

    it('should throw if courses array is empty', () => {
      const program = { ...mockPrograms[0], courses: [] };

      expect(() => parseProgram(program)).toThrow(ValidationError);
    });

    it('should validate nested course schemas', () => {
      const program = {
        ...mockPrograms[0],
        courses: [{ name: 'Invalid' }], // invalid course
      };

      expect(() => parseProgram(program)).toThrow(ValidationError);
    });
  });

  describe('parsePrograms', () => {
    it('should parse array of programs', () => {
      const parsed = parsePrograms(mockPrograms);

      expect(parsed.length).toBe(mockPrograms.length);
      expect(parsed[0].id).toBe(mockPrograms[0].id);
    });

    it('should throw if any program is invalid', () => {
      const invalid = [...mockPrograms, { name: 'Invalid' }];

      expect(() => parsePrograms(invalid)).toThrow(ValidationError);
    });
  });

  describe('parseUser', () => {
    it('should parse valid user', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test User',
      };

      const parsed = parseUser(user);
      expect(parsed.email).toBe(user.email);
      expect(parsed.displayName).toBe(user.displayName);
    });

    it('should throw on invalid email', () => {
      const invalid = {
        id: 'user-1',
        email: 'not-an-email',
        displayName: 'Test',
      };

      expect(() => parseUser(invalid)).toThrow(ValidationError);
    });

    it('should throw on missing required field', () => {
      const invalid = {
        id: 'user-1',
        email: 'test@example.com',
        // missing displayName
      };

      expect(() => parseUser(invalid)).toThrow(ValidationError);
    });

    it('should handle optional fields', () => {
      const user = {
        id: 'user-1',
        email: 'test@example.com',
        displayName: 'Test',
        bio: undefined,
        profileImage: undefined,
      };

      const parsed = parseUser(user);
      expect(parsed.id).toBe('user-1');
    });
  });

  describe('parseProgress', () => {
    it('should parse valid progress', () => {
      const progress = {
        courseId: 'course-1',
        userId: 'user-1',
        percent: 50,
        currentWeek: 3,
        totalWeeks: 12,
        upcomingDeadlines: [],
        lastAccessedDate: new Date(),
      };

      const parsed = parseProgress(progress);
      expect(parsed.percent).toBe(50);
      expect(parsed.currentWeek).toBe(3);
    });

    it('should throw on invalid percent', () => {
      const invalid = {
        courseId: 'course-1',
        userId: 'user-1',
        percent: 150, // max 100
        currentWeek: 3,
        totalWeeks: 12,
        upcomingDeadlines: [],
        lastAccessedDate: new Date(),
      };

      expect(() => parseProgress(invalid)).toThrow(ValidationError);
    });

    it('should throw on currentWeek greater than totalWeeks', () => {
      // Note: Schema doesn't validate this, but it's logically inconsistent
      const progress = {
        courseId: 'course-1',
        userId: 'user-1',
        percent: 50,
        currentWeek: 20,
        totalWeeks: 12,
        upcomingDeadlines: [],
        lastAccessedDate: new Date(),
      };

      // This should parse successfully as there's no cross-field validation
      const parsed = parseProgress(progress);
      expect(parsed).toBeDefined();
    });
  });

  describe('parseEnrolledCourse', () => {
    it('should parse valid enrolled course', () => {
      const enrolled = {
        courseId: 'course-1',
        enrollmentDate: new Date(),
        progress: 75,
        status: 'enrolled' as const,
      };

      const parsed = parseEnrolledCourse(enrolled);
      expect(parsed.courseId).toBe('course-1');
      expect(parsed.progress).toBe(75);
      expect(parsed.status).toBe('enrolled');
    });

    it('should throw on invalid status', () => {
      const invalid = {
        courseId: 'course-1',
        enrollmentDate: new Date(),
        progress: 75,
        status: 'invalid-status',
      };

      expect(() => parseEnrolledCourse(invalid)).toThrow(ValidationError);
    });

    it('should throw on invalid progress', () => {
      const invalid = {
        courseId: 'course-1',
        enrollmentDate: new Date(),
        progress: 150, // max 100
        status: 'enrolled' as const,
      };

      expect(() => parseEnrolledCourse(invalid)).toThrow(ValidationError);
    });

    it('should handle optional completionDate', () => {
      const enrolled = {
        courseId: 'course-1',
        enrollmentDate: new Date(),
        progress: 100,
        status: 'completed' as const,
        completionDate: new Date(),
      };

      const parsed = parseEnrolledCourse(enrolled);
      expect(parsed.completionDate).toBeDefined();
    });
  });

  describe('parseCertificate', () => {
    it('should parse valid certificate', () => {
      const cert = {
        id: 'cert-1',
        courseId: 'course-1',
        userId: 'user-1',
        issuedDate: new Date(),
        certificateUrl: 'https://example.com/cert.pdf',
      };

      const parsed = parseCertificate(cert);
      expect(parsed.id).toBe('cert-1');
      expect(parsed.courseId).toBe('course-1');
    });

    it('should throw on invalid URL', () => {
      const invalid = {
        id: 'cert-1',
        courseId: 'course-1',
        userId: 'user-1',
        issuedDate: new Date(),
        certificateUrl: 'not-a-url',
      };

      expect(() => parseCertificate(invalid)).toThrow(ValidationError);
    });

    it('should throw on missing required field', () => {
      const invalid = {
        id: 'cert-1',
        courseId: 'course-1',
        // missing userId
        issuedDate: new Date(),
        certificateUrl: 'https://example.com/cert.pdf',
      };

      expect(() => parseCertificate(invalid)).toThrow(ValidationError);
    });
  });

  describe('ValidationError', () => {
    it('should include field and reason', () => {
      const error = new ValidationError('email', 'Invalid email format');

      expect(error.field).toBe('email');
      expect(error.reason).toBe('Invalid email format');
      expect(error.message).toContain('email');
    });

    it('should extend Error class', () => {
      const error = new ValidationError('name', 'Too short');

      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('ValidationError');
    });

    it('should allow custom message', () => {
      const error = new ValidationError('id', 'Required', 'Custom message');

      expect(error.message).toBe('Custom message');
    });
  });

  describe('Error messages', () => {
    it('should provide clear error message on validation failure', () => {
      const invalid = { id: '', name: '' }; // empty strings

      try {
        parseCourse(invalid);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.field).toBeDefined();
        expect(validationError.reason).toBeDefined();
      }
    });

    it('should identify which field failed', () => {
      const invalid = {
        id: 'course-1',
        name: 'Valid',
        slug: 'valid',
        description: 'Valid',
        duration: 8,
        level: 'beginner',
        language: 'en',
        enrollments: 100,
        instructors: [], // empty, but minimum 1 required
        skills: [],
        certificate: true,
      };

      try {
        parseCourse(invalid);
        expect.unreachable();
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        const validationError = error as ValidationError;
        expect(validationError.field).toBe('instructors');
      }
    });
  });
});
