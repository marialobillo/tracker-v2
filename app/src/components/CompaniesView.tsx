import React, { useState, useMemo } from 'react';
import type { JobApplication, CompanyInfo } from '../types';
import { formatDate, monthsAgo } from '../utils';

interface CompaniesViewProps {
  apps: JobApplication[];
}

// Builds the list of unique companies with calculated months since last application
function buildCompanies(apps: JobApplication[]): CompanyInfo[] {
  const map = new Map<string, CompanyInfo>();

  apps.forEach((app) => {
    if (!app.company) return;

    const key = app.company.toLowerCase();
    const existing = map.get(key);

    if (!existing) {
      map.set(key, {
        company: app.company,
        lastDate: app.dateApplied,
        count: 1,
        months: 0, // calculated after the loop
      });
    } else {
      existing.count++;
      // Keep the most recent date
      if (app.dateApplied > existing.lastDate) {
        existing.lastDate = app.dateApplied;
      }
    }
  });

  // Calculate months for each company and sort by most recent first
  return Array.from(map.values())
    .map((c) => ({ ...c, months: monthsAgo(c.lastDate) }))
    .sort((a, b) => a.months - b.months);
}

const CompaniesView: React.FC<CompaniesViewProps> = ({ apps }) => {
  const [search, setSearch] = useState('');

  const companies = useMemo(() => buildCompanies(apps), [apps]);

  // Filter by search query
  const filtered = companies.filter((c) =>
    c.company.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>
        Green = you can reapply. Red = wait longer (6 month rule).
      </p>

      {/* Search */}
      <input
        type="text"
        className="companies-search"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search company..."
      />

      {/* Company list */}
      <div style={{ maxHeight: 500, overflowY: 'auto' }}>
        {filtered.map((company) => {
          const blocked = company.months < 6;

          return (
            <div key={company.company} className={`company-card ${blocked ? 'blocked' : 'free'}`}>
              <div>
                <div className="name">{company.company}</div>
                <div className="meta">
                  {company.count} application{company.count > 1 ? 's' : ''} · last on {formatDate(company.lastDate)}
                </div>
              </div>
              <span className={`company-tag ${blocked ? 'blocked' : 'free'}`}>
                {blocked ? `🚫 ${company.months.toFixed(1)}m` : `✓ ${company.months.toFixed(1)}m`}
              </span>
            </div>
          );
        })}

        {/* Empty state */}
        {filtered.length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--text3)', padding: 32, fontSize: 13 }}>
            No companies found
          </div>
        )}
      </div>
    </div>
  );
};

export default CompaniesView;