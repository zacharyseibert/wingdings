import { addWings, getUser } from '../../db/wings.js';

export async function handleRemove(args, body, respond) {
  const amount = parseInt(args[0], 10);

  if (!args[0] || isNaN(amount) || amount <= 0) {
    return respond({ text: '❌ Usage: `/wingdings remove <number>` — e.g. `/wingdings remove 2`', response_type: 'ephemeral' });
  }

  const { user_id } = body;

  try {
    await addWings(user_id, -amount);
  } catch (err) {
    if (err instanceof RangeError) {
      return respond({ text: `❌ ${err.message}`, response_type: 'ephemeral' });
    }
    throw err;
  }

  const user = await getUser(user_id);
  return respond({
    response_type: 'ephemeral',
    text: `✅ Removed ${amount} wing${amount === 1 ? '' : 's'}. Your new total: *${user.total_wings}*`,
  });
}
