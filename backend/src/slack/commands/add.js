import { upsertUser, addWings, getUser } from '../../db/wings.js';
import { sendWingNotification } from '../../push.js';
import { checkAndAwardBadges } from '../../db/badges.js';
import { getCompetitionByCode } from '../../db/competitions.js';
import { supabase } from '../../db/client.js';

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

  // Ensure Slack users are in HWFFL competition
  const hwffl = await getCompetitionByCode('HWFFL-2026');
  if (hwffl) {
    await supabase
      .from('users')
      .update({ competition_id: hwffl.id })
      .eq('id', user_id)
      .is('competition_id', null); // Only update if not already in a competition
  }

  await addWings(user_id, amount);

  const user = await getUser(user_id);

  // Check for new badges
  const newBadges = await checkAndAwardBadges(user_id, {
    amount,
    totalWings: user.total_wings,
    photoUrl: null,
    locationName: null,
    loggedAt: new Date().toISOString(),
    localHour: new Date().getHours(),
  });

  if (user.competition_id !== hwffl?.id) {
    return respond({ response_type: 'ephemeral', text: `✅ Logged ${amount} wing${amount === 1 ? '' : 's'}! Your total: *${user.total_wings}*` });
  }

  const emoji = amount >= 20 ? '🍗🔥' : '🍗';
  let message = `${emoji} *${displayName}* just crushed *${amount} wing${amount === 1 ? '' : 's'}*! Their total: *${user.total_wings}* 🏆`;

  // Add badge announcements
  if (newBadges.length > 0) {
    const badgeText = newBadges.map(b => `${b.emoji} *${b.name}*`).join(', ');
    message += `\n🎉 New badge${newBadges.length > 1 ? 's' : ''}: ${badgeText}`;
  }

  // Send push notifications to everyone else (non-blocking)
  sendWingNotification({ loggerUserId: user_id, loggerName: displayName, amount }).catch(console.error);

  return respond({
    response_type: 'in_channel',
    text: message,
  });
}
