import db from './db.js';

// Convert a date to an IST Date object manually using timezone calculation
export function getISTDate(dateInput = new Date()) {
  const date = new Date(dateInput);
  // Convert standard date to UTC
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  // Add IST offset (UTC + 5:30)
  const istOffset = 5.5 * 3600000;
  return new Date(utcTime + istOffset);
}

// Generate human-readable date, day, and time strings formatted in IST
export function formatIST(date) {
  const formatter = new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
  return formatter.format(date);
}

// Simple dates helper to format YYYY-MM-DD
export function formatISODateOnly(date) {
  const d = getISTDate(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Get the day of the week in English
const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function getDayName(date) {
  return DAYS_OF_WEEK[date.getDay()];
}

// Smart Study Tip Generation Logic
function generateTips(subjectName, isWeak, daysToExam, slotDurationHours) {
  // Lists of potential tips based on criteria
  const generalStudyTips = [
    'Study in short blocks: Use 25-minute focus sessions (Pomodoro) with short breaks.',
    'Do not study only one subject for too long: Mix subjects to stay fresh and avoid boredom.',
    'Make simple notes: Turn hard topics into short bullet points or flashcards.',
    'Teach the topic: Pretend you are teaching it to a friend or younger sibling.'
  ];

  const generalRevisionTips = [
    'Use active recall: Close your notes and try to explain the topic in your own words.',
    'Revise again later: Review the same topic after 1 day, then 3 days, then 7 days (Spaced Repetition).',
    'Do a 5-minute fast recall of what you studied at the end of the session.'
  ];

  const generalUnderstandingTips = [
    'Use examples: For hard subjects, connect new ideas to real-life examples.',
    'Identify core terms: Highlight the 3 most important keywords and write their definitions.',
    'Sketch it out: Draw a mind map or flowchart to visualize how concepts connect.'
  ];

  const weakStudyTips = [
    'Start with the basics: Do not rush. Solve 3 simple foundational problems first.',
    'Ask for help: Write down the exact part you do not understand to ask your teacher/bot.',
    'Focus on process over output: Spend 15 minutes explaining one formula step-by-step.'
  ];

  const weakRevisionTips = [
    'Double review: Revise this topic tonight for 10 minutes before sleeping.',
    'Re-do mistakes: Go over a problem you got wrong earlier and resolve it without help.'
  ];

  const weakUnderstandingTips = [
    'Feynman Technique: Explain this concept as if you are talking to a 10-year-old child.',
    'Use analogical thinking: Compare the hard concept to something everyday (e.g., electricity to water flowing).'
  ];

  const examNearTips = [
    'Focus on mock tests: Solve past exam questions under exam time limits.',
    'Priority study: Focus only on high-weightage topics and formulas.',
    'Review cheat-sheets: Spend 10 minutes skimming summaries rather than reading full chapters.'
  ];

  const examNearRevisionTips = [
    'Solve practice questions without notes. Force your brain to recall.',
    'Scan previous mistakes: Re-do only the questions you got wrong in class tests.'
  ];

  const longSlotTips = [
    'Break it down: Divide this 2+ hour session into 3 specific topics with 5-minute breaks.',
    'Take a walking break: Stand up and walk around for 5 minutes after every 45 minutes of studying.'
  ];

  // Select appropriate tips
  let studyTip = '';
  let revisionTip = '';
  let understandingTip = '';

  if (daysToExam !== null && daysToExam <= 3) {
    // Exam is very close
    studyTip = examNearTips[Math.floor(Math.random() * examNearTips.length)];
    revisionTip = examNearRevisionTips[Math.floor(Math.random() * examNearRevisionTips.length)];
    understandingTip = 'Focus purely on what is likely to appear. Do not start learning entirely new, complex topics now.';
  } else if (isWeak) {
    // Subject is flagged weak
    studyTip = weakStudyTips[Math.floor(Math.random() * weakStudyTips.length)];
    revisionTip = weakRevisionTips[Math.floor(Math.random() * weakRevisionTips.length)];
    understandingTip = weakUnderstandingTips[Math.floor(Math.random() * weakUnderstandingTips.length)];
  } else {
    // Standard tips
    studyTip = generalStudyTips[Math.floor(Math.random() * generalStudyTips.length)];
    revisionTip = generalRevisionTips[Math.floor(Math.random() * generalRevisionTips.length)];
    understandingTip = generalUnderstandingTips[Math.floor(Math.random() * generalUnderstandingTips.length)];
  }

  // Inject long slot advice if duration is high
  if (slotDurationHours >= 2.0) {
    studyTip = `${studyTip} (Break Reminder: ${longSlotTips[Math.floor(Math.random() * longSlotTips.length)]})`;
  }

  return {
    studyTip,
    revisionTip,
    understandingTip
  };
}

/**
 * Generates a 14-day study plan in IST
 * @param {string} userId - The user ID to schedule for
 */
export function generateStudySchedule(userId) {
  const user = db.findOne('users', { _id: userId });
  if (!user) return [];

  const subjects = db.find('subjects', { userId });
  const globalSubjects = db.find('subjects', { isGlobal: true });
  const allSubjects = [...globalSubjects, ...subjects];

  const tasks = db.find('tasks', { userId, status: 'pending' });

  // 1. Identify weak subjects (rated <= 2 or explicitly flagged as weak)
  const weakSubjectIds = user.weakSubjects || [];

  // 2. Identify upcoming exams and calculate days until exam in IST
  const todayIST = getISTDate();
  const todayStr = formatISODateOnly(todayIST);

  const subjectExams = allSubjects
    .filter(s => s.examDate)
    .map(s => {
      const examDate = new Date(s.examDate);
      const diffTime = examDate.getTime() - todayIST.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return { subjectId: s._id, diffDays, examDateStr: s.examDate };
    });

  // 3. Create active task pool. If an exam is approaching within 10 days, we dynamically inject "Exam Revision" tasks if none exist!
  const taskPool = [...tasks];
  
  subjectExams.forEach(exam => {
    if (exam.diffDays >= 0 && exam.diffDays <= 10) {
      const existingRevisionTask = taskPool.find(t => t.subjectId === exam.subjectId && t.title.toLowerCase().includes('revision'));
      if (!existingRevisionTask) {
        const subject = allSubjects.find(s => s._id === exam.subjectId);
        taskPool.push({
          _id: `auto-exam-rev-${exam.subjectId}`,
          title: `Critical Revision: Prepare for ${subject ? subject.name : 'Subject'} Exam`,
          subjectId: exam.subjectId,
          dueDate: exam.examDateStr,
          duration: 1.5, // Default revision session size
          priority: exam.diffDays <= 3 ? 'high' : 'medium',
          isAutoGenerated: true,
          userId
        });
      }
    }
  });

  // 4. Score and sort tasks based on priority, due date, exam proximity, and weak subjects
  const priorityWeight = { high: 3, medium: 2, low: 1 };
  
  const scoredTasks = taskPool.map(task => {
    let score = 0;
    
    // Base weight from priority
    score += (priorityWeight[task.priority.toLowerCase()] || 1) * 20;

    // Weight from due date proximity
    const dueDate = new Date(task.dueDate || '9999-12-31');
    const diffTime = dueDate.getTime() - todayIST.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays < 0) {
      score += 0; // Overdue tasks (skip or keep low priority)
    } else if (diffDays <= 1) {
      score += 50; // Due tomorrow
    } else if (diffDays <= 3) {
      score += 30; // Due in 3 days
    } else if (diffDays <= 7) {
      score += 15;
    }

    // Weight from weak subject designation
    const isWeak = weakSubjectIds.includes(task.subjectId);
    if (isWeak) {
      score += 25; // Prioritize weak subject tasks
    }

    // Weight from approaching exam
    const exam = subjectExams.find(e => e.subjectId === task.subjectId);
    if (exam && exam.diffDays >= 0) {
      if (exam.diffDays <= 3) score += 60; // Exam extremely close
      else if (exam.diffDays <= 7) score += 30;
    }

    return { ...task, score, isWeak };
  });

  // Sort tasks descending by score
  scoredTasks.sort((a, b) => b.score - a.score);

  // 5. Generate daily availability slots for the next 14 days in IST
  const availability = user.availability || {};
  const scheduleSlots = [];

  for (let i = 0; i < 14; i++) {
    const targetDate = new Date(todayIST);
    targetDate.setDate(todayIST.getDate() + i);

    const dayName = getDayName(targetDate);
    const dayConfig = availability[dayName];

    if (dayConfig && dayConfig.enabled) {
      const [startHour, startMin] = dayConfig.start.split(':').map(Number);
      const [endHour, endMin] = dayConfig.end.split(':').map(Number);

      const slotStart = new Date(targetDate);
      slotStart.setHours(startHour, startMin, 0, 0);

      const slotEnd = new Date(targetDate);
      slotEnd.setHours(endHour, endMin, 0, 0);

      // If slot end is before slot start (crosses midnight, though standard availability is daytime), fix it
      if (slotEnd <= slotStart) {
        slotEnd.setDate(slotEnd.getDate() + 1);
      }

      // If we are scheduling for "today" (i = 0), automatically skip times that have already passed
      if (i === 0) {
        if (todayIST >= slotEnd) {
          // Entire slot passed today
          continue;
        }
        if (todayIST > slotStart) {
          // Truncate slotStart to current time (rounded up to next 15 minutes)
          const minutes = todayIST.getMinutes();
          const roundedMinutes = Math.ceil(minutes / 15) * 15;
          slotStart.setHours(todayIST.getHours());
          slotStart.setMinutes(roundedMinutes);
          slotStart.setSeconds(0);
          slotStart.setMilliseconds(0);
          if (slotStart >= slotEnd) continue; // In case rounding pushed past slot end
        }
      }

      scheduleSlots.push({
        date: formatISODateOnly(slotStart),
        dayName,
        slotStart,
        slotEnd,
        durationMs: slotEnd.getTime() - slotStart.getTime()
      });
    }
  }

  // 6. Schedule tasks into slots (Bin Packing)
  const finalSchedule = [];
  const taskStatus = scoredTasks.map(t => ({ ...t, remainingHours: t.duration }));

  for (const slot of scheduleSlots) {
    let currentStart = new Date(slot.slotStart);
    const currentEnd = new Date(slot.slotEnd);

    while (currentStart < currentEnd) {
      // Find the next task in the sorted list that has remaining time
      const taskIndex = taskStatus.findIndex(t => t.remainingHours > 0);
      if (taskIndex === -1) {
        // No more tasks. Let's fill the rest of the day with General Revision
        const remainingDurationHours = (currentEnd.getTime() - currentStart.getTime()) / 3600000;
        if (remainingDurationHours >= 0.5) {
          // Pick a random subject (prefer weak subjects) for General Revision
          let subjectObj = allSubjects.find(s => weakSubjectIds.includes(s._id));
          if (!subjectObj && allSubjects.length > 0) {
            subjectObj = allSubjects[Math.floor(Math.random() * allSubjects.length)];
          }

          const subName = subjectObj ? subjectObj.name : 'General study';
          const subId = subjectObj ? subjectObj._id : 'general';
          const isWeak = subjectObj ? weakSubjectIds.includes(subId) : false;

          const startStr = currentStart.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
          const endStr = currentEnd.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

          const exam = subjectExams.find(e => e.subjectId === subId);
          const daysToExam = exam ? exam.diffDays : null;

          const tips = generateTips(subName, isWeak, daysToExam, remainingDurationHours);

          finalSchedule.push({
            date: slot.date,
            day: slot.dayName,
            startTime: startStr,
            endTime: endStr,
            startRaw: currentStart.toISOString(),
            endRaw: currentEnd.toISOString(),
            subjectName: subName,
            subjectId: subId,
            topic: 'General Revision & Formula Review',
            title: `General Revision - ${subName}`,
            duration: remainingDurationHours,
            isRevision: true,
            ...tips
          });
        }
        break; // Finish current day slot
      }

      const task = taskStatus[taskIndex];
      const subject = allSubjects.find(s => s._id === task.subjectId);
      const isWeak = weakSubjectIds.includes(task.subjectId);

      const exam = subjectExams.find(e => e.subjectId === task.subjectId);
      const daysToExam = exam ? exam.diffDays : null;

      const remainingSlotHours = (currentEnd.getTime() - currentStart.getTime()) / 3600000;
      
      let sessionDurationHours = 0;
      let isTaskFinished = false;

      if (task.remainingHours <= remainingSlotHours) {
        // We can fit the entire remaining task in this slot
        sessionDurationHours = task.remainingHours;
        taskStatus[taskIndex].remainingHours = 0;
        isTaskFinished = true;
      } else {
        // Task is larger than remaining slot, schedule whatever fits
        sessionDurationHours = remainingSlotHours;
        taskStatus[taskIndex].remainingHours -= remainingSlotHours;
      }

      // Don't schedule sessions shorter than 15 minutes (0.25 hrs) to avoid fragmentation
      if (sessionDurationHours >= 0.25) {
        const sessionEnd = new Date(currentStart.getTime() + (sessionDurationHours * 3600000));

        const startStr = currentStart.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });
        const endStr = sessionEnd.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

        const tips = generateTips(subject ? subject.name : 'Unknown', isWeak, daysToExam, sessionDurationHours);

        finalSchedule.push({
          date: slot.date,
          day: slot.dayName,
          startTime: startStr,
          endTime: endStr,
          startRaw: currentStart.toISOString(),
          endRaw: sessionEnd.toISOString(),
          subjectName: subject ? subject.name : 'Unknown',
          subjectId: task.subjectId,
          topic: task.title,
          title: task.title,
          duration: sessionDurationHours,
          taskId: task._id,
          isFinishedPart: isTaskFinished,
          ...tips
        });

        currentStart = sessionEnd;
      } else {
        // If remaining is tiny, discard or round up
        currentStart = currentEnd;
      }
    }
  }

  return finalSchedule;
}
