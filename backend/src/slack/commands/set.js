import { upsertUser, setWings, getUser } from '../../db/wings.js';

// Only allow users in this list to use /wingdings set
// Add Slack user IDs (e.g. "U012AB3CD") — find yours via /wingdings stats
const ADMIN_IDS = process.env.ADMIN_SLACK_IDS
  ? process.env.ADMIN_SLACK_IDS.split(',').map(s => s.trim())
  : [];

export async function handleSet(args, body, client, respond) {
  const { user_id } = body;

  if (ADMIN_IDS.length > 0 && !ADMIN_IDS.includes(user_id)) {
    return respond({ text: '❌ You don\'t have permission to use `/wingdings set`.', response_type: 'ephemeral' });
  }

  // Accepts: /wingdings set @mention 42  OR  /wingdings set 42 (for yourself)
  let targetId = user_id;
  let targetName = null;
  let amountArg = args[0];

  if (args[0]?.startsWith('<@') && args[1]) {
    // Parse Slack user mention: <@U012AB3CD> or <@U012AB3CD|username>
    const match = args[0].match(/^<@([A-Z0-9]+)/);
    if (match) targetId = match[1];
    amountArg = args[1];
  }

  const target = parseInt(amountArg, 10);
  if (isNaN(target) || target < 0) {
    return respond({ text: '❌ Usage: `/wingdings set [@user] <number>`', response_type: 'ephemeral' });
  }

  // Ensure user row exists before setting wings
  try {
    const profile = await client.users.info({ user: targetId });
    targetName = profile.user.profile.display_name || profile.user.real_name;
    await upsertUser({
      id: targetId,
      username: profile.user.name,
      display_name: targetName,
      avatar_url: profile.user.profile.image_72,
    });
  } catch (_) { /* user may already exist */ }

  await setWings(targetId, target);
  const updated = await getUser(targetId);
  const label = targetName ? `*${targetName}*` : 'their';

  return respond({
    response_type: 'ephemeral',
    text: `✅ Set ${label} wing count to *${updated.total_wings}*.`,
  });
}
