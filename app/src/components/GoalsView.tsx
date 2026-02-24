import React, { useState, useEffect, useMemo } from 'react';
import { fetchGoals, updateGoals, fetchDailyProgress, fetchProgressStats } from '../api';
import type { Goals, DailyProgress, ProgressStats } from '../api';

const GoalsView: React.FC = () => {
  const [goals, setGoals] = useState<Goals>({ daily_goal: 5, weekly_goal: 25 });
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([]);
  const [stats, setStats] = useState<ProgressStats>({ daysMet: 0, totalDays: 0, currentStreak: 0, longestStreak: 0 });
  const [editing, setEditing] = useState(false);
  const [tempGoals, setTempGoals] = useState(goals);

  const loadData = async () => {
    try {
      const [goalsData, progressData, statsData] = await Promise.all([
        fetchGoals(),
        fetchDailyProgress(30),
        fetchProgressStats()
      ]);
      setGoals(goalsData);
      setTempGoals(goalsData);
      setDailyProgress(progressData);
      setStats(statsData);
    } catch (e) {
      console.error('Failed to load goals data:', e);
    }
  };

  // Load data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [goalsData, progressData, statsData] = await Promise.all([
          fetchGoals(),
          fetchDailyProgress(30),
          fetchProgressStats()
        ]);
        setGoals(goalsData);
        setTempGoals(goalsData);
        setDailyProgress(progressData);
        setStats(statsData);
      } catch (e) {
        console.error('Failed to load goals data:', e);
      }
    };
    
    load();
  }, []);

  

  const handleSaveGoals = async () => {
    try {
      await updateGoals(tempGoals);
      setGoals(tempGoals);
      setEditing(false);
      // Reload data to recalculate progress with new goals
      loadData();
    } catch (e) {
      console.error('Failed to save goals:', e);
    }
  };

  // Today's progress
  const today = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return dailyProgress.find((d) => d.date === todayStr) || { date: todayStr, count: 0, goalMet: false };
  }, [dailyProgress]);

  // This week's progress (last 7 days)
  const thisWeek = useMemo(() => {
    return dailyProgress.slice(-7);
  }, [dailyProgress]);

  const weekTotal = useMemo(() => {
    return thisWeek.reduce((sum, d) => sum + d.count, 0);
  }, [thisWeek]);

  // Progress percentage
  const dailyPercent = Math.min((today.count / goals.daily_goal) * 100, 100);
  const weeklyPercent = Math.min((weekTotal / goals.weekly_goal) * 100, 100);

  return (
    <div>
      {/* Goal Configuration */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', margin: 0 }}>⚙️ Goal Configuration</h3>
          {!editing ? (
            <button className="btn-cancel" style={{ padding: '6px 12px' }} onClick={() => setEditing(true)}>Edit</button>
          ) : (
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-save" style={{ padding: '6px 12px' }} onClick={handleSaveGoals}>Save</button>
              <button className="btn-cancel" style={{ padding: '6px 12px' }} onClick={() => { setTempGoals(goals); setEditing(false); }}>Cancel</button>
            </div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Daily Goal
            </label>
            {editing ? (
              <input
                type="number"
                value={tempGoals.daily_goal}
                onChange={(e) => setTempGoals({ ...tempGoals, daily_goal: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
              />
            ) : (
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--blue)' }}>{goals.daily_goal} apps/day</div>
            )}
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Weekly Goal
            </label>
            {editing ? (
              <input
                type="number"
                value={tempGoals.weekly_goal}
                onChange={(e) => setTempGoals({ ...tempGoals, weekly_goal: parseInt(e.target.value) || 0 })}
                style={{ width: '100%', padding: '8px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
              />
            ) : (
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)' }}>{goals.weekly_goal} apps/week</div>
            )}
          </div>
        </div>
      </div>

      {/* Today's Progress */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
          📅 Today's Progress {today.goalMet && '🎉'}
        </h3>
        <div style={{ fontSize: 32, fontWeight: 700, color: today.goalMet ? 'var(--green)' : 'var(--text)', marginBottom: 8 }}>
          {today.count} / {goals.daily_goal} applications
        </div>
        {/* Progress bar */}
        <div style={{ width: '100%', height: 12, background: 'var(--surface2)', borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
          <div style={{ 
            width: `${dailyPercent}%`, 
            height: '100%', 
            background: today.goalMet ? 'var(--green)' : 'var(--blue)',
            transition: 'width 0.3s ease'
          }} />
        </div>
        {!today.goalMet && (
          <div style={{ fontSize: 13, color: 'var(--text3)' }}>
            {goals.daily_goal - today.count} more to reach your goal today!
          </div>
        )}
        {today.goalMet && (
          <div style={{ fontSize: 13, color: 'var(--green)', fontWeight: 600 }}>
            ✓ Goal completed! Keep it up!
          </div>
        )}
      </div>

      {/* This Week */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20, marginBottom: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>📊 This Week</h3>
        <div style={{ fontSize: 32, fontWeight: 700, color: weekTotal >= goals.weekly_goal ? 'var(--green)' : 'var(--text)', marginBottom: 8 }}>
          {weekTotal} / {goals.weekly_goal} applications
        </div>
        {/* Progress bar */}
        <div style={{ width: '100%', height: 12, background: 'var(--surface2)', borderRadius: 6, overflow: 'hidden', marginBottom: 16 }}>
          <div style={{ 
            width: `${weeklyPercent}%`, 
            height: '100%', 
            background: weekTotal >= goals.weekly_goal ? 'var(--green)' : 'var(--orange)',
            transition: 'width 0.3s ease'
          }} />
        </div>

        {/* Weekly bar chart */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
          {thisWeek.map((day) => {
            const date = new Date(day.date + 'T00:00:00');
            const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
            const height = Math.max((day.count / goals.daily_goal) * 100, 10);
            return (
              <div key={day.date} style={{ textAlign: 'center' }}>
                <div style={{ 
                  height: 80, 
                  display: 'flex', 
                  alignItems: 'flex-end', 
                  justifyContent: 'center',
                  marginBottom: 8
                }}>
                  <div style={{ 
                    width: '100%', 
                    height: `${height}%`,
                    background: day.goalMet ? 'var(--green)' : day.count > 0 ? 'var(--blue)' : 'var(--surface2)',
                    borderRadius: '4px 4px 0 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    color: day.count > 0 ? '#fff' : 'var(--text3)'
                  }}>
                    {day.count}
                  </div>
                </div>
                <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 600 }}>{dayName}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Current Streak
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--orange)' }}>
            🔥 {stats.currentStreak}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            {stats.currentStreak === 1 ? 'day' : 'days'} in a row
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Longest Streak
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--purple)' }}>
            ⭐ {stats.longestStreak}
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            personal best
          </div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Success Rate (30d)
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, color: stats.totalDays > 0 && (stats.daysMet / stats.totalDays) > 0.7 ? 'var(--green)' : 'var(--text)' }}>
            {stats.totalDays > 0 ? Math.round((stats.daysMet / stats.totalDays) * 100) : 0}%
          </div>
          <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>
            {stats.daysMet} of {stats.totalDays} days
          </div>
        </div>
      </div>

      {/* 30-day Calendar Heatmap */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
        <h3 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>📆 Last 30 Days</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 6 }}>
          {dailyProgress.map((day) => {
            const date = new Date(day.date + 'T00:00:00');
            const dayNum = date.getDate();
            return (
              <div
                key={day.date}
                title={`${day.date}: ${day.count} apps ${day.goalMet ? '✓' : ''}`}
                style={{
                  aspectRatio: '1',
                  background: day.goalMet ? 'var(--green)' : day.count > 0 ? 'var(--blue)' : 'var(--surface2)',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  color: day.count > 0 ? '#fff' : 'var(--text3)',
                  cursor: 'default',
                  transition: 'transform 0.1s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'scale(1.1)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {dayNum}
              </div>
            );
          })}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, background: 'var(--green)', borderRadius: 4 }} />
            <span style={{ color: 'var(--text2)' }}>Goal met</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, background: 'var(--blue)', borderRadius: 4 }} />
            <span style={{ color: 'var(--text2)' }}>Some progress</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, background: 'var(--surface2)', borderRadius: 4 }} />
            <span style={{ color: 'var(--text2)' }}>No apps</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GoalsView;