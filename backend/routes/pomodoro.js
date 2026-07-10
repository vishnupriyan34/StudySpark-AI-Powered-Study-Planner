import express from 'express';
import db from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { formatISODateOnly } from '../services/scheduler.js';

const router = express.Router();

// Log completed Pomodoro session
router.post('/log', authMiddleware, (req, res) => {
  const { taskId, subjectId, durationMinutes, startTime, endTime } = req.body;

  if (!durationMinutes || !startTime || !endTime) {
    return res.status(400).json({ message: 'Missing Pomodoro session details' });
  }

  let taskTitle = 'General Session';
  let subjectName = 'General';
  let finalSubjectId = subjectId || 'general';

  if (taskId) {
    const task = db.findOne('tasks', { _id: taskId });
    if (task) {
      taskTitle = task.title;
      finalSubjectId = task.subjectId;
    }
  }

  if (finalSubjectId && finalSubjectId !== 'general') {
    const subject = db.findOne('subjects', { _id: finalSubjectId });
    if (subject) {
      subjectName = subject.name;
    }
  }

  const logDate = formatISODateOnly(new Date(startTime));

  const newLog = db.insert('pomodoros', {
    userId: req.user.id,
    taskId: taskId || null,
    taskTitle,
    subjectId: finalSubjectId,
    subjectName,
    durationMinutes: parseFloat(durationMinutes),
    startTime, // ISO String
    endTime,   // ISO String
    date: logDate // YYYY-MM-DD in IST
  });

  // Also log to general activities collection
  db.insert('activities', {
    userId: req.user.id,
    type: 'pomodoro_session',
    description: `Completed focus session on: "${taskTitle}" (${durationMinutes} mins)`,
    subjectId: finalSubjectId,
    subjectName,
    durationHours: durationMinutes / 60,
    timestamp: new Date().toISOString()
  });

  res.status(201).json({ message: 'Focus session logged successfully', log: newLog });
});

// Get Pomodoro logs for current student
router.get('/', authMiddleware, (req, res) => {
  const logs = db.find('pomodoros', { userId: req.user.id });
  res.json(logs);
});

export default router;
