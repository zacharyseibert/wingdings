'use client';

import { useEffect, useState } from 'react';

interface GlobalStats {
  total: number;
  participants: number;
}

export default function StatsBar({ apiUrl }: { apiUrl: string }) {
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiUrl}/api/stats`);
        if (res.ok) setStats(await res.json());
      } catch { /* non-fatal */ }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const cards = [
    { label: 'Total Wings Eaten', value: stats ? stats.total.toLocaleString() : '—', emoji: '🍗' },
    { label: 'Active Participants', value: stats ? stats.participants.toLocaleString() : '—', emoji: '👥' },
    {
      label: 'Wings Per Person',
      value: stats && stats.participants > 0 ? Math.round(stats.total / stats.participants).toLocaleString() : '—',
      emoji: '📊',
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
      {cards.map(card => (
        <div key={card.label} className="bg-wing-card border border-wing-border rounded-xl p-5 text-center">
          <div className="text-3xl mb-1">{card.emoji}</div>
          <div className="text-3xl font-bold text-wing-orange">{card.value}</div>
          <div className="text-stone-400 text-sm mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
