import React, { useState, useMemo } from 'react';
import type { JobApplication } from './../types';
import { APP_STATUSES } from './../constants';
import { formatDate } from './../utils';
import StatusBadge from './StatusBadge';
import InterviewPipeline from './InterviewPipeline';

type SortableField = 'dateApplied' | 'company' | 'position' | 'status' | 'salary';

interface TableViewProps {
  apps: JobApplication[];
  // Opens the edit form for a given application
  onEdit: (app: JobApplication) => void;
  // Deletes an application by id
  onDelete: (id: number) => void;
}

// Sortable column header button
interface SortBtnProps {
  field: SortableField;
  currentSort: string;
  currentDir: 'asc' | 'desc';
  onSort: (field: SortableField) => void;
  children: React.ReactNode;
}

const SortBtn: React.FC<SortBtnProps> = ({ field, currentSort, currentDir, onSort, children }) => {
  return (
    <button
      className={currentSort === field ? 'sort-active' : ''}
      onClick={() => onSort(field)}
    >
      {children}
      {currentSort === field ? (currentDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </button>
  );
};

// Returns the string value of a sortable field from a JobApplication
function getSortValue(app: JobApplication, field: SortableField): string {
  return app[field] || '';
}

const TableView: React.FC<TableViewProps> = ({ apps, onEdit, onDelete }) => {
  const [searchQ, setSearchQ] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [sortBy, setSortBy] = useState<SortableField>('dateApplied');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  // Toggles direction if clicking the same column, otherwise sets new column descending
  const handleSort = (field: SortableField) => {
    if (sortBy === field) {
      setSortDir((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortDir('desc');
    }
  };

  // Filters and sorts the apps array based on current state
  const displayed = useMemo(() => {
    let list = [...apps];

    // Filter by status pill
    if (filterStatus !== 'All') {
      list = list.filter((a) => a.status === filterStatus);
    }

    // Filter by search query (company or position)
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(
        (a) =>
          (a.company || '').toLowerCase().includes(q) ||
          (a.position || '').toLowerCase().includes(q)
      );
    }

    // Sort by selected column
    list.sort((a, b) => {
      const va = getSortValue(a, sortBy);
      const vb = getSortValue(b, sortBy);
      return sortDir === 'asc' ? (va > vb ? 1 : -1) : (va < vb ? 1 : -1);
    });

    return list;
  }, [apps, filterStatus, searchQ, sortBy, sortDir]);

  return (
    <div>
      {/* Search + status filter pills */}
      <div className="filters">
        <input
          type="text"
          value={searchQ}
          onChange={(e) => setSearchQ(e.target.value)}
          placeholder="Search company or position..."
        />
        <div className="pill-row">
          {['All', ...APP_STATUSES].map((s) => (
            <button
              key={s}
              className={`pill ${filterStatus === s ? 'active' : ''}`}
              onClick={() => setFilterStatus(s)}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrap">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th><SortBtn field="dateApplied" currentSort={sortBy} currentDir={sortDir} onSort={handleSort}>Date</SortBtn></th>
                <th><SortBtn field="company" currentSort={sortBy} currentDir={sortDir} onSort={handleSort}>Company</SortBtn></th>
                <th><SortBtn field="position" currentSort={sortBy} currentDir={sortDir} onSort={handleSort}>Position</SortBtn></th>
                <th>Location</th>
                <th><SortBtn field="status" currentSort={sortBy} currentDir={sortDir} onSort={handleSort}>Status</SortBtn></th>
                <th><SortBtn field="salary" currentSort={sortBy} currentDir={sortDir} onSort={handleSort}>Salary</SortBtn></th>
                <th>Interviews</th>
                <th style={{ width: 70 }}></th>
              </tr>
            </thead>
            <tbody>
              {displayed.map((app) => (
                <tr key={app.id}>
                  <td>{formatDate(app.dateApplied)}</td>
                  <td><span className="company">{app.company || '—'}</span></td>
                  <td>{app.position || '—'}</td>
                  <td>{app.location || '—'}</td>
                  <td><StatusBadge status={app.status} /></td>
                  <td>{app.salary ? `€${Number(app.salary).toLocaleString()}` : '—'}</td>
                  <td>
                    <InterviewPipeline
                      interviews={app.interviews}
                      // Clicking a pipeline stage from the table opens the full edit form
                      onStageClick={() => onEdit(app)}
                    />
                  </td>
                  <td>
                    <div className="actions">
                      <button className="act-btn" onClick={() => onEdit(app)} title="Edit">✏️</button>
                      <button className="act-btn" onClick={() => onDelete(app.id)} title="Delete">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}

              {/* Empty state */}
              {displayed.length === 0 && (
                <tr>
                  <td className="empty-row" colSpan={8}>
                    {searchQ || filterStatus !== 'All'
                      ? 'No applications match your filters'
                      : 'No applications yet. Add the first one!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default TableView;