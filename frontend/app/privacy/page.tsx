export const metadata = {
  title: 'Privacy Policy — Wingdings',
};

export default function PrivacyPolicy() {
  const updated = 'June 5, 2026';

  return (
    <main className="max-w-2xl mx-auto px-4 py-12">
      <a href="/" className="text-wing-orange text-sm mb-8 inline-block">← Back to Wingdings</a>
      <h1 className="text-3xl font-bold text-white mb-2">Privacy Policy</h1>
      <p className="text-stone-500 text-sm mb-10">Last updated: {updated}</p>

      <div className="space-y-8 text-stone-300 leading-relaxed">
        <section>
          <h2 className="text-white font-semibold text-lg mb-3">What Wingdings is</h2>
          <p>Wingdings is a wing-eating tracker for groups. It lets users log how many chicken wings they've eaten and view a leaderboard with friends via Slack and a companion iOS app.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">What we collect</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white">Email address</strong> — used to create your account and link your Slack and mobile identities.</li>
            <li><strong className="text-white">Wing entries</strong> — the number of wings you log and when you logged them.</li>
            <li><strong className="text-white">Slack profile data</strong> — your Slack display name and profile photo, fetched when you use the Slack bot.</li>
            <li><strong className="text-white">Push notification token</strong> — stored to send you wing alerts when friends log wings. Only collected if you grant permission.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">How we use it</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>To display your stats and rank on the leaderboard</li>
            <li>To send push notifications when others log wings (only if you opt in)</li>
            <li>To link your Slack and mobile accounts by email so your history is unified</li>
          </ul>
          <p className="mt-3">We do not sell your data. We do not use it for advertising.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Third-party services</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li><strong className="text-white">Supabase</strong> — stores all user data and wing entries. <a href="https://supabase.com/privacy" className="text-wing-orange underline" target="_blank" rel="noopener noreferrer">Supabase Privacy Policy</a></li>
            <li><strong className="text-white">Slack</strong> — used for the slash command integration. <a href="https://slack.com/privacy-policy" className="text-wing-orange underline" target="_blank" rel="noopener noreferrer">Slack Privacy Policy</a></li>
            <li><strong className="text-white">Expo</strong> — used to deliver push notifications to the iOS app. <a href="https://expo.dev/privacy" className="text-wing-orange underline" target="_blank" rel="noopener noreferrer">Expo Privacy Policy</a></li>
          </ul>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Data deletion</h2>
          <p>To delete your account and all associated data, email <a href="mailto:zacharyseibert@gmail.com" className="text-wing-orange underline">zacharyseibert@gmail.com</a> and we'll remove it within 30 days.</p>
        </section>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Contact</h2>
          <p>Questions? <a href="mailto:zacharyseibert@gmail.com" className="text-wing-orange underline">zacharyseibert@gmail.com</a></p>
        </section>
      </div>
    </main>
  );
}
