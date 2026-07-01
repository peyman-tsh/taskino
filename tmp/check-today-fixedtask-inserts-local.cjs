const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  throw new Error('Refusing non-local MongoDB URI');
}

const now = new Date('2026-07-01T16:08:00.000Z'); // 2026-07-01 19:38 Tehran

const persianFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tehran',
  calendar: 'persian',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
const gregorianFormatter = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Asia/Tehran',
  calendar: 'gregory',
  numberingSystem: 'latn',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
});
function parts(formatter, date) {
  return Object.fromEntries(formatter.formatToParts(date).filter((p) => p.type !== 'literal').map((p) => [p.type, Number(p.value)]));
}
function weekdayTehran(date) {
  const p = parts(gregorianFormatter, date);
  return new Date(Date.UTC(p.year, p.month - 1, p.day)).getUTCDay();
}
function sameTehranDay(dateA, dateB) {
  const a = parts(gregorianFormatter, dateA);
  const b = parts(gregorianFormatter, dateB);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}
function seriesKey(doc) {
  const sourceIdentity = doc.originalSourceRow ?? doc.sourceRow ?? `${doc.title}:${doc.description}`;
  return [doc.recurrence, doc.assignedTo?.toString?.() ?? '', doc.createdBy?.toString?.() ?? '', doc.sourceExcel ?? '', doc.sourceSheet ?? '', sourceIdentity].join('|');
}
function shouldGenerateToday(doc, today) {
  const hasSchedule = Boolean(doc.scheduleConfig?.weekdays?.length || doc.scheduleConfig?.monthDays?.length);
  if (!hasSchedule) {
    if (doc.recurrence === 'daily') return true;
    if (doc.recurrence === 'weekly') return today.weekday === 6;
    return today.persianDay === 1;
  }
  if (doc.recurrence === 'monthly') {
    return Boolean(doc.scheduleConfig?.monthDays?.includes(today.persianDay));
  }
  return Boolean(doc.scheduleConfig?.weekdays?.includes(today.weekday));
}
function isConfiguredDailyBlockStillOpen(doc) {
  const weekdays = doc.scheduleConfig?.weekdays ?? [];
  const hasDailyGap = doc.recurrence === 'daily' && weekdays.length > 0 && new Set(weekdays).size < 7;
  return Boolean(doc.isActive && hasDailyGap && doc.endDate instanceof Date && doc.endDate.getTime() > now.getTime());
}
function dedupeLatest(candidates) {
  const latestBySeries = new Map();
  for (const candidate of candidates) {
    const key = seriesKey(candidate);
    const existing = latestBySeries.get(key);
    if (!existing || (candidate.isActive && !existing.isActive)) latestBySeries.set(key, candidate);
  }
  return [...latestBySeries.values()];
}

async function main() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('fixedtasktemplates');
  const persian = parts(persianFormatter, now);
  const gregorian = parts(gregorianFormatter, now);
  const today = { weekday: weekdayTehran(now), persianDay: persian.day };

  const dailyCandidates = dedupeLatest(await collection.find({
    recurrence: 'daily',
    $or: [{ isActive: true }, { 'scheduleConfig.weekdays.0': { $exists: true } }],
  }).sort({ createdAt: -1, _id: -1 }).toArray());
  const weeklyCandidates = dedupeLatest(await collection.find({
    recurrence: 'weekly',
    $or: [{ isActive: true }, { 'scheduleConfig.weekdays.0': { $exists: true } }, { 'scheduleConfig.monthDays.0': { $exists: true } }],
  }).sort({ createdAt: -1, _id: -1 }).toArray());
  const monthlyCandidates = dedupeLatest(await collection.find({
    recurrence: 'monthly',
    $or: [{ isActive: true }, { 'scheduleConfig.weekdays.0': { $exists: true } }, { 'scheduleConfig.monthDays.0': { $exists: true } }],
  }).sort({ createdAt: -1, _id: -1 }).toArray());

  function expectedFor(recurrence, candidates) {
    const rows = candidates.filter((doc) => {
      if (!shouldGenerateToday(doc, today)) return false;
      if (doc.startDate instanceof Date && sameTehranDay(doc.startDate, now)) return false;
      if (isConfiguredDailyBlockStillOpen(doc)) return false;
      return true;
    });
    return { recurrence, candidates: candidates.length, shouldInsert: rows.length, rows };
  }

  const daily = expectedFor('daily', dailyCandidates);
  const weekly = expectedFor('weekly', weeklyCandidates);
  const monthly = expectedFor('monthly', monthlyCandidates);

  const output = {
    nowUtc: now.toISOString(),
    tehranGregorian: `${gregorian.year}-${String(gregorian.month).padStart(2, '0')}-${String(gregorian.day).padStart(2, '0')} ${String(gregorian.hour).padStart(2, '0')}:${String(gregorian.minute).padStart(2, '0')}`,
    tehranPersian: `${persian.year}/${String(persian.month).padStart(2, '0')}/${String(persian.day).padStart(2, '0')} ${String(persian.hour).padStart(2, '0')}:${String(persian.minute).padStart(2, '0')}`,
    weekdayCode: today.weekday,
    weekdayMeaning: '0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday',
    counts: {
      daily: daily.shouldInsert,
      weekly: weekly.shouldInsert,
      monthly: monthly.shouldInsert,
      total: daily.shouldInsert + weekly.shouldInsert + monthly.shouldInsert,
    },
    candidates: {
      daily: daily.candidates,
      weekly: weekly.candidates,
      monthly: monthly.candidates,
    },
    sampleIds: {
      daily: daily.rows.slice(0, 10).map((doc) => ({ _id: doc._id.toString(), title: doc.title, weekdays: doc.scheduleConfig?.weekdays ?? null })),
      weekly: weekly.rows.slice(0, 10).map((doc) => ({ _id: doc._id.toString(), title: doc.title, weekdays: doc.scheduleConfig?.weekdays ?? null })),
      monthly: monthly.rows.slice(0, 10).map((doc) => ({ _id: doc._id.toString(), title: doc.title, monthDays: doc.scheduleConfig?.monthDays ?? null })),
    },
  };
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
