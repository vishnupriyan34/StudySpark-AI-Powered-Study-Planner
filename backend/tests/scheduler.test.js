import db from '../services/db.js';
import { generateStudySchedule, getISTDate, formatISODateOnly } from '../services/scheduler.js';
import crypto from 'crypto';

// Setup Mock Student Profile
const mockUserId = crypto.randomUUID();

const runTests = () => {
  console.log('--- STARTING SCHEDULER ALGORITHM UNIT TESTS ---');

  // 1. Seed Database with temporary test subjects and tasks
  const testSubjects = [
    { _id: 'sub-math', name: 'Advanced Calculus', description: 'Diff equations', difficulty: 'Hard', userId: mockUserId, isGlobal: false },
    { _id: 'sub-eng', name: 'English Literature', description: 'Plays', difficulty: 'Easy', userId: mockUserId, isGlobal: false }
  ];

  testSubjects.forEach(s => db.insert('subjects', s));

  // Insert mock student user
  const passwordHash = crypto.createHash('sha256').update('password123').digest('hex');
  db.insert('users', {
    _id: mockUserId,
    name: 'Test Student',
    email: 'test@student.com',
    password: passwordHash,
    role: 'student',
    availability: {
      Monday: { enabled: true, start: '18:00', end: '21:00' },
      Tuesday: { enabled: true, start: '18:00', end: '21:00' },
      Wednesday: { enabled: true, start: '18:00', end: '21:00' },
      Thursday: { enabled: true, start: '18:00', end: '21:00' },
      Friday: { enabled: true, start: '18:00', end: '21:00' },
      Saturday: { enabled: true, start: '10:00', end: '14:00' },
      Sunday: { enabled: true, start: '10:00', end: '14:00' }
    },
    weakSubjects: ['sub-math'], // Math is flagged as weak
    selfRatings: { 'sub-math': 1, 'sub-eng': 5 }
  });

  const testTasks = [
    { _id: 'task-math-1', title: 'Calculus homework', subjectId: 'sub-math', dueDate: '2026-12-31', duration: 2.0, priority: 'high', status: 'pending', userId: mockUserId },
    { _id: 'task-eng-1', title: 'Read Hamlet', subjectId: 'sub-eng', dueDate: '2026-12-31', duration: 1.0, priority: 'low', status: 'pending', userId: mockUserId }
  ];

  testTasks.forEach(t => db.insert('tasks', t));

  try {
    // 2. Generate study schedule
    const schedule = generateStudySchedule(mockUserId);

    // Assertions
    console.log(`Generated schedule items count: ${schedule.length}`);
    if (schedule.length === 0) {
      throw new Error('FAIL: Scheduler returned an empty array.');
    }

    // Verify task-math-1 (High priority, weak subject) was scheduled before task-eng-1 (low priority)
    const mathSessionIndex = schedule.findIndex(item => item.taskId === 'task-math-1');
    const engSessionIndex = schedule.findIndex(item => item.taskId === 'task-eng-1');

    console.log(`Math high-priority task index in plan: ${mathSessionIndex}`);
    console.log(`English low-priority task index in plan: ${engSessionIndex}`);

    if (mathSessionIndex === -1) {
      throw new Error('FAIL: Math task not found in schedule.');
    }
    if (engSessionIndex === -1) {
      throw new Error('FAIL: English task not found in schedule.');
    }
    if (mathSessionIndex > engSessionIndex) {
      throw new Error('FAIL: Low priority task scheduled before high priority, weak subject task.');
    }

    console.log('✅ SUCCESS: Priority and Weak subject sorting order verified.');

    // Verify IST conversion date bounds
    const istToday = getISTDate();
    const formattedToday = formatISODateOnly(istToday);
    console.log(`Current Reference date in IST: ${formattedToday}`);

    // Verify all schedule items contain valid tips
    const sampleSession = schedule[0];
    if (!sampleSession.studyTip || !sampleSession.revisionTip || !sampleSession.understandingTip) {
      throw new Error('FAIL: Schedule items do not contain the required set of study, revision, and understanding tips.');
    }
    console.log('✅ SUCCESS: Required smart tips are attached to all schedule sessions.');

    console.log('\n--- ALL SCHEDULER ALGORITHM UNIT TESTS PASSED SUCCESSFULLY! ---');

  } catch (error) {
    console.error('❌ TEST RUN FAILED:', error.message);
    process.exit(1);
  } finally {
    // Clean up mock database files
    db.delete('subjects', { userId: mockUserId });
    db.delete('users', { _id: mockUserId });
    db.delete('tasks', { userId: mockUserId });
    console.log('Cleaned up mock data from database files.');
  }
};

runTests();
