'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface User {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  total_wings: number;
  updated_at: string;
}

const MEDALS = ['🥇', '🥈', '🥉'];

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    const { data } = await supabase
      .from('users')
      .select('id, display_name, username, avatar_url, total_wings, updated_at')
      .gt('total_wings', 0)
      .order('total_wings', { ascending: false })
      .limit(10);
    if (data) setUsers(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    // Real-time subscription — fires whenever a user's total_wings changes
    const channel = supabase
      .channel('leaderboard-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users' },
        (payload) => {
          const updated = payload.new as User;
          setFlash(updated.id);
          setTimeout(() => setFlash(null), 1500);
          setUsers(prev => {
            const next = prev.map(u => u.id === updated.id ? { ...u, ...updated } : u);
            // If the updated user isn't in the list yet, add them
            if (!next.find(u => u.id === updated.id) && updated.total_wings > 0) {
              next.push(updated);
            }
            return next.filter(u => u.total_wings > 0).sort((a, b) => b.total_wings - a.total_wings).slice(0, 10);
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchLeaderboard]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-16 rounded-xl bg-wing-card animate-pulse" />
        ))}
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-16 text-stone-500">
        <div className="text-6xl mb-4">🍗</div>
        <p>No wings logged yet.</p>
        <p className="text-sm mt-1">Be the first — use <code className="bg-wing-card px-1 rounded">/wingdings add 6</code> in Slack!</p>
      </div>
    );
  }

  const max = users[0]?.total_wings ?? 1;

  return (
    <ol className="space-y-3">
      {users.map((user, i) => {
        const pct = Math.max(4, (user.total_wings / max) * 100);
        const isFlashing = flash === user.id;
        return (
          <li
            key={user.id}
            className={`flex items-center gap-4 rounded-xl p-4 border transition-all duration-500 ${
              isFlashing
                ? 'border-wing-orange bg-wing-orange/20 scale-[1.01]'
                : 'border-wing-border bg-wing-card'
            }`}
          >
            <span className="text-2xl w-8 text-center shrink-0">
              {MEDALS[i] ?? <span className="text-stone-500 text-lg font-bold">{i + 1}</span>}
            </span>
            {user.avatar_url ? (
              <img src={user.avatar_url} alt="" className="w-10 h-10 rounded-full shrink-0" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-wing-orange/30 flex items-center justify-center text-wing-orange font-bold shrink-0">
                {(user.display_name || user.username || '?')[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{user.display_name || user.username}</div>
              <div className="mt-1.5 h-2 rounded-full bg-wing-border overflow-hidden">
                <div
                  className="h-full rounded-full bg-wing-orange transition-all duration-700"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-wing-orange font-bold text-xl">{user.total_wings.toLocaleString()}</div>
              <div className="text-stone-500 text-xs">wings</div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
