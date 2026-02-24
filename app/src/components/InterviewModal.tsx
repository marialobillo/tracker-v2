import React, { useState } from 'react';
import type { Interview, InterviewStatus } from '../types';
import { INTERVIEW_COLORS, INTERVIEW_RATINGS } from '../constants';

interface InterviewModalProps {
  interview: Interview;
  stageName: string;
  onSave: (updated: Interview) => void;
  onClose: () => void;
}

const InterviewModal: React.FC<InterviewModalProps> = ({ interview, stageName, onSave, onClose }) => {
  // Local copy of the interview so we can edit without mutating the parent state
  const [data, setData] = useState<Interview>({ ...interview });

  // Generic setter: updates a single field by key
  const set = <K extends keyof Interview>(key: K, value: Interview[K]) => {
    setData((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header">
          <h3>{stageName}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        {/* Date */}
        <div className="field">
          <label>Date</label>
          <input type="date" value={data.date} onChange={(e) => set('date', e.target.value)} />
        </div>

        {/* Status: pending / passed / failed */}
        <div className="field">
          <label>Status</label>
          <div className="status-row">
            {(['pending', 'passed', 'failed'] as InterviewStatus[]).map((s) => (
              <button
                key={s}
                className={`status-btn ${data.status === s ? `active-${s}` : ''}`}
                onClick={() => set('status', s)}
              >
                {s === 'pending' ? '⏳ Pending' : s === 'passed' ? '✓ Passed' : '✗ Failed'}
              </button>
            ))}
          </div>
        </div>

        {/* Color picker */}
        <div className="field">
          <label>Color</label>
          <div className="color-row">
            {INTERVIEW_COLORS.map((c) => (
              <div
                key={c.value}
                className={`color-swatch ${data.color === c.value ? 'selected' : ''}`}
                style={{ background: c.value }}
                onClick={() => set('color', c.value)}
                title={c.name}
              />
            ))}
          </div>
        </div>

        {/* Rating */}
        <div className="field">
          <label>How did it go?</label>
          <select value={data.rating} onChange={(e) => set('rating', e.target.value)}>
            {INTERVIEW_RATINGS.map((r) => (
              <option key={r} value={r}>{r || '— Not rated'}</option>
            ))}
          </select>
        </div>

        {/* Notes */}
        <div className="field">
          <label>Notes</label>
          <textarea
            value={data.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="What they asked, how it went..."
          />
        </div>

        {/* Actions */}
        <div className="modal-actions">
          <button className="btn-save" onClick={() => onSave(data)}>Save</button>
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
};

export default InterviewModal;