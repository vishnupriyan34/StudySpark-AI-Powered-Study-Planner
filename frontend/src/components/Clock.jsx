import React, { useState, useEffect } from 'react';

export default function Clock() {
  const [timeData, setTimeData] = useState({
    time: '',
    date: '',
    day: ''
  });

  useEffect(() => {
    const updateTime = () => {
      const dateObj = new Date();

      // Format time in IST
      const timeFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: 'numeric',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      });

      // Format date in IST
      const dateFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });

      // Format day of the week in IST
      const dayFormatter = new Intl.DateTimeFormat('en-IN', {
        timeZone: 'Asia/Kolkata',
        weekday: 'long'
      });

      setTimeData({
        time: timeFormatter.format(dateObj),
        date: dateFormatter.format(dateObj),
        day: dayFormatter.format(dateObj)
      });
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="live-clock-container" id="ist-live-clock">
      <div className="live-time" aria-label="Current IST Time">
        {timeData.time}
      </div>
      <div className="live-date">
        {timeData.day}, {timeData.date} <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)' }}>(IST)</span>
      </div>
    </div>
  );
}
