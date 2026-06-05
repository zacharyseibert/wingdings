'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Entry {
  amount: number;
  created_at: string;
  user_id: string;
  photo_url?: string | null;
  location_name?: string | null;
  users: { display_name: string; username: string; avatar_url: string | null };
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ apiUrl }: { apiUrl: string }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [, setTick] = useState(0);

  const fetchRecent = useCallback(async () => {
    try {
      const res = await fetch(`${apiUrl}/api/recent?limit=8`);
      if (res.ok) {
        const { data } = await res.json();
        setEntries(data);
      }
    } catch { /* non-fatal */ }
  }, [apiUrl]);

  useEffect(() => {
    fetchRecent();

    // Real-time: prepend new entries as they come in
    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wing_entries' },
        async (payload) => {
          if (payload.new.amount <= 0) return;
          // Fetch user info for this entry
          const { data: user } = await supabase
            .from('users')
            .select('display_name, username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();
          const newEntry: Entry = {
            amount: payload.new.amount,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            users: user ?? { display_name: 'Someone', username: 'someone', avatar_url: null },
          };
          setEntries(prev => [newEntry, ...prev].slice(0, 8));
        }
      )
      .subscribe();

    // Update time-ago labels every 30s
    const ticker = setInterval(() => setTick(t => t + 1), 30_000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(ticker);
    };
  }, [fetchRecent]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm">
        No activity yet — log some wings!
      </div>
    );
  }

  return (
    <ul className="space-y-2">
      {entries.map((e, i) => {
        const name = e.users?.display_name || e.users?.username || 'Someone';
        return (
          <li key={i} className="flex items-center gap-3 py-2 border-b border-wing-border last:border-0">
            {e.users?.avatar_url ? (
              <img src={e.users.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-wing-orange/20 flex items-center justify-center text-wing-orange text-sm font-bold shrink-0">
                {name[0].toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <div>
                <span className="font-medium">{name}</span>
                <span className="text-stone-400"> ate </span>
                <span className="text-wing-orange font-bold">{e.amount} wings</span>
                <span className="text-stone-500 text-xs ml-2">{timeAgo(e.created_at)}</span>
                {e.location_name && (
                  <span className="text-stone-500 text-xs ml-2">📍 {e.location_name}</span>
                )}
              </div>
              {e.photo_url && (
                <img
                  src={e.photo_url}
                  alt="wing photo"
                  className="mt-2 rounded-lg max-h-48 object-cover w-full"
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
