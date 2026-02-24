import React from 'react';
import type { Interviews, InterviewStatus } from '../types';
import { INTERVIEW_STAGES } from '../constants';
import { formatDate } from '../utils';

interface InterviewPipelineProps {
  interviews: Interviews;
  // Called when a stage button is clicked, passes the stage key (e.g. 'hrCall')
  onStageClick: (stageKey: keyof Interviews) => void;
}

// Determines which CSS classes to apply based on the interview state
function getButtonClass(status: InterviewStatus, hasDate: boolean): string {
  let cls = 'pipe-btn';
  if (status === 'passed') cls += ' passed';
  else if (status === 'failed') cls += ' failed';
  else if (hasDate) cls += ' has-date';
  return cls;
}

const InterviewPipeline: React.FC<InterviewPipelineProps> = ({ interviews, onStageClick }) => {
  return (
    <div className="pipeline">
      {INTERVIEW_STAGES.map((stage) => {
        const interview = interviews[stage.key];
        const hasDate = !!interview.date;
        const showBadge = interview.status === 'passed' || interview.status === 'failed';

        return (
          <button
            key={stage.key}
            className={getButtonClass(interview.status, hasDate)}
            onClick={() => onStageClick(stage.key)}
            title={stage.label + (hasDate ? ` — ${formatDate(interview.date)}` : '')}
          >
            {/* Small ✓ or ✗ badge in the top-right corner */}
            {showBadge && (
              <span className={`pipe-badge ${interview.status}`}>
                {interview.status === 'passed' ? '✓' : '✗'}
              </span>
            )}
            {stage.short}
          </button>
        );
      })}
    </div>
  );
};

export default InterviewPipeline;