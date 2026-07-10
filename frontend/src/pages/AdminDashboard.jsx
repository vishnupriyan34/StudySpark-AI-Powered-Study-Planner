import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut, Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Title, Tooltip, Legend);

export default function AdminDashboard({ token, user, apiBase }) {
  // Sidebar page states: 'dashboard', 'students', 'subjects', 'studyplans', 'activities', 'announcements', 'analytics', 'settings'
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Data states
  const [stats, setStats] = useState({});
  const [students, setStudents] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activitiesList, setActivitiesList] = useState([]);
  
  // Custom settings form
  const [settingsForm, setSettingsForm] = useState({
    siteName: '',
    homepageText: '',
    heroTitle: '',
    heroSubtitle: '',
    siteBranding: '',
    timeFormat: '12h',
    isLightModeDefault: true
  });

  // Modal control states
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [studentForm, setStudentForm] = useState({ name: '', email: '', password: '' });
  
  const [editStudentObj, setEditStudentObj] = useState(null);
  const [showEditStudent, setShowEditStudent] = useState(false);

  const [selectedStudentProfile, setSelectedStudentProfile] = useState(null);
  const [showStudentProfileModal, setShowStudentProfileModal] = useState(false);

  const [subjectForm, setSubjectForm] = useState({ name: '', description: '', difficulty: 'Medium', examDate: '', examTime: '' });
  const [editSubjectObj, setEditSubjectObj] = useState(null);
  const [showEditSubject, setShowEditSubject] = useState(false);

  const [announcementForm, setAnnouncementForm] = useState({ title: '', content: '' });
  const [notifyForm, setNotifyForm] = useState({ title: '', message: '', studentId: 'all' });

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'active', 'inactive'
  
  const [activityTypeFilter, setActivityTypeFilter] = useState('all'); // 'all', 'login', 'pomodoro_session', 'task_completion'

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch all admin data
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch aggregated stats
        const resStats = await fetch(`${apiBase}/admin/stats`, { headers });
        if (resStats.ok) {
          const statsData = await resStats.json();
          setStats(statsData);
          setActivitiesList(statsData.recentActivities || []);
        }

        // 2. Fetch all student user accounts
        const resStudents = await fetch(`${apiBase}/admin/students`, { headers });
        if (resStudents.ok) {
          const studentsData = await resStudents.json();
          setStudents(studentsData);
        }

        // 3. Fetch default global subjects
        const resSubs = await fetch(`${apiBase}/subjects`, { headers });
        if (resSubs.ok) {
          const subsData = await resSubs.json();
          setSubjects(subsData);
        }

        // 4. Fetch announcements
        const resAnn = await fetch(`${apiBase}/admin/announcements`, { headers });
        if (resAnn.ok) {
          const annData = await resAnn.json();
          setAnnouncements(annData);
        }

        // 5. Fetch notification alert logs
        const resNotify = await fetch(`${apiBase}/admin/notifications`, { headers });
        if (resNotify.ok) {
          const notifyData = await resNotify.json();
          setNotifications(notifyData);
        }

        // 6. Fetch settings
        const resSettings = await fetch(`${apiBase}/admin/settings`, { headers });
        if (resSettings.ok) {
          const settingsData = await resSettings.json();
          setSettingsForm(settingsData);
        }
      } catch (err) {
        console.error('Error fetching admin workspace data:', err);
      }
    };

    fetchAdminData();
  }, [token, refreshKey]);

  const triggerRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // -------------------- STUDENT MANAGEMENT LOGIC --------------------

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiBase}/admin/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(studentForm)
      });
      if (response.ok) {
        setStudentForm({ name: '', email: '', password: '' });
        setShowAddStudent(false);
        triggerRefresh();
        alert('Student registered successfully.');
      } else {
        const err = await response.json();
        alert(err.message || 'Failed to add student.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditStudent = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiBase}/admin/students/${editStudentObj._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: editStudentObj.name, email: editStudentObj.email })
      });
      if (response.ok) {
        setShowEditStudent(false);
        setEditStudentObj(null);
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleStudentStatus = async (student) => {
    try {
      const response = await fetch(`${apiBase}/admin/students/${student._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ isActive: !student.isActive })
      });
      if (response.ok) {
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm('Warning: This will permanently delete this student account and all of their focus study logs. Proceed?')) return;
    try {
      const response = await fetch(`${apiBase}/admin/students/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleOpenStudentProfile = async (id) => {
    try {
      const response = await fetch(`${apiBase}/admin/students/${id}/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedStudentProfile(data);
        setShowStudentProfileModal(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------- SUBJECT MANAGEMENT LOGIC --------------------

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiBase}/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ ...subjectForm, isGlobal: true }) // Set as global default subject
      });
      if (response.ok) {
        setSubjectForm({ name: '', description: '', difficulty: 'Medium', examDate: '', examTime: '' });
        triggerRefresh();
        alert('Global subject added successfully.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleEditSubject = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiBase}/subjects/${editSubjectObj._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editSubjectObj)
      });
      if (response.ok) {
        setShowEditSubject(false);
        setEditSubjectObj(null);
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------- ANNOUNCEMENT / NOTIFICATION LOGIC --------------------

  const handleCreateAnnouncement = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiBase}/admin/announcements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(announcementForm)
      });
      if (response.ok) {
        setAnnouncementForm({ title: '', content: '' });
        triggerRefresh();
        alert('Notice published.');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateNotification = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiBase}/admin/notifications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(notifyForm)
      });
      if (response.ok) {
        setNotifyForm({ title: '', message: '', studentId: 'all' });
        triggerRefresh();
        alert('Dashboard notification alert broadcasted successfully!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNotification = async (id) => {
    try {
      const response = await fetch(`${apiBase}/admin/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------- SETTINGS LOGIC --------------------

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`${apiBase}/admin/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settingsForm)
      });
      if (response.ok) {
        alert('Website customization and time formats saved successfully.');
        triggerRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // -------------------- SEARCH & FILTER METHODS --------------------

  const filteredStudents = students.filter(s => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.email.toLowerCase().includes(searchQuery.toLowerCase());
    
    if (statusFilter === 'active') return matchesSearch && s.isActive;
    if (statusFilter === 'inactive') return matchesSearch && !s.isActive;
    return matchesSearch;
  });

  // Convert raw ISO timestamp to readable IST date & time string
  const formatISTStr = (isoTimestamp) => {
    if (!isoTimestamp) return '';
    const dateObj = new Date(isoTimestamp);
    return dateObj.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true });
  };

  // Chart data computations
  const barChartData = {
    labels: students.slice(0, 8).map(s => s.name),
    datasets: [
      {
        label: 'Focus Study Hours',
        data: students.slice(0, 8).map(s => s.hoursStudied),
        backgroundColor: 'rgba(79, 70, 229, 0.75)',
        borderRadius: 4
      }
    ]
  };

  const doughnutChartData = {
    labels: ['Completed Tasks', 'Pending Tasks'],
    datasets: [
      {
        data: [stats.completedTasks || 0, stats.pendingTasks || 0],
        backgroundColor: ['#10b981', '#ef4444'],
        borderWidth: 1
      }
    ]
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', minHeight: 'calc(100vh - 75px)', background: 'var(--bg-app)' }}>
      
      {/* Sidebar Navigation */}
      <aside style={{
        background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-color)',
        padding: '1.5rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem'
      }}>
        <div style={{ padding: '0 0.5rem 1.5rem 0.5rem', borderBottom: '1px solid var(--border-color)', marginBottom: '1rem' }}>
          <h4 style={{ color: 'var(--text-primary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Navigation Console</h4>
        </div>

        {[
          { id: 'dashboard', label: '🏠 Dashboard Overview' },
          { id: 'students', label: '👨‍🎓 Student Management' },
          { id: 'subjects', label: '📚 Global Subjects' },
          { id: 'studyplans', label: '📅 Study Plan Monitor' },
          { id: 'activities', label: '📋 Cross-Student logs' },
          { id: 'announcements', label: '📢 Notice Broadcaster' },
          { id: 'analytics', label: '📈 Analytics & Charts' },
          { id: 'settings', label: '⚙️ Branding Settings' }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              width: '100%',
              textAlign: 'left',
              padding: '0.85rem 1rem',
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer',
              fontWeight: '700',
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9rem',
              background: activeTab === tab.id ? 'var(--primary)' : 'transparent',
              color: activeTab === tab.id ? 'white' : 'var(--text-secondary)',
              transition: 'all 0.2s',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            {tab.label}
          </button>
        ))}
      </aside>

      {/* Main Panel Content Area */}
      <main style={{ padding: '2rem', overflowY: 'auto' }}>

        {/* -------------------- SECTION 1: DASHBOARD OVERVIEW -------------------- */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ color: 'var(--primary)' }}>🏠 Dashboard Overview</h2>

            {/* Metric KPI cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1.5rem' }}>
              <div className="card">
                <h4>{stats.totalStudents || 0}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Students</p>
              </div>
              <div className="card">
                <h4>{stats.activeStudents || 0}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Active Students</p>
              </div>
              <div className="card">
                <h4>{stats.totalTasks || 0}</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Tasks</p>
              </div>
              <div className="card">
                <h4>{stats.totalFocusHours || 0} hrs</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Study Hours</p>
              </div>
              <div className="card">
                <h4>{stats.averageCompletionRate || 0}%</h4>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Average Completion Rate</p>
              </div>
            </div>

            {/* Split Dashboard Content */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
              {/* Activity Log */}
              <div className="card">
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📋 Recent Activity Timeline</h3>
                {activitiesList.length === 0 ? (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No student activity recorded yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', maxHeight: '400px', overflowY: 'auto' }}>
                    {activitiesList.map((log, index) => (
                      <div key={index} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                          <strong>{log.studentName}</strong>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{formatISTStr(log.timestamp)}</span>
                        </div>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.15rem' }}>{log.description}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Master upcoming exams deadlines */}
              <div className="card">
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📝 Master Exam Schedules</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {subjects.filter(s => s.examDate).map((sub, index) => (
                    <div key={index} style={{ borderLeft: '4px solid var(--danger)', paddingLeft: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.95rem' }}>{sub.name}</h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Date: {sub.examDate} at {sub.examTime || '10:00 AM'}</p>
                    </div>
                  ))}
                  {subjects.filter(s => s.examDate).length === 0 && (
                    <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center', padding: '1rem' }}>No exam dates scheduled in the system yet.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* -------------------- SECTION 2: STUDENT MANAGEMENT -------------------- */}
        {activeTab === 'students' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ color: 'var(--primary)' }}>👨‍🎓 Student Account Directory</h2>
              <button className="btn btn-primary" onClick={() => setShowAddStudent(true)}>➕ Add Student Account</button>
            </div>

            {/* Filter and search controllers */}
            <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
              <input 
                type="text" 
                className="form-control" 
                placeholder="Search name or email..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ flex: 1 }}
              />
              <select 
                className="form-control"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="all">All Accounts</option>
                <option value="active">Active Only</option>
                <option value="inactive">Deactivated Only</option>
              </select>
            </div>

            {/* Students Table */}
            <div className="card">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Status</th>
                    <th>Tasks</th>
                    <th>Completion %</th>
                    <th>Hours Studied</th>
                    <th>Logins</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map(student => (
                    <tr key={student._id}>
                      <td style={{ fontWeight: 600 }}>{student.name}</td>
                      <td>{student.email}</td>
                      <td>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700, 
                          color: student.isActive ? 'var(--success)' : 'var(--danger)',
                          background: student.isActive ? 'var(--success-light)' : 'var(--danger-light)',
                          padding: '0.2rem 0.5rem',
                          borderRadius: '0.25rem'
                        }}>
                          {student.isActive ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td>{student.totalTasks}</td>
                      <td>{student.completionRate}%</td>
                      <td>{student.hoursStudied} hrs</td>
                      <td>{student.loginCount}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.4rem' }}>
                          <button className="btn btn-secondary" onClick={() => handleOpenStudentProfile(student._id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} title="Preview student workspace">
                            👁️ View
                          </button>
                          <button className="btn btn-secondary" onClick={() => { setEditStudentObj(student); setShowEditStudent(true); }} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                            ✏️ Edit
                          </button>
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleToggleStudentStatus(student)} 
                            style={{ 
                              padding: '0.25rem 0.5rem', 
                              fontSize: '0.75rem',
                              color: student.isActive ? 'var(--danger)' : 'var(--success)'
                            }}
                          >
                            {student.isActive ? '🔒 Deactivate' : '🔓 Activate'}
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDeleteStudent(student._id)} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}>
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredStudents.length === 0 && (
                    <tr>
                      <td colSpan="8" style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem' }}>No student records found matching filters.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ADD STUDENT MODAL */}
            {showAddStudent && (
              <div className="card" style={{ position: 'fixed', top: '20%', left: '35%', width: '400px', zIndex: 100, boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)' }}>
                <h3 style={{ marginBottom: '1rem' }}>Register Student Account</h3>
                <form onSubmit={handleAddStudent}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={studentForm.name}
                      onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      className="form-control"
                      value={studentForm.email}
                      onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Password</label>
                    <input 
                      type="password" 
                      className="form-control"
                      value={studentForm.password}
                      onChange={(e) => setStudentForm({ ...studentForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowAddStudent(false)}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Create Account</button>
                  </div>
                </form>
              </div>
            )}

            {/* EDIT STUDENT MODAL */}
            {showEditStudent && editStudentObj && (
              <div className="card" style={{ position: 'fixed', top: '20%', left: '35%', width: '400px', zIndex: 100, boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)' }}>
                <h3 style={{ marginBottom: '1rem' }}>Modify Student Details</h3>
                <form onSubmit={handleEditStudent}>
                  <div className="form-group">
                    <label>Full Name</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editStudentObj.name}
                      onChange={(e) => setEditStudentObj({ ...editStudentObj, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email Address</label>
                    <input 
                      type="email" 
                      className="form-control"
                      value={editStudentObj.email}
                      onChange={(e) => setEditStudentObj({ ...editStudentObj, email: e.target.value })}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowEditStudent(false); setEditStudentObj(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Update Profile</button>
                  </div>
                </form>
              </div>
            )}

            {/* INDIVIDUAL STUDENT PROFILE PREVIEW MODAL */}
            {showStudentProfileModal && selectedStudentProfile && (
              <div className="card" style={{
                position: 'fixed',
                top: '5%',
                left: '10%',
                right: '10%',
                bottom: '5%',
                zIndex: 100,
                boxShadow: 'var(--shadow-lg)',
                background: 'var(--bg-app)',
                overflowY: 'auto',
                padding: '2.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
                  <div>
                    <h2>Student Profile: {selectedStudentProfile.profile.name}</h2>
                    <p style={{ color: 'var(--text-secondary)' }}>Email: {selectedStudentProfile.profile.email} | Registered: {formatISTStr(selectedStudentProfile.profile.createdAt)}</p>
                  </div>
                  <button className="btn btn-secondary" onClick={() => { setShowStudentProfileModal(false); setSelectedStudentProfile(null); }}>Close Profile Preview ❌</button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
                  {/* Left Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Subjects and self ratings */}
                    <div className="card">
                      <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>📚 Subjects & Ratings</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedStudentProfile.subjects.map(s => {
                          const rating = selectedStudentProfile.profile.selfRatings?.[s._id] || 'Not rated';
                          return (
                            <div key={s._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                              <span>{s.name} ({s.difficulty})</span>
                              <strong>★ {rating}/5</strong>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Tasks checklist */}
                    <div className="card">
                      <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>📋 Task Checklist Status</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                        {selectedStudentProfile.tasks.map(t => (
                          <div key={t._id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                            <span>{t.title}</span>
                            <span style={{ 
                              color: t.status === 'completed' ? 'var(--success)' : 'var(--accent)',
                              fontWeight: 700 
                            }}>
                              {t.status.toUpperCase()}
                            </span>
                          </div>
                        ))}
                        {selectedStudentProfile.tasks.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No tasks registered.</p>}
                      </div>
                    </div>

                  </div>

                  {/* Right Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    
                    {/* Active study schedule */}
                    <div className="card">
                      <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>📅 Active IST Study Schedule</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                        {selectedStudentProfile.schedule.map((slot, index) => (
                          <div key={index} style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                            <strong>{slot.day}, {slot.date}</strong> | {slot.startTime} - {slot.endTime}
                            <div>Subject: <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{slot.subjectName}</span> ({slot.topic})</div>
                          </div>
                        ))}
                        {selectedStudentProfile.schedule.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No active slots scheduled.</p>}
                      </div>
                    </div>

                    {/* Pomodoro Focus session log history */}
                    <div className="card">
                      <h4 style={{ color: 'var(--primary)', marginBottom: '0.75rem' }}>🍅 Pomodoro Sprint Logs</h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', maxHeight: '250px', overflowY: 'auto' }}>
                        {selectedStudentProfile.pomodoros.map(p => (
                          <div key={p._id} style={{ fontSize: '0.8rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.35rem' }}>
                            <strong>{p.taskTitle}</strong> ({p.durationMinutes} mins)
                            <div style={{ color: 'var(--text-secondary)', fontSize: '0.75rem' }}>Logged: {formatISTStr(p.startTime)}</div>
                          </div>
                        ))}
                        {selectedStudentProfile.pomodoros.length === 0 && <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>No Pomodoro sessions logged yet.</p>}
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            )}

          </div>
        )}

        {/* -------------------- SECTION 3: SUBJECTS & EXAMS -------------------- */}
        {activeTab === 'subjects' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
            
            {/* Global Subjects Listing */}
            <div className="card">
              <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📚 Master Global Subject Repository</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>These default subjects are instantly shared with all students upon account signup.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {subjects.map(sub => (
                  <div key={sub._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.05rem' }}>{sub.name}</h4>
                        <span style={{ 
                          fontSize: '0.65rem', 
                          background: sub.isGlobal ? 'var(--primary-light)' : 'var(--accent-light)', 
                          color: sub.isGlobal ? 'var(--primary)' : 'var(--accent)', 
                          padding: '0.1rem 0.4rem', 
                          borderRadius: '0.25rem',
                          fontWeight: 700
                        }}>
                          {sub.isGlobal ? 'Global default' : 'Student custom'}
                        </span>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.description}</p>
                      {sub.examDate && (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', fontWeight: 600 }}>
                          📝 Master Exam Date: {sub.examDate} at {sub.examTime || '10:00 AM'}
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <span style={{ 
                        fontSize: '0.75rem', 
                        background: sub.difficulty === 'Hard' ? 'var(--danger-light)' : sub.difficulty === 'Medium' ? 'var(--accent-light)' : 'var(--success-light)', 
                        color: sub.difficulty === 'Hard' ? 'var(--danger)' : sub.difficulty === 'Medium' ? 'var(--accent)' : 'var(--success)', 
                        padding: '0.15rem 0.5rem', 
                        borderRadius: '0.25rem', 
                        fontWeight: 800 
                      }}>
                        {sub.difficulty}
                      </span>
                      {sub.isGlobal && (
                        <button className="btn btn-secondary" onClick={() => { setEditSubjectObj(sub); setShowEditSubject(true); }} style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem' }}>
                          ✏️ Edit
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Create Default Subject Panel */}
            <div className="card">
              <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>➕ Add New Global Subject</h3>
              <form onSubmit={handleAddSubject}>
                <div className="form-group">
                  <label>Subject Name</label>
                  <input 
                    type="text" 
                    className="form-control"
                    placeholder="e.g. History, Biology..."
                    value={subjectForm.name}
                    onChange={(e) => setSubjectForm({ ...subjectForm, name: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Syllabus / Reference Description</label>
                  <textarea 
                    className="form-control"
                    rows="3"
                    placeholder="Provide curriculum links or short summary..."
                    value={subjectForm.description}
                    onChange={(e) => setSubjectForm({ ...subjectForm, description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Curriculum Difficulty Rating</label>
                  <select 
                    className="form-control"
                    value={subjectForm.difficulty}
                    onChange={(e) => setSubjectForm({ ...subjectForm, difficulty: e.target.value })}
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Exam Date (Optional)</label>
                  <input 
                    type="date" 
                    className="form-control"
                    value={subjectForm.examDate}
                    onChange={(e) => setSubjectForm({ ...subjectForm, examDate: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>Exam Start Time (Optional)</label>
                  <input 
                    type="time" 
                    className="form-control"
                    value={subjectForm.examTime}
                    onChange={(e) => setSubjectForm({ ...subjectForm, examTime: e.target.value })}
                  />
                </div>
                <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                  Create Global Subject
                </button>
              </form>
            </div>

            {/* EDIT SUBJECT MODAL */}
            {showEditSubject && editSubjectObj && (
              <div className="card" style={{ position: 'fixed', top: '15%', left: '35%', width: '420px', zIndex: 100, boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)' }}>
                <h3 style={{ marginBottom: '1.25rem' }}>Modify Subject details</h3>
                <form onSubmit={handleEditSubject}>
                  <div className="form-group">
                    <label>Subject Name</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={editSubjectObj.name}
                      onChange={(e) => setEditSubjectObj({ ...editSubjectObj, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Description</label>
                    <textarea 
                      className="form-control" 
                      rows="2"
                      value={editSubjectObj.description}
                      onChange={(e) => setEditSubjectObj({ ...editSubjectObj, description: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Difficulty</label>
                    <select 
                      className="form-control"
                      value={editSubjectObj.difficulty}
                      onChange={(e) => setEditSubjectObj({ ...editSubjectObj, difficulty: e.target.value })}
                    >
                      <option value="Easy">Easy</option>
                      <option value="Medium">Medium</option>
                      <option value="Hard">Hard</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Exam Date</label>
                    <input 
                      type="date" 
                      className="form-control"
                      value={editSubjectObj.examDate || ''}
                      onChange={(e) => setEditSubjectObj({ ...editSubjectObj, examDate: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Exam Time</label>
                    <input 
                      type="time" 
                      className="form-control"
                      value={editSubjectObj.examTime || ''}
                      onChange={(e) => setEditSubjectObj({ ...editSubjectObj, examTime: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowEditSubject(false); setEditSubjectObj(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Update Subject</button>
                  </div>
                </form>
              </div>
            )}

          </div>
        )}

        {/* -------------------- SECTION 4: STUDY PLANS MONITOR -------------------- */}
        {activeTab === 'studyplans' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ color: 'var(--primary)' }}>📅 Student Study Plan Monitor</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Review how students are tracking their tasks, following auto-generated timetables, and managing overdue goals.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {students.map(student => (
                <div key={student._id} className="card" style={{ display: 'grid', gridTemplateColumns: '250px 1fr', gap: '2rem', alignItems: 'center' }}>
                  
                  {/* Student Details Left */}
                  <div>
                    <h4 style={{ fontSize: '1.1rem' }}>{student.name}</h4>
                    <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>{student.email}</p>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem' }}>
                      <strong>Completion Rate:</strong>
                      <span style={{ color: 'var(--primary)', fontWeight: '800' }}>{student.completionRate}%</span>
                    </div>
                    <button 
                      className="btn btn-secondary" 
                      onClick={() => handleOpenStudentProfile(student._id)}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', marginTop: '0.75rem', width: '100%' }}
                    >
                      👁️ Inspect Study Plan
                    </button>
                  </div>

                  {/* Plan progress bars right */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.5rem' }}>
                    <div style={{ borderLeft: '3px solid var(--primary)', paddingLeft: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Plan Status</span>
                      <h4 style={{ fontSize: '1.25rem', marginTop: '0.15rem' }}>
                        {student.totalTasks === 0 ? 'Not Configured' : student.completionRate >= 80 ? '🚀 Excellent Pace' : student.completionRate >= 50 ? '📈 On Track' : '⚠️ Lagging'}
                      </h4>
                    </div>

                    <div style={{ borderLeft: '3px solid var(--accent)', paddingLeft: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Tasks (Complete / Total)</span>
                      <h4 style={{ fontSize: '1.25rem', marginTop: '0.15rem' }}>
                        {student.completedTasks} / {student.totalTasks}
                      </h4>
                    </div>

                    <div style={{ borderLeft: '3px solid var(--success)', paddingLeft: '0.75rem' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Study Hours Logged</span>
                      <h4 style={{ fontSize: '1.25rem', marginTop: '0.15rem' }}>
                        {student.hoursStudied} hrs
                      </h4>
                    </div>
                  </div>

                </div>
              ))}
            </div>
          </div>
        )}

        {/* -------------------- SECTION 5: CROSS-STUDENT LOGS -------------------- */}
        {activeTab === 'activities' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ color: 'var(--primary)' }}>📋 Cross-Student Audit Logs</h2>

            {/* Filter selectors */}
            <div className="card" style={{ display: 'flex', gap: '1rem', padding: '1rem' }}>
              <button className={`btn ${activityTypeFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActivityTypeFilter('all')}>Show All Log Types</button>
              <button className={`btn ${activityTypeFilter === 'login' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActivityTypeFilter('login')}>🔐 Logins Only</button>
              <button className={`btn ${activityTypeFilter === 'pomodoro_session' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActivityTypeFilter('pomodoro_session')}>🍅 Pomodoros Only</button>
              <button className={`btn ${activityTypeFilter === 'task_completion' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setActivityTypeFilter('task_completion')}>✅ Task Completions</button>
            </div>

            {/* Logs List */}
            <div className="card">
              <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>Audit Timeline</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {activitiesList
                  .filter(a => activityTypeFilter === 'all' || a.type === activityTypeFilter)
                  .map((log, index) => (
                    <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ fontSize: '1.15rem' }}>{log.type === 'login' ? '🔐' : log.type === 'pomodoro_session' ? '🍅' : '✅'}</span>
                          <strong style={{ fontSize: '0.95rem' }}>{log.studentName}</strong>
                          <span style={{ fontSize: '0.75rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.35rem', borderRadius: '0.2rem' }}>
                            {log.type.replace('_', ' ')}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>{log.description}</p>
                      </div>

                      <div style={{ textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        🕒 {formatISTStr(log.timestamp)}
                      </div>
                    </div>
                  ))}
                {activitiesList.filter(a => activityTypeFilter === 'all' || a.type === activityTypeFilter).length === 0 && (
                  <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '2rem' }}>No matching activity log entries recorded.</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* -------------------- SECTION 6: NOTICE BROADCASTER -------------------- */}
        {activeTab === 'announcements' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: '2rem' }}>
            
            {/* Left: Manage Broadcast Lists */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Global Announcements */}
              <div className="card">
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>📢 Global Announcement History</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {announcements.map(ann => (
                    <div key={ann._id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '0.95rem' }}>{ann.title}</h4>
                        <button className="btn btn-secondary" onClick={() => {
                          if (confirm('Delete announcement?')) {
                            fetch(`${apiBase}/admin/announcements/${ann._id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }).then(triggerRefresh);
                          }
                        }} style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem' }}>🗑️</button>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{ann.content}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Posted: {formatISTStr(ann.createdAt)}</span>
                    </div>
                  ))}
                  {announcements.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>No notices published.</p>}
                </div>
              </div>

              {/* Alert notifications list */}
              <div className="card">
                <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>🚨 Alert Notifications Broadcasts</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '350px', overflowY: 'auto' }}>
                  {notifications.map(notice => (
                    <div key={notice._id} style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <h4 style={{ fontSize: '0.95rem' }}>{notice.title} <span style={{ fontSize: '0.7rem', color: 'var(--primary)' }}>({notice.studentId === 'all' ? 'Broad' : 'Private'})</span></h4>
                        <button className="btn btn-secondary" onClick={() => handleDeleteNotification(notice._id)} style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem' }}>
                          🗑️
                        </button>
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>{notice.message}</p>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Sent: {formatISTStr(notice.timestamp)}</span>
                    </div>
                  ))}
                  {notifications.length === 0 && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textAlign: 'center' }}>No alert notifications broadcasted.</p>}
                </div>
              </div>

            </div>

            {/* Right: Broadcast forms */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
              
              {/* Broadcast announcement */}
              <div className="card">
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📢 Create Global Notice Board Post</h3>
                <form onSubmit={handleCreateAnnouncement}>
                  <div className="form-group">
                    <label>Notice Header</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={announcementForm.title}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Notice Content</label>
                    <textarea 
                      className="form-control"
                      rows="3"
                      value={announcementForm.content}
                      onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Broadcast Notice</button>
                </form>
              </div>

              {/* Broadcast Alert */}
              <div className="card">
                <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>🚨 Broadcast Dashboard Alert Message</h3>
                <form onSubmit={handleCreateNotification}>
                  <div className="form-group">
                    <label>Alert Target</label>
                    <select 
                      className="form-control"
                      value={notifyForm.studentId}
                      onChange={(e) => setNotifyForm({ ...notifyForm, studentId: e.target.value })}
                    >
                      <option value="all">Broadcast Alert to All Students</option>
                      {students.map(s => <option key={s._id} value={s._id}>{s.name} ({s.email})</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Alert Header</label>
                    <input 
                      type="text" 
                      className="form-control"
                      value={notifyForm.title}
                      onChange={(e) => setNotifyForm({ ...notifyForm, title: e.target.value })}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Alert Message</label>
                    <textarea 
                      className="form-control"
                      rows="2"
                      value={notifyForm.message}
                      onChange={(e) => setNotifyForm({ ...notifyForm, message: e.target.value })}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>Broadcast Alert</button>
                </form>
              </div>

            </div>

          </div>
        )}

        {/* -------------------- SECTION 7: ANALYTICS & REPORTS -------------------- */}
        {activeTab === 'analytics' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <h2 style={{ color: 'var(--primary)' }}>📈 Cohort Analytics & Reports</h2>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
              {/* Chart 1 */}
              <div className="card">
                <h4 style={{ textAlign: 'center', marginBottom: '1.25rem' }}>Average Task Completion Ratios</h4>
                <div style={{ width: '250px', margin: '0 auto' }}>
                  <Doughnut data={doughnutChartData} />
                </div>
              </div>

              {/* Chart 2 */}
              <div className="card">
                <h4 style={{ textAlign: 'center', marginBottom: '1.25rem' }}>Top Students Study Hours</h4>
                <Bar data={barChartData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
              </div>
            </div>

            {/* Difficult subjects stats */}
            <div className="card">
              <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>📚 Curriculum Difficulties Index</h3>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Average difficulty level rated by student profiles (lower rating represents higher difficulty!).</p>
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Subject Name</th>
                    <th>Average Rated Score</th>
                    <th>Curriculum Level status</th>
                  </tr>
                </thead>
                <tbody>
                  {(stats.subjectDifficulties || []).map((sub, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 600 }}>{sub.subjectName}</td>
                      <td style={{ fontWeight: 700, color: 'var(--accent)' }}>★ {sub.difficultyScore} / 5</td>
                      <td>
                        <span style={{ 
                          fontSize: '0.75rem', 
                          fontWeight: 700,
                          color: sub.difficultyScore <= 2.2 ? 'var(--danger)' : sub.difficultyScore <= 3.5 ? 'var(--accent)' : 'var(--success)'
                        }}>
                          {sub.difficultyScore <= 2.2 ? '⚠️ High Difficulty focus needed' : sub.difficultyScore <= 3.5 ? '⚡ Medium Difficulty' : '✅ Well understood'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* -------------------- SECTION 8: BRANDING SETTINGS -------------------- */}
        {activeTab === 'settings' && (
          <div className="card" style={{ maxWidth: '650px', margin: '0 auto' }}>
            <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>⚙️ Customize Website Branding & Settings</h3>
            
            <form onSubmit={handleSaveSettings}>
              <div className="form-group">
                <label>Website Name / Branding Header</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={settingsForm.siteName}
                  onChange={(e) => setSettingsForm({ ...settingsForm, siteName: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Login Top Brand Subtitle Tagline</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={settingsForm.siteBranding}
                  onChange={(e) => setSettingsForm({ ...settingsForm, siteBranding: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Login Hero Section Title</label>
                <input 
                  type="text" 
                  className="form-control"
                  value={settingsForm.heroTitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroTitle: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Login Hero Section Subtitle Text</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  value={settingsForm.heroSubtitle}
                  onChange={(e) => setSettingsForm({ ...settingsForm, heroSubtitle: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>SEO Meta / Homepage Text</label>
                <textarea 
                  className="form-control"
                  rows="3"
                  value={settingsForm.homepageText}
                  onChange={(e) => setSettingsForm({ ...settingsForm, homepageText: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>IST Dashboard Time Format Settings</label>
                <select 
                  className="form-control"
                  value={settingsForm.timeFormat}
                  onChange={(e) => setSettingsForm({ ...settingsForm, timeFormat: e.target.value })}
                >
                  <option value="12h">12 Hour clock (e.g., 6:30 PM)</option>
                  <option value="24h">24 Hour clock (e.g., 18:30)</option>
                </select>
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1.5rem', padding: '0.85rem' }}>
                Save Configurations & Update branding
              </button>
            </form>
          </div>
        )}

      </main>

    </div>
  );
}
