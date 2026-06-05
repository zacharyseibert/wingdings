import { getUser, getHistory, getGlobalStats } from '../../db/wings.js';

export async function handleStats(body, respond) {
  const { user_id } = body;
  const [user, history, global] = await Promise.all([
    getUser(user_id),
    getHistory(user_id, 5),
    getGlobalStats(),
  ]);

  const total = user?.total_wings ?? 0;
  const name = user?.display_name ?? 'You';

  const recentLines = history.length
    ? history.map(e => {
        const sign = e.amount > 0 ? '+' : '';
        const date = new Date(e.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `• ${sign}${e.amount} wings on ${date}${e.note ? ` _(${e.note})_` : ''}`;
      }).join('\n')
    : '_No entries yet_';

  const globalPct = global.total > 0 ? ((total / global.total) * 100).toFixed(1) : '0.0';

  return respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: `🍗 ${name}'s Wing Stats` },
      },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: `*Total Wings*\n${total}` },
          { type: 'mrkdwn', text: `*Share of All Wings*\n${globalPct}% of ${global.total} total` },
        ],
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `*Recent entries:*\n${recentLines}` },
      },
    ],
  });
}
