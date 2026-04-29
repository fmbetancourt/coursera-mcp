import { z } from 'zod';

// Level and Language enums
const LevelSchema = z.enum(['beginner', 'intermediate', 'advanced', 'professional'] as const);
const LanguageSchema = z.enum(['en', 'es', 'fr', 'de', 'zh', 'ja', 'pt', 'ru'] as const);
const CourseStatusSchema = z.enum(['enrolled', 'completed', 'dropped'] as const);
const ProgramTypeSchema = z.enum(
  ['specialization', 'degree', 'certificate', 'professional-certificate'] as const
);

// Instructor schema
export const InstructorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  bio: z.string().optional(),
  profileImage: z.string().url().optional(),
});

// Skill schema
export const SkillSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

// Course schema with validation rules
export const CourseSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  slug: z.string().min(1),
  description: z.string().min(1),
  duration: z.number().min(1).max(156), // max 3 years
  level: LevelSchema,
  language: LanguageSchema,
  rating: z.number().min(0).max(5).optional(),
  enrollments: z.number().min(0),
  instructors: z.array(InstructorSchema).min(1),
  skills: z.array(SkillSchema).min(0),
  certificate: z.boolean(),
  prerequisites: z.array(z.string()).optional(),
  syllabus: z.string().optional(),
  reviewCount: z.number().min(0).optional(),
});

export type Course = z.infer<typeof CourseSchema>;

// Program schema
export const ProgramSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  type: ProgramTypeSchema,
  courses: z.array(CourseSchema).min(1),
  totalDuration: z.number().min(1).max(156),
  price: z.number().min(0),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  partnerUniversity: z.string().optional(),
});

export type Program = z.infer<typeof ProgramSchema>;

// User schema
export const UserSchema = z.object({
  id: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  enrollments: z.array(z.any()).optional(), // Will be validated separately
  certificates: z.array(z.any()).optional(), // Will be validated separately
  profileImage: z.string().url().optional(),
  bio: z.string().optional(),
});

export type User = z.infer<typeof UserSchema>;

// Enrolled course schema
export const EnrolledCourseSchema = z.object({
  courseId: z.string().min(1),
  enrollmentDate: z.coerce.date(),
  progress: z.number().min(0).max(100),
  status: CourseStatusSchema,
  completionDate: z.coerce.date().optional(),
});

export type EnrolledCourse = z.infer<typeof EnrolledCourseSchema>;

// Certificate schema
export const CertificateSchema = z.object({
  id: z.string().min(1),
  courseId: z.string().min(1),
  userId: z.string().min(1),
  issuedDate: z.coerce.date(),
  certificateUrl: z.string().url(),
});

export type Certificate = z.infer<typeof CertificateSchema>;

// Deadline schema
export const DeadlineSchema = z.object({
  name: z.string().min(1),
  dueDate: z.coerce.date(),
  type: z.enum(['assignment', 'quiz', 'project', 'exam']),
  completed: z.boolean(),
  submissionUrl: z.string().url().optional(),
});

// Progress schema
export const ProgressSchema = z.object({
  courseId: z.string().min(1),
  userId: z.string().min(1),
  percent: z.number().min(0).max(100),
  currentWeek: z.number().min(0),
  totalWeeks: z.number().min(1),
  upcomingDeadlines: z.array(DeadlineSchema),
  lastAccessedDate: z.coerce.date(),
});

export type Progress = z.infer<typeof ProgressSchema>;

// Search parameters schemas
export const SearchCourseParamsSchema = z.object({
  query: z.string().optional(),
  level: LevelSchema.optional(),
  language: LanguageSchema.optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(['rating', 'enrollments', 'recent']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type SearchCourseParams = z.infer<typeof SearchCourseParamsSchema>;

export const SearchProgramParamsSchema = z.object({
  query: z.string().optional(),
  type: ProgramTypeSchema.optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
  sortBy: z.enum(['rating', 'price', 'recent']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type SearchProgramParams = z.infer<typeof SearchProgramParamsSchema>;

// API Response schema
export const ApiResponseSchema = z.object({
  data: z.any(),
  meta: z
    .object({
      total: z.number().min(0),
      offset: z.number().min(0),
      limit: z.number().min(1),
    })
    .optional(),
});

// Coursera error schema
export const CourseraErrorSchema = z.object({
  message: z.string().min(1),
  code: z.string().min(1),
  statusCode: z.number().min(100).max(599),
  details: z.record(z.unknown()).optional(),
});

export type CourseraErrorResponse = z.infer<typeof CourseraErrorSchema>;
