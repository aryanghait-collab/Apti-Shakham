export interface Question {
  id: number;
  text: string;
  options: Option[];
  difficulty: number;
}

export interface Option {
  id: string;
  text: string;
}

export interface User {
  firstName: string;
  lastName: string;
  email: string;
}

export type QuizStatus = 'registration' | 'loading' | 'active' | 'finished' | 'timed-out' | 'error';
