// API client using native fetch - calls Next.js API routes
// No axios needed, no base URL needed (same origin)

import type { JobApplication } from './types';

// ─── APPLICATIONS ─────────────────────────────────────────────────────────────

export async function fetchApplications(): Promise<JobApplication[]> {
  const res = await fetch('/api/applications');
  if (!res.ok) throw new Error('Failed to fetch applications');
  return res.json();
}

export async function createApplication(app: JobApplication): Promise<JobApplication> {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(app),
  });
  if (!res.ok) throw new Error('Failed to create application');
  return res.json();
}

export async function updateApplication(app: JobApplication): Promise<JobApplication> {
  const res = await fetch(`/api/applications/${app.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(app),
  });
  if (!res.ok) throw new Error('Failed to update application');
  return res.json();
}

export async function deleteApplication(id: number): Promise<void> {
  const res = await fetch(`/api/applications/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete application');
}

// ─── GOALS ────────────────────────────────────────────────────────────────────

export interface Goals {
  daily_goal: number;
  weekly_goal: number;
}

export interface DailyProgress {
  date: string;
  count: number;
  goalMet: boolean;
}

export interface ProgressStats {
  daysMet: number;
  totalDays: number;
  currentStreak: number;
  longestStreak: number;
}

export async function fetchGoals(): Promise<Goals> {
  const res = await fetch('/api/goals');
  if (!res.ok) throw new Error('Failed to fetch goals');
  return res.json();
}

export async function updateGoals(goals: Goals): Promise<Goals> {
  const res = await fetch('/api/goals', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(goals),
  });
  if (!res.ok) throw new Error('Failed to update goals');
  return res.json();
}

export async function fetchDailyProgress(days: number = 30): Promise<DailyProgress[]> {
  const res = await fetch(`/api/progress/daily?days=${days}`);
  if (!res.ok) throw new Error('Failed to fetch daily progress');
  return res.json();
}

export async function fetchProgressStats(): Promise<ProgressStats> {
  const res = await fetch('/api/progress/stats');
  if (!res.ok) throw new Error('Failed to fetch progress stats');
  return res.json();
}