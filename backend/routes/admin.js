import express from 'express';
import crypto from 'crypto';
import db from '../services/db.js';
import { authMiddleware, adminMiddleware } from '../middleware/auth.js';
import { generateStudySchedule } from '../services/scheduler.js';

const router = express.Router();

// -------------------- STUDENT MANAGEMENT --------------------

// Get list of all students and their stats (Admin only)
router.get('/students', authMiddleware, adminMiddleware, (req, res) => {
  const users = db.find('users', { role: 'student' });
  const allTasks = db.find('tasks');
  const allPomodoros = db.find('pomodoros');
  const allActivities = db.find('activities');

  const studentStats = users.map(student => {
    const studentTasks = allTasks.filter(t => t.userId === student._id);
    const completedTasksCount = studentTasks.filter(t => t.status === 'completed').length;
    const totalTasksCount = studentTasks.length;
    
    const completionRate = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;

    const studentPomodoros = allPomodoros.filter(p => p.userId === student._id);
    const totalMinutes = studentPomodoros.reduce((sum, p) => sum + (p.durationMinutes || 0), 0);
    const hoursStudied = Math.round((totalMinutes / 60) * 10) / 10;

    const loginCount = allActivities.filter(a => a.userId === student._id && a.type === 'login').length;

    return {
      _id: student._id,
      name: student.name,
      email: student.email,
      isActive: student.isActive !== false, // Default is true
      totalTasks: totalTasksCount,
      completedTasks: completedTasksCount,
      completionRate,
      hoursStudied,
      pomodorosCount: studentPomodoros.length,
      loginCount,
      createdAt: student.createdAt
    };
  });

  res.json(studentStats);
});

// Add a new student manually (Admin only)
router.post('/students', authMiddleware, adminMiddleware, (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const existingUser = db.findOne('users', { email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  const defaultAvailability = {
    Monday: { enabled: true, start: '18:00', end: '21:00' },
    Tuesday: { enabled: true, start: '18:00', end: '21:00' },
    Wednesday: { enabled: true, start: '18:00', end: '21:00' },
    Thursday: { enabled: true, start: '18:00', end: '21:00' },
    Friday: { enabled: true, start: '18:00', end: '21:00' },
    Saturday: { enabled: true, start: '10:00', end: '18:00' },
    Sunday: { enabled: true, start: '10:00', end: '18:00' }
  };

  const newUser = db.insert('users', {
    name,
    email,
    password: passwordHash,
    role: 'student',
    isActive: true,
    availability: defaultAvailability,
    weakSubjects: [],
    selfRatings: {}
  });

  const { password: _, ...userWithoutPassword } = newUser;
  res.status(201).json({ message: 'Student created successfully', user: userWithoutPassword });
});

// Edit student details / Toggle Activation (Admin only)
router.put('/students/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, email, isActive } = req.body;

  const student = db.findOne('users', { _id: id, role: 'student' });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (email) updateData.email = email;
  if (isActive !== undefined) updateData.isActive = isActive;

  db.update('users', { _id: id }, updateData);
  res.json({ message: 'Student profile updated successfully' });
});

// Delete student entirely (Admin only)
router.delete('/students/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;

  const student = db.findOne('users', { _id: id, role: 'student' });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  db.delete('users', { _id: id });
  
  // Clean up all data associated with this student
  db.delete('subjects', { userId: id });
  db.delete('tasks', { userId: id });
  db.delete('pomodoros', { userId: id });
  db.delete('activities', { userId: id });
  db.delete('notifications', { userId: id });

  res.json({ message: 'Student account and all associated data deleted successfully' });
});

// View a specific student's complete profile (Admin only)
router.get('/students/:id/profile', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;

  const student = db.findOne('users', { _id: id, role: 'student' });
  if (!student) {
    return res.status(404).json({ message: 'Student not found' });
  }

  const globalSubjects = db.find('subjects', { isGlobal: true });
  const customSubjects = db.find('subjects', { userId: id });
  const allSubjects = [...globalSubjects, ...customSubjects];

  const tasks = db.find('tasks', { userId: id });
  const activities = db.find('activities', { userId: id });
  const pomodoros = db.find('pomodoros', { userId: id });
  
  let schedule = [];
  try {
    schedule = generateStudySchedule(id);
  } catch (err) {
    console.error('Error generating schedule for student preview:', err);
  }

  const { password, ...studentProfile } = student;

  res.json({
    profile: studentProfile,
    subjects: allSubjects,
    tasks,
    activities,
    pomodoros,
    schedule
  });
});


// -------------------- GLOBAL WEBSITE SETTINGS --------------------

// Get website layout settings
router.get('/settings', (req, res) => {
  const settings = db.findOne('settings', {}) || {
    siteName: 'StudySpark',
    homepageText: 'Optimize study plans in IST.',
    heroTitle: 'Unlock Your Smartest Study Schedule.',
    heroSubtitle: 'Manage deadlines, revision and pomodoros.',
    siteBranding: 'Spark your plan. Light up your grades.',
    timeFormat: '12h',
    isLightModeDefault: true
  };
  res.json(settings);
});

