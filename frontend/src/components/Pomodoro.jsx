import React, { useState, useEffect, useRef } from 'react';

export default function Pomodoro({ tasks, token, apiBase, onSessionLogged }) {
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  
  // Custom settings
  const [customWorkMins, setCustomWorkMins] = useState(25);
  const [customBreakMins, setCustomBreakMins] = useState(5);
  const [showSettings, setShowSettings] = useState(false);

  // Time logging details
  const sessionStartTimeRef = useRef(null);

  useEffect(() => {
    let interval = null;

    if (isActive) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (seconds === 0) {
          if (minutes === 0) {
            // Timer expired!
            handleTimerExpiry();
            clearInterval(interval);
          } else {
            setMinutes(minutes - 1);
            setSeconds(59);
          }
        }
      }, 1000);
    } else {
      clearInterval(interval);
    }

    return () => clearInterval(interval);
  }, [isActive, minutes, seconds, isBreak]);

  // Handle start
  const handleStart = () => {
    if (!isActive && !isBreak) {
      sessionStartTimeRef.current = new Date().toISOString();
    }
    setIsActive(true);
  };

  // Handle pause
  const handlePause = () => {
    setIsActive(false);
  };

  // Handle reset
  const handleReset = () => {
    setIsActive(false);
    setMinutes(isBreak ? customBreakMins : customWorkMins);
    setSeconds(0);
    sessionStartTimeRef.current = null;
  };

  // Triggered when count reaches 0:00
  const handleTimerExpiry = async () => {
    setIsActive(false);
    
    // Play alert sound (using built-in web audio so we do not need files)
    playBeepSound();

    if (!isBreak) {
      // Work session finished: log it!
      const endTime = new Date().toISOString();
      const startTime = sessionStartTimeRef.current || new Date(Date.now() - customWorkMins * 60000).toISOString();
      
      const selectedTask = tasks.find(t => t._id === selectedTaskId);
      const logBody = {
        taskId: selectedTaskId || null,
        subjectId: selectedTask ? selectedTask.subjectId : null,
        durationMinutes: customWorkMins,
        startTime,
        endTime
      };

      try {
        const response = await fetch(`${apiBase}/pomodoro/log`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(logBody)
        });

        if (response.ok) {
          if (onSessionLogged) onSessionLogged();
          alert(`Great job! You finished a ${customWorkMins}-minute focus sprint! Logged successfully.`);
        } else {
          console.error('Failed to log Pomodoro session');
        }
      } catch (err) {
        console.error('Network error logging Pomodoro session:', err);
      }

      // Switch to break
      setIsBreak(true);
      setMinutes(customBreakMins);
      setSeconds(0);
    } else {
      // Break session finished
      alert('Break over! Time to focus.');
      setIsBreak(false);
      setMinutes(customWorkMins);
      setSeconds(0);
    }
  };

  // Web Audio API beep generator
  const playBeepSound = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
      gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.8); // 0.8 seconds beep
    } catch (e) {
      console.warn('Web Audio API not supported or blocked by user permissions');
    }
  };

  // Apply custom configurations
  const applySettings = (e) => {
    e.preventDefault();
    setMinutes(isBreak ? customBreakMins : customWorkMins);
    setSeconds(0);
    setShowSettings(false);
  };

  return (
    <div className="card pomodoro-container" style={{ position: 'relative' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--primary)' }}>
        ⏱️ Pomodoro Focus Timer
      </h3>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
        {isBreak ? '☕ Break Time - Relax!' : '🎯 Work Session - Stay Focused!'}
      </p>

      {/* Linked Task Selector */}
      {!isBreak && (
        <div className="form-group" style={{ width: '100%', maxWidth: '280px', margin: '0 auto 1rem auto' }}>
          <label style={{ fontSize: '0.75rem', textAlign: 'center' }}>Link session to a task:</label>
          <select 
            className="form-control"
            value={selectedTaskId}
            onChange={(e) => setSelectedTaskId(e.target.value)}
            disabled={isActive}
            style={{ fontSize: '0.85rem', padding: '0.5rem' }}
          >
            <option value="">-- General Study Session --</option>
            {tasks.filter(t => t.status === 'pending').map(task => (
              <option key={task._id} value={task._id}>
                [{task.subjectName}] {task.title}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Visual Ticking Circle */}
      <div className={`timer-circle ${isActive ? 'active' : ''}`}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>

      {/* Core Controls */}
      <div className="timer-controls">
        {!isActive ? (
          <button className="btn btn-primary" onClick={handleStart}>
            ▶️ Start
          </button>
        ) : (
          <button className="btn btn-secondary" onClick={handlePause}>
            ⏸️ Pause
          </button>
        )}
        <button className="btn btn-secondary" onClick={handleReset}>
          🔄 Reset
        </button>
        <button 
          className="btn btn-secondary" 
          onClick={() => setShowSettings(!showSettings)}
          disabled={isActive}
          style={{ padding: '0.5rem' }}
          aria-label="Timer settings"
        >
          ⚙️
        </button>
      </div>

      {/* Quick settings card */}
      {showSettings && (
        <form onSubmit={applySettings} className="card" style={{ 
          position: 'absolute', 
          top: '10%', 
          left: '5%', 
          right: '5%', 
          zIndex: 10,
          background: 'var(--bg-app)',
          boxShadow: 'var(--shadow-lg)'
        }}>
          <h4 style={{ marginBottom: '1rem' }}>Configure Timer</h4>
          <div className="form-group">
            <label>Work Duration (mins):</label>
            <input 
              type="number" 
              className="form-control"
              min="1" 
              max="180" 
              value={customWorkMins}
              onChange={(e) => setCustomWorkMins(parseInt(e.target.value) || 25)}
            />
          </div>
          <div className="form-group">
            <label>Break Duration (mins):</label>
            <input 
              type="number" 
              className="form-control" 
              min="1" 
              max="60" 
              value={customBreakMins}
              onChange={(e) => setCustomBreakMins(parseInt(e.target.value) || 5)}
            />
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setShowSettings(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary">Apply</button>
          </div>
        </form>
      )}
    </div>
  );
}
