import React, { useState, useEffect } from 'react';
import Clock from '../components/Clock';

export default function ActivityReview({ token, apiBase }) {
  const [activities, setActivities] = useState([]);
  const [filter, setFilter] = useState('all'); // 'today', 'week', 'month', 'all'
  const [loading, setLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchActivities = async () => {
      setLoading(true);
      try {
        const response = await fetch(`${apiBase}/activities?filter=${filter}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setActivities(data);
        }
      } catch (err) {
        console.error('Failed to fetch activities:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchActivities();
  }, [token, filter, refreshKey]);

  const handleClearLogs = async () => {
    if (!confirm('Are you sure you want to permanently clear all your focus activity records?')) return;
    try {
      const response = await fetch(`${apiBase}/activities`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        setRefreshKey(prev => prev + 1);
        alert('Activity logs cleared successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Convert raw ISO timestamp to readable IST date & time string
  const formatToISTString = (isoTimestamp) => {
    const dateObj = new Date(isoTimestamp);
    
    const day = dateObj.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
    const date = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
    const time = dateObj.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

    return { day, date, time };
  };

  // Compute aggregated stats from filtered activities list
  const totalTasksCompleted = activities.filter(act => act.type === 'task_completion').length;
  const pomodoroSessions = activities.filter(act => act.type === 'pomodoro_session');
  // Total focus hours calculated purely from active Pomodoro sessions
  const totalFocusHours = pomodoroSessions.reduce((sum, act) => sum + (act.durationHours || 0), 0);

  // Time spent per subject in filtered lists (based on Pomodoro focus logs)
  const subjectBreakdown = {};
  pomodoroSessions.forEach(act => {
    const sName = act.subjectName || 'General';
    subjectBreakdown[sName] = (subjectBreakdown[sName] || 0) + (act.durationHours || 0.417);
  });

  return (
    <div className="main-container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Activity History Review</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Examine your complete study achievements, pomodoro logs, and subject efforts with real-time IST logs.</p>
        </div>
        <Clock />
      </div>

      {/* Filter Row */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', padding: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          {['all', 'today', 'week', 'month'].map(opt => (
            <button 
              key={opt}
              className={`btn ${filter === opt ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilter(opt)}
              style={{ textTransform: 'capitalize', padding: '0.5rem 1rem', fontSize: '0.85rem' }}
            >
              {opt === 'all' ? 'Show All Time' : opt === 'week' ? 'This Week' : opt === 'month' ? 'This Month' : 'Today'}
            </button>
          ))}
        </div>

        <button className="btn btn-danger" onClick={handleClearLogs} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
          ⚠️ Clear Logs
        </button>
      </div>

      {/* Filter Stats Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
        <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
          <h4 style={{ fontSize: '1.5rem', color: 'var(--primary)' }}>{totalFocusHours.toFixed(1)} hrs</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Time Focused</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--success)' }}>
          <h4 style={{ fontSize: '1.5rem', color: 'var(--success)' }}>{totalTasksCompleted}</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Completed Tasks</p>
        </div>
        <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
          <h4 style={{ fontSize: '1.5rem', color: 'var(--secondary)' }}>{pomodoroSessions.length}</h4>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Focus Sprints Completed</p>
        </div>
      </div>

      {/* Main Breakdown Section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.7fr', gap: '2rem', alignItems: 'flex-start' }}>
        
        {/* Logs Table */}
        <div className="card">
          <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>Focus Log details (IST Reference)</h3>
          
          {loading ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>Retrieving logs...</p>
          ) : activities.length === 0 ? (
            <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem 0' }}>No logged entries found matching filters.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activities.map((act) => {
                const { day, date, time } = formatToISTString(act.timestamp);
                const isPom = act.type === 'pomodoro_session';
                
                return (
                  <div key={act._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '1.1rem' }}>{isPom ? '🍅' : '✅'}</span>
                        <strong style={{ fontSize: '0.95rem' }}>{act.description}</strong>
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Subject: <strong>{act.subjectName}</strong>
                      </div>
                    </div>
                    
                    <div style={{ textAlignment: 'right', fontSize: '0.8rem' }}>
                      <div style={{ fontWeight: 600, color: 'var(--primary)' }}>{time}</div>
                      <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>{day}, {date}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Effort distribution by subject */}
        <div className="card">
          <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>Subject Effort Share</h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Approximate breakdown of hours logged in current filter window:</p>
          
          {Object.keys(subjectBreakdown).length === 0 ? (
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '1rem' }}>No subject data logged.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {Object.keys(subjectBreakdown).map(sub => {
                const hrs = subjectBreakdown[sub];
                return (
                  <div key={sub} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                      <span>{sub}</span>
                      <span style={{ color: 'var(--primary)' }}>{hrs.toFixed(1)} hrs</span>
                    </div>
                    <div style={{ width: '100%', height: '8px', background: 'var(--border-color)', borderRadius: '4px', overflow: 'hidden' }}>
                      <div 
                        style={{ 
                          width: `${Math.min((hrs / Math.max(...Object.values(subjectBreakdown))) * 100, 100)}%`, 
                          height: '100%', 
                          background: 'linear-gradient(90deg, var(--primary) 0%, var(--secondary) 100%)' 
                        }} 
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
