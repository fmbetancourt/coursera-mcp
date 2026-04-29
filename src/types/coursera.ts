// Coursera domain types for Coursera MCP

export type Level = 'beginner' | 'intermediate' | 'advanced' | 'professional';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'pt' | 'ru';
export type CourseStatus = 'enrolled' | 'completed' | 'dropped';
export type ProgramType = 'specialization' | 'degree' | 'certificate' | 'professional-certificate';

export interface Instructor {
  id: string;
  name: string;
  bio?: string;
  profileImage?: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Course {
  id: string;
  name: string;
  slug: string;
  description: string;
  duration: number; // weeks
  level: Level;
  language: Language;
  rating?: number; // 0-5
  enrollments: number;
  instructors: Instructor[];
  skills: Skill[];
  certificate: boolean;
  prerequisites?: string[];
  syllabus?: string;
  reviewCount?: number;
}

export interface Program {
  id: string;
  name: string;
  type: ProgramType;
  courses: Course[];
  totalDuration: number; // weeks
  price: number;
  description?: string;
  targetAudience?: string;
  partnerUniversity?: string;
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  enrollments: EnrolledCourse[];
  certificates: Certificate[];
  profileImage?: string;
  bio?: string;
}

export interface EnrolledCourse {
  courseId: string;
  enrollmentDate: Date;
  progress: number; // 0-100
  status: CourseStatus;
  completionDate?: Date;
}

export interface Certificate {
  id: string;
  courseId: string;
  userId: string;
  issuedDate: Date;
  certificateUrl: string;
}

export interface Progress {
  courseId: string;
  userId: string;
  percent: number; // 0-100
  currentWeek: number;
  totalWeeks: number;
  upcomingDeadlines: Deadline[];
  lastAccessedDate: Date;
}

export interface Deadline {
  name: string;
  dueDate: Date;
  type: 'assignment' | 'quiz' | 'project' | 'exam';
  completed: boolean;
  submissionUrl?: string;
}

export interface SearchCourseParams {
  query?: string;
  level?: Level;
  language?: Language;
  limit?: number;
  offset?: number;
  sortBy?: 'rating' | 'enrollments' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

export interface SearchProgramParams {
  query?: string;
  type?: ProgramType;
  limit?: number;
  offset?: number;
  sortBy?: 'rating' | 'price' | 'recent';
  sortOrder?: 'asc' | 'desc';
}

export interface CourseraApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    offset: number;
    limit: number;
  };
}

export interface CourseraError {
  message: string;
  code: string;
  statusCode: number;
  details?: Record<string, unknown>;
}
