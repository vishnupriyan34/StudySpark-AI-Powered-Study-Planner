# Smart Study Planner - AI-Powered Timetable

The **Smart Study Planner** is a full-stack web application designed to help students organize tasks, prepare for exams, log study sessions using a Pomodoro timer, and receive customized study tips and suggestions based on weak subjects.

It calculates and displays everything in **Indian Standard Time (IST)**, ensuring accuracy regardless of your system's locale settings.

---

## Main Features

### 1. Indian Standard Time (IST) Compliance
- Prominent live clock showing the current time, day, and date formatted in IST on the dashboard, schedule, and Pomodoro timer.
- Schedules, time windows, and Pomodoro focus logs are calculated, formatted, and stored with reference to Asia/Kolkata (IST).

### 2. Auto-Generated Timetable
- Calculates availability windows for each day of the week (e.g., 6:00 PM – 9:00 PM) in IST.
- Sequentially fits tasks into free slots using a greedy bin-packing algorithm.
- Dynamically generates "Critical Revision" tasks for subjects with approaching exams (< 10 days).
- Automatically skips past times, scheduling study sessions from the next available 15-minute slot today.

### 3. Smart Study Tips & AI Suggestions
- Identify weak subjects dynamically when a student rates their subject ≤ 2 stars (or flags it as hard).
- Allocates **1.5x more study sessions** to weak subjects automatically.
- Appends three custom study tips to *every single study session*:
  - **Smart Study Tip**: Practical methods to learn.
  - **Revision Tip**: Best active-recall strategies.
  - **Understanding Tip**: Concepts explanation guidance.
- Highlights **"Today's Best Study Tip"** on the dashboard based on active tasks and weak subjects.

### 4. Pomodoro Focus Timer
- Integrated work/break countdown timer (defaults to 25 mins focus, 5 mins break).
- Link sessions directly to pending tasks.
- Plays a notification alert upon session completion and automatically logs focus hours, date, and time bounds.

### 5. Chatbot Study Companion
- Interactive chatbot widget that answers questions contextually:
  - Ask *"What should I study today?"* -> Bot reads today's IST schedule and highlights the next session time.
  - Ask *"How can I prepare for exams?"* or *"Give me motivation"* -> Generates time management advice and quotes.

### 6. Admin Panel
- Secure administrator account (`admin@planner.com` / `admin123`).
- View a listing of all students and their study performance (tasks completion rate, hours focused).
- Publish global notice board announcements that display at the top of students' dashboards.

---

## Technical Stack & Architecture

- **Frontend**: Vite + React SPA + Chart.js (styled with custom Vanilla CSS for glassmorphism, transitions, light/dark mode).
- **Backend**: Node.js + Express (JWT auth, custom crypto password hashing).
- **Database**: Local JSON-file storage inside `backend/data/` (zero configuration needed, 100% portable for presentations).

---

## How to Run the Project

### Prerequisite
Make sure you have **Node.js** (v18+) and **NPM** installed.

### Step 1: Run the Backend API
1. Navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server (runs on `http://localhost:5000`):
   ```bash
   npm run dev
   ```

### Step 2: Run the React Frontend
1. Open a new terminal window and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the Vite dev server (runs on `http://localhost:5173`):
   ```bash
   npm run dev
   ```
4. Click the link in the terminal to open the planner web application in your browser.

---

## Seed Accounts (Quick Access)

- **Admin Account**:
  - **Email**: `admin@planner.com`
  - **Password**: `admin123`
- **Student Account**:
  - Sign up with any name and email directly on the landing page!
