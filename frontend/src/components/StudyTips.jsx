import React from 'react';

export default function StudyTips({ currentSession, weakSubjects, examNear }) {
  // Static collection of tips that are returned based on parameters
  const getPersonalizedTips = () => {
    const tipsList = [];

    // Check if studying a specific subject right now
    if (currentSession) {
      const isWeak = weakSubjects?.some(ws => ws.toLowerCase() === currentSession.subjectName.toLowerCase());
      
      if (isWeak) {
        tipsList.push({
          icon: '⚠️',
          title: `Focus Study on ${currentSession.subjectName}`,
          tip: 'Solve 3 small examples after learning the formulas or definitions.',
          why: 'Solving concrete problems right after theory seals the neural pathways and checks if you actually understood it.'
        });
        tipsList.push({
          icon: '🔄',
          title: 'Immediate Active Recall',
          tip: 'Close your book at the end of this session and write down 5 key concepts from memory.',
          why: 'Forcing your brain to recall information without prompt is the #1 way to prevent forgetting difficult subjects.'
        });
      } else {
        tipsList.push({
          icon: '💡',
          title: `Learning: ${currentSession.subjectName}`,
          tip: `Try to explain "${currentSession.topic}" in your own words, as if teaching a younger student.`,
          why: 'If you can explain a topic simply, it means you have fully understood the core concept without relying on jargon.'
        });
      }
    }

    // Check if any exam is near
    if (examNear) {
      tipsList.push({
        icon: '🎯',
        title: 'Exam Strategy Mode',
        tip: 'Prioritize mock test questions and solve past papers under timed conditions.',
        why: 'Familiarity with exam time limits and question layouts reduces anxiety and builds speed on the big day.'
      });
      tipsList.push({
        icon: '📝',
        title: 'Review Cheat-Sheets',
        tip: 'Review high-level summaries and formulas, do not read full text chapters now.',
        why: 'In the final days, consolidating what you already know is far more valuable than starting brand-new hard chapters.'
      });
    }

    // Add generic high-value tips if we need more
    if (tipsList.length < 3) {
      tipsList.push({
        icon: '⏱️',
        title: 'Spaced Repetition Tip',
        tip: 'Review this session\'s topic again in exactly 2 days, then 7 days.',
        why: 'Reviewing information at expanding time intervals pushes knowledge from short-term to permanent long-term memory.'
      });
      tipsList.push({
        icon: '🍅',
        title: 'Pomodoro Sprints',
        tip: 'Study in 25-minute focus blocks with 5-minute movement breaks.',
        why: 'Our brains maintain optimal focus for about 20-30 minutes. Regular short breaks reload your attention span.'
      });
    }

    return tipsList;
  };

  const tips = getPersonalizedTips();
  const bestTip = tips[0] || {
    icon: '🚀',
    title: 'Start Small',
    tip: 'Just open your study material and study for 5 minutes. Motivation follows action.',
    why: 'Starting is the hardest part. Once you take a tiny action, your brain gets momentum and wants to continue.'
  };

  return (
    <div className="study-tips-section" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Today's Best Study Tip Highlighted */}
      <div className="card best-tip-card" style={{ 
        background: 'linear-gradient(135deg, var(--primary-light) 0%, rgba(14, 165, 233, 0.08) 100%)',
        border: '1.5px dashed var(--primary)',
        position: 'relative'
      }}>
        <div style={{ position: 'absolute', top: '1rem', right: '1.5rem', fontSize: '1.5rem' }}>
          {bestTip.icon}
        </div>
        <span style={{ 
          fontSize: '0.75rem', 
          fontWeight: 800, 
          color: 'var(--primary)', 
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          🌟 Today's Best Study Tip
        </span>
        <h4 style={{ margin: '0.25rem 0 0.5rem 0', color: 'var(--primary)' }}>
          {bestTip.title}
        </h4>
        <p style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem' }}>
          {bestTip.tip}
        </p>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
          <strong>Why this helps:</strong> {bestTip.why}
        </div>
      </div>

      {/* Other Helpful Tips */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
        {tips.slice(1).map((item, index) => (
          <div className="card" key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', padding: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontSize: '1.25rem' }}>{item.icon}</span>
              <h5 style={{ color: 'var(--text-primary)' }}>{item.title}</h5>
            </div>
            <p style={{ fontSize: '0.85rem', fontWeight: 500, flexGrow: 1 }}>
              {item.tip}
            </p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
              <strong>Why:</strong> {item.why}
            </div>
          </div>
        ))}
      </div>
      
    </div>
  );
}
