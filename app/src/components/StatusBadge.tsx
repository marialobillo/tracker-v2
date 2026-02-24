import React from 'react';
import type { AppStatus } from '../types';

interface StatusBadgeProps {
  status: AppStatus;
}

// Maps each status to a CSS class name
// "In Process" becomes "InProcess" to match the CSS class .status-InProcess
function getClassName(status: AppStatus): string {
  return 'status status-' + status.replace(' ', '');
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  return <span className={getClassName(status)}>{status}</span>;
};

export default StatusBadge;