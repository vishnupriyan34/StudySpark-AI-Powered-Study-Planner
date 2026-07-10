import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Route imports
import authRoutes from './routes/auth.js';
import subjectRoutes from './routes/subjects.js';
import taskRoutes from './routes/tasks.js';
import scheduleRoutes from './routes/schedule.js';
import pomodoroRoutes from './routes/pomodoro.js';
import aiRoutes from './routes/ai.js';
import adminRoutes from './routes/admin.js';
import activitiesRoutes from './routes/activities.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*', // For development accessibility
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/subjects', subjectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/schedule', scheduleRoutes);
app.use('/api/pomodoro', pomodoroRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/activities', activitiesRoutes);

// Health Check / Root check
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    timezone: 'Asia/Kolkata'
  });
});

// Serve frontend build in production (optional, good standard)
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuildPath));

app.get('*any', (req, res, next) => {
  // If request is for /api, pass it through
  if (req.path.startsWith('/api')) {
    return next();
  }
  // Otherwise serve React index.html if frontend is built
  const indexPath = path.join(frontendBuildPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(200).send('Smart Study Planner API Server is running. Frontend dev server is separate.');
    }
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`[SERVER] Smart Study Planner running on http://localhost:${PORT}`);
  console.log(`[TIMEZONE] System configured reference: Asia/Kolkata (IST)`);
});
