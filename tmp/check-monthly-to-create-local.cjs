const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uri = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const now = new Date('2026-07-02T16:00:00.000Z'); // 2026-07-02 19:30 Asia/Tehran

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
function seriesKey(doc) {
  const sourceIdentity = doc.originalSourceRow ?? doc.sourceRow ?? `${doc.title}:${doc.description}`;
  return [doc.recurrence, doc.assignedTo?.toString?.() ?? '', doc.createdBy?.toString?.() ?? '', doc.sourceExcel ?? '', doc.sourceSheet ?? '', sourceIdentity].join('|');
}
function sameTehranDay(dateA, dateB) {
  const a = parts(gregorianFormatter, dateA);
  const b = parts(gregorianFormatter, dateB);
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

async function main() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('fixedtasktemplates');
  const todayPersian = parts(persianFormatter, now);
  const todayGregorian = parts(gregorianFormatter, now);
  const candidates = await collection.find({
    recurrence: 'monthly',
    $or: [
      { isActive: true },
      { 'scheduleConfig.monthDays.0': { $exists: true } },
    ],
  }).sort({ createdAt: -1, _id: -1 }).toArray();

  const latestBySeries = new Map();
  for (const candidate of candidates) {
    const key = seriesKey(candidate);
    const existing = latestBySeries.get(key);
    if (!existing || (candidate.isActive && !existing.isActive)) {
      latestBySeries.set(key, candidate);
    }
  }

  const scheduled = [...latestBySeries.values()].filter((doc) => {
    const monthDays = doc.scheduleConfig?.monthDays ?? [];
    if (!monthDays.includes(todayPersian.day)) return false;
    if (doc.startDate && sameTehranDay(doc.startDate, now)) return false;
    return true;
  });

  const output = {
    nowUtc: now.toISOString(),
    tehranGregorian: `${todayGregorian.year}-${String(todayGregorian.month).padStart(2, '0')}-${String(todayGregorian.day).padStart(2, '0')} ${String(todayGregorian.hour).padStart(2, '0')}:${String(todayGregorian.minute).padStart(2, '0')}`,
    tehranPersian: `${todayPersian.year}/${String(todayPersian.month).padStart(2, '0')}/${String(todayPersian.day).padStart(2, '0')} ${String(todayPersian.hour).padStart(2, '0')}:${String(todayPersian.minute).padStart(2, '0')}`,
    persianMonthDay: todayPersian.day,
    monthlyCandidateDocs: candidates.length,
    uniqueMonthlySeries: latestBySeries.size,
    shouldCreateCount: scheduled.length,
    shouldCreate: scheduled.map((doc) => ({
      _id: doc._id.toString(),
      title: doc.title,
      assignedTo: doc.assignedTo?.toString?.(),
      createdBy: doc.createdBy?.toString?.(),
      isActive: doc.isActive,
      status: doc.status,
      sourceSheet: doc.sourceSheet,
      originalSourceRow: doc.originalSourceRow,
      sourceRow: doc.sourceRow,
      monthDays: doc.scheduleConfig?.monthDays ?? [],
      startDate: doc.startDate?.toISOString?.() ?? null,
      endDate: doc.endDate?.toISOString?.() ?? null,
    })),
  };
  console.log(JSON.stringify(output, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
