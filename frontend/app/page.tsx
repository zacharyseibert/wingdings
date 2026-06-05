import Leaderboard from '../components/Leaderboard';
import StatsBar from '../components/StatsBar';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? '';

export default function Home() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="text-7xl mb-3 wing-pulse inline-block">🍗</div>
        <h1 className="text-4xl font-bold tracking-tight">Wingdings</h1>
        <p className="text-stone-400 mt-2">Track every wing. Crown every champion.</p>
        <p className="text-stone-500 text-sm mt-3">
          Use <code className="bg-wing-card border border-wing-border px-1.5 py-0.5 rounded text-wing-orange">/wingdings</code> in Slack to log your wings.
        </p>
      </div>

      {/* Global stats */}
      <StatsBar apiUrl={API_URL} />

      {/* Leaderboard */}
      <section>
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span>🏆</span> Leaderboard
          <span className="ml-auto text-xs text-green-500 font-normal flex items-center gap-1">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping inline-block" />
            Live
          </span>
        </h2>
        <Leaderboard />
      </section>

      <footer className="mt-12 text-center text-stone-600 text-xs">
        Wingdings · Built with 🍗 and Slack
      </footer>
    </main>
  );
}
