// Replays every wing entry to find badges users qualified for but never received.
// Dry run by default; pass --apply to insert the missing badges.
// Run: node --env-file=.env scripts/backfill-badges.js [--apply]
import { entryBadgeKeys } from '../src/db/badgeRules.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const APPLY = process.argv.includes('--apply');
const headers = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, 'Content-Type': 'application/json' };

// Time-of-day badges depend on the device's local hour, which isn't stored; #1 depends on past leaderboard state.
const SKIP = new Set(['night_owl', 'early_bird', 'number_one']);

// When each badge went live (from git history). Misses after launch earn "Oops, My Bad";
// qualifying entries from before launch are still awarded, but don't count as our mistake.
const DEFAULT_LAUNCH = '2026-06-06T02:00:00Z';
const LAUNCH = {
  wing_mayor: '2026-07-02T15:03:24Z',
  nice: '2026-07-13T15:30:47Z',
  blaze_it: '2026-07-13T15:30:47Z',
  jerkin_it: '2026-07-22T16:06:34Z',
  ...Object.fromEntries(['thanksgiving', 'christmas', 'new_years', 'new_years_eve', 'fourth_of_july', 'halloween',
    'super_bowl', 'valentines', 'st_patricks', 'cinco_de_mayo'].map(k => [k, '2026-09-28T18:08:09Z'])),
  arbor_day: '2026-09-28T18:15:06Z',
  mlk_day: '2026-09-28T18:15:06Z',
  birthday: '2026-09-28T18:26:41Z',
  camera_shy: '2026-09-28T19:36:50Z',
};

async function selectAll(table, select, filters = '') {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=${select}&${filters}`, {
      headers: { ...headers, Range: `${from}-${from + 999}` },
    });
    if (!res.ok) throw new Error(`${table}: ${res.status} ${await res.text()}`);
    const page = await res.json();
    rows.push(...page);
    if (page.length < 1000) return rows;
  }
}

async function insertBadges(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/badges?on_conflict=user_id,badge_key`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
    body: JSON.stringify(rows),
  });
  if (!res.ok) throw new Error(`insert: ${res.status} ${await res.text()}`);
}

function qualifyingKeys(entry, state, birthday) {
  state.total += entry.amount;
  if (entry.amount <= 0) return [];

  const keys = entryBadgeKeys({
    amount: entry.amount,
    totalWings: state.total,
    photoUrl: entry.photo_url,
    note: entry.note,
    birthday,
    loggedAt: entry.created_at,
  });

  if (entry.location_name) {
    state.locations[entry.location_name] = (state.locations[entry.location_name] ?? 0) + 1;
    if (Object.keys(state.locations).length >= 3) keys.push('wing_tourist');
    if (state.locations[entry.location_name] >= 5) keys.push('wing_mayor');
  }
  if (!entry.photo_url && ++state.noPhoto >= 5) keys.push('camera_shy');

  return keys.filter(k => !SKIP.has(k));
}

async function main() {
  const [users, entries, badges] = await Promise.all([
    selectAll('users', 'id,display_name,username,birthday'),
    selectAll('wing_entries', 'user_id,amount,note,photo_url,location_name,created_at', 'order=created_at.asc'),
    selectAll('badges', 'user_id,badge_key'),
  ]);

  const owned = new Set(badges.map(b => `${b.user_id}:${b.badge_key}`));
  const entriesByUser = {};
  for (const e of entries) (entriesByUser[e.user_id] ??= []).push(e);
  const toInsert = [];
  const report = [];

  for (const user of users) {
    const state = { total: 0, locations: {}, noPhoto: 0 };
    const found = {}; // key -> { earnedAt, afterLaunch }

    for (const entry of entriesByUser[user.id] ?? []) {
      for (const key of qualifyingKeys(entry, state, user.birthday)) {
        if (owned.has(`${user.id}:${key}`)) continue;
        const afterLaunch = entry.created_at >= (LAUNCH[key] ?? DEFAULT_LAUNCH);
        if (!found[key]) found[key] = { earnedAt: entry.created_at, afterLaunch };
        else if (afterLaunch) found[key].afterLaunch = true;
      }
    }

    const keys = Object.keys(found);
    if (!keys.length) continue;

    const missed = keys.filter(k => found[k].afterLaunch);
    for (const key of keys) toInsert.push({ user_id: user.id, badge_key: key, earned_at: found[key].earnedAt });
    const getsOops = missed.length > 0 && !owned.has(`${user.id}:oops_my_bad`);
    if (getsOops) toInsert.push({ user_id: user.id, badge_key: 'oops_my_bad', earned_at: new Date().toISOString() });

    report.push({
      user: user.display_name || user.username || user.id,
      missed: missed.join(', '),
      preLaunch: keys.filter(k => !found[k].afterLaunch).join(', '),
      oops: getsOops ? 'yes' : '',
    });
  }

  console.table(report);
  console.log(`${toInsert.length} badge rows across ${report.length} users (${report.filter(r => r.oops).length} get Oops, My Bad)`);

  if (!APPLY) {
    console.log('Dry run. Re-run with --apply to insert.');
    return;
  }
  for (let i = 0; i < toInsert.length; i += 500) await insertBadges(toInsert.slice(i, i + 500));
  console.log('Inserted.');
}

main().catch(err => { console.error(err); process.exit(1); });
