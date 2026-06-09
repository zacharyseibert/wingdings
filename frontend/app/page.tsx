import ClientHome from '../components/ClientHome';

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

      <ClientHome apiUrl={API_URL} />

      <footer className="mt-12 text-center text-wing-textSecondary text-xs">
        Wingdings · Built with 🍗 and Slack
      </footer>
    </main>
  );
}
