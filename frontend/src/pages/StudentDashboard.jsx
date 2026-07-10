import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';
import Clock from '../components/Clock';
import Pomodoro from '../components/Pomodoro';
import ScheduleView from '../components/ScheduleView';
import StudyTips from '../components/StudyTips';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function StudentDashboard({ token, user, onUpdateUser, apiBase }) {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'subjects', 'schedule', 'profile'
  
  // Data states
  const [subjects, setSubjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [activities, setActivities] = useState([]);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [weakSubjectsList, setWeakSubjectsList] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [studentNotifications, setStudentNotifications] = useState([]);

  // Subject Form State
  const [subForm, setSubForm] = useState({ name: '', description: '', difficulty: 'Medium', examDate: '', examTime: '' });
  // Task Form State
  const [taskForm, setTaskForm] = useState({ title: '', subjectId: '', dueDate: '', duration: '1', priority: 'medium' });
  
  // Loading state
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch initial data
  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { 'Authorization': `Bearer ${token}` };

        // 1. Fetch Subjects
        const resSubs = await fetch(`${apiBase}/subjects`, { headers });
        if (resSubs.ok) {
          const subsData = await resSubs.json();
          setSubjects(subsData);
        }

        // 2. Fetch Tasks
        const resTasks = await fetch(`${apiBase}/tasks`, { headers });
        if (resTasks.ok) {
          const tasksData = await resTasks.json();
          setTasks(tasksData);
        }

        // 3. Fetch Schedule
        const resSched = await fetch(`${apiBase}/schedule`, { headers });
        if (resSched.ok) {
          const schedData = await resSched.json();
          setSchedule(schedData);
        }

        // 4. Fetch Activities
        const resActs = await fetch(`${apiBase}/activities?filter=all`, { headers });
        if (resActs.ok) {
          const actsData = await resActs.json();
          setActivities(actsData);
        }

        // 5. Fetch AI Suggestions
        const resAi = await fetch(`${apiBase}/ai/suggestions`, { headers });
        if (resAi.ok) {
          const aiData = await resAi.json();
          setAiSuggestions(aiData.suggestions || []);
          setWeakSubjectsList(aiData.weakSubjects || []);
        }

        // 6. Fetch Global Announcements
        const resAnnounce = await fetch(`${apiBase}/admin/announcements`, { headers });
        if (resAnnounce.ok) {
          const annData = await resAnnounce.json();
          setAnnouncements(annData);
        }

        // 7. Fetch Student Notifications/Alerts
        const resNotify = await fetch(`${apiBase}/admin/notifications/student`, { headers });
        if (resNotify.ok) {
          const notifyData = await resNotify.json();
          setStudentNotifications(notifyData);
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      }
    };

    fetchData();
  }, [token, refreshKey]);

  const triggerDataRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  // Recalculate schedule endpoint call
  const handleRecalculateSchedule = async () => {
    try {
      const response = await fetch(`${apiBase}/schedule`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSchedule(data);
        triggerDataRefresh();
        alert('Study Schedule successfully updated based on latest tasks, exams, and settings!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Subject CRUD Operations
  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (!subForm.name) return;

    try {
      const response = await fetch(`${apiBase}/subjects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(subForm)
      });

      if (response.ok) {
        setSubForm({ name: '', description: '', difficulty: 'Medium', examDate: '', examTime: '' });
        triggerDataRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!confirm('Deleting this subject will also delete all associated tasks. Proceed?')) return;
    try {
      const response = await fetch(`${apiBase}/subjects/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerDataRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Task CRUD Operations
  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.subjectId || !taskForm.dueDate) return;

    try {
      const response = await fetch(`${apiBase}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(taskForm)
      });

      if (response.ok) {
        setTaskForm({ title: '', subjectId: '', dueDate: '', duration: '1', priority: 'medium' });
        triggerDataRefresh();
        // Prompt recalculation
        handleRecalculateSchedule();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleTaskStatus = async (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    try {
      const response = await fetch(`${apiBase}/tasks/${task._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });
      if (response.ok) {
        triggerDataRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      const response = await fetch(`${apiBase}/tasks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        triggerDataRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Availability profile update
  const handleUpdateAvailability = async (day, field, value) => {
    const updatedAvailability = { ...user.availability };
    if (field === 'enabled') {
      updatedAvailability[day].enabled = value;
    } else {
      updatedAvailability[day][field] = value;
    }

    try {
      const response = await fetch(`${apiBase}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ availability: updatedAvailability })
      });

      if (response.ok) {
        const data = await response.json();
        onUpdateUser(data.user);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Self Ratings update
  const handleUpdateRating = async (subId, rating) => {
    const updatedRatings = { ...user.selfRatings, [subId]: rating };
    try {
      const response = await fetch(`${apiBase}/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ selfRatings: updatedRatings })
      });

      if (response.ok) {
        const data = await response.json();
        onUpdateUser(data.user);
        triggerDataRefresh();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Statistics Computations
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Study hours computation (from pomodoros in activities)
  const pomodoros = activities.filter(act => act.type === 'pomodoro_session');
  const totalFocusMins = pomodoros.length * 25; // standard duration mapping
  const totalFocusHours = Math.round((totalFocusMins / 60) * 10) / 10;

  // Chart 1: Time spent per subject
  const subjectTimeData = {};
  pomodoros.forEach(p => {
    const subName = p.subjectName || 'General';
    subjectTimeData[subName] = (subjectTimeData[subName] || 0) + 25;
  });

  const doughnutData = {
    labels: Object.keys(subjectTimeData),
    datasets: [{
      label: 'Focus Minutes',
      data: Object.values(subjectTimeData),
      backgroundColor: ['#4f46e5', '#0ea5e9', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6'],
      borderWidth: 1
    }]
  };

  // Chart 2: Weekly study trends
  // Map past 7 days focus activity
  const getWeeklyTrend = () => {
    const trend = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString('en-IN', { weekday: 'short' });
      trend[key] = 0;
    }

    pomodoros.forEach(p => {
      const pDate = new Date(p.timestamp);
      const key = pDate.toLocaleDateString('en-IN', { weekday: 'short' });
      if (trend[key] !== undefined) {
        trend[key] += 25; // Add minutes
      }
    });

    return trend;
  };

  const weeklyTrendData = getWeeklyTrend();

  const barData = {
    labels: Object.keys(weeklyTrendData),
    datasets: [{
      label: 'Study Minutes',
      data: Object.values(weeklyTrendData),
      backgroundColor: 'rgba(79, 70, 229, 0.75)',
      borderRadius: 4
    }]
  };

  // Check if exams are near (< 4 days)
  const isExamNear = schedule.some(item => item.daysToExam !== null && item.daysToExam <= 3);
  // Next active scheduled session
  const todayISTStr = new Date().toISOString().split('T')[0];
  const nextSession = schedule.find(item => item.date === todayISTStr && new Date(item.startRaw) > new Date());

  return (
    <div className="main-container">
      {/* Header bar items */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h2>Welcome back, {user.name}!</h2>
          <p style={{ color: 'var(--text-secondary)' }}>Track your tasks, prepare for exams, and follow your customized study schedule.</p>
        </div>
        <Clock />
      </div>

      {/* Alert Notifications */}
      {studentNotifications.map((note) => (
        <div key={note._id} className="alert-banner" style={{ background: 'var(--danger-light)', borderLeft: '5px solid var(--danger)', color: 'var(--text-primary)', marginBottom: '1rem' }}>
          <h4 style={{ color: 'var(--danger)' }}>🚨 Admin Alert: {note.title}</h4>
          <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{note.message}</p>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
            Received: {new Date(note.timestamp).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
          </span>
        </div>
      ))}

      {/* Announcements Board */}
      {announcements.length > 0 && (
        <div className="alert-banner" style={{ background: 'var(--accent-light)', borderLeft: '5px solid var(--accent)', color: 'var(--text-primary)' }}>
          <h4 style={{ color: 'var(--accent)' }}>📢 Global Announcement: {announcements[0].title}</h4>
          <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>{announcements[0].content}</p>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Posted by Admin</span>
        </div>
      )}

      {/* Tabs list */}
      <div className="tab-row">
        <button className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          Overview Dashboard
        </button>
        <button className={`tab-button ${activeTab === 'subjects' ? 'active' : ''}`} onClick={() => setActiveTab('subjects')}>
          Subjects & Exams
        </button>
        <button className={`tab-button ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
          My Timetable
        </button>
        <button className={`tab-button ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
          Availability & Goals
        </button>
      </div>

      {/* -------------------- TAB CONTENT: OVERVIEW -------------------- */}
      {activeTab === 'overview' && (
        <div className="dashboard-grid">
          {/* LEFT AREA */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* KPI Cards Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🎯</span>
                <div>
                  <h3 style={{ fontSize: '1.75rem' }}>{completionRate}%</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Task Completion</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>🕒</span>
                <div>
                  <h3 style={{ fontSize: '1.75rem' }}>{totalFocusHours}h</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Hours Focused</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>📋</span>
                <div>
                  <h3 style={{ fontSize: '1.75rem' }}>{pendingTasks}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Pending Tasks</p>
                </div>
              </div>
              <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <span style={{ fontSize: '2rem' }}>⚠️</span>
                <div>
                  <h3 style={{ fontSize: '1.75rem' }}>{weakSubjectsList.length}</h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Weak Subjects</p>
                </div>
              </div>
            </div>

            {/* Task Checklist Manager */}
            <div className="card">
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>📋 Task Checklist</h3>
              
              {/* Quick Add Task */}
              <form onSubmit={handleAddTask} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem', background: 'rgba(0,0,0,0.01)', padding: '1rem', borderRadius: '0.5rem' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Task Name"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm({...taskForm, title: e.target.value})}
                  style={{ flex: 2, minWidth: '150px' }}
                  required
                />
                
                <select 
                  className="form-control"
                  value={taskForm.subjectId}
                  onChange={(e) => setTaskForm({...taskForm, subjectId: e.target.value})}
                  style={{ flex: 1.2, minWidth: '120px' }}
                  required
                >
                  <option value="">-- Subject --</option>
                  {subjects.map(s => <option key={s._id} value={s._id}>{s.name}</option>)}
                </select>

                <input 
                  type="date" 
                  className="form-control"
                  value={taskForm.dueDate}
                  onChange={(e) => setTaskForm({...taskForm, dueDate: e.target.value})}
                  style={{ flex: 1, minWidth: '110px' }}
                  required
                />

                <input 
                  type="number" 
                  className="form-control"
                  step="0.5"
                  min="0.5"
                  placeholder="Hrs"
                  value={taskForm.duration}
                  onChange={(e) => setTaskForm({...taskForm, duration: e.target.value})}
                  style={{ width: '70px' }}
                  required
                />

                <select 
                  className="form-control"
                  value={taskForm.priority}
                  onChange={(e) => setTaskForm({...taskForm, priority: e.target.value})}
                  style={{ width: '100px' }}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>

                <button type="submit" className="btn btn-primary">Add Task</button>
              </form>

              {/* Tasks List */}
              {tasks.length === 0 ? (
                <p style={{ textAlign: 'center', color: 'var(--text-secondary)', padding: '1rem 0' }}>No tasks found. Create one above to feed the auto-scheduler.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {tasks.map(task => (
                    <div key={task._id} className="task-item">
                      <div className="task-item-left">
                        <input 
                          type="checkbox" 
                          checked={task.status === 'completed'}
                          onChange={() => handleToggleTaskStatus(task)}
                          style={{ width: '1.2rem', height: '1.2rem', cursor: 'pointer' }}
                        />
                        <span style={{ textDecoration: task.status === 'completed' ? 'line-through' : 'none', fontWeight: 600 }}>
                          {task.title} <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>({task.subjectName})</span>
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📅 Due: {task.dueDate}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>🕒 {task.duration}h</span>
                        <span className={`task-priority-badge ${task.priority}`}>{task.priority}</span>
                        <button 
                          className="btn btn-secondary" 
                          onClick={() => handleDeleteTask(task._id)}
                          style={{ padding: '0.2rem 0.4rem', fontSize: '0.75rem' }}
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Smart Study Tips display */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', color: 'var(--primary)' }}>💡 Smart Study Tips For You</h3>
              <StudyTips currentSession={nextSession} weakSubjects={weakSubjectsList} examNear={isExamNear} />
            </div>

            {/* Performance Analytics & Charts */}
            <div className="card">
              <h3 style={{ marginBottom: '1.25rem', color: 'var(--primary)' }}>📊 Performance Analytics</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem' }}>Focus Share by Subject (mins)</h4>
                  {Object.keys(subjectTimeData).length === 0 ? (
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', paddingTop: '2rem' }}>No session logs yet. Complete a Pomodoro session to see distributions.</p>
                  ) : (
                    <div style={{ width: '220px', margin: '0 auto' }}>
                      <Doughnut data={doughnutData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                    </div>
                  )}
                </div>

                <div>
                  <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1rem' }}>Weekly Study Trend (mins)</h4>
                  <Bar data={barData} options={{ responsive: true, plugins: { legend: { display: false } } }} />
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT AREA (Sidebar) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Pomodoro widget */}
            <Pomodoro 
              tasks={tasks}
              token={token}
              apiBase={apiBase}
              onSessionLogged={triggerDataRefresh}
            />

            {/* AI Suggestion Box */}
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <h3 style={{ color: 'var(--primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🤖 AI Coach Advice
              </h3>
              
              {aiSuggestions.length === 0 ? (
                <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Loading intelligent study tips...</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {aiSuggestions.map((item, sIdx) => (
                    <div key={sIdx} style={{ borderBottom: sIdx === aiSuggestions.length - 1 ? 'none' : '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                      <h4 style={{ fontSize: '0.9rem', color: 'var(--text-primary)', marginBottom: '0.25rem' }}>
                        {item.title}
                      </h4>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                        {item.suggestion}
                      </p>
                      <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                        <strong>Why:</strong> {item.why}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* -------------------- TAB CONTENT: SUBJECTS -------------------- */}
      {activeTab === 'subjects' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '2rem' }}>
          
          {/* Subjects List */}
          <div className="card">
            <h3 style={{ color: 'var(--primary)', marginBottom: '1.5rem' }}>📚 Active Subjects & Exams</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>Rate your difficulty on subjects. The scheduler prioritizes weaker subjects (rated 1 or 2 stars) automatically by creating more slots.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {subjects.map(sub => {
                const isGlobal = sub.isGlobal;
                const rating = user.selfRatings?.[sub._id] || 3;

                return (
                  <div key={sub._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <h4 style={{ fontSize: '1.1rem' }}>{sub.name}</h4>
                        {isGlobal && <span style={{ fontSize: '0.65rem', background: 'var(--primary-light)', color: 'var(--primary)', padding: '0.1rem 0.4rem', borderRadius: '0.25rem', fontWeight: 700 }}>Global</span>}
                      </div>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{sub.description}</p>
                      
                      {/* Exam notice if active */}
                      {sub.examDate ? (
                        <div style={{ fontSize: '0.75rem', color: 'var(--danger)', marginTop: '0.25rem', fontWeight: 600 }}>
                          📝 Exam Scheduled: {sub.examDate} at {sub.examTime || '10:00 AM'}
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No exam date set</span>
                      )}
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      
                      {/* Self Rating Star Stars Selector */}
                      <div style={{ display: 'flex', gap: '0.15rem' }}>
                        {[1, 2, 3, 4, 5].map(star => (
                          <span 
                            key={star} 
                            onClick={() => handleUpdateRating(sub._id, star)}
                            style={{ 
                              cursor: 'pointer', 
                              fontSize: '1.1rem', 
                              color: star <= rating ? 'var(--accent)' : 'var(--text-muted)' 
                            }}
                            title={`Rate ${star}/5`}
                          >
                            ★
                          </span>
                        ))}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.75rem', background: sub.difficulty === 'Hard' ? 'var(--danger-light)' : sub.difficulty === 'Medium' ? 'var(--accent-light)' : 'var(--success-light)', color: sub.difficulty === 'Hard' ? 'var(--danger)' : sub.difficulty === 'Medium' ? 'var(--accent)' : 'var(--success)', padding: '0.15rem 0.5rem', borderRadius: '0.25rem', fontWeight: 800 }}>
                          {sub.difficulty}
                        </span>

                        {!isGlobal && (
                          <button 
                            className="btn btn-secondary" 
                            onClick={() => handleDeleteSubject(sub._id)}
                            style={{ padding: '0.15rem 0.35rem', fontSize: '0.75rem' }}
                          >
                            🗑️
                          </button>
                        )}
                      </div>

                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Add Subject Card */}
          <div className="card">
            <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>➕ Add New Subject & Exam</h3>
            
            <form onSubmit={handleAddSubject}>
              <div className="form-group">
                <label>Subject Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="e.g. Physics, Chemistry..."
                  value={subForm.name}
                  onChange={(e) => setSubForm({...subForm, name: e.target.value})}
                  required
                />
              </div>

              <div className="form-group">
                <label>Description</label>
                <textarea 
                  className="form-control" 
                  rows="2"
                  placeholder="Brief syllabus description..."
                  value={subForm.description}
                  onChange={(e) => setSubForm({...subForm, description: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Difficulty Level</label>
                <select 
                  className="form-control"
                  value={subForm.difficulty}
                  onChange={(e) => setSubForm({...subForm, difficulty: e.target.value})}
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
                  value={subForm.examDate}
                  onChange={(e) => setSubForm({...subForm, examDate: e.target.value})}
                />
              </div>

              <div className="form-group">
                <label>Exam Time (Optional)</label>
                <input 
                  type="time" 
                  className="form-control"
                  value={subForm.examTime}
                  onChange={(e) => setSubForm({...subForm, examTime: e.target.value})}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }}>
                Save Subject
              </button>
            </form>
          </div>

        </div>
      )}

      {/* -------------------- TAB CONTENT: SCHEDULE -------------------- */}
      {activeTab === 'schedule' && (
        <ScheduleView 
          schedule={schedule}
          onRefresh={handleRecalculateSchedule}
          token={token}
          apiBase={apiBase}
        />
      )}

      {/* -------------------- TAB CONTENT: PROFILE -------------------- */}
      {activeTab === 'profile' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
          
          {/* Time availability settings */}
          <div className="card">
            <h3 style={{ color: 'var(--primary)', marginBottom: '1.25rem' }}>🕒 Available Study Window (IST)</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>Define what hours you can allocate to study on each day of the week. The scheduler plans sessions only during these blocks.</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {Object.keys(user.availability || {}).map(day => {
                const config = user.availability[day];
                return (
                  <div key={day} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input 
                        type="checkbox" 
                        checked={config.enabled}
                        onChange={(e) => handleUpdateAvailability(day, 'enabled', e.target.checked)}
                        style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                      />
                      <strong style={{ width: '90px' }}>{day}</strong>
                    </div>

                    {config.enabled ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input 
                          type="time" 
                          className="form-control"
                          value={config.start}
                          onChange={(e) => handleUpdateAvailability(day, 'start', e.target.value)}
                          style={{ padding: '0.25rem 0.5rem' }}
                        />
                        <span>to</span>
                        <input 
                          type="time" 
                          className="form-control"
                          value={config.end}
                          onChange={(e) => handleUpdateAvailability(day, 'end', e.target.value)}
                          style={{ padding: '0.25rem 0.5rem' }}
                        />
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Unavailable / Day off</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick info/help section */}
          <div className="card">
            <h3 style={{ color: 'var(--primary)', marginBottom: '1rem' }}>💡 How the Smart Scheduler Works</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.9rem', lineHeight: '1.5' }}>
              <p>1. <strong>Core Priority Sorting</strong>: Tasks are weighted based on their priority level (High &gt; Medium &gt; Low) and proximity to due dates.</p>
              <p>2. <strong>Weak Subject Allocation</strong>: The scheduler checks your ratings. If you rated a subject ≤ 2 stars, it is treated as "Weak" and allocated <strong>1.5x more session blocks</strong>.</p>
              <p>3. <strong>Exam Preparation Mode</strong>: If a subject has an upcoming exam (within 10 days), the scheduler automatically creates "Critical Revision" tasks even if you haven't entered any manually.</p>
              <p>4. <strong>Auto-Recalculation</strong>: Updating study hours, tasks, ratings, or adding exams triggers an automatic re-evaluation to keep your study calendar fresh and aligned with real IST timelines.</p>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
