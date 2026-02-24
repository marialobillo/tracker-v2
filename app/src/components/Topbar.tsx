import React from 'react';

interface TopbarProps {
  totalApps: number;
  onNewApp: () => void;
  // onLogout: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ totalApps, onNewApp }) => {
  return (
    <div className="topbar">
      <div className="topbar-left">
        <div className="logo">
          📋 Job<span>Tracker</span>
        </div>
        <span className="badge">{totalApps} applications</span>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        <button className="btn-new" onClick={onNewApp}>
          + New application
        </button>
        {/* <button
          onClick={onLogout}
          style={{
            background: '#2a2d3a',
            color: '#94a3b8',
            border: 'none',
            padding: '0.5rem 0.8rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontSize: '0.8rem',
          }}
        >
          Logout
        </button> */}
      </div>
    </div>
  );
};
export default Topbar;