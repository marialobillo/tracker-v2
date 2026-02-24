import React, { useMemo, useState } from 'react';
import type { JobApplication, Interviews, Interview } from '../types';
import { APP_STATUSES, SENIORITY_OPTIONS, SPECIALIZATIONS, REJECTION_REASONS } from '../constants';
import { emptyApp } from '../utils';
import InterviewPipeline from './InterviewPipeline';
import InterviewModal from './InterviewModal';
import { INTERVIEW_STAGES } from '../constants';
import { formatDate, monthsAgo } from '../utils';

interface AppFormProps {
  app: JobApplication | null;
  apps: JobApplication[];
  onSave: (app: JobApplication) => void;
  onClose: () => void;
}

const AppForm: React.FC<AppFormProps> = ({ app, apps, onSave, onClose }) => {
  // If editing, copy the existing app. If creating, start with an empty one.
  const [data, setData] = useState<JobApplication>(
    app ? { ...app, interviews: { ...app.interviews } } : emptyApp()
  );

  // Which interview stage modal is open (null = none)
  const [activeStage, setActiveStage] = useState<keyof Interviews | null>(null);

  // Generic setter for top-level fields
  const set = <K extends keyof JobApplication>(key: K, value: JobApplication[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  // Check if company already exists
  const existingApps = useMemo(() => {
    if (!data.company || data.company.length < 2) return [];
    const companyLower = data.company.toLowerCase();
    return apps.filter(a => 
      a.company && 
      a.company.toLowerCase() === companyLower &&
      a.id !== data.id
    ).sort((a, b) => b.dateApplied.localeCompare(a.dateApplied)); // most recent first
  }, [data.company, apps, data.id]);
  
  // Updates a single interview stage inside the interviews object
  const setInterview = (stageKey: keyof Interviews, updated: Interview) => {
    setData((prev) => ({
      ...prev,
      interviews: { ...prev.interviews, [stageKey]: updated },
    }));
  };

  // Label for the interview modal header
  const activeStageName = activeStage
    ? INTERVIEW_STAGES.find((s) => s.key === activeStage)?.label ?? ''
    : '';

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h3>{app ? 'Edit application' : 'New application'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Date + Week */}
        <div className="form-row">
          <div className="field">
            <label>Date applied</label>
            <input type="date" value={data.dateApplied} onChange={(e) => set('dateApplied', e.target.value)} />
          </div>
          <div className="field">
            <label>Week</label>
            <input type="text" value={data.week} onChange={(e) => set('week', e.target.value)} placeholder="e.g. W04" />
          </div>
        </div>

        {/* Position */}
        <div className="field">
          <label>Position</label>
          <input type="text" value={data.position} onChange={(e) => set('position', e.target.value)} placeholder="Senior Backend Developer" />
        </div>

        {/* Company + Location */}
        <div className="form-row">
          <div className="field">
            <label>Company</label>
            <input type="text" value={data.company} onChange={(e) => set('company', e.target.value)} placeholder="Google" />
          </div>
          {/* Warning si ya aplicaste a esta empresa */}
            {existingApps.length > 0 && (
              <div style={{ 
                marginTop: -6,
                marginBottom: 14,
                padding: '8px 12px', 
                background: 'rgba(245, 166, 35, 0.1)', 
                border: '1px solid rgba(245, 166, 35, 0.3)', 
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--orange)',
                fontWeight: 600
              }}>
                ⚠️ You already applied to <strong>{data.company}</strong> {existingApps.length} time{existingApps.length > 1 ? 's' : ''}
                <div style={{ marginTop: 4, fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>
                  Last: {formatDate(existingApps[0].dateApplied)} ({monthsAgo(existingApps[0].dateApplied).toFixed(1)} months ago)
                </div>
              </div>
            )}

          <div className="field">
            <label>Location</label>
            <input type="text" value={data.location} onChange={(e) => set('location', e.target.value)} placeholder="Remote / Madrid" />
          </div>
        </div>

        {/* Seniority + Specialization */}
        <div className="form-row">
          <div className="field">
            <label>Seniority</label>
            <select value={data.seniority} onChange={(e) => set('seniority', e.target.value)}>
              {SENIORITY_OPTIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Specialization</label>
            <select value={data.specialization} onChange={(e) => set('specialization', e.target.value)}>
              {SPECIALIZATIONS.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>

        {/* Job Posting URL */}
        <div className="field">
          <label>Job Posting URL</label>
          <input type="url" value={data.jobPostingUrl} onChange={(e) => set('jobPostingUrl', e.target.value)} placeholder="https://..." />
        </div>

        {/* Status + Salary */}
        <div className="form-row">
          <div className="field">
            <label>Status</label>
            <select value={data.status} onChange={(e) => set('status', e.target.value as JobApplication['status'])}>
              {APP_STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div className="field">
            <label>Salary (€/year)</label>
            <input type="number" value={data.salary} onChange={(e) => set('salary', e.target.value)} placeholder="70000" />
          </div>
        </div>

        {/* Rejection reason — only visible when status is Rejected */}
        {data.status === 'Rejected' && (
          <div className="field">
            <label>Rejection reason</label>
            <select value={data.rejectionReason} onChange={(e) => set('rejectionReason', e.target.value)}>
              {REJECTION_REASONS.map((r) => <option key={r} value={r}>{r || '— Not specified'}</option>)}
            </select>
          </div>
        )}

        {/* Notes */}
        <div className="field">
          <label>Notes</label>
          <textarea value={data.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Notes about this application..." />
        </div>

        {/* Interview pipeline — clicking a stage opens InterviewModal */}
        <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 8 }}>
          <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.6px' }}>
            Interview pipeline — click each stage
          </label>
          <InterviewPipeline interviews={data.interviews} onStageClick={setActiveStage} />
        </div>

        {/* Form actions */}
        <div className="modal-actions">
          <button className="btn-save" onClick={() => onSave(data)}>Save</button>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>

      {/* Interview modal — renders on top when a stage is selected */}
      {activeStage && (
        <InterviewModal
          interview={data.interviews[activeStage]}
          stageName={activeStageName}
          onSave={(updated) => {
            setInterview(activeStage, updated);
            setActiveStage(null);
          }}
          onClose={() => setActiveStage(null)}
        />
      )}
    </div>
  );
};

export default AppForm;