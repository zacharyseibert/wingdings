import Leaderboard from '../components/Leaderboard';
import StatsBar from '../components/StatsBar';
import FunStats from '../components/FunStats';
import ActivityFeed from '../components/ActivityFeed';
import WingsChart from '../components/WingsChart';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-7xl mb-3 wing-pulse inline-block">🍗</div>
        <h1 className="text-4xl font-bold tracking-tight text-wing-text">Wingdings</h1>
        <p className="text-wing-textSecondary mt-2">Track every wing. Crown every champion.</p>
        <p className="text-wing-textSecondary text-sm mt-3">
          Use <code className="bg-wing-card border border-wing-border px-1.5 py-0.5 rounded text-wing-primary shadow-sm">/wingdings</code> in Slack to log your wings.
        </p>
      </div>

      {/* Global stats */}
      <StatsBar apiUrl={API_URL} />

      {/* Fun stats */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-wing-text">📊 Records</h2>
        <FunStats apiUrl={API_URL} />
      </section>

      {/* Wings over time chart */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-4 text-wing-text">📈 Wings Over Time</h2>
        <div className="bg-wing-card border border-wing-border rounded-xl p-4 shadow-sm">
          <WingsChart apiUrl={API_URL} />
        </div>
      </section>

      {/* Leaderboard + Activity feed side by side on wider screens */}
      <div className="grid grid-cols-1 gap-8">
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2 text-wing-text">
            <span>🏆</span> Leaderboard
            <span className="ml-auto text-xs text-wing-success font-normal flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-wing-success rounded-full animate-ping inline-block" />
              Live
            </span>
          </h2>
          <Leaderboard />
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
            <ActivityFeed apiUrl={API_URL} />
          </div>
        </section>
      </div>

      <footer className="mt-12 text-center text-wing-textSecondary text-xs">
        Wingdings · Built with 🍗 and Slack
      </footer>
    </main>
  );
}
