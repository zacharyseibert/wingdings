'use client';

import { useEffect, useState } from 'react';

interface FunStatsData {
  biggestSession: {
    amount: number;
    created_at: string;
    users: { display_name: string; username: string; avatar_url: string | null };
  } | null;
  mostActiveDay: { day: string; total: number } | null;
  longestStreak: { name: string; streak: number } | null;
}

function StatCard({ emoji, label, value, sub }: { emoji: string; label: string; value: string; sub?: string }) {
  return (
    <div className="bg-wing-card border border-wing-border rounded-xl p-5 shadow-sm">
      <div className="text-2xl mb-2">{emoji}</div>
      <div className="text-xs text-wing-textLight uppercase tracking-wide mb-1">{label}</div>
      <div className="text-xl font-bold text-wing-text">{value}</div>
      {sub && <div className="text-wing-textSecondary text-sm mt-0.5">{sub}</div>}
    </div>
  );
}

export default function FunStats({ apiUrl }: { apiUrl: string }) {
  const [stats, setStats] = useState<FunStatsData | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`${apiUrl}/api/fun-stats`);
        if (res.ok) setStats(await res.json());
      } catch { /* non-fatal */ }
    }
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, [apiUrl]);

  const biggest = stats?.biggestSession;
  const activeDay = stats?.mostActiveDay;
  const streak = stats?.longestStreak;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        emoji="💥"
        label="Biggest Single Session"
        value={biggest ? `${biggest.amount} wings` : '—'}
        sub={biggest ? (biggest.users?.display_name || biggest.users?.username) : undefined}
      />
      <StatCard
        emoji="📅"
        label="Most Active Day"
        value={activeDay ? activeDay.day : '—'}
        sub={activeDay ? `${activeDay.total} wings total` : undefined}
      />
      <StatCard
        emoji="🔥"
        label="Longest Streak"
        value={streak ? `${streak.streak} day${streak.streak === 1 ? '' : 's'}` : '—'}
        sub={streak?.name ?? undefined}
      />
    </div>
  );
}
