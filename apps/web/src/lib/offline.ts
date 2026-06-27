import { useEffect, useState } from 'react';
import { ingestNote } from './api';

const KEY = 'abiros-offline-notes';

interface QueuedNote {
  title: string;
  content: string;
  at: number;
}

function read(): QueuedNote[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as QueuedNote[];
  } catch {
    return [];
  }
}
function write(q: QueuedNote[]) {
  localStorage.setItem(KEY, JSON.stringify(q));
}

export function queueNote(title: string, content: string) {
  const q = read();
  q.push({ title, content, at: Date.now() });
  write(q);
}

export function queuedCount(): number {
  return read().length;
}

/** Try to send all queued notes; keeps any that still fail. Returns # synced. */
export async function flushQueue(): Promise<number> {
  const q = read();
  if (q.length === 0) return 0;
  const remaining: QueuedNote[] = [];
  let synced = 0;
  for (const n of q) {
    try {
      await ingestNote(n.title, n.content);
      synced++;
    } catch {
      remaining.push(n);
    }
  }
  write(remaining);
  return synced;
}

/** React hook: live online/offline status; auto-flushes the queue on reconnect. */
export function useOnline(): boolean {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const on = () => {
      setOnline(true);
      void flushQueue();
    };
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}
