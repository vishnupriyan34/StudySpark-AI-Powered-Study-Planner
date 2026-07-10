import express from 'express';
import db from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { getISTDate, formatISODateOnly } from '../services/scheduler.js';

const router = express.Router();

// Get historical activity logs for the current student
router.get('/', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { filter } = req.query; // 'today', 'week', 'month', 'all'
    
    let activities = db.find('activities', { userId });
    
    // Sort activities descending (newest first)
    activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    const todayIST = getISTDate();
    
    if (filter === 'today') {
      const todayStr = formatISODateOnly(todayIST);
      activities = activities.filter(act => {
        const actDateStr = formatISODateOnly(new Date(act.timestamp));
        return actDateStr === todayStr;
      });
    } else if (filter === 'week') {
      const oneWeekAgo = getISTDate();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      oneWeekAgo.setHours(0, 0, 0, 0); // start of day in IST
      activities = activities.filter(act => {
        return getISTDate(new Date(act.timestamp)) >= oneWeekAgo;
      });
    } else if (filter === 'month') {
      const oneMonthAgo = getISTDate();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      oneMonthAgo.setHours(0, 0, 0, 0); // start of day in IST
      activities = activities.filter(act => {
        return getISTDate(new Date(act.timestamp)) >= oneMonthAgo;
      });
    }

    res.json(activities);
  } catch (error) {
    console.error('Error fetching activities:', error);
    res.status(500).json({ message: 'Failed to retrieve activity log' });
  }
});

// Clear activity log
router.delete('/', authMiddleware, (req, res) => {
  try {
    const deletedCount = db.delete('activities', { userId: req.user.id });
    res.json({ message: `Successfully cleared ${deletedCount} activity entries.` });
  } catch (error) {
    console.error('Error clearing activities:', error);
    res.status(500).json({ message: 'Failed to clear activity log' });
  }
});

export default router;
