import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import db from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'study-planner-secret-key-12345';

// Default weekly free time slots (IST references)
const DEFAULT_AVAILABILITY = {
  Monday: { enabled: true, start: '18:00', end: '21:00' },
  Tuesday: { enabled: true, start: '18:00', end: '21:00' },
  Wednesday: { enabled: true, start: '18:00', end: '21:00' },
  Thursday: { enabled: true, start: '18:00', end: '21:00' },
  Friday: { enabled: true, start: '18:00', end: '21:00' },
  Saturday: { enabled: true, start: '10:00', end: '18:00' },
  Sunday: { enabled: true, start: '10:00', end: '18:00' }
};

// Sign Up
router.post('/signup', (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  const existingUser = db.findOne('users', { email });
  if (existingUser) {
    return res.status(400).json({ message: 'Email already registered' });
  }

  // Hashing using crypto (Node native SHA-256)
  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

  const newUser = db.insert('users', {
    name,
    email,
    password: passwordHash,
    role: role === 'admin' ? 'admin' : 'student',
    isActive: true,
    availability: DEFAULT_AVAILABILITY,
    weakSubjects: [], // List of subject IDs tagged as weak
    selfRatings: {}   // Subject ID -> self score (1-5)
  });

  const token = jwt.sign({ id: newUser._id, email: newUser.email, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

  // Exclude password in response
  const { password: _, ...userWithoutPassword } = newUser;

  res.status(201).json({
    message: 'Registration successful',
    token,
    user: userWithoutPassword
  });
});

// Login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  const user = db.findOne('users', { email });
  if (!user) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Deactivation status check
  if (user.role === 'student' && user.isActive === false) {
    return res.status(403).json({ message: 'Access denied: Your student account has been deactivated by the Administrator.' });
  }

  const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
  if (user.password !== passwordHash) {
    return res.status(400).json({ message: 'Invalid credentials' });
  }

  // Log login activity
  db.insert('activities', {
    userId: user._id,
    type: 'login',
    description: `${user.name} logged in successfully.`,
    subjectId: 'general',
    subjectName: 'System',
    durationHours: 0,
    timestamp: new Date().toISOString()
  });

  const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    message: 'Login successful',
    token,
    user: userWithoutPassword
  });
});

// Get Current User Profile
router.get('/me', authMiddleware, (req, res) => {
  const user = db.findOne('users', { _id: req.user.id });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const { password, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// Update Profile Availability & AI weak subject info
router.put('/profile', authMiddleware, (req, res) => {
  const { name, availability, selfRatings } = req.body;

  const user = db.findOne('users', { _id: req.user.id });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  const updateData = {};
  if (name) updateData.name = name;
  if (availability) updateData.availability = availability;
  
  if (selfRatings) {
    updateData.selfRatings = selfRatings;
    // Automatically recalculate weak subjects (ratings <= 2 or containing explicit "Hard" flags)
    const weakSubjects = [];
    for (const subId in selfRatings) {
      if (Number(selfRatings[subId]) <= 2) {
        weakSubjects.push(subId);
      }
    }
    updateData.weakSubjects = weakSubjects;
  }

  db.update('users', { _id: req.user.id }, updateData);

  const updatedUser = db.findOne('users', { _id: req.user.id });
  const { password, ...userWithoutPassword } = updatedUser;

  res.json({
    message: 'Profile updated successfully',
    user: userWithoutPassword
  });
});

export default router;
