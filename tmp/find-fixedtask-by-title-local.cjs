const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const searchTerm = process.argv.slice(2).join(' ').trim();
if (!searchTerm) {
  throw new Error('Usage: node tmp/find-fixedtask-by-title-local.cjs <title search>');
}

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  throw new Error('Refusing non-local MongoDB URI');
}

const tehranGregorian = new Intl.DateTimeFormat('en-GB', {
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

const tehranPersian = new Intl.DateTimeFormat('en-GB', {
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

function normalize(value) {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\u064a/g, '\u06cc')
    .replace(/\u0643/g, '\u06a9')
    .toLowerCase();
}

function dateValue(value) {
  if (!(value instanceof Date)) return null;
  return {
    utc: value.toISOString(),
    tehranGregorian: tehranGregorian.format(value),
    tehranPersian: tehranPersian.format(value),
  };
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const docs = await db
    .collection('fixedtasktemplates')
    .find({})
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  const needle = normalize(searchTerm);
  const matches = docs.filter((doc) => normalize(doc.title).includes(needle));
  const userIds = [
    ...new Set(
      matches
        .flatMap((doc) => [doc.assignedTo, doc.createdBy])
        .filter(Boolean)
        .map((id) => id.toString()),
    ),
  ].map((id) => new mongoose.Types.ObjectId(id));
  const users = userIds.length
    ? await db.collection('users').find({ _id: { $in: userIds } }).toArray()
    : [];
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  const result = matches.map((doc) => {
    const assignedTo = usersById.get(doc.assignedTo?.toString());
    const createdBy = usersById.get(doc.createdBy?.toString());
    return {
      _id: doc._id.toString(),
      title: doc.title,
      recurrence: doc.recurrence,
      status: doc.status,
      isActive: doc.isActive,
      assignedTo: assignedTo
        ? `${assignedTo.firstName ?? ''} ${assignedTo.lastName ?? ''}`.trim()
        : doc.assignedTo?.toString(),
      createdBy: createdBy
        ? `${createdBy.firstName ?? ''} ${createdBy.lastName ?? ''}`.trim()
        : doc.createdBy?.toString(),
      scheduleConfig: doc.scheduleConfig ?? null,
      startDate: dateValue(doc.startDate),
      endDate: dateValue(doc.endDate),
      startTime: doc.startTime ?? null,
      endTime: doc.endTime ?? null,
      doneTime: dateValue(doc.doneTime),
      startedAt: dateValue(doc.startedAt),
      lastGeneratedAt: dateValue(doc.lastGeneratedAt),
      nextRunAt: dateValue(doc.nextRunAt),
      createdAt: dateValue(doc.createdAt),
      updatedAt: dateValue(doc.updatedAt),
      sourceSheet: doc.sourceSheet ?? null,
      sourceRow: doc.sourceRow ?? null,
      originalSourceRow: doc.originalSourceRow ?? null,
    };
  });

  console.log(JSON.stringify({ searchTerm, count: result.length, matches: result }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
