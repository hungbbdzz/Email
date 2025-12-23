
export enum EmailLabel {
  WORK = 'Work',
  PERSONAL = 'Personal',
  PROMOTION = 'Promotion',
  SOCIAL = 'Social',
  SPAM = 'Spam',
  PHISHING = 'Phishing',
  GAME = 'Game',
  EDUCATION = 'Education',
}

export enum ModelType {
  FLASH = 'gemini-2.5-flash',
  PRO = 'gemini-3-pro-preview',
  FLASH_2_0 = 'gemini-2.0-flash',
}

export type ComposeMode = 'compose' | 'reply' | 'forward';
export type AppModule = 'mail' | 'chat' | 'meet';

export interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  type?: 'text' | 'file' | 'task'; // For special message types
  metadata?: any;
}

export interface ChatSession {
  id: string;
  user_id: string;
  title: string;
  type?: 'dm' | 'space';
  members?: string[];
  created_at: string;
  updated_at: string;
}

export interface Email {
  id: string;
  threadId?: string; 
  senderName: string;
  senderEmail: string;
  to?: string;
  subject: string;
  preview: string;
  body: string; 
  date: string;
  label: EmailLabel;
  confidenceScore: number; 
  isRead: boolean;
  warnings?: string[]; 
  avatar?: string;
  isStarred?: boolean;
  isArchived?: boolean;
  isDeleted?: boolean;
  isCorrection?: boolean; 
  snoozeUntil?: string; // ISO date string
}

export interface StatData {
  name: string;
  value: number;
  fill?: string;
  [key: string]: any;
}

export interface AccuracyData {
  day: string;
  accuracy: number;
  [key: string]: any;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
}

export interface AppConfig {
  supabaseUrl: string;
  supabaseKey: string;
  googleClientId?: string;
}

export interface ModelLog {
  timestamp: Date;
  action: string;
  details: string;
  status: string;
}

// Moved from trainingData.ts
export interface TrainingData {
    text: string;
    label: string;
    sender: string;
    subject?: string;
}