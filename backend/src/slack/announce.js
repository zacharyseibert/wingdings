import { slackApp } from './app.js';

/**
 * Post a badge announcement to the configured Slack channel
 */
export async function announceBadgesToSlack(userId, displayName, badges) {
  if (!badges || badges.length === 0) return;

  const channelId = process.env.SLACK_CHANNEL_ID;
  if (!channelId) {
    console.warn('[slack] SLACK_CHANNEL_ID not configured, skipping badge announcement');
    return;
  }

  const badgeText = badges.map(b => `${b.emoji} *${b.name}*`).join(', ');
  const message = `🎉 *${displayName}* earned new badge${badges.length > 1 ? 's' : ''}: ${badgeText}`;

  try {
    await slackApp.client.chat.postMessage({
      channel: channelId,
      text: message,
      unfurl_links: false,
      unfurl_media: false,
    });
  } catch (err) {
    console.error('[slack] Failed to announce badges:', err);
  }
}
