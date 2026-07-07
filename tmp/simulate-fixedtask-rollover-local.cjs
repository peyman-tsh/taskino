const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { FixedTaskScheduleService } = require('../dist/fixedTask/services/fixed-task-schedule.service');
const { FixedTaskRecurrence, FixedTaskStatus } = require('../dist/fixedTask/fixed-task.schema');
const { getTehranDateParts, getTehranPersianDateParts, tehranDateTimeToUtc } = require('../dist/common/utils/tehran-time.util');
const { IRAN_1405_OFFICIAL_HOLIDAYS } = require('../dist/holiday/iran-1405-official-holidays');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  throw new Error('Refusing non-local MongoDB URI');
}

const scheduleService = new FixedTaskScheduleService();
const now = new Date();

function tehranDateKey(date) {
  const parts = getTehranDateParts(date);
  return [
    parts.year,
    String(parts.month).padStart(2, '0'),
    String(parts.day).padStart(2, '0'),
  ].join('-');
}

function tehranLabel(date) {
  if (!(date instanceof Date)) return null;
  const g = getTehranDateParts(date);
  const p = getTehranPersianDateParts(date);
  return {
    utc: date.toISOString(),
    tehranGregorian: `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')} ${String(g.hour).padStart(2, '0')}:${String(g.minute).padStart(2, '0')}`,
    tehranPersian: `${p.year}/${String(p.month).padStart(2, '0')}/${String(p.day).padStart(2, '0')} ${String(p.hour).padStart(2, '0')}:${String(p.minute).padStart(2, '0')}`,
  };
}

function tehranDayOnly(date) {
  if (!(date instanceof Date)) return null;
  const p = getTehranPersianDateParts(date);
  return `${p.year}/${String(p.month).padStart(2, '0')}/${String(p.day).padStart(2, '0')}`;
}

function weekdayInTehran(date) {
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Tehran',
    weekday: 'short',
  }).format(date);
}

async function isOfficialHoliday(db, date) {
  const key = tehranDateKey(date);
  const existsInSeed = IRAN_1405_OFFICIAL_HOLIDAYS.some((holiday) => holiday.date === key);
  const dayStart = new Date(`${key}T00:00:00.000Z`);
  const dayEnd = new Date(`${key}T23:59:59.999Z`);
  const existsInDb = await db.collection('holidays').findOne({
    isOfficial: true,
    date: { $gte: dayStart, $lte: dayEnd },
  });
  return Boolean(existsInSeed || existsInDb);
}

function isUnfinished(doc) {
  return doc.status === FixedTaskStatus.TODO || doc.status === FixedTaskStatus.IN_PROGRESS;
}

function deadlineOf(doc) {
  if (!(doc.endDate instanceof Date)) return null;
  if (!doc.endTime) return doc.endDate;

  const [hours, minutes] = doc.endTime.split(':').map(Number);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return doc.endDate;

  const endDate = getTehranDateParts(doc.endDate);
  return tehranDateTimeToUtc(endDate.year, endDate.month, endDate.day, hours, minutes, 0, 999);
}

function isExpired(doc) {
  const deadline = deadlineOf(doc);
  return Boolean(deadline && deadline.getTime() < now.getTime());
}

function startedToday(doc) {
  if (!(doc.startDate instanceof Date)) return false;
  const start = getTehranDateParts(doc.startDate);
  const today = getTehranDateParts(now);
  return start.year === today.year && start.month === today.month && start.day === today.day;
}

function sortNewestFirst(docs) {
  return [...docs].sort((a, b) => {
    const createdDiff = (b.createdAt?.getTime?.() ?? 0) - (a.createdAt?.getTime?.() ?? 0);
    if (createdDiff !== 0) return createdDiff;
    return String(b._id).localeCompare(String(a._id));
  });
}

function dedupeCandidates(docs) {
  const latestBySeries = new Map();
  for (const candidate of sortNewestFirst(docs)) {
    const key = scheduleService.getSeriesKey(candidate);
    const existing = latestBySeries.get(key);
    if (!existing || (candidate.isActive && !existing.isActive)) {
      latestBySeries.set(key, candidate);
    }
  }
  return [...latestBySeries.values()];
}

async function findCandidates(collection, recurrence) {
  const filter = recurrence === FixedTaskRecurrence.DAILY
    ? {
        recurrence,
        $or: [
          { isActive: true },
          { 'scheduleConfig.weekdays.0': { $exists: true } },
        ],
      }
    : {
        recurrence,
        $or: [
          { isActive: true },
          { 'scheduleConfig.weekdays.0': { $exists: true } },
          { 'scheduleConfig.monthDays.0': { $exists: true } },
        ],
      };

  return collection.find(filter).sort({ createdAt: -1, _id: -1 }).toArray();
}

