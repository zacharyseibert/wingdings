import { upsertUser, addWings, getUser } from '../../db/wings.js';

export async function handleAdd(args, body, client, respond) {
  const amount = parseInt(args[0], 10);

  if (!args[0] || isNaN(amount) || amount <= 0) {
    return respond({ text: '❌ Usage: `/wingdings add <number>` — e.g. `/wingdings add 6`', response_type: 'ephemeral' });
  }
  if (amount > 1000) {
    return respond({ text: '❌ That\'s a lot of wings. Max single entry is 1,000.', response_type: 'ephemeral' });
  }

  const { user_id, user_name } = body;

  // Fetch richer profile data (display name + avatar)
  let displayName = user_name;
  let avatarUrl = null;
  let email = null;
  try {
    const profile = await client.users.info({ user: user_id });
    displayName = profile.user.profile.display_name || profile.user.real_name || user_name;
    avatarUrl = profile.user.profile.image_72;
    email = profile.user.profile.email ?? null;
  } catch (_) { /* non-fatal */ }

  await upsertUser({ id: user_id, username: user_name, display_name: displayName, avatar_url: avatarUrl, email });
  await addWings(user_id, amount);

  const user = await getUser(user_id);
  const emoji = amount >= 20 ? '🍗🔥' : '🍗';

  return respond({
    response_type: 'in_channel',
    text: `${emoji} *${displayName}* just crushed *${amount} wing${amount === 1 ? '' : 's'}*! Their total: *${user.total_wings}* 🏆`,
  });
}
