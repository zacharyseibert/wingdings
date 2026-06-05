export async function handleHelp(respond) {
  return respond({
    response_type: 'ephemeral',
    blocks: [
      {
        type: 'header',
        text: { type: 'plain_text', text: '🍗 Wingdings — Commands' },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: [
            '`/wingdings add <n>` — Log _n_ wings you just ate',
            '`/wingdings remove <n>` — Oops, take back _n_ wings',
            '`/wingdings stats` — See your personal stats',
            '`/wingdings leaderboard` — Top 10 wing eaters (public)',
            '`/wingdings history` — Your last 10 entries',
            '`/wingdings set [@user] <n>` — Admin: set a total directly',
            '`/wingdings help` — This message',
          ].join('\n'),
        },
      },
    ],
  });
}
