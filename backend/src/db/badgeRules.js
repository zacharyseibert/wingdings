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

const DEFAULT_TZ = 'America/New_York';

// Server runs in UTC. Derive the user's local wall-clock date from the hour their device reported;
// without one (Slack, backfill) fall back to DEFAULT_TZ.
export function localDateParts(loggedAt, localHour) {
  const utc = new Date(loggedAt);
  if (typeof localHour === 'number') {
    let offset = localHour - utc.getUTCHours();
    if (offset > 14) offset -= 24;
    if (offset < -12) offset += 24;
    const local = new Date(utc.getTime() + offset * 3600_000);
    return { year: local.getUTCFullYear(), month: local.getUTCMonth(), day: local.getUTCDate(), hour: localHour };
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: DEFAULT_TZ, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', hourCycle: 'h23' })
      .formatToParts(utc).map(p => [p.type, p.value])
  );
  return { year: +parts.year, month: +parts.month - 1, day: +parts.day, hour: +parts.hour };
}

function lastWeekdayOfMonth(year, month, weekday) {
  for (let d = 31; d >= 1; d--) {
    const date = new Date(Date.UTC(year, month, d));
    if (date.getUTCMonth() === month && date.getUTCDay() === weekday) return d;
  }
  return null;
}

// Badges determined purely by a single entry's data — shared with the backfill script.
export function entryBadgeKeys({ amount, totalWings, photoUrl, note, birthday, loggedAt, localHour }) {
  const { year, month, day, hour } = localDateParts(loggedAt, localHour);
  const keys = [];

  if (totalWings >= 1) keys.push('first_wing');
  if (totalWings >= 10) keys.push('ten_club');
  if (totalWings >= 100) keys.push('century');
  if (totalWings >= 500) keys.push('five_hundred');
  if (totalWings >= 1000) keys.push('one_thousand');
  if (totalWings >= 5000) keys.push('five_thousand');
  if (amount >= 20) keys.push('big_session');
  if (amount >= 50) keys.push('heavyweight');
  if (amount >= 100) keys.push('glutton');
  if (totalWings === 69) keys.push('nice');
  if (totalWings === 420) keys.push('blaze_it');
  if (note && /jerk/i.test(note)) keys.push('jerkin_it');
  if (photoUrl) keys.push('food_blogger');
  if (hour >= 0 && hour < 5) keys.push('night_owl');
  if (hour >= 6 && hour < 9) keys.push('early_bird');

  if (birthday) {
    const [bdMM, bdDD] = birthday.split('-').map(Number);
    if (month + 1 === bdMM && day === bdDD) keys.push('birthday');
  }

  if (month === 11 && day === 25) keys.push('christmas');
  if (month === 0 && day === 1)  keys.push('new_years');
  if (month === 11 && day === 31) keys.push('new_years_eve');
  if (month === 6 && day === 4)  keys.push('fourth_of_july');
  if (month === 9 && day === 31) keys.push('halloween');
  if (month === 1 && day === 14) keys.push('valentines');
  if (month === 2 && day === 17) keys.push('st_patricks');
  if (month === 4 && day === 5)  keys.push('cinco_de_mayo');
  if (month === 10 && day === getNthWeekdayOfMonth(year, 10, 4, 4)) keys.push('thanksgiving');
  if (month === 1 && day === getNthWeekdayOfMonth(year, 1, 0, 2)) keys.push('super_bowl');
  if (month === 0 && day === getNthWeekdayOfMonth(year, 0, 1, 3)) keys.push('mlk_day');
  if (month === 3 && day === lastWeekdayOfMonth(year, 3, 5)) keys.push('arbor_day');

  return keys;
}
