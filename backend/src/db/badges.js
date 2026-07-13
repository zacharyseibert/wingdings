import { supabase } from './client.js';

export const BADGE_DEFINITIONS = {
  first_wing:   { emoji: '🍗', name: 'First Wing',    desc: 'Logged your first wings' },
  ten_club:     { emoji: '🔟', name: '10 Club',       desc: 'Eaten 10 wings total' },
  century:      { emoji: '💯', name: 'Century',       desc: 'Eaten 100 wings total' },
  five_hundred: { emoji: '🚀', name: '500 Club',      desc: 'Eaten 500 wings total' },
  one_thousand: { emoji: '👑', name: '1,000 Wings',   desc: 'Eaten 1,000 wings total' },
  five_thousand:{ emoji: '🌟', name: '5,000 Wings',   desc: 'Eaten 5,000 wings total' },
  big_session:  { emoji: '💥', name: 'Big Session',   desc: 'Ate 20+ wings in one sitting' },
  heavyweight:  { emoji: '🏋️', name: 'Heavyweight',   desc: 'Ate 50+ wings in one sitting' },
  glutton:      { emoji: '👹', name: 'The Glutton',   desc: 'Ate 100+ wings in one sitting' },
  food_blogger: { emoji: '📸', name: 'Food Blogger',  desc: 'Attached a photo to a log' },
  wing_tourist: { emoji: '📍', name: 'Wing Tourist',  desc: 'Logged from 3 different locations' },
  night_owl:    { emoji: '🌙', name: 'Night Owl',     desc: 'Logged wings after midnight' },
  early_bird:   { emoji: '🌅', name: 'Early Bird',    desc: 'Logged wings before 9am' },
  number_one:   { emoji: '🏆', name: '#1',            desc: 'Held the top leaderboard spot' },
  wing_mayor:   { emoji: '🦅', name: 'Wing Mayor',    desc: 'Logged wings at the same spot 5 times' },
  nice:         { emoji: '😏', name: 'Nice!',         desc: 'Reached exactly 69 wings' },
  blaze_it:     { emoji: '🌿', name: 'Blaze It',      desc: 'Reached exactly 420 wings' },
};

async function awardBadge(userId, badgeKey) {
  const { error } = await supabase
    .from('badges')
    .insert({ user_id: userId, badge_key: badgeKey })
    .select()
    .single();

  if (error && error.code !== '23505') { // 23505 = unique violation, badge already exists
    console.error('[badges] award error:', error);
    return null;
  }

  return error?.code === '23505' ? null : BADGE_DEFINITIONS[badgeKey];
}

export async function checkAndAwardBadges(userId, { amount, totalWings, photoUrl, locationName, loggedAt, localHour }) {
  try {
    const newBadges = [];
    const hour = localHour ?? new Date(loggedAt).getHours();

    // Quick checks - these don't need DB queries
    const quickChecks = [];

    if (totalWings >= 1) quickChecks.push('first_wing');
    if (totalWings >= 10) quickChecks.push('ten_club');
    if (totalWings >= 100) quickChecks.push('century');
    if (totalWings >= 500) quickChecks.push('five_hundred');
    if (totalWings >= 1000) quickChecks.push('one_thousand');
    if (totalWings >= 5000) quickChecks.push('five_thousand');

    if (amount >= 20) quickChecks.push('big_session');
    if (amount >= 50) quickChecks.push('heavyweight');
    if (amount >= 100) quickChecks.push('glutton');

    if (totalWings === 69) quickChecks.push('nice');
    if (totalWings === 420) quickChecks.push('blaze_it');

    if (photoUrl) quickChecks.push('food_blogger');
    if (hour >= 0 && hour < 5) quickChecks.push('night_owl');
    if (hour >= 6 && hour < 9) quickChecks.push('early_bird');

    // Award quick checks
    for (const key of quickChecks) {
      const badge = await awardBadge(userId, key);
      if (badge) newBadges.push({ key, ...badge });
    }

    // Check wing tourist + wing mayor (needs DB query)
    if (locationName) {
      const { data: locationEntries } = await supabase
        .from('wing_entries')
        .select('location_name')
        .eq('user_id', userId)
        .not('location_name', 'is', null);

      if (locationEntries) {
        const uniqueLocations = new Set(locationEntries.map(e => e.location_name));
        if (uniqueLocations.size >= 3) {
          const badge = await awardBadge(userId, 'wing_tourist');
          if (badge) newBadges.push({ key: 'wing_tourist', ...badge });
        }

        // Wing Mayor: 5+ visits to the same location
        const locationCounts = {};
        for (const e of locationEntries) {
          locationCounts[e.location_name] = (locationCounts[e.location_name] || 0) + 1;
        }
        if (Object.values(locationCounts).some(count => count >= 5)) {
          const badge = await awardBadge(userId, 'wing_mayor');
          if (badge) newBadges.push({ key: 'wing_mayor', ...badge });
        }
      }
    }

    // Check #1 (needs DB query)
    const { data: top } = await supabase
      .from('users')
      .select('id')
      .order('total_wings', { ascending: false })
      .limit(1)
      .single();

    if (top?.id === userId) {
      const badge = await awardBadge(userId, 'number_one');
      if (badge) newBadges.push({ key: 'number_one', ...badge });
    }

    return newBadges;
  } catch (err) {
    console.error('[badges] checkAndAward error:', err);
    return [];
  }
}

export async function getUserBadges(userId) {
  const { data } = await supabase
    .from('badges')
    .select('badge_key, earned_at')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });
  return (data ?? []).map(b => ({ key: b.badge_key, earned_at: b.earned_at, ...BADGE_DEFINITIONS[b.badge_key] }));
}

export async function getRecentBadgesForUsers(userIds) {
  if (!userIds.length) return {};
  const { data } = await supabase
    .from('badges')
    .select('user_id, badge_key, earned_at')
    .in('user_id', userIds)
    .order('earned_at', { ascending: false })
    .limit(userIds.length * 3);

  const result = {};
  for (const row of data ?? []) {
    if (!result[row.user_id]) result[row.user_id] = [];
    if (result[row.user_id].length < 3) {
      result[row.user_id].push({ key: row.badge_key, ...BADGE_DEFINITIONS[row.badge_key] });
    }
  }
  return result;
}
