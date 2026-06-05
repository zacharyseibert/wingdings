import { getLeaderboard } from '../../db/wings.js';

const MEDALS = ['🥇', '🥈', '🥉'];

export async function handleLeaderboard(respond) {
  const board = await getLeaderboard(10);

  if (board.length === 0) {
    return respond({ text: '🍗 No wings logged yet — be the first!', response_type: 'ephemeral' });
  }

  const rows = board.map((u, i) => {
    const medal = MEDALS[i] ?? `${i + 1}.`;
    return `${medal} *${u.display_name || u.username}* — ${u.total_wings} wings`;
  }).join('\n');

  return respond({
    response_type: 'in_channel',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🏆 Wingdings Leaderboard' },
      },
      {
        type: 'section',
        text: { type: 'mrkdwn', text: rows },
      },
    ],
  });
}
