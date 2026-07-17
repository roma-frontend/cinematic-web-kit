'use client';

import { useEffect, useState } from 'react';
import { getTimeOfDay, type TimeOfDay } from '@/lib/time-aware';

export function TimeAwareProvider() {
  const [time, setTime] = useState<TimeOfDay>('day');

  useEffect(() => {
    const updateTime = () => {
      const current = getTimeOfDay();
      setTime(current);
      document.documentElement.setAttribute('data-time', current);
    };

    updateTime();

    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
