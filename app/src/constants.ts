import type { InterviewStage } from './types';

// Sequential stages of the interview pipeline
export const INTERVIEW_STAGES: InterviewStage[] = [
  { key: 'hrCall', label: '1. HR Call', short: 'HR' },
  { key: 'screeningCall', label: '2. Screening', short: 'Scr' },
  { key: 'hiringManager', label: '3. Hiring Mgr', short: 'HM' },
  { key: 'takeHome', label: '4.1 Take Home', short: 'TH' },
  { key: 'systemDesign', label: '4.2 System Design', short: 'SD' },
  { key: 'liveCoding', label: '4.3 Live Coding', short: 'LC' },
  { key: 'culturalFit', label: '5. Cultural Fit', short: 'CF' },
  { key: 'offer', label: '6. Offer', short: 'Of' },
];

// Possible statuses for a job application
export const APP_STATUSES = ['Applied', 'In Process', 'Rejected', 'Offer', 'Archived'] as const;

// Seniority levels available in the form
export const SENIORITY_OPTIONS = ['Junior', 'Mid', 'Senior', 'Lead', 'Principal'] as const;

// Tech specializations available in the form
export const SPECIALIZATIONS = [
  'Backend', 'Frontend', 'Fullstack', 'DevOps',
  'Data Engineering', 'Platform', 'Mobile', 'ML/AI', 'Security', 'Other'
] as const;

// Color options for interview stages
export const INTERVIEW_COLORS = [
  { name: 'Blue', value: '#4f8bff' },
  { name: 'Green', value: '#34d97e' },
  { name: 'Orange', value: '#f5a623' },
  { name: 'Red', value: '#ff5555' },
  { name: 'Purple', value: '#a78bfa' },
  { name: 'Pink', value: '#f472b6' },
  { name: 'Teal', value: '#2dd4bf' },
  { name: 'Yellow', value: '#eab308' },
] as const;

// Rating options for how an interview went
export const INTERVIEW_RATINGS = ['', '😫 Bad', '😐 OK', '🙂 Good', '😄 Great'] as const;

// Reasons why an application was rejected
export const REJECTION_REASONS = [
  '',
  'No response',
  'After HR',
  'After technical',
  'After take home',
  'After offer negotiation',
  'Salary',
  'Other'
] as const;