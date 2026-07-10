import React, { useState } from 'react';

export default function ScheduleView({ schedule, onRefresh, token, apiBase }) {
  const [expandedSessions, setExpandedSessions] = useState({});

  // Group schedule items by Date (YYYY-MM-DD)
  const groupScheduleByDate = () => {
    const groups = {};
    schedule.forEach(item => {
      if (!groups[item.date]) {
        groups[item.date] = {
          day: item.day,
          sessions: []
        };
      }
      groups[item.date].sessions.push(item);
    });
    return groups;
  };

  const scheduleGroups = groupScheduleByDate();

  const toggleTips = (index) => {
    setExpandedSessions(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  const handleExportIcs = () => {
    // Download standard .ics file directly from backend endpoint
    fetch(`${apiBase}/schedule/export/ics`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to generate calendar');
        return res.blob();
      })
      .then(blob => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'study_schedule.ics';
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(err => {
        alert('Failed to export calendar. Ensure you have scheduled subjects/tasks first.');
        console.error(err);
      });
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="card" style={{ width: '100%' }}>
      <div className="timetable-header">
        <h3 style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          📅 Generated Study Plan (14-Day Outlook)
        </h3>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-secondary" onClick={onRefresh} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            🔄 Recalculate
          </button>
          <button className="btn btn-secondary" onClick={handlePrint} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            🖨️ Print
          </button>
          <button className="btn btn-primary" onClick={handleExportIcs} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
            📅 Export .ics
          </button>
        </div>
      </div>

      {schedule.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
          <span style={{ fontSize: '3rem' }}>📆</span>
          <p style={{ marginTop: '1rem', fontWeight: 600 }}>Your study schedule is empty.</p>
          <p style={{ fontSize: '0.85rem' }}>Add subjects, upcoming exam dates, tasks, and setup your available study hours under your Profile, then hit Recalculate!</p>
        </div>
      ) : (
        <div className="timetable-container">
          <div className="timetable-grid">
            {Object.keys(scheduleGroups).sort().map((dateStr) => {
              const group = scheduleGroups[dateStr];
              
              // Format date string to Indian standard readability
              const formattedDate = new Date(dateStr).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              });

              return (
                <div key={dateStr} className="timetable-day-section">
                  <h4 className="timetable-day-title">
                    📅 {group.day}, {formattedDate}
                  </h4>
                  <div className="timetable-sessions">
                    {group.sessions.map((session, sIdx) => {
                      const sessionKey = `${dateStr}-${sIdx}`;
                      const isExpanded = expandedSessions[sessionKey];
                      const isWeak = session.isWeak;
                      const isRevision = session.isRevision;

                      return (
                        <div 
                          key={sIdx} 
                          className={`session-card ${isWeak ? 'weak-subject' : ''} ${isRevision ? 'revision-session' : ''}`}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <div className="session-time">
                                🕒 {session.startTime} - {session.endTime} ({session.duration.toFixed(1)} hrs)
                              </div>
                              <div className="session-subject">
                                {session.subjectName}
                              </div>
                              <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                                📌 {session.topic}
                              </div>
                            </div>
                            
                            <button 
                              className="btn btn-secondary" 
                              onClick={() => toggleTips(sessionKey)}
                              style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', borderRadius: '0.25rem' }}
                            >
                              {isExpanded ? 'Hide Tips' : 'Tips 💡'}
                            </button>
                          </div>

                          {/* Collapsible Smart Tips Section */}
                          {isExpanded && (
                            <div className="session-tips-container">
                              <div className="session-tip-item">
                                <strong>💡 Study:</strong> {session.studyTip}
                              </div>
                              <div className="session-tip-item">
                                <strong>🔄 Revision:</strong> {session.revisionTip}
                              </div>
                              <div className="session-tip-item">
                                <strong>🧠 Understanding:</strong> {session.understandingTip}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
