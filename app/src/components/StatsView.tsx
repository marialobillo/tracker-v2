import React, { useMemo } from 'react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import type { JobApplication } from '../types';
import { INTERVIEW_STAGES, APP_STATUSES } from '../constants';

// Register all chart.js components we use
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

interface StatsViewProps {
  apps: JobApplication[];
}

// All computed stats in one place
interface ComputedStats {
  total: number;
  rejected: number;
  inProcess: number;
  offers: number;
  responseRate: number;       // percentage of apps that got any activity
  noResponse: number;         // rejected with zero interview activity
  avgResponseDays: number | null; // avg days between apply and first HR call
  avgPerMonth: number;
  specMap: Record<string, number>;   // apps per specialization
  weekMap: Record<string, number>;   // apps per week
  weeks: string[];                   // sorted week keys for the chart
  funnel: { label: string; count: number }[]; // how many apps reached each interview stage
}

// Color for each application status in the doughnut chart
const STATUS_COLORS: Record<string, string> = {
  'Applied': '#4f8bff',
  'In Process': '#f5a623',
  'Rejected': '#ff5555',
  'Offer': '#34d97e',
  'Archived': '#5c6177',
};

// Returns the ISO week number for a given date
function getWeekNumber(date: Date): number {
  const jan1 = new Date(date.getFullYear(), 0, 1);
  return Math.ceil(((date.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
}

// Computes all statistics from the apps array
function computeStats(apps: JobApplication[]): ComputedStats {
  const total = apps.length;
  const rejected = apps.filter((a) => a.status === 'Rejected').length;
  const inProcess = apps.filter((a) => a.status === 'In Process').length;
  const offers = apps.filter((a) => a.status === 'Offer').length;

  // "No response" = rejected apps where no interview stage was ever touched
  const noResponse = apps.filter((a) => {
    if (a.status !== 'Rejected') return false;
    const iv = a.interviews;
    return (
      (!iv.hrCall || iv.hrCall.status === 'pending') &&
      (!iv.screeningCall || iv.screeningCall.status === 'pending')
    );
  }).length;

  // Response rate = everything that's not just sitting at "Applied" or silent rejections
  const stillApplied = apps.filter((a) => a.status === 'Applied').length;
  const activeApps = total - stillApplied - noResponse;
  const responseRate = total > 0 ? (activeApps / total) * 100 : 0;

  // Apps grouped by specialization
  const specMap: Record<string, number> = {};
  apps.forEach((a) => {
    const spec = a.specialization || 'Other';
    specMap[spec] = (specMap[spec] || 0) + 1;
  });

  // Apps grouped by week
  const weekMap: Record<string, number> = {};
  apps.forEach((a) => {
    if (!a.dateApplied) return;
    const d = new Date(a.dateApplied + 'T00:00:00');
    const key = `${d.getFullYear()}-W${String(getWeekNumber(d)).padStart(2, '0')}`;
    weekMap[key] = (weekMap[key] || 0) + 1;
  });
  const weeks = Object.keys(weekMap).sort();

  // Interview funnel: how many apps reached each stage
  const funnel = INTERVIEW_STAGES.map((stage) => ({
    label: stage.label,
    count: apps.filter((a) => {
      const iv = a.interviews[stage.key];
      return iv && (iv.status === 'passed' || iv.status === 'failed' || iv.date);
    }).length,
  }));

  // Average days between applying and the first HR call
  const responseTimes = apps
    .filter((a) => a.interviews?.hrCall?.date && a.dateApplied)
    .map((a) => (new Date(a.interviews.hrCall.date).getTime() - new Date(a.dateApplied).getTime()) / (1000 * 60 * 60 * 24));
  const avgResponseDays = responseTimes.length > 0
    ? responseTimes.reduce((sum, v) => sum + v, 0) / responseTimes.length
    : null;

  // Average apps per month
  const monthSet = new Set(apps.filter((a) => a.dateApplied).map((a) => a.dateApplied.slice(0, 7)));
  const avgPerMonth = monthSet.size > 0 ? total / monthSet.size : 0;

  return { total, rejected, inProcess, offers, responseRate, noResponse, avgResponseDays, avgPerMonth, specMap, weekMap, weeks, funnel };
}

// Returns a CSS color class name based on the response rate value
function getResponseRateClass(rr: number): 'good' | 'warn' | 'bad' {
  if (rr > 15) return 'good';
  if (rr > 8) return 'warn';
  return 'bad';
}

// Returns advice text based on the response rate
function getAdvice(rr: number): string {
  if (rr < 8) return 'Your response rate is below 8%. Consider reviewing your CV and cover letter, or focusing on fewer but better-matched companies.';
  if (rr < 15) return 'Your response rate is in the normal range (8-15%). Keep the current pace and focus on preparing the interviews you already have.';
  return 'Your response rate is very good (>15%). You are on track — focus on converting interviews into offers.';
}

const StatsView: React.FC<StatsViewProps> = ({ apps }) => {
  const stats = useMemo(() => computeStats(apps), [apps]);
  const rrClass = getResponseRateClass(stats.responseRate);

  // ─── CHART DATA ──────────────────────────────────────────────────────────

  // Doughnut: apps by status
  const doughnutData = {
    labels: [...APP_STATUSES],
    datasets: [{
      data: APP_STATUSES.map((s) => apps.filter((a) => a.status === s).length),
      backgroundColor: APP_STATUSES.map((s) => STATUS_COLORS[s]),
      borderColor: '#0f1117',
      borderWidth: 3,
    }],
  };

  // Horizontal bar: apps by specialization
  const specLabels = Object.keys(stats.specMap);
  const barSpecData = {
    labels: specLabels,
    datasets: [{ data: specLabels.map((k) => stats.specMap[k]), backgroundColor: '#4f8bff', borderRadius: 4 }],
  };

  // Line: weekly trend
  const lineData = {
    labels: stats.weeks,
    datasets: [{
      data: stats.weeks.map((w) => stats.weekMap[w]),
      borderColor: '#4f8bff',
      backgroundColor: 'rgba(79,139,255,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 2,
    }],
  };

  // Horizontal bar: interview funnel
  const funnelData = {
    labels: stats.funnel.map((f) => f.label),
    datasets: [{
      data: stats.funnel.map((f) => f.count),
      backgroundColor: ['#4f8bff', '#4f8bff', '#f5a623', '#f5a623', '#a78bfa', '#a78bfa', '#2dd4bf', '#34d97e'],
      borderRadius: 4,
    }],
  };

  // ─── SHARED CHART OPTIONS ────────────────────────────────────────────────

  const doughnutOpts = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { labels: { color: '#8b90a0', font: { size: 11 } } } },
  } as const;

  const horizontalBarOpts = {
    responsive: true,
    maintainAspectRatio: true,
    indexAxis: 'y' as const,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#8b90a0', font: { size: 10 } }, grid: { color: '#2e3344' } },
      y: { ticks: { color: '#8b90a0', font: { size: 11 } }, grid: { display: false } },
    },
  };

  const lineOpts = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#8b90a0', font: { size: 9 }, maxRotation: 45 }, grid: { color: '#2e3344' } },
      y: { ticks: { color: '#8b90a0', font: { size: 10 } }, grid: { color: '#2e3344' } },
    },
  };

  // ─── RENDER ──────────────────────────────────────────────────────────────

  return (
    <div>
      {/* KPI Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-val">{stats.total}</div>
          <div className="stat-label">Total applications</div>
          <div className="stat-sub">~{Math.round(stats.avgPerMonth)} per month</div>
        </div>

        <div className="stat-card">
          <div className="stat-val" style={{ color: `var(--${rrClass === 'good' ? 'green' : rrClass === 'warn' ? 'orange' : 'red'})` }}>
            {stats.responseRate.toFixed(1)}%
          </div>
          <div className="stat-label">Response rate</div>
          <div className="stat-sub">
            <span className={rrClass}>
              {rrClass === 'good' ? '↑ Very good' : rrClass === 'warn' ? '→ Normal' : '↓ Low'}
            </span>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--orange)' }}>{stats.inProcess}</div>
          <div className="stat-label">In process</div>
          <div className="stat-sub">{stats.total > 0 ? ((stats.inProcess / stats.total) * 100).toFixed(1) : 0}% of total</div>
        </div>

        <div className="stat-card">
          <div className="stat-val" style={{ color: 'var(--green)' }}>{stats.offers}</div>
          <div className="stat-label">Offers</div>
          <div className="stat-sub">
            {stats.avgResponseDays !== null ? `Avg response: ${Math.round(stats.avgResponseDays)}d` : 'No response data'}
          </div>
        </div>
      </div>

      {/* Charts row 1 */}
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Applications by status</h4>
          <p>Distribution across all statuses</p>
          <Doughnut data={doughnutData} options={doughnutOpts} />
        </div>
        <div className="chart-card">
          <h4>By specialization</h4>
          <p>How many applications per area</p>
          <Bar data={barSpecData} options={horizontalBarOpts} />
        </div>
      </div>

      {/* Charts row 2 */}
      <div className="charts-grid">
        <div className="chart-card">
          <h4>Weekly trend</h4>
          <p>Applications per week over time</p>
          <Line data={lineData} options={lineOpts} />
        </div>
        <div className="chart-card">
          <h4>Interview funnel</h4>
          <p>How many apps reached each stage</p>
          <Bar data={funnelData} options={horizontalBarOpts} />
        </div>
      </div>

      {/* Insights */}
      <div className="insights-grid">
        <div className="insight-card">
          <h4>📊 Key numbers</h4>
          <div className="insight-item">
            <span className="label">No response</span>
            <span className="value bad">{stats.noResponse}</span>
          </div>
          <div className="insight-item">
            <span className="label">Rejection rate</span>
            <span className="value warn">{stats.total > 0 ? ((stats.rejected / stats.total) * 100).toFixed(1) : 0}%</span>
          </div>
          <div className="insight-item">
            <span className="label">Avg response time</span>
            <span className="value">{stats.avgResponseDays !== null ? `${Math.round(stats.avgResponseDays)} days` : '—'}</span>
          </div>
          <div className="insight-item">
            <span className="label">Apps / month</span>
            <span className="value">{Math.round(stats.avgPerMonth)}</span>
          </div>
        </div>

        <div className="insight-card">
          <h4>🎯 Conversion by stage</h4>
          {stats.funnel.map((f) => (
            <div key={f.label} className="insight-item">
              <span className="label">{f.label}</span>
              <span className="value">{f.count}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Advice box */}
      <div className="advice-box">
        <h4>💡 Advice</h4>
        <p>{getAdvice(stats.responseRate)}</p>
      </div>
    </div>
  );
};

export default StatsView;