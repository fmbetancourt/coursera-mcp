import {
  CourseSchema,
  ProgramSchema,
  UserSchema,
  ProgressSchema,
  EnrolledCourseSchema,
} from '../../src/types/schemas';
import type {
  Course,
  Program,
  User,
  Progress,
  EnrolledCourse,
  Instructor,
  Skill,
  Deadline,
} from '../../src/types/coursera';

// Mock Instructors
const mockInstructors: Instructor[] = [
  {
    id: 'instructor-1',
    name: 'Dr. Sarah Johnson',
    bio: 'Expert in TypeScript and Node.js',
    profileImage: 'https://example.com/sarah.jpg',
  },
  {
    id: 'instructor-2',
    name: 'Prof. Michael Chen',
    bio: 'Full-stack developer and educator',
    profileImage: 'https://example.com/michael.jpg',
  },
];

// Mock Skills
const mockSkills: Skill[] = [
  { id: 'skill-1', name: 'TypeScript' },
  { id: 'skill-2', name: 'Node.js' },
  { id: 'skill-3', name: 'REST APIs' },
  { id: 'skill-4', name: 'Testing' },
];

// Mock Courses
export const mockCourses: Course[] = [
  {
    id: 'course-1',
    name: 'Advanced TypeScript',
    slug: 'advanced-typescript',
    description: 'Master advanced TypeScript patterns and techniques',
    duration: 4,
    level: 'advanced',
    language: 'en',
    rating: 4.8,
    enrollments: 5234,
    instructors: [mockInstructors[0]],
    skills: [mockSkills[0], mockSkills[1]],
    certificate: true,
    prerequisites: ['Basic JavaScript'],
    reviewCount: 432,
  },
  {
    id: 'course-2',
    name: 'Node.js Fundamentals',
    slug: 'nodejs-fundamentals',
    description: 'Learn Node.js from scratch',
    duration: 6,
    level: 'beginner',
    language: 'en',
    rating: 4.6,
    enrollments: 12450,
    instructors: [mockInstructors[1]],
    skills: [mockSkills[1], mockSkills[2]],
    certificate: true,
    reviewCount: 1023,
  },
  {
    id: 'course-3',
    name: 'REST API Design',
    slug: 'rest-api-design',
    description: 'Design scalable and maintainable REST APIs',
    duration: 4,
    level: 'intermediate',
    language: 'en',
    rating: 4.7,
    enrollments: 8932,
    instructors: [mockInstructors[0], mockInstructors[1]],
    skills: [mockSkills[2], mockSkills[3]],
    certificate: true,
    reviewCount: 654,
  },
  {
    id: 'course-4',
    name: 'Testing Strategies',
    slug: 'testing-strategies',
    description: 'Unit, integration, and E2E testing best practices',
    duration: 3,
    level: 'intermediate',
    language: 'en',
    rating: 4.5,
    enrollments: 4567,
    instructors: [mockInstructors[1]],
    skills: [mockSkills[3]],
    certificate: true,
    reviewCount: 289,
  },
  {
    id: 'course-5',
    name: 'Security in Web Applications',
    slug: 'security-web-apps',
    description: 'Comprehensive web security practices',
    duration: 5,
    level: 'advanced',
    language: 'en',
    rating: 4.9,
    enrollments: 3456,
    instructors: [mockInstructors[0]],
    skills: [mockSkills[0], mockSkills[1]],
    certificate: true,
    reviewCount: 178,
  },
];

// Validate courses against schema
mockCourses.forEach((course) => {
  CourseSchema.parse(course);
});

// Mock Programs
export const mockPrograms: Program[] = [
  {
    id: 'program-1',
    name: 'Full-Stack JavaScript Developer',
    type: 'specialization',
    courses: [mockCourses[0], mockCourses[1], mockCourses[2]],
    totalDuration: 14,
    price: 149,
    description: 'Complete path to becoming a full-stack JavaScript developer',
    targetAudience: 'Software engineers and web developers',
    partnerUniversity: 'Tech Academy',
  },
  {
    id: 'program-2',
    name: 'Advanced Node.js & Security',
    type: 'professional-certificate',
    courses: [mockCourses[1], mockCourses[4]],
    totalDuration: 8,
    price: 99,
    description: 'Advanced Node.js with security best practices',
    targetAudience: 'Backend developers',
    partnerUniversity: 'Code Masters',
  },
  {
    id: 'program-3',
    name: 'API Development & Testing',
    type: 'certificate',
    courses: [mockCourses[2], mockCourses[3]],
    totalDuration: 7,
    price: 79,
    description: 'Master API design and comprehensive testing',
    targetAudience: 'API developers and QA engineers',
    partnerUniversity: 'Dev Institute',
  },
];

// Validate programs against schema
mockPrograms.forEach((program) => {
  ProgramSchema.parse(program);
});

// Mock Users
export const mockUsers: User[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    displayName: 'Alice Developer',
    enrollments: [],
    certificates: [],
    profileImage: 'https://example.com/alice.jpg',
    bio: 'Full-stack developer',
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    displayName: 'Bob Engineer',
    enrollments: [],
    certificates: [],
    profileImage: 'https://example.com/bob.jpg',
    bio: 'Backend engineer',
  },
];

// Validate users against schema
mockUsers.forEach((user) => {
  UserSchema.parse(user);
});

// Mock Enrolled Courses
export const mockEnrolledCourses: EnrolledCourse[] = [
  {
    courseId: 'course-1',
    enrollmentDate: new Date('2024-01-15'),
    progress: 75,
    status: 'enrolled',
  },
  {
    courseId: 'course-2',
    enrollmentDate: new Date('2023-12-01'),
    progress: 100,
    status: 'completed',
    completionDate: new Date('2024-02-01'),
  },
  {
    courseId: 'course-3',
    enrollmentDate: new Date('2024-02-10'),
    progress: 45,
    status: 'enrolled',
  },
  {
    courseId: 'course-4',
    enrollmentDate: new Date('2024-01-20'),
    progress: 0,
    status: 'dropped',
  },
];

// Validate enrolled courses against schema
mockEnrolledCourses.forEach((ec) => {
  EnrolledCourseSchema.parse(ec);
});

// Mock Deadlines
const mockDeadlines: Deadline[] = [
  {
    name: 'Week 1 Quiz',
    dueDate: new Date('2024-05-10'),
    type: 'quiz',
    completed: true,
  },
  {
    name: 'Module 2 Assignment',
    dueDate: new Date('2024-05-17'),
    type: 'assignment',
    completed: false,
  },
  {
    name: 'Final Project',
    dueDate: new Date('2024-05-31'),
    type: 'project',
    completed: false,
  },
];

// Mock Progress
export const mockProgress: Progress[] = [
  {
    courseId: 'course-1',
    userId: 'user-1',
    percent: 75,
    currentWeek: 3,
    totalWeeks: 4,
    upcomingDeadlines: mockDeadlines,
    lastAccessedDate: new Date('2024-04-28'),
  },
  {
    courseId: 'course-2',
    userId: 'user-1',
    percent: 100,
    currentWeek: 6,
    totalWeeks: 6,
    upcomingDeadlines: [],
    lastAccessedDate: new Date('2024-02-01'),
  },
  {
    courseId: 'course-3',
    userId: 'user-2',
    percent: 45,
    currentWeek: 2,
    totalWeeks: 4,
    upcomingDeadlines: [mockDeadlines[1]],
    lastAccessedDate: new Date('2024-04-25'),
  },
];

// Validate progress against schema
mockProgress.forEach((progress) => {
  ProgressSchema.parse(progress);
});
