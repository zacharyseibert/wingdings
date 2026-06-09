'use client';

import { useEffect, useState } from 'react';

interface GlobalStats {
  total: number;
  participants: number;
}

export default function StatsBar({ apiUrl, competitionId }: { apiUrl: string; competitionId?: number | null }) {
  const [stats, setStats] = useState<GlobalStats | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const url = competitionId !== null && competitionId !== undefined
          ? `${apiUrl}/api/stats?competitionId=${competitionId}`
          : `${apiUrl}/api/stats`;
        const res = await fetch(url);
        if (res.ok) setStats(await res.json());
      } catch { /* non-fatal */ }
    }
    load();
    const interval = setInterval(load, 30_000);
    return () => clearInterval(interval);
  }, [apiUrl, competitionId]);

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
        <div key={card.label} className="bg-wing-card border border-wing-border rounded-xl p-5 text-center shadow-sm">
          <div className="text-3xl mb-1">{card.emoji}</div>
          <div className="text-3xl font-bold text-wing-primary">{card.value}</div>
          <div className="text-wing-textSecondary text-sm mt-1">{card.label}</div>
        </div>
      ))}
    </div>
  );
}