function summarizeDoc(doc) {
  return {
    _id: doc._id.toString(),
    title: doc.title,
    recurrence: doc.recurrence,
    status: doc.status,
    isActive: doc.isActive,
    startDate: tehranDayOnly(doc.startDate),
    endDate: tehranDayOnly(doc.endDate),
    deadline: tehranLabel(deadlineOf(doc)),
    scheduleConfig: doc.scheduleConfig ?? null,
    createdAt: tehranLabel(doc.createdAt),
    sourceSheet: doc.sourceSheet ?? null,
    originalSourceRow: doc.originalSourceRow ?? doc.sourceRow ?? null,
  };
}

function simulateRecurrence(recurrence, candidates, skipWholeRecurrence) {
  const output = {
    rawCandidates: candidates.length,
    seriesCandidates: 0,
    skippedByHolidayOrFriday: Boolean(skipWholeRecurrence),
    wouldCreate: [],
    wouldDeactivate: [],
    wouldSkipStartedToday: [],
    wouldDoNothing: [],
  };

  if (skipWholeRecurrence) return output;

  const seriesCandidates = dedupeCandidates(candidates);
  output.seriesCandidates = seriesCandidates.length;

  for (const doc of seriesCandidates) {
    const shouldGenerateToday = scheduleService.shouldGenerateTodayForCron(doc, now);

    if (!shouldGenerateToday) {
      const shouldDeactivateDaily =
        doc.recurrence === FixedTaskRecurrence.DAILY &&
        doc.isActive &&
        scheduleService.hasScheduleConfig(doc);
      const shouldDeactivateMonthly =
        doc.recurrence === FixedTaskRecurrence.MONTHLY &&
        doc.isActive &&
        scheduleService.hasScheduleConfig(doc) &&
        isUnfinished(doc) &&
        isExpired(doc);

      if (shouldDeactivateDaily || shouldDeactivateMonthly) {
        output.wouldDeactivate.push(summarizeDoc(doc));
      } else {
        output.wouldDoNothing.push(summarizeDoc(doc));
      }
      continue;
    }

    if (startedToday(doc)) {
      output.wouldSkipStartedToday.push(summarizeDoc(doc));
      continue;
    }

    const schedule = scheduleService.buildRolloverSchedule(doc, now);
    output.wouldCreate.push({
      from: summarizeDoc(doc),
      newOccurrence: {
        status: FixedTaskStatus.TODO,
        isActive: true,
        startDate: tehranLabel(schedule.startDate),
        endDate: tehranLabel(schedule.endDate),
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        scheduleConfig: doc.scheduleConfig ?? null,
      },
      oldOccurrenceWillBeDeactivatedFirst: Boolean(doc.isActive),
    });
  }

  return output;
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const collection = db.collection('fixedtasktemplates');
  const isFriday = weekdayInTehran(now) === 'Fri';
  const officialHoliday = await isOfficialHoliday(db, now);
  const nonWorkingDay = isFriday || officialHoliday;
  const [dailyCandidates, weeklyCandidates, monthlyCandidates] = await Promise.all([
    findCandidates(collection, FixedTaskRecurrence.DAILY),
    findCandidates(collection, FixedTaskRecurrence.WEEKLY),
    findCandidates(collection, FixedTaskRecurrence.MONTHLY),
  ]);

  const todayPersian = getTehranPersianDateParts(now);
  const todayGregorian = getTehranDateParts(now);
  const result = {
    now: tehranLabel(now),
    today: {
      persian: `${todayPersian.year}/${String(todayPersian.month).padStart(2, '0')}/${String(todayPersian.day).padStart(2, '0')}`,
      gregorianTehran: `${todayGregorian.year}-${String(todayGregorian.month).padStart(2, '0')}-${String(todayGregorian.day).padStart(2, '0')}`,
      weekday: weekdayInTehran(now),
      weekdayCode: new Date(Date.UTC(todayGregorian.year, todayGregorian.month - 1, todayGregorian.day)).getUTCDay(),
      isFriday,
      officialHoliday,
      nonWorkingDay,
    },
    daily: simulateRecurrence(FixedTaskRecurrence.DAILY, dailyCandidates, nonWorkingDay),
    weekly: simulateRecurrence(FixedTaskRecurrence.WEEKLY, weeklyCandidates, nonWorkingDay),
    monthly: simulateRecurrence(FixedTaskRecurrence.MONTHLY, monthlyCandidates, false),
  };

  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
