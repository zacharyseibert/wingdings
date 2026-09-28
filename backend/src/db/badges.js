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

function getNthWeekdayOfMonth(year, month, weekday, n) {
  // weekday: 0=Sun, 1=Mon ... 6=Sat. n: 1-based
  let count = 0;
  for (let d = 1; d <= 31; d++) {
    const date = new Date(year, month, d);
    if (date.getMonth() !== month) break;
    if (date.getDay() === weekday) {
      count++;
      if (count === n) return d;
    }
  }
  return null;
}

export async function checkAndAwardBadges(userId, { amount, totalWings, photoUrl, locationName, note, birthday, loggedAt, localHour }) {
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
    if (note && /jerk/i.test(note)) quickChecks.push('jerkin_it');
    if (birthday) {
      const [bdMM, bdDD] = birthday.split('-').map(Number);
      if (month + 1 === bdMM && day === bdDD) quickChecks.push('birthday');
    }

    // Holiday badges — based on date logged
    const logDate = new Date(loggedAt);
    const month = logDate.getMonth(); // 0-indexed
    const day = logDate.getDate();
    const year = logDate.getFullYear();

    if (month === 11 && day === 25) quickChecks.push('christmas');
    if (month === 0 && day === 1)  quickChecks.push('new_years');
    if (month === 11 && day === 31) quickChecks.push('new_years_eve');
    if (month === 6 && day === 4)  quickChecks.push('fourth_of_july');
    if (month === 9 && day === 31) quickChecks.push('halloween');
    if (month === 1 && day === 14) quickChecks.push('valentines');
    if (month === 2 && day === 17) quickChecks.push('st_patricks');
    if (month === 4 && day === 5)  quickChecks.push('cinco_de_mayo');
    // Thanksgiving: 4th Thursday of November
    if (month === 10 && day === getNthWeekdayOfMonth(year, 10, 4, 4)) quickChecks.push('thanksgiving');
    // Super Bowl: 2nd Sunday of February
    if (month === 1 && day === getNthWeekdayOfMonth(year, 1, 0, 2)) quickChecks.push('super_bowl');
    // MLK Day: 3rd Monday of January
    if (month === 0 && day === getNthWeekdayOfMonth(year, 0, 1, 3)) quickChecks.push('mlk_day');
    // Arbor Day: last Friday of April
    if (month === 3) {
      let lastFriday = null;
      for (let d = 30; d >= 1; d--) {
        const date = new Date(year, 3, d);
        if (date.getMonth() !== 3) continue;
        if (date.getDay() === 5) { lastFriday = d; break; }
      }
      if (day === lastFriday) quickChecks.push('arbor_day');
    }

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
