import { slackApp } from './app.js';

/**
 * Post a wing log announcement from the mobile app to Slack
 */
export async function announceWingsToSlack(displayName, amount, { note, locationName, photoUrl, totalWings } = {}) {
  const channelId = process.env.SLACK_CHANNEL_ID;
  if (!channelId) return;

  const parts = [`📱 *${displayName}* just logged *${amount} wing${amount === 1 ? '' : 's'}* via the app!`];
  if (locationName) parts.push(`📍 ${locationName}`);
  if (note) parts.push(`💬 ${note}`);
  parts.push(`_(${totalWings.toLocaleString()} total)_`);

  const blocks = [
    {
      type: 'section',
      text: { type: 'mrkdwn', text: parts.join('\n') },
    },
  ];

  if (photoUrl) {
    blocks.push({
      type: 'image',
      image_url: photoUrl,
      alt_text: 'Wing photo',
    });
  }

  try {
    await slackApp.client.chat.postMessage({
      channel: channelId,
      text: `📱 ${displayName} logged ${amount} wings via the app`,
      blocks,
      unfurl_links: false,
      unfurl_media: false,
    });
  } catch (err) {
    console.error('[slack] Failed to announce wings:', err);
  }
}

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
