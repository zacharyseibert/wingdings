'use client';

import { useState } from 'react';
import Leaderboard from './Leaderboard';
import StatsBar from './StatsBar';
import FunStats from './FunStats';
import ActivityFeed from './ActivityFeed';
import WingsChart from './WingsChart';

const HWFFL_COMPETITION_ID = 1; // HWFFL competition ID

export default function ClientHome({ apiUrl }: { apiUrl: string }) {
  const [viewMode, setViewMode] = useState<'competition' | 'global'>('competition');

  const competitionId = viewMode === 'competition' ? HWFFL_COMPETITION_ID : null;
  const statsTitle = viewMode === 'competition' ? 'Competition Stats' : 'Global Stats';

  return (
    <>
      {/* Toggle */}
      <div className="flex justify-center gap-3 mb-8">
        <button
          onClick={() => setViewMode('competition')}
          className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            viewMode === 'competition'
              ? 'bg-wing-accent text-white shadow-sm'
              : 'bg-wing-card text-wing-textSecondary border border-wing-border hover:border-wing-accent'
          }`}
        >
          🏆 HWFFL Competition
        </button>
        <button
          onClick={() => setViewMode('global')}
          className={`px-6 py-2.5 rounded-xl font-semibold text-sm transition-all ${
            viewMode === 'global'
              ? 'bg-wing-accent text-white shadow-sm'
              : 'bg-wing-card text-wing-textSecondary border border-wing-border hover:border-wing-accent'
          }`}
        >
          🌎 Global
        </button>
      </div>

      {/* Stats section title */}
      <h2 className="text-2xl font-bold text-wing-text mb-6 text-center">{statsTitle}</h2>

      {/* Global stats */}
      <StatsBar apiUrl={apiUrl} competitionId={competitionId} />

      {/* Fun stats */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-wing-text">📊 Records</h2>
        <FunStats apiUrl={apiUrl} competitionId={competitionId} />
      </section>

      {/* Wings over time chart */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-wing-text">📈 Wings Over Time</h2>
        <div className="bg-wing-card border border-wing-border rounded-xl p-4 shadow-sm">
          <WingsChart apiUrl={apiUrl} competitionId={competitionId} />
        </div>
      </section>

      {/* Leaderboard + Activity feed */}
      <div className="grid grid-cols-1 gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-wing-text">
            <span>🏆</span> Leaderboard
            <span className="ml-auto text-xs text-wing-success font-normal flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-wing-success rounded-full animate-ping inline-block" />
              Live
            </span>
          </h2>
          <Leaderboard competitionId={competitionId} />
        </section>

        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-wing-text">
            <span>⚡</span> Recent Activity
            <span className="ml-auto text-xs text-wing-success font-normal flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-wing-success rounded-full animate-ping inline-block" />
              Live
            </span>
          </h2>
          <div className="bg-wing-card border border-wing-border rounded-xl p-4 shadow-sm">
            <ActivityFeed apiUrl={apiUrl} competitionId={competitionId} />
          </div>
        </section>
      </div>
    </>
  );
}
