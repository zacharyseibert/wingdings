import { supabase } from './client.js';
import { entryBadgeKeys } from './badgeRules.js';

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
  jerkin_it:    { emoji: '🫙', name: "Jerkin' It",    desc: 'Logged wings with jerk in the notes' },
  thanksgiving: { emoji: '🦃', name: 'Thanksgiving',  desc: 'Logged wings on Thanksgiving' },
  christmas:    { emoji: '🎄', name: 'Christmas',     desc: 'Logged wings on Christmas' },
  new_years:    { emoji: '🎆', name: "New Year's",    desc: "Logged wings on New Year's Day" },
  new_years_eve:{ emoji: '🥂', name: "New Year's Eve",desc: "Logged wings on New Year's Eve" },
  fourth_of_july:{ emoji: '🎇', name: '4th of July',  desc: 'Logged wings on the 4th of July' },
  halloween:    { emoji: '🎃', name: 'Halloween',     desc: 'Logged wings on Halloween' },
  super_bowl:   { emoji: '🏈', name: 'Super Bowl',    desc: 'Logged wings on Super Bowl Sunday' },
  valentines:   { emoji: '❤️',  name: "Valentine's",  desc: "Logged wings on Valentine's Day" },
  st_patricks:  { emoji: '🍀', name: "St. Patrick's", desc: "Logged wings on St. Patrick's Day" },
  cinco_de_mayo:{ emoji: '🌮', name: 'Cinco de Mayo', desc: 'Logged wings on Cinco de Mayo' },
  arbor_day:    { emoji: '🌳', name: 'Arbor Day',     desc: 'Logged wings on Arbor Day' },
  mlk_day:      { emoji: '✊', name: 'MLK Day',       desc: 'Logged wings on MLK Jr. Day' },
  birthday:     { emoji: '🎂', name: 'Birthday Wings', desc: 'Logged wings on your birthday' },
  camera_shy:   { emoji: '🙈', name: 'Camera Shy',    desc: 'Logged wings 5 times without a photo' },
  wing_buddy:   { emoji: '🤝', name: 'Wing Buddy',    desc: 'Shared a tagged wing session with someone' },
  wing_squad:   { emoji: '👥', name: 'Wing Squad',    desc: 'Ate wings in a tagged session of 4 or more' },
  oops_my_bad:  { emoji: '🙇', name: 'Oops, My Bad',  desc: 'A badge you earned slipped through the cracks. Sorry!' },
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

export async function checkAndAwardBadges(userId, { amount, totalWings, photoUrl, locationName, note, birthday, loggedAt, localHour }) {
  try {
    const newBadges = [];
    const quickChecks = entryBadgeKeys({ amount, totalWings, photoUrl, note, birthday, loggedAt, localHour });

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

    // Camera Shy: 5+ entries with no photo
    if (!photoUrl) {
      const { count } = await supabase
        .from('wing_entries')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .is('photo_url', null)
        .gt('amount', 0);
      if (count >= 5) {
        const badge = await awardBadge(userId, 'camera_shy');
        if (badge) newBadges.push({ key: 'camera_shy', ...badge });
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

// Returns [{ userId, badges }] for every participant who earned something new.
export async function awardSessionBadges(participantIds) {
  const keys = ['wing_buddy', ...(participantIds.length >= 4 ? ['wing_squad'] : [])];
  const results = [];
  for (const userId of participantIds) {
    const badges = [];
    for (const key of keys) {
      const badge = await awardBadge(userId, key);
      if (badge) badges.push({ key, ...badge });
    }
    if (badges.length) results.push({ userId, badges });
  }
  return results;
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
