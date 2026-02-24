import type { Interview, Interviews, JobApplication } from './types';
import { INTERVIEW_STAGES } from './constants';

// Formats a date string (YYYY-MM-DD) into a readable Spanish format (e.g. "12 jun 2025")
export function formatDate(dateStr: string): string {
  if (!dateStr) return '—';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

// Calculates how many months ago a date was from today
export function monthsAgo(dateStr: string): number {
  if (!dateStr) return Infinity;
  const ms = new Date().getTime() - new Date(dateStr).getTime();
  return ms / (1000 * 60 * 60 * 24 * 30.44);
}

// Returns a blank Interview object with default values
export function emptyInterview(): Interview {
  return {
    date: '',
    status: 'pending',
    rating: '',
    notes: '',
    color: '#4f8bff',
  };
}

// Returns a blank JobApplication with all interview stages initialized
export function emptyApp(): JobApplication {
  // Builds the interviews object dynamically from INTERVIEW_STAGES
  const interviews = Object.fromEntries(
    INTERVIEW_STAGES.map((stage) => [stage.key, emptyInterview()])
  ) as unknown as Interviews;

  return {
    id: Date.now(),
    dateApplied: '',
    week: '',
    position: '',
    company: '',
    location: '',
    seniority: 'Senior',
    specialization: 'Backend',
    jobPostingUrl: '',
    status: 'Applied',
    salary: '',
    notes: '',
    rejectionReason: '',
    interviews,
  };
}