// Update website settings (Admin only)
router.put('/settings', authMiddleware, adminMiddleware, (req, res) => {
  const { siteName, homepageText, heroTitle, heroSubtitle, siteBranding, timeFormat, isLightModeDefault } = req.body;
  
  const currentSettings = db.findOne('settings', {});
  const updateData = {
    siteName,
    homepageText,
    heroTitle,
    heroSubtitle,
    siteBranding,
    timeFormat,
    isLightModeDefault
  };

  if (currentSettings) {
    db.update('settings', { _id: currentSettings._id }, updateData);
  } else {
    db.insert('settings', updateData);
  }

  res.json({ message: 'System settings updated successfully', settings: updateData });
});


// -------------------- ANALYTICS & ADVANCED REPORTS --------------------

// Get advanced dashboard charts & metrics (Admin only)
router.get('/stats', authMiddleware, adminMiddleware, (req, res) => {
  const students = db.find('users', { role: 'student' });
  const tasks = db.find('tasks');
  const pomodoros = db.find('pomodoros');
  const activities = db.find('activities');

  const totalStudents = students.length;
  const activeStudents = students.filter(s => s.isActive !== false).length;
  
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const pendingTasks = totalTasks - completedTasks;
  const averageCompletionRate = totalStudents > 0 ? Math.round((completedTasks / (totalTasks || 1)) * 100) : 0;

  const totalFocusMinutes = pomodoros.reduce((sum, p) => sum + (p.durationMinutes || 0), 0);
  const totalFocusHours = Math.round((totalFocusMinutes / 60) * 10) / 10;

  // Recent activity logs (across all students)
  const recentLogs = [...activities];
  recentLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  const recentActivities = recentLogs.slice(0, 15).map(log => {
    const userObj = db.findOne('users', { _id: log.userId });
    return {
      ...log,
      studentName: userObj ? userObj.name : 'Unknown Student'
    };
  });

  // Calculate difficulty index for subjects (average of selfRatings)
  const allSubjects = db.find('subjects');
  const subjectDifficulties = allSubjects.map(sub => {
    let sum = 0;
    let count = 0;
    students.forEach(student => {
      const rating = student.selfRatings?.[sub._id];
      if (rating !== undefined) {
        sum += Number(rating);
        count++;
      }
    });
    const avgRating = count > 0 ? Math.round((sum / count) * 10) / 10 : 3;
    return {
      subjectName: sub.name,
      difficultyScore: avgRating,
      isGlobal: sub.isGlobal
    };
  });

  res.json({
    totalStudents,
    activeStudents,
    totalTasks,
    completedTasks,
    pendingTasks,
    totalFocusHours,
    averageCompletionRate,
    recentActivities,
    subjectDifficulties
  });
});


// -------------------- NOTIFICATIONS & ALERTS SYSTEM --------------------

// Admin broadcasts alerts / notifications to students
router.post('/notifications', authMiddleware, adminMiddleware, (req, res) => {
  const { title, message, studentId } = req.body;

  if (!title || !message) {
    return res.status(400).json({ message: 'Notification Title and message are required' });
  }

  const notification = db.insert('notifications', {
    title,
    message,
    studentId: studentId || 'all', // 'all' means broadcast to all, or target specific student id
    timestamp: new Date().toISOString(),
    isRead: false
  });

  res.status(201).json({ message: 'Notification created successfully', notification });
});

// View notification history list (Admin only)
router.get('/notifications', authMiddleware, adminMiddleware, (req, res) => {
  const notifications = db.find('notifications');
  notifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(notifications);
});

// Delete alert notification (Admin only)
router.delete('/notifications/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const deletedCount = db.delete('notifications', { _id: id });
  if (deletedCount > 0) {
    res.json({ message: 'Notification deleted successfully' });
  } else {
    res.status(404).json({ message: 'Notification not found' });
  }
});

// Student fetches their notifications
router.get('/notifications/student', authMiddleware, (req, res) => {
  const studentId = req.user.id;
  const allNotices = db.find('notifications');
  
  // Return notifications targeted to this student OR marked for 'all'
  const filtered = allNotices.filter(n => n.studentId === 'all' || n.studentId === studentId);
  filtered.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  res.json(filtered);
});


// -------------------- GLOBAL ANNOUNCEMENTS --------------------

// Create announcements (Admin only)
router.post('/announcements', authMiddleware, adminMiddleware, (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) {
    return res.status(400).json({ message: 'Title and content are required' });
  }

  const announcement = db.insert('announcements', {
    title,
    content,
    createdBy: req.user.name,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({ message: 'Announcement created successfully', announcement });
});

// Retrieve announcements (All authenticated users)
router.get('/announcements', authMiddleware, (req, res) => {
  const announcements = db.find('announcements');
  announcements.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  res.json(announcements);
});

// Delete announcement (Admin only)
router.delete('/announcements/:id', authMiddleware, adminMiddleware, (req, res) => {
  const { id } = req.params;
  const deletedCount = db.delete('announcements', { _id: id });
  if (deletedCount > 0) {
    res.json({ message: 'Announcement deleted successfully' });
  } else {
    res.status(404).json({ message: 'Announcement not found' });
  }
});

export default router;
