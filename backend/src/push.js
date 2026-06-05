import { supabase } from './db/client.js';

export async function sendWingNotification({ loggerUserId, loggerName, amount }) {
  // Fetch all push tokens except the user who just logged
  const { data: users } = await supabase
    .from('users')
    .select('push_token')
    .neq('id', loggerUserId)
    .not('push_token', 'is', null);

  if (!users?.length) return;

  const tokens = users.map(u => u.push_token).filter(Boolean);
  if (!tokens.length) return;

  const messages = tokens.map(to => ({
    to,
    title: '🍗 Wings Alert',
    body: `${loggerName} just crushed ${amount} wing${amount === 1 ? '' : 's'}!`,
    sound: 'default',
    data: { type: 'wing_log' },
  }));

  // Send in batches of 100 (Expo limit)
  for (let i = 0; i < messages.length; i += 100) {
    const batch = messages.slice(i, i + 100);
    try {
      await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(batch),
      });
    } catch (err) {
      console.error('[push] failed to send batch:', err);
    }
  }
}
