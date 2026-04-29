// Utility types - enums and basic building blocks
// Main domain types (Course, Program, User, etc.) are in schemas.ts

export type Level = 'beginner' | 'intermediate' | 'advanced' | 'professional';
export type Language = 'en' | 'es' | 'fr' | 'de' | 'zh' | 'ja' | 'pt' | 'ru';
export type CourseStatus = 'enrolled' | 'completed' | 'dropped';
export type ProgramTypeEnum = 'specialization' | 'degree' | 'certificate' | 'professional-certificate';

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

export interface Deadline {
  name: string;
  dueDate: Date;
  type: 'assignment' | 'quiz' | 'project' | 'exam';
  completed: boolean;
  submissionUrl?: string;
}

export interface CourseraApiResponse<T> {
  data: T;
  meta?: {
    total: number;
    offset: number;
    limit: number;
  };
}
