'use strict';

/**
 * Which event types count as genuine *learner activity* when we learn a
 * personalized send-time from the event log (see `activeHourCounts`).
 *
 * This is a strict allow-list on purpose. System/outbound events —
 * `nudgeSent`, `nudgeFailed`, `certificatePrompted`, `certificateIssued`,
 * `badge` — are NOT learner actions; including `nudgeSent` in particular would
 * create a feedback loop where the histogram drifts toward whatever hour we
 * currently send at. Only inbound, learner-initiated events belong here.
 */
const ACTIVITY_EVENTS = [
  'dailyCheckIn',
  'lessonCompleted',
  'quizFinished',
  'checkAnswered',
  'assessmentFinished',
  'trackSelected',
  'setLite',
  'setReminders',
];

// A SQL literal list — `'a','b',...` — safe to inline because every entry is a
// hard-coded constant above (no user input ever reaches this).
const ACTIVITY_EVENTS_SQL = ACTIVITY_EVENTS.map((t) => `'${t}'`).join(',');

/**
 * The hour-of-day (0–23) an event happened, in the learner's LOCAL time.
 *
 * Events are stored in UTC — SQLite hands us a `'YYYY-MM-DD HH:MM:SS'` string
 * from `datetime('now')`, Postgres a JS `Date` (TIMESTAMPTZ). We read the UTC
 * hour from either and add `tzOffsetHours` to reach EAT. Returns null for a row
 * we can't parse, so the caller can skip it rather than mis-bucket it.
 */
function eatHourFromTs(ts, tzOffsetHours = 0) {
  let utcHour = null;
  if (ts instanceof Date) {
    utcHour = ts.getUTCHours();
  } else if (ts != null) {
    const m = /\d{4}-\d{2}-\d{2}[ T](\d{2}):/.exec(String(ts));
    if (m) utcHour = parseInt(m[1], 10);
  }
  if (utcHour == null || Number.isNaN(utcHour)) return null;
  return (((utcHour + tzOffsetHours) % 24) + 24) % 24;
}

/** Bucket event rows ({ ts }) into a 24-slot count array by local (EAT) hour. */
function bucketByEatHour(rows, tzOffsetHours = 0) {
  const counts = new Array(24).fill(0);
  for (const r of rows) {
    const h = eatHourFromTs(r.ts, tzOffsetHours);
    if (h != null) counts[h] += 1;
  }
  return counts;
}

module.exports = { ACTIVITY_EVENTS, ACTIVITY_EVENTS_SQL, eatHourFromTs, bucketByEatHour };
