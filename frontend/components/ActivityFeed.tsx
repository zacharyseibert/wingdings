'use client';

import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

interface Entry {
  amount: number;
  created_at: string;
  user_id: string;
  photo_url?: string | null;
  location_name?: string | null;
  note?: string | null;
  users: { display_name: string; username: string; avatar_url: string | null };
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function ActivityFeed({ apiUrl, competitionId }: { apiUrl: string; competitionId?: number | null }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [, setTick] = useState(0);

  const fetchRecent = useCallback(async () => {
    try {
      // TODO: Add competition filtering when backend supports it
      const res = await fetch(`${apiUrl}/api/recent?limit=8`);
      if (res.ok) {
        const { data } = await res.json();
        setEntries(data);
      }
    } catch { /* non-fatal */ }
  }, [apiUrl, competitionId]);

  useEffect(() => {
    fetchRecent();

    const channel = supabase
      .channel('activity-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'wing_entries' },
        async (payload) => {
          if (payload.new.amount <= 0) return;
          const { data: user } = await supabase
            .from('users')
            .select('display_name, username, avatar_url')
            .eq('id', payload.new.user_id)
            .single();
          const newEntry: Entry = {
            amount: payload.new.amount,
            created_at: payload.new.created_at,
            user_id: payload.new.user_id,
            photo_url: payload.new.photo_url,
            location_name: payload.new.location_name,
            users: user ?? { display_name: 'Someone', username: 'someone', avatar_url: null },
          };
          setEntries(prev => [newEntry, ...prev].slice(0, 8));
        }
      )
      .subscribe();

    const ticker = setInterval(() => setTick(t => t + 1), 30_000);
    return () => { supabase.removeChannel(channel); clearInterval(ticker); };
  }, [fetchRecent]);

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-stone-500 text-sm">
        No activity yet — log some wings!
      </div>
    );
  }

  return (
    <ul className="space-y-0">
      {entries.map((e, i) => {
        const name = e.users?.display_name || e.users?.username || 'Someone';
        const hasExtras = !!(e.photo_url || e.location_name || e.note);
        const isExpanded = expanded === i;

        return (
          <li
            key={i}
            className={`border-b border-wing-border last:border-0 ${hasExtras ? 'cursor-pointer' : ''}`}
            onClick={() => hasExtras && setExpanded(isExpanded ? null : i)}
          >
            <div className="flex items-center gap-3 py-3">
              {e.users?.avatar_url ? (
                <img src={e.users.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-wing-orange/20 flex items-center justify-center text-wing-orange text-sm font-bold shrink-0">
                  {name[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <span className="font-medium">{name}</span>
                <span className="text-stone-400"> ate </span>
                <span className="text-wing-orange font-bold">{e.amount} wings</span>
                <span className="text-stone-500 text-xs ml-2">{timeAgo(e.created_at)}</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                {e.note && <span className="text-sm">💬</span>}
                {e.photo_url && <span className="text-sm">📷</span>}
                {e.location_name && <span className="text-sm">📍</span>}
                {hasExtras && (
                  <span className={`text-stone-500 text-xs transition-transform ${isExpanded ? 'rotate-180' : ''}`}>▾</span>
                )}
              </div>
            </div>

            {/* Expanded content */}
            {isExpanded && (
              <div className="pb-3 pl-11 space-y-2">
                {e.note && <p className="text-stone-400 text-sm">💬 {e.note}</p>}
                {e.location_name && (
                  <p className="text-stone-400 text-sm">📍 {e.location_name}</p>
                )}
                {e.photo_url && (
                  <img
                    src={e.photo_url}
                    alt="wing photo"
                    className="rounded-xl max-h-64 object-cover w-full"
                  />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
