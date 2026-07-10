import React, { useState } from 'react';

export default function Landing({ onAuthSuccess, apiBase, settings }) {
  const [role, setRole] = useState('student'); // 'student' or 'admin'
  const [activeTab, setActiveTab] = useState('signin'); // 'signin' or 'signup'
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setErrorMsg('');
    setSuccessMsg('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setLoading(true);

    const endpoint = activeTab === 'signin' ? '/auth/login' : '/auth/signup';
    
    // Package payload, including role parameter for signup
    const payload = activeTab === 'signin'
      ? { email: formData.email, password: formData.password }
      : { name: formData.name, email: formData.email, password: formData.password, role };

    try {
      const response = await fetch(`${apiBase}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (response.ok) {
        if (activeTab === 'signup') {
          setSuccessMsg(`${role === 'admin' ? 'Admin' : 'Student'} registration successful! Logging you in...`);
          setTimeout(() => {
            onAuthSuccess(data.token, data.user);
          }, 1000);
        } else {
          onAuthSuccess(data.token, data.user);
        }
      } else {
        setErrorMsg(data.message || 'Authentication failed. Please verify credentials.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Server connection failure. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', minHeight: 'calc(100vh - 75px)', alignContent: 'start' }}>
      
      {/* Top Banner Header spanning across both columns */}
      <div style={{
        gridColumn: 'span 2',
        textAlign: 'center',
        padding: '2rem 1.5rem',
        background: 'var(--bg-card)',
        borderBottom: '1px solid var(--border-color)',
        boxShadow: '0 4px 20px rgba(79, 70, 229, 0.08)',
        backdropFilter: 'var(--glass-blur)',
        zIndex: 5
      }}>
        <h2 style={{
          fontSize: '2rem',
          fontWeight: '900',
          color: 'var(--primary)',
          textShadow: '0 0 10px rgba(79, 70, 229, 0.35), 0 0 25px rgba(14, 165, 233, 0.2)',
          letterSpacing: '-0.02em',
          margin: 0
        }}>
          🎯 {settings?.siteName || 'StudySpark'} — &ldquo;{settings?.siteBranding || 'Spark your plan. Light up your grades.🚀'}&rdquo;
        </h2>
      </div>

      {/* Hero Section */}
      <div className="auth-hero-section" style={{ padding: '3.5rem' }}>
        <h2 className="auth-hero-title" style={{ color: 'var(--primary)', fontSize: '2.8rem' }}>
          {settings?.heroTitle || 'Unlock Your Smartest Study Schedule.'}
        </h2>
        <p className="auth-hero-subtitle">
          {settings?.heroSubtitle || 'Optimize your daily study sessions in IST. Track priorities, schedule tasks around exams, study with Pomodoro sprints, and get real-time AI suggestions for weak subjects.'}
        </p>
        
        {/* Simple features visual list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 600 }}>
            <span style={{ fontSize: '1.25rem' }}>📅</span> Auto-generated daily plans matched to your exact available slots
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 600 }}>
            <span style={{ fontSize: '1.25rem' }}>⚡</span> Priority-based task list sorting
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 600 }}>
            <span style={{ fontSize: '1.25rem' }}>🤖</span> Personal tutor AI chatbot & smart performance tips
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', fontWeight: 600 }}>
            <span style={{ fontSize: '1.25rem' }}>🍅</span> Integrated task-linked Pomodoro timers
          </div>
        </div>
      </div>

      {/* Form Card */}
      <div className="auth-form-card" style={{ padding: '3.5rem' }}>
        <div style={{ maxWidth: '400px', width: '100%', margin: '0 auto' }}>
          
          {/* Segment Button for Portal Role Switch */}
          <div style={{ 
            display: 'flex', 
            background: 'var(--border-color)', 
            padding: '0.25rem', 
            borderRadius: '0.75rem', 
            marginBottom: '1.5rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <button 
              type="button"
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: role === 'student' ? 'var(--primary)' : 'transparent',
                color: role === 'student' ? 'white' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
              onClick={() => { setRole('student'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              👨‍🎓 Student Portal
            </button>
            <button 
              type="button"
              style={{
                flex: 1,
                padding: '0.65rem',
                borderRadius: '0.5rem',
                border: 'none',
                background: role === 'admin' ? 'var(--primary)' : 'transparent',
                color: role === 'admin' ? 'white' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.25rem'
              }}
              onClick={() => { setRole('admin'); setErrorMsg(''); setSuccessMsg(''); }}
            >
              🛡️ Admin Portal
            </button>
          </div>

          {/* Tab switches */}
          <div className="auth-tabs">
            <button 
              className={`auth-tab ${activeTab === 'signin' ? 'active' : ''}`}
              onClick={() => handleTabChange('signin')}
            >
              Sign In
            </button>
            <button 
              className={`auth-tab ${activeTab === 'signup' ? 'active' : ''}`}
              onClick={() => handleTabChange('signup')}
            >
              Sign Up ({role === 'admin' ? 'Admin' : 'Student'})
            </button>
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
            {activeTab === 'signin' 
              ? `Access the portal using your registered ${role} credentials.` 
              : `Create an ${role} profile to start using the system.`}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            {errorMsg && (
              <div className="alert-banner" style={{ background: 'var(--danger-light)', color: 'var(--danger)', border: '1px solid var(--danger)' }}>
                ⚠️ {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="alert-banner" style={{ background: 'var(--success-light)', color: 'var(--success)', border: '1px solid var(--success)' }}>
                ✅ {successMsg}
              </div>
            )}

            {activeTab === 'signup' && (
              <div className="form-group">
                <label htmlFor="name">Full Name</label>
                <input 
                  type="text" 
                  id="name" 
                  name="name" 
                  className="form-control"
                  placeholder="e.g. Rahul Sharma"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                className="form-control"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                className="form-control"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleInputChange}
                required
              />
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem', padding: '0.85rem' }}
              disabled={loading}
            >
              {loading ? 'Authenticating...' : activeTab === 'signin' ? 'Sign In' : `Register as ${role === 'admin' ? 'Admin' : 'Student'}`}
            </button>
          </form>

          {/* Demonstration Notice */}
          <div style={{ marginTop: '2.5rem', padding: '1rem', borderRadius: '0.5rem', background: 'var(--primary-light)', fontSize: '0.75rem' }}>
            <strong>💡 Demo Setup details:</strong>
            <ul style={{ paddingLeft: '1rem', marginTop: '0.25rem' }}>
              <li><strong>Pre-seeded Admin:</strong> admin@planner.com (Password: admin123)</li>
              <li><strong>Custom Accounts:</strong> Use the Portal toggles above to register new administrators or students instantly.</li>
            </ul>
          </div>

        </div>
      </div>

      {/* Footer Banner - Spans across both columns */}
      <div style={{
        gridColumn: 'span 2',
        textAlign: 'center',
        padding: '2.5rem 1rem 1.5rem 1rem',
        borderTop: '1px solid var(--border-color)',
        fontFamily: 'var(--font-heading)',
        fontSize: '1rem',
        fontWeight: '700',
        letterSpacing: '0.04em',
        color: 'var(--text-secondary)'
      }}>
        <div style={{ fontSize: '0.85rem', fontWeight: '500', color: 'var(--text-muted)', marginBottom: '0.5rem', fontStyle: 'italic' }}>
          Built for smarter student planning.
        </div>
        🚀Developed by <span style={{ 
          background: 'linear-gradient(135deg, var(--primary) 0%, var(--secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontWeight: '800'
        }}>Vishnu Priyan.S</span> 💻
      </div>

    </div>
  );
}
