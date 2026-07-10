import express from 'express';
import db from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Get all subjects (Includes global/default subjects + student's custom subjects)
router.get('/', authMiddleware, (req, res) => {
  // Find global subjects
  const globals = db.find('subjects', { isGlobal: true });
  // Find user-specific subjects
  const studentCustom = db.find('subjects', { userId: req.user.id });

  res.json([...globals, ...studentCustom]);
});

// Create new custom subject
router.post('/', authMiddleware, (req, res) => {
  const { name, description, difficulty, examDate, examTime } = req.body;

  if (!name || !difficulty) {
    return res.status(400).json({ message: 'Subject name and difficulty are required' });
  }

  const newSub = db.insert('subjects', {
    name,
    description: description || '',
    difficulty, // 'Easy', 'Medium', 'Hard'
    examDate: examDate || null, // YYYY-MM-DD in IST
    examTime: examTime || null, // HH:MM in IST
    userId: req.user.id,
    isGlobal: false
  });

  res.status(201).json(newSub);
});

// Update subject details (including exam dates)
router.put('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  const { name, description, difficulty, examDate, examTime } = req.body;

  const subject = db.findOne('subjects', { _id: id });
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  // Prevent modifying global subjects unless admin (for simplicity, only allow updating user's custom subjects or if role is admin)
  if (!subject.isGlobal && subject.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Cannot edit this subject' });
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (description !== undefined) updateData.description = description;
  if (difficulty) updateData.difficulty = difficulty;
  if (examDate !== undefined) updateData.examDate = examDate;
  if (examTime !== undefined) updateData.examTime = examTime;

  db.update('subjects', { _id: id }, updateData);
  res.json({ message: 'Subject updated successfully', subject: { ...subject, ...updateData } });
});

// Delete custom subject
router.delete('/:id', authMiddleware, (req, res) => {
  const { id } = req.params;

  const subject = db.findOne('subjects', { _id: id });
  if (!subject) {
    return res.status(404).json({ message: 'Subject not found' });
  }

  if (subject.isGlobal && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Cannot delete global subjects' });
  }

  if (!subject.isGlobal && subject.userId !== req.user.id && req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied: Cannot delete this subject' });
  }

  db.delete('subjects', { _id: id });
  
  // Clean up dependent tasks for this subject
  db.delete('tasks', { subjectId: id, userId: req.user.id });

  res.json({ message: 'Subject deleted successfully and linked tasks cleaned' });
});

export default router;
