import express from 'express';
import db from '../services/db.js';
import { authMiddleware } from '../middleware/auth.js';
import { generateStudySchedule, getISTDate, formatIST } from '../services/scheduler.js';

const router = express.Router();

// Get smart AI suggestions for weak subjects and scheduling tips
router.get('/suggestions', authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const user = db.findOne('users', { _id: userId });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const subjects = db.find('subjects', { userId });
    const globalSubjects = db.find('subjects', { isGlobal: true });
    const allSubjects = [...globalSubjects, ...subjects];

    const tasks = db.find('tasks', { userId });
    const pendingTasks = tasks.filter(t => t.status === 'pending');
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const pomodoros = db.find('pomodoros', { userId });

    const weakSubjectIds = user.weakSubjects || [];
    const selfRatings = user.selfRatings || {};

    const suggestions = [];
    const weakSubjectDetails = [];

    // 1. Identify weak subjects
    allSubjects.forEach(sub => {
      const rating = selfRatings[sub._id];
      const isWeak = weakSubjectIds.includes(sub._id);
      if (isWeak || (rating && Number(rating) <= 2)) {
        weakSubjectDetails.push(sub.name);
      }
    });

    if (weakSubjectDetails.length > 0) {
      suggestions.push({
        type: 'weak_subject',
        title: `Extra focus needed on ${weakSubjectDetails.join(', ')}`,
        suggestion: `You seem weaker in ${weakSubjectDetails.join(' & ')}. The algorithm will automatically allocate 1.5x more study sessions for these subjects. Try studying them in your highest-energy slots!`,
        why: 'Allocating more time to difficult topics early helps build confidence and avoids exam-time panic.'
      });
    } else {
      suggestions.push({
        type: 'status_ok',
        title: 'All subjects rated well!',
        suggestion: 'Keep maintaining a balanced schedule. Review easy subjects once a week to ensure you do not forget key details.',
        why: 'Even simple subjects need spaced repetition to keep information active in your long-term memory.'
      });
    }

    // 2. Exam proximity warnings
    const todayIST = getISTDate();
    allSubjects.forEach(sub => {
      if (sub.examDate) {
        const examDate = new Date(sub.examDate);
        const diffTime = examDate.getTime() - todayIST.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays >= 0 && diffDays <= 4) {
          suggestions.push({
            type: 'exam_warning',
            title: `Exam approaching: ${sub.name} in ${diffDays} day(s)!`,
            suggestion: `Focus entirely on active recall and previous papers. Avoid starting new complex chapters now. Spend 15 minutes reviewing formulas or key summaries.`,
            why: 'Last-minute learning of new concepts leads to high stress and low retention. Solidifying what you already know is safer.'
          });
        }
      }
    });

    // 3. Scheduling and habit tips based on tasks/pomodoros
    if (pendingTasks.length > 5) {
      suggestions.push({
        type: 'task_backlog',
        title: 'Task Backlog Warning',
        suggestion: `You have ${pendingTasks.length} pending tasks. Prioritize the high-priority ones first, or break down the larger tasks (e.g. into 30-minute items) to gain momentum.`,
        why: 'A large checklist feels overwhelming. Breaking it into small, quick tasks tricks your brain into starting.'
      });
    }

    if (pomodoros.length >= 5) {
      suggestions.push({
        type: 'pomodoro_praise',
        title: 'Excellent Study Focus!',
        suggestion: `You have completed ${pomodoros.length} Pomodoro study sessions. Excellent discipline! Keep using the 25-minute focus intervals.`,
        why: 'Structured breaks keep your brain from burning out and preserve high mental output.'
      });
    } else if (completedTasks.length > 0 && pomodoros.length === 0) {
      suggestions.push({
        type: 'pomodoro_suggestion',
        title: 'Try the Pomodoro Focus Timer',
        suggestion: 'You are completing tasks, but not logging focus blocks. Try using our Pomodoro timer to manage your energy during studies.',
        why: 'Timed work sprints build deep focus and make it easier to track how much effort goes into each subject.'
      });
    }

    // 4. Default dynamic suggestion if array is small
    if (suggestions.length < 3) {
      suggestions.push({
        type: 'general_wisdom',
        title: 'Optimize Study environment',
        suggestion: 'Ensure your study desk has good lighting and keep your mobile phone in another room during study sessions.',
        why: 'Reducing physical distractions significantly lowers the cognitive load required to start studying.'
      });
    }

    res.json({
      suggestions,
      weakSubjects: weakSubjectDetails
    });
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    res.status(500).json({ message: 'Error generating recommendations' });
  }
});

