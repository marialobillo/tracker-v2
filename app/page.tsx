"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from 'react';
import './src/styles.css';
import type { JobApplication } from './src/types';
import { fetchApplications, createApplication, updateApplication, deleteApplication } from './src/api';
import Topbar from './src/components/Topbar';
import TableView from './src/components/TableView';
import CompaniesView from './src/components/CompaniesView';
import StatsView from './src/components/StatsView';
import AppForm from './src/components/AppForm';
import InterviewsCalendar from './src/components/InterviewsCalendar';
import GoalsView from './src/components/GoalsView';
import PasteView from './src/components/PasteView'; // NUEVO
import { useRouter } from "next/navigation";
import { emptyApp } from "./src/utils";

// Available top-level views
type View = 'paste' | 'table' | 'interviews' | 'companies' | 'stats' | 'goals'; // NUEVO: 'paste'

const TABS: { key: View; label: string }[] = [
  { key: 'paste', label: '✨ Paste' }, // NUEVO
  { key: 'goals', label: '🎯 Goals' },
  { key: 'table', label: '📊 Applications' },
  { key: 'interviews', label: '📅 Interviews' },
  { key: 'companies', label: '🏢 Companies' },
  { key: 'stats', label: '📈 Statistics' },
];

export default function Home() {
  const { status } = useSession();
  const router = useRouter();
  const [apps, setApps] = useState<JobApplication[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [view, setView] = useState<View>('table');
  const [formOpen, setFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<JobApplication | null>(null);

  useEffect(() => {
    fetchApplications()
      .then((data) => { setApps(data); setLoaded(true); })
      .catch(() => { setError(true); setLoaded(true); });
  }, []);

  // Redirect to login if not authenticated
  if (status === "loading") {
    return (
      <div className="error-screen">
        <div className="icon">⏳</div>
        <div className="title">Loading...</div>
      </div>
    );
  }

  if (status === "unauthenticated") {
    router.push("/login");
    return null;
  }

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

  const handleNewApp = () => {
    setEditingApp(null);
    setFormOpen(true);
  };

    const handleApplyFromOffer = (p: {
    company: string; position: string; location: string;
    offerId: number; resumeId: number | null;
  }) => {
    setEditingApp({
      ...emptyApp(),
      id: Date.now(),
      dateApplied: new Date().toLocaleDateString('sv-SE'), // YYYY-MM-DD en tu hora local
      company: p.company,
      position: p.position,
      location: p.location,
      offerId: p.offerId,
      resumeId: p.resumeId,
    });
    setFormOpen(true);
  };

  const handleEdit = (app: JobApplication) => {
    setEditingApp(app);
    setFormOpen(true);
  };

  if (!loaded) {
    return (
      <div className="error-screen">
        <div className="icon">⏳</div>
        <div className="title">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-screen">
        <div className="icon">⚠️</div>
        <div className="title">Cannot connect to the server</div>
        <div className="desc">Check your database connection.</div>
      </div>
    );
  }

  return (
    <div>
      <Topbar totalApps={apps.length} onNewApp={handleNewApp} />

      <div className="main">
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

        {view === 'paste' && <PasteView onApply={handleApplyFromOffer} />}
        {view === 'table' && (
          <TableView apps={apps} onEdit={handleEdit} onDelete={handleDelete} />
        )}
        {view === 'goals' && <GoalsView />}
        {view === 'companies' && <CompaniesView apps={apps} />}
        {view === 'stats' && <StatsView apps={apps} />}
        {view === 'interviews' && (
          <InterviewsCalendar apps={apps} onEdit={handleEdit} />
        )}
      </div>

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