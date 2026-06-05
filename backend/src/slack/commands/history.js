import { getHistory, getUser } from '../../db/wings.js';

export async function handleHistory(body, respond) {
  const { user_id } = body;
  const [entries, user] = await Promise.all([getHistory(user_id, 10), getUser(user_id)]);

  if (!entries.length) {
    return respond({ text: '🍗 You haven\'t logged any wings yet. Try `/wingdings add 6`!', response_type: 'ephemeral' });
  }

  const lines = entries.map(e => {
    const sign = e.amount > 0 ? '+' : '';
    const date = new Date(e.created_at).toLocaleString('en-US', {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
    return `• ${sign}${e.amount} wings — ${date}${e.note ? ` _(${e.note})_` : ''}`;
  }).join('\n');

  return respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🍗 Your Wing History (last ${entries.length})` },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Total: ${user?.total_wings ?? 0} wings*\n\n${lines}` },
      },
    ],
  });
}
