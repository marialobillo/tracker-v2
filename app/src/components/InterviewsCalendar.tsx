import React, { useState, useMemo } from 'react';
import type { JobApplication, Interviews } from '../types';
import { INTERVIEW_STAGES } from '../constants';

interface InterviewsCalendarProps {
  apps: JobApplication[];
  onEdit: (app: JobApplication) => void;
}

// Single interview event to display on the calendar
interface CalendarEvent {
  app: JobApplication;
  stageKey: keyof Interviews;
  stageName: string;
  date: string;
  color: string;
  status: string;
}

// Extracts all interviews that have a date set
function extractEvents(apps: JobApplication[]): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  apps.forEach((app) => {
    INTERVIEW_STAGES.forEach((stage) => {
      const interview = app.interviews[stage.key];
      if (interview && interview.date) {
        events.push({
          app,
          stageKey: stage.key,
          stageName: stage.label,
          date: interview.date,
          color: interview.color,
          status: interview.status,
        });
      }
    });
  });

  // Sort by date ascending
  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// Generates calendar grid for a given year/month
function buildCalendarGrid(year: number, month: number): Date[] {
  const firstDay = new Date(year, month, 1);
  // const lastDay = new Date(year, month + 1, 0);
  
  // Start from the previous month to fill the grid
  const startDay = new Date(firstDay);

  const dayOfWeek = firstDay.getDay();
  const daysToSubtract = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  startDay.setDate(startDay.getDate() - daysToSubtract);
  
  const grid: Date[] = [];
  const current = new Date(startDay);
  
  // 6 weeks = 42 days to cover all possible month layouts
  for (let i = 0; i < 42; i++) {
    grid.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  
  return grid;
}

// Formats date as YYYY-MM-DD for comparison with interview dates
function formatDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const InterviewsCalendar: React.FC<InterviewsCalendarProps> = ({ apps, onEdit }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth()); // 0-indexed

  const events = useMemo(() => extractEvents(apps), [apps]);
  
  // Group events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((event) => {
      const key = event.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(event);
    });
    return map;
  }, [events]);

  const calendarGrid = useMemo(
    () => buildCalendarGrid(currentYear, currentMonth),
    [currentYear, currentMonth]
  );

  const monthName = new Date(currentYear, currentMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const goToPrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const goToNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

  return (
    <div>
      {/* Calendar controls */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', margin: 0 }}>{monthName}</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn-cancel" style={{ padding: '6px 12px' }} onClick={goToPrevMonth}>← Prev</button>
          <button className="btn-cancel" style={{ padding: '6px 12px' }} onClick={goToToday}>Today</button>
          <button className="btn-cancel" style={{ padding: '6px 12px' }} onClick={goToNextMonth}>Next →</button>
        </div>
      </div>

      {/* Calendar grid */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(7, 1fr)', 
        gap: 8,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 16
      }}>
        {/* Day headers */}
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => (
          <div key={day} style={{ 
            padding: '8px 0', 
            textAlign: 'center', 
            fontSize: 11, 
            fontWeight: 700, 
            color: 'var(--text3)',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarGrid.map((date, idx) => {
          const dateKey = formatDateKey(date);
          const dayEvents = eventsByDate.get(dateKey) || [];
          const isToday = formatDateKey(today) === dateKey;
          const isCurrentMonth = date.getMonth() === currentMonth;

          return (
            <div
              key={idx}
              style={{
                minHeight: 100,
                padding: 8,
                background: isCurrentMonth ? 'var(--surface2)' : 'transparent',
                border: isToday ? '2px solid var(--blue)' : '1px solid var(--border)',
                borderRadius: 8,
                opacity: isCurrentMonth ? 1 : 0.4,
              }}
            >
              {/* Day number */}
              <div style={{ 
                fontSize: 12, 
                fontWeight: 600, 
                color: isToday ? 'var(--blue)' : 'var(--text)', 
                marginBottom: 6 
              }}>
                {date.getDate()}
              </div>

              {/* Events for this day */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {dayEvents.map((event, i) => (
                  <div
                    key={i}
                    onClick={() => onEdit(event.app)}
                    style={{
                      padding: '4px 6px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontWeight: 600,
                      cursor: 'pointer',
                      background: event.color + '20',
                      borderLeft: `3px solid ${event.color}`,
                      color: 'var(--text)',
                      transition: 'all 0.1s',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = event.color + '40';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = event.color + '20';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      {event.status === 'passed' && '✓'}
                      {event.status === 'failed' && '✗'}
                      {event.status === 'pending' && '⏳'}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {event.app.company}
                      </span>
                    </div>
                    <div style={{ fontSize: 9, color: 'var(--text3)', marginTop: 2 }}>
                      {event.stageName}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div style={{ 
        marginTop: 20, 
        padding: 16, 
        background: 'var(--surface)', 
        border: '1px solid var(--border)', 
        borderRadius: 12 
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Legend
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>⏳</span>
            <span style={{ color: 'var(--text2)' }}>Pending</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✓</span>
            <span style={{ color: 'var(--text2)' }}>Passed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span>✗</span>
            <span style={{ color: 'var(--text2)' }}>Failed</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div style={{ width: 16, height: 16, border: '2px solid var(--blue)', borderRadius: 4 }}></div>
            <span style={{ color: 'var(--text2)' }}>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewsCalendar;