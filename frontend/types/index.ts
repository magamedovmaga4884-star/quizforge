export type UserRole = "TEACHER" | "STUDENT";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface Subject {
  id: number;
  name: string;
  description?: string;
  teacher_id: number;
  created_at: string;
  test_count?: number;
}

export type TestDifficulty = "EASY" | "MEDIUM" | "HARD";
export type TestStatus = "DRAFT" | "PUBLISHED" | "CLOSED";
export type QuestionType = "SINGLE_CHOICE" | "MULTIPLE_CHOICE" | "TRUE_FALSE";

export interface Answer {
  id?: number;
  text: string;
  is_correct: boolean;
  order_index?: number;
}

export interface StudentAnswer {
  id: number;
  text: string;
  order_index: number;
}

export interface Question {
  id: number;
  test_id: number;
  text: string;
  question_type: QuestionType;
  difficulty: TestDifficulty;
  points: number;
  order_index: number;
  created_at?: string;
  answers: Answer[];
}

export interface StudentQuestion {
  id: number;
  text: string;
  question_type: QuestionType;
  points: number;
  order_index: number;
  answers: StudentAnswer[];
}

export interface Material {
  id: number;
  test_id: number;
  filename: string;
  file_type: string;
  extracted_text_snippet?: string;
  char_count: number;
  created_at: string;
}

export interface Test {
  id: number;
  teacher_id: number;
  subject_id: number;
  title: string;
  description?: string;
  difficulty: TestDifficulty;
  time_limit_minutes: number;
  question_count: number;
  room_code?: string;
  status: TestStatus;
  created_at: string;
  updated_at: string;
  subject?: Subject;
  questions?: Question[];
  materials?: Material[];
}

export interface RoomJoinInfo {
  test_id: number;
  title: string;
  description?: string;
  subject_name: string;
  difficulty: TestDifficulty;
  time_limit_minutes: number;
  question_count: number;
  room_code: string;
}

export type AttemptStatus = "IN_PROGRESS" | "COMPLETED" | "TIMED_OUT";

export interface StudentAttemptPlay {
  id: number;
  test_id: number;
  test_title: string;
  subject_name: string;
  time_limit_minutes: number;
  started_at: string;
  remaining_seconds: number;
  status: AttemptStatus;
  questions: StudentQuestion[];
  answers: Record<number, number[]>;
}

export interface AttemptFinishResult {
  id: number;
  score: number;
  total_points: number;
  percentage: number;
  status: AttemptStatus;
  started_at: string;
  finished_at: string;
  duration_seconds: number;
  correct_count: number;
  total_questions: number;
}

export interface TeacherAttemptResultItem {
  id: number;
  student_id: number;
  student_name: string;
  student_email: string;
  score: number;
  total_points: number;
  percentage: number;
  status: AttemptStatus;
  started_at: string;
  finished_at?: string;
  duration_seconds?: number;
}

export interface TeacherTestResults {
  test_id: number;
  test_title: string;
  total_attempts: number;
  average_score: number;
  highest_score: number;
  average_percentage: number;
  attempts: TeacherAttemptResultItem[];
}

export interface QuestionStatItem {
  question_id: number;
  question_text: string;
  order_index: number;
  total_answers: number;
  correct_count: number;
  incorrect_count: number;
  correct_percentage: number;
  incorrect_percentage: number;
}

export interface TestStatistics {
  test_id: number;
  total_students: number;
  questions: QuestionStatItem[];
}

export interface DashboardStats {
  total_tests: number;
  active_tests: number;
  unique_students: number;
  completed_attempts: number;
  recent_tests: {
    id: number;
    title: string;
    subject_name: string;
    question_count: number;
    difficulty: TestDifficulty;
    time_limit_minutes: number;
    status: TestStatus;
    room_code?: string;
    created_at: string;
  }[];
}
