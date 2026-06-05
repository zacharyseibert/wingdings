import { App, ExpressReceiver } from '@slack/bolt';
import { handleAdd } from './commands/add.js';
import { handleRemove } from './commands/remove.js';
import { handleStats } from './commands/stats.js';
import { handleLeaderboard } from './commands/leaderboard.js';
import { handleHistory } from './commands/history.js';
import { handleSet } from './commands/set.js';
import { handleHelp } from './commands/help.js';

export const receiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  // We expose the Express app so we can attach our own API routes
});

export const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  receiver,
});

slackApp.command('/wingdings', async ({ command, ack, respond, client }) => {
  await ack();

  const [subcommand, ...args] = command.text.trim().split(/\s+/);

  try {
    switch (subcommand?.toLowerCase()) {
      case 'add':
        return await handleAdd(args, command, client, respond);
      case 'remove':
        return await handleRemove(args, command, respond);
      case 'stats':
        return await handleStats(command, respond);
      case 'leaderboard':
        return await handleLeaderboard(respond);
      case 'history':
        return await handleHistory(command, respond);
      case 'set':
        return await handleSet(args, command, client, respond);
      case 'help':
      case '':
      case undefined:
        return await handleHelp(respond);
      default:
        return await respond({
          response_type: 'ephemeral',
          text: `❌ Unknown subcommand \`${subcommand}\`. Try \`/wingdings help\`.`,
        });
    }
  } catch (err) {
    console.error(`[wingdings] Error handling "${subcommand}":`, err);
    return respond({
      response_type: 'ephemeral',
      text: '❌ Something went wrong. Please try again.',
    });
  }
});
