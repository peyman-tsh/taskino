const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) throw new Error('Refusing non-local Mongo URI');

function seriesKey(doc) {
  const sourceIdentity = doc.originalSourceRow ?? doc.sourceRow ?? `${doc.title}:${doc.description}`;
  return [
    doc.recurrence,
    doc.assignedTo?.toString?.() ?? '',
    doc.createdBy?.toString?.() ?? '',
    doc.sourceExcel ?? '',
    doc.sourceSheet ?? '',
    sourceIdentity,
  ].join('|');
}

async function uniqueCount(collection, filter) {
  const docs = await collection.find(filter).sort({ createdAt: -1, _id: -1 }).toArray();
  const unique = new Map();
  for (const doc of docs) {
    const key = seriesKey(doc);
    if (!unique.has(key)) unique.set(key, doc);
  }
  return { raw: docs.length, unique: unique.size, docs: [...unique.values()] };
}

async function main() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('fixedtasktemplates');

  const daily = await uniqueCount(collection, {
    recurrence: 'daily',
    'scheduleConfig.weekdays': 0,
  });
  const weekly = await uniqueCount(collection, {
    recurrence: 'weekly',
    'scheduleConfig.weekdays': 0,
  });
  const monthly = await uniqueCount(collection, {
    recurrence: 'monthly',
    'scheduleConfig.monthDays': 14,
  });

  console.log(JSON.stringify({
    sundayWeekdayCode: 0,
    persianMonthDay: 14,
    counts: {
      daily: daily.unique,
      weekly: weekly.unique,
      monthly: monthly.unique,
      total: daily.unique + weekly.unique + monthly.unique,
    },
    rawCountsBeforeDedupe: {
      daily: daily.raw,
      weekly: weekly.raw,
      monthly: monthly.raw,
      total: daily.raw + weekly.raw + monthly.raw,
    },
    samples: {
      daily: daily.docs.slice(0, 5).map((doc) => ({ _id: doc._id.toString(), title: doc.title, sourceSheet: doc.sourceSheet, weekdays: doc.scheduleConfig?.weekdays })),
      weekly: weekly.docs.slice(0, 5).map((doc) => ({ _id: doc._id.toString(), title: doc.title, sourceSheet: doc.sourceSheet, weekdays: doc.scheduleConfig?.weekdays })),
      monthly: monthly.docs.slice(0, 5).map((doc) => ({ _id: doc._id.toString(), title: doc.title, sourceSheet: doc.sourceSheet, monthDays: doc.scheduleConfig?.monthDays })),
    },
  }, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
