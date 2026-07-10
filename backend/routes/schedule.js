import express from 'express';
import { generateStudySchedule, getISTDate } from '../services/scheduler.js';
import { authMiddleware } from '../middleware/auth.js';
import db from '../services/db.js';

const router = express.Router();

// Retrieve generated schedule
router.get('/', authMiddleware, (req, res) => {
  try {
    const schedule = generateStudySchedule(req.user.id);
    res.json(schedule);
  } catch (error) {
    console.error('Error generating schedule:', error);
    res.status(500).json({ message: 'Failed to generate study schedule' });
  }
});

// Export study schedule as .ics (iCalendar) file
router.get('/export/ics', authMiddleware, (req, res) => {
  try {
    const schedule = generateStudySchedule(req.user.id);
    
    if (schedule.length === 0) {
      return res.status(400).json({ message: 'No schedule items found to export' });
    }

    let icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Smart Study Planner//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH'
    ].join('\r\n') + '\r\n';

    const formatIcsDate = (isoStr) => {
      const date = new Date(isoStr);
      return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    };

    schedule.forEach((item, index) => {
      const startIcs = formatIcsDate(item.startRaw);
      const endIcs = formatIcsDate(item.endRaw);
      const uid = `session-${index}-${req.user.id}@smartstudyplanner.com`;
      
      const description = [
        `Topic: ${item.topic}`,
        `Smart Study Tip: ${item.studyTip}`,
        `Revision Tip: ${item.revisionTip}`,
        `Understanding Tip: ${item.understandingTip}`
      ].join('\\n');

      icsContent += [
        'BEGIN:VEVENT',
        `UID:${uid}`,
        `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
        `DTSTART:${startIcs}`,
        `DTEND:${endIcs}`,
        `SUMMARY:Study: ${item.subjectName} - ${item.topic.substring(0, 40)}`,
        `DESCRIPTION:${description}`,
        'STATUS:CONFIRMED',
        'SEQUENCE:0',
        'END:VEVENT'
      ].join('\r\n') + '\r\n';
    });

    icsContent += 'END:VCALENDAR';

    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=study_schedule.ics');
    res.status(200).send(icsContent);
  } catch (error) {
    console.error('Error exporting calendar:', error);
    res.status(500).json({ message: 'Failed to export calendar' });
  }
});

export default router;
