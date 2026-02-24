import { useState, useEffect } from 'react';
import './styles.css';
import type { JobApplication } from './types';
import { fetchApplications, createApplication, updateApplication, deleteApplication } from './api';
import Topbar from './components/Topbar';
import TableView from './components/TableView';
import CompaniesView from './components/CompaniesView';
import StatsView from './components/StatsView';
import AppForm from './components/AppForm';
import InterviewsCalendar from './components/InterviewsCalendar';
import GoalsView from './components/GoalsView';
// import Login from './components/Login';

// Available top-level views
type View = 'table' | 'interviews' | 'companies' | 'stats' | 'goals';

const TABS: { key: View; label: string }[] = [
  { key: 'goals', label: '🎯 Goals' },
  { key: 'table', label: '📊 Applications' },
  { key: 'interviews', label: '📅 Interviews' },
  { key: 'companies', label: '🏢 Companies' },
  { key: 'stats', label: '📈 Statistics' },

];

function App() {
  // ─── STATE ───────────────────────────────────────────────────────────────
  // const [authed, setAuthed] = useState(isAuthenticated());
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [view, setView] = useState<View>('table');

  // Form modal: null = closed, null app = new, populated app = editing
  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);

  // ─── LOAD DATA ON MOUNT ──────────────────────────────────────────────────
  useEffect(() => {
    // if (!authed) return;
    fetchApplications()
      .then((data) => { setApps(data); setLoaded(true); })
      .catch(() => { setError(true); setLoaded(true); });
  }, []);

  // ─── CRUD HANDLERS ───────────────────────────────────────────────────────

  const handleSave = async (app: JobApplication) => {
    const isNew = !apps.find((a) => a.id === app.id);
    try {
      const saved = isNew
        ? await createApplication(app)
        : await updateApplication(app);

      setApps((prev) =>
        isNew ? [...prev, saved] : prev.map((a) => (a.id === saved.id ? saved : a))
      );
    } catch (e) {
      console.error('Failed to save application:', e);
    }
    setFormOpen(false);
    setEditingApp(null);
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this application?')) return;
    try {
      await deleteApplication(id);
      setApps((prev) => prev.filter((a) => a.id !== id));
    } catch (e) {
      console.error('Failed to delete application:', e);
    }
  };

  // Opens the form for a new application
  const handleNewApp = () => {
    setEditingApp(null);
    setFormOpen(true);
  };

  // Opens the form to edit an existing application
  const handleEdit = (app: JobApplication) => {
    setEditingApp(app);
    setFormOpen(true);
  };

  // ─── LOGIN CHECK ─────────────────────────────────────────────────────────
  // if (!authed) {
  //   return <Login onLogin={() => setAuthed(true)} />;
  // }

  // ─── LOADING STATE ───────────────────────────────────────────────────────
  if (!loaded) {
    return (
      <div className="error-screen">
        <div className="icon">⏳</div>
        <div className="title">Loading...</div>
      </div>
    );
  }

  // ─── ERROR STATE (backend not running) ───────────────────────────────────
  if (error) {
    return (
      <div className="error-screen">
        <div className="icon">⚠️</div>
        <div className="title">Cannot connect to the server</div>
        <div className="desc">The backend is not running. You need to start it first.</div>
        <div className="hint">In another terminal: python start_backend.py</div>
      </div>
    );
  }

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <div>
      {/* Top navigation bar */}
      {/* <Topbar totalApps={apps.length} onNewApp={handleNewApp} onLogout={() => { logout(); setAuthed(false); }} /> */}
        <Topbar totalApps={apps.length} onNewApp={handleNewApp} />

      <div className="main">
        {/* View tabs */}
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              className={`tab ${view === tab.key ? 'active' : ''}`}
              onClick={() => setView(tab.key)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Active view */}
        {view === 'table' && (
          <TableView apps={apps} onEdit={handleEdit} onDelete={handleDelete} />
        )}
        {view === 'goals' && (
          <GoalsView />
        )}
        {view === 'companies' && (
          <CompaniesView apps={apps} />
        )}
        {view === 'stats' && (
          <StatsView apps={apps} />
        )}
        {view === 'interviews' && (
          <InterviewsCalendar apps={apps} onEdit={handleEdit} />
        )}
      </div>

      {/* Application form modal */}
      {formOpen && (
        <AppForm
          app={editingApp}
          apps={apps}
          onSave={handleSave}
          onClose={() => { setFormOpen(false); setEditingApp(null); }}
        />
      )}
    </div>
  );
}

export default App;