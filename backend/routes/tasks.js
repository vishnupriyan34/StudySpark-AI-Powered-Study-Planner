import express from 'express';
import db from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get tasks with priority sorting, due date sorting, and filtering
router.get('/', authMiddleware, (req, res) => {
  const { subjectId, status, priority } = req.query;
  
  const query = { userId: req.user.id };
  if (subjectId) query.subjectId = subjectId;
  if (status) query.status = status;
  if (priority) query.priority = priority;

  let tasks = db.find('tasks', query);

  // Sorting priorities: High (3), Medium (2), Low (1)
  const priorityWeight = { high: 3, medium: 2, low: 1 };

  tasks.sort((a, b) => {
    // First, sort by completion status (pending tasks first)
    if (a.status !== b.status) {
      return a.status === 'pending' ? -1 : 1;
    }

    // Sort by priority (higher priority first)
    const weightA = priorityWeight[a.priority.toLowerCase()] || 0;
    const weightB = priorityWeight[b.priority.toLowerCase()] || 0;
    if (weightA !== weightB) {
      return weightB - weightA;
    }

    // Sort by due date (earlier due dates first)
    const dateA = new Date(a.dueDate || '9999-12-31');
    const dateB = new Date(b.dueDate || '9999-12-31');
    return dateA - dateB;
  });

  // Resolve subject details for each task
  const resolvedTasks = tasks.map(task => {
    const subject = db.findOne('subjects', { _id: task.subjectId });
    return {
      ...task,
      subjectName: subject ? subject.name : 'Unknown Subject'
    };
  });

  res.json(resolvedTasks);
});

// Create task
router.post('/', authMiddleware, (req, res) => {
  const { title, subjectId, dueDate, duration, priority } = req.body;

  if (!title || !subjectId || !dueDate || !duration || !priority) {
    return res.status(400).json({ message: 'Missing required task fields' });
  }

  const subject = db.findOne('subjects', { _id: subjectId });
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  const newTask = db.insert('tasks', {
    title,
    subjectId,
    dueDate, // YYYY-MM-DD in IST
    duration: parseFloat(duration), // in hours
    priority, // 'low', 'medium', 'high'
    status: 'pending', // 'pending', 'completed'
    userId: req.user.id
  });

  res.status(201).json(newTask);
});

// Update task (mark complete, update details)
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { title, subjectId, dueDate, duration, priority, status } = req.body;

  const task = db.findOne('tasks', { _id: id, userId: req.user.id });
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  const updateData = {};
  if (title) updateData.title = title;
  if (subjectId) updateData.subjectId = subjectId;
  if (dueDate) updateData.dueDate = dueDate;
  if (duration !== undefined) updateData.duration = parseFloat(duration);
  if (priority) updateData.priority = priority;
  
  if (status) {
    updateData.status = status;
    // Log in activity review if task is completed
    if (status === 'completed' && task.status === 'pending') {
      const subject = db.findOne('subjects', { _id: task.subjectId || subjectId });
      db.insert('activities', {
        userId: req.user.id,
        type: 'task_completion',
        description: `Completed task: "${task.title}"`,
        subjectId: task.subjectId,
        subjectName: subject ? subject.name : 'General',
        durationHours: task.duration,
        timestamp: new Date().toISOString() // stores ISO, we convert to IST on display
      });
    }
  }

  db.update('tasks', { _id: id }, updateData);

  res.json({ message: 'Task updated successfully', task: { ...task, ...updateData } });
});

// Delete task
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;

  const task = db.findOne('tasks', { _id: id, userId: req.user.id });
  if (!task) {
    return res.status(404).json({ message: 'Task not found' });
  }

  db.delete('tasks', { _id: id });
  res.json({ message: 'Task deleted successfully' });
});

export default router;