// Chatbot endpoint
router.post('/chatbot', authMiddleware, (req, res) => {
  const { message } = req.body;
  if (!message) return res.status(400).json({ message: 'Message is required' });

  const userId = req.user.id;
  const user = db.findOne('users', { _id: userId });
  if (!user) return res.status(404).json({ message: 'User not found' });

  const msgLower = message.toLowerCase();

  const subjects = db.find('subjects', { userId });
  const globalSubjects = db.find('subjects', { isGlobal: true });
  const allSubjects = [...globalSubjects, ...subjects];

  const pendingTasks = db.find('tasks', { userId, status: 'pending' });

  // Get current IST timestamp
  const todayIST = getISTDate();
  const dayName = todayIST.toLocaleDateString('en-IN', { weekday: 'long', timeZone: 'Asia/Kolkata' });
  const dateStr = todayIST.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });
  const timeStr = todayIST.toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' });

  // Generate latest study schedule
  const schedule = generateStudySchedule(userId);
  const todaySchedule = schedule.filter(item => item.date === todayIST.toISOString().split('T')[0]);

  // Find next upcoming session in schedule
  const nextSession = schedule.find(item => new Date(item.startRaw) > todayIST);

  let reply = '';

  // 1. Handle schedule queries
  if (msgLower.includes('today') || msgLower.includes('schedule') || msgLower.includes('study what') || msgLower.includes('what should i study')) {
    const todaySessionsStr = todaySchedule.map(s => `- ${s.startTime} to ${s.endTime}: ${s.subjectName} (${s.topic})`).join('\n');
    reply = `Today is **${dayName}, ${dateStr}**.\n\n`;

    if (todaySchedule.length > 0) {
      reply += `Here is your study schedule for today in IST:\n${todaySessionsStr}\n\n`;
      if (nextSession) {
        reply += `Your next upcoming session starts at **${nextSession.startTime}** on **${nextSession.subjectName}** (${nextSession.topic}).`;
      }
    } else {
      reply += `You have no study sessions scheduled for today!\n`;
      if (nextSession) {
        reply += `Your next scheduled study session is on **${nextSession.day}, ${nextSession.date}** at **${nextSession.startTime}** doing **${nextSession.subjectName}** (${nextSession.topic}).`;
      } else {
        reply += `There are no scheduled sessions in your plan. Try adding some tasks and due dates, then check back!`;
      }
    }
  }
  // 2. Handle motivation queries
  else if (msgLower.includes('motivate') || msgLower.includes('motivation') || msgLower.includes('quote') || msgLower.includes('tired') || msgLower.includes('bored')) {
    const quotes = [
      "The secret of getting ahead is getting started. — Mark Twain",
      "It always seems impossible until it's done. — Nelson Mandela",
      "Believe you can and you're halfway there. — Theodore Roosevelt",
      "Start where you are. Use what you have. Do what you can. — Arthur Ashe",
      "You don't have to be great to start, but you have to start to be great. — Zig Ziglar"
    ];
    const quote = quotes[Math.floor(Math.random() * quotes.length)];
    reply = `Here is a study motivation for you:\n\n> **"${quote}"**\n\nTake a deep breath, pick a task, and run a quick 25-minute Pomodoro focus block. You can do this!`;
  }
  // 3. Handle exam-related queries
  else if (msgLower.includes('exam') || msgLower.includes('test') || msgLower.includes('prepare') || msgLower.includes('stress')) {
    const upcomingExams = allSubjects.filter(s => s.examDate);
    if (upcomingExams.length > 0) {
      const examList = upcomingExams.map(s => {
        const d = new Date(s.examDate);
        const daysLeft = Math.ceil((d.getTime() - todayIST.getTime()) / (1000 * 3600 * 24));
        return `- **${s.name}**: ${s.examDate} (${daysLeft >= 0 ? `${daysLeft} days left` : 'passed'})`;
      }).join('\n');

      reply = `Here are your recorded exam dates:\n${examList}\n\n**Exam preparation strategy:**\n1. Prioritize active recall over passive reading.\n2. Do mock problems under exam conditions.\n3. Keep study sessions under 2 hours, separated by 5-10 minute walks.`;
    } else {
      reply = `You haven't recorded any exam dates yet. Go to the "Subjects" section and add exam dates to let me generate an exam revision schedule for you!`;
    }
  }
  // 4. Handle time management / focus queries
  else if (msgLower.includes('time') || msgLower.includes('manage') || msgLower.includes('pomodoro') || msgLower.includes('break')) {
    reply = `**Time Management & Focus Tips:**\n\n1. **Use Pomodoro**: Focus for 25 minutes, then take a 5-minute break. This prevents mental fatigue.\n2. **Eat the Frog**: Study your hardest/weakest subject first in the day when your mind is fresh.\n3. **Block Time**: Set specific start/end times in your profile so you do not have to decide when to study daily.`;
  }
  // 5. Subject Specific Heuristics
  else if (msgLower.includes('math') || msgLower.includes('calculus') || msgLower.includes('algebra') || msgLower.includes('equation')) {
    reply = `**How to Study Mathematics:**\n\n1. **Do, Don't Just Read**: Math is muscle memory for the brain. Solve at least 3-5 variations of a problem type.\n2. **Understand the Formula**: Know *why* a formula works, not just *what* it is. Draw geometric connections if possible.\n3. **Isolate Mistakes**: When you get a problem wrong, pinpoint the exact step (e.g., algebra error vs. integration error) to fix your gap.`;
  }
  else if (msgLower.includes('physics') || msgLower.includes('mechanics') || msgLower.includes('thermodynamics') || msgLower.includes('optics')) {
    reply = `**How to Study Physics:**\n\n1. **Draw Diagrams**: Always start with a sketch (e.g., free-body diagrams, wave reflections). Visualizing forces makes mathematical equations intuitive.\n2. **Track Units**: Ensure units match on both sides of the equation (dimensional analysis) to catch quick formula errors.\n3. **Concept First**: Do not jump to the formula. Explain the concept (e.g., conservation of energy) in your own words first.`;
  }
  else if (msgLower.includes('computer science') || msgLower.includes('coding') || msgLower.includes('programming') || msgLower.includes('algorithm')) {
    reply = `**How to Study Computer Science & Programming:**\n\n1. **Write & Run**: Never just read code. Type it, run it, and break it intentionally to see how errors occur.\n2. **Trace Code on Paper**: Draw variable states step-by-step for loops and recursive calls. This is called a "dry run".\n3. **Divide & Conquer**: Break a complex program into small functions (Input -> Processing -> Output) and write test cases for each.`;
  }
  else if (msgLower.includes('chemistry') || msgLower.includes('organic') || msgLower.includes('reaction')) {
    reply = `**How to Study Chemistry:**\n\n1. **Map Reactions**: Create visual map trees linking start chemicals to end products for organic chemistry.\n2. **Use Mnemonics**: Set abbreviations and rhymes to remember lists, series (e.g., activity series), and naming conventions.\n3. **Practice Numerical Chemistry**: Treat physical chemistry like physics—practice formula application and conversion factors daily.`;
  }
  else if (msgLower.includes('english') || msgLower.includes('literature') || msgLower.includes('grammar') || msgLower.includes('essay')) {
    reply = `**How to Study English & Literature:**\n\n1. **Active Summaries**: Write a 1-sentence summary of every scene, act, or chapter you read.\n2. **Track Vocabulary**: Keep a list of unfamiliar words and write 2 sentences using them in context.\n3. **Structure Outlines**: When writing essays, draft a clear thesis sentence and allocate exactly one key argument per paragraph.`;
  }
  else if (msgLower.includes('biology') || msgLower.includes('cell') || msgLower.includes('anatomy') || msgLower.includes('genetics')) {
    reply = `**How to Study Biology:**\n\n1. **Draw from Memory**: Label blank biological diagrams. If you can draw it without looking, you understand the structure.\n2. **Learn Etymology**: Breakdown Latin and Greek terms (e.g., photo-synthesis = light-combining) to make spelling and retention easy.\n3. **Systems Thinking**: Study biological systems (e.g., blood circulation) as input-output systems before memorizing cell components.`;
  }
  // 6. Generic Topic-Tailored Plan Fallback (Generates custom advice for ANY topic)
  else {
    // Attempt to extract the primary topic from the user question
    let topic = message;
    
    // Strip common conversational prefixes to find the noun
    const prefixes = [
      'how to study', 'how can i study', 'how to learn', 'what is', 'explain', 
      'tell me about', 'how do i learn', 'help me with', 'how to prepare'
    ];
    
    for (const prefix of prefixes) {
      if (msgLower.startsWith(prefix)) {
        topic = message.substring(prefix.length).trim();
        break;
      }
    }
    
    // Clean trailing question marks
    topic = topic.replace(/\?+$/, '').trim();
    
    // Cap length to keep response neat
    if (topic.length > 50) {
      topic = topic.substring(0, 50) + '...';
    }

    if (topic.length > 1) {
      reply = `Here is a custom study strategy for **"${topic}"**:\n\n`;
      reply += `1. **First Principles (Deconstruct)**: Break down "${topic}" into 3 simple, core parts. Master the definitions of these parts before looking at advanced theories.\n`;
      reply += `2. **Active Recall Practice**: After studying "${topic}", close your material and explain the topic out loud. Write down a 3-bullet-point summary completely from memory.\n`;
      reply += `3. **Interval Review**: Schedule a quick 10-minute review of "${topic}" tomorrow, then again in 3 days, and once more in 7 days to lock it in your long-term memory.\n\n`;
      reply += `*Tip: Link a 25-minute Pomodoro focus block to one of your tasks and focus purely on "${topic}"!*`;
    } else {
      const weakSubjects = user.weakSubjects || [];
      let weakMsg = '';
      if (weakSubjects.length > 0) {
        const weakNames = allSubjects.filter(s => weakSubjects.includes(s._id)).map(s => s.name);
        weakMsg = ` I see you are working on strengthening: **${weakNames.join(', ')}**.`;
      }

      reply = `Hello, **${user.name}**! I am your AI Study Assistant.${weakMsg}\n\nI can help you build study strategies for **any topic**! Ask me things like:\n- *"How do I study machine learning?"*\n- *"Explain quadratic equations"* \n- *"What should I study today?"*\n- *"Give me a motivational quote"*`;
    }
  }

  res.json({ reply });
});

export default router;
