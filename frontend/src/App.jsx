import React, { useState, useEffect } from 'react';
import Landing from './pages/Landing';
import StudentDashboard from './pages/StudentDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ActivityReview from './pages/ActivityReview';
import Chatbot from './components/Chatbot';
import './App.css';

const API_BASE = window.location.port === '5173' ? 'http://localhost:5000/api' : '/api';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
  const [page, setPage] = useState('dashboard'); // 'dashboard', 'activities' for students
  const [loading, setLoading] = useState(!!token);

  const [settings, setSettings] = useState(null);

  // Fetch website custom settings
  useEffect(() => {
    fetch(`${API_BASE}/admin/settings`)
      .then(res => res.json())
      .then(data => {
        setSettings(data);
        if (data.isLightModeDefault !== undefined && !localStorage.getItem('theme')) {
          setTheme(data.isLightModeDefault ? 'light' : 'dark');
        }
      })
      .catch(err => console.error('Branding fetch error:', err));
  }, []);

  // Apply Theme on load / change
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  // Fetch current user details on load if token is stored
  useEffect(() => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    const fetchUser = async () => {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        } else {
          // Token expired or invalid, sign out
          handleSignOut();
        }
      } catch (err) {
        console.error('Failed to verify token:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [token]);

  const handleAuthSuccess = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    setPage('dashboard');
  };

  const handleSignOut = () => {
    localStorage.removeItem('token');
    setToken('');
    setUser(null);
    setPage('dashboard');
  };

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-app)', color: 'var(--text-primary)' }}>
        <h2>Loading Smart study space...</h2>
      </div>
    );
  }

  const isStudent = user && user.role === 'student';
  const isAdmin = user && user.role === 'admin';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Background radial shapes blur effect */}
      <div className="bg-decorations">
        <div className="decor-shape decor-shape-1" />
        <div className="decor-shape decor-shape-2" />
      </div>

      {/* Main Header navigation */}
      <header className="app-header">
        <div className="logo-container">
          <div className="logo-icon">🎓</div>
          <div>
            <h1 className="logo-text">{settings?.siteName || 'Smart Study Planner'}</h1>
            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>{settings?.siteBranding || 'AI-Powered'}</span>
          </div>
        </div>

        {/* Dynamic header options depending on Auth */}
        <div className="header-right">
          {user && (
            <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              {isStudent && (
                <>
                  <button 
                    className={`btn ${page === 'dashboard' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPage('dashboard')}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    🏠 Workspace
                  </button>
                  <button 
                    className={`btn ${page === 'activities' ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setPage('activities')}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}
                  >
                    📈 Activity History
                  </button>
                </>
              )}

              {isAdmin && (
                <span style={{ fontSize: '0.85rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.25rem 0.5rem', borderRadius: '0.25rem', fontWeight: 700 }}>
                  🛡️ Administrator
                </span>
              )}

              <div style={{ height: '24px', width: '1px', background: 'var(--border-color)' }} />
              
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', fontSize: '0.8rem' }}>
                <span style={{ fontWeight: 700 }}>{user.name}</span>
                <button 
                  onClick={handleSignOut} 
                  style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', padding: 0 }}
                >
                  Sign Out ↩
                </button>
              </div>
            </div>
          )}

          {/* Theme Switcher Toggle */}
          <button 
            className="theme-toggle-btn" 
            onClick={toggleTheme}
            aria-label="Toggle Light/Dark Theme"
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {!user ? (
          <Landing onAuthSuccess={handleAuthSuccess} apiBase={API_BASE} settings={settings} />
        ) : isAdmin ? (
          <AdminDashboard token={token} user={user} apiBase={API_BASE} />
        ) : isStudent ? (
          page === 'activities' ? (
            <ActivityReview token={token} apiBase={API_BASE} />
          ) : (
            <StudentDashboard 
              token={token} 
              user={user} 
              onUpdateUser={setUser} 
              apiBase={API_BASE} 
            />
          )
        ) : (
          <div style={{ textAlign: 'center', padding: '3rem' }}>Access Denied. Role mismatch.</div>
        )}
      </main>

      {/* AI Chatbot Floating Overlay (For students only) */}
      {isStudent && (
        <Chatbot token={token} apiBase={API_BASE} />
      )}
    </div>
  );
}
