const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found in .env');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  throw new Error(`Refusing to update non-local MongoDB URI: ${uri.replace(/:\/\/.*@/, '://***@')}`);
}

const startDate = new Date('2026-07-01T10:07:18.008+00:00');
const endDate = new Date('2026-07-01T20:30:00.000+00:00');
const collectionName = 'fixedtasktemplates';

function shuffle(values) {
  return [...values].sort(() => Math.random() - 0.5);
}

function randomPick(values, min, max) {
  const size = Math.floor(Math.random() * (max - min + 1)) + min;
  return shuffle(values).slice(0, size).sort((first, second) => first - second);
}

function buildScheduleConfig(recurrence) {
  if (recurrence === 'monthly') {
    return {
      weekdays: [],
      monthDays: randomPick(Array.from({ length: 28 }, (_, index) => index + 1), 1, 4),
    };
  }

  if (recurrence === 'weekly') {
    return {
      weekdays: randomPick([0, 1, 2, 3, 4, 5, 6], 1, 3),
      monthDays: [],
    };
  }

  return {
    weekdays: randomPick([0, 1, 2, 3, 4, 5, 6], 1, 7),
    monthDays: [],
  };
}

async function main() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection(collectionName);
  const docs = await collection.find({}).toArray();
  const backupPath = path.join(
    __dirname,
    `fixedtask-before-scheduleconfig-update-${Date.now()}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(docs, null, 2));

  const countsByRecurrence = docs.reduce((counts, doc) => {
    counts[doc.recurrence || 'unknown'] = (counts[doc.recurrence || 'unknown'] || 0) + 1;
    return counts;
  }, {});

  let modified = 0;
  for (const doc of docs) {
    const result = await collection.updateOne(
      { _id: doc._id },
      {
        $set: {
          scheduleConfig: buildScheduleConfig(doc.recurrence),
          startDate,
          endDate,
          updatedAt: new Date(),
        },
      },
    );
    modified += result.modifiedCount;
  }

  const withScheduleConfig = await collection.countDocuments({
    $or: [
      { 'scheduleConfig.weekdays.0': { $exists: true } },
      { 'scheduleConfig.monthDays.0': { $exists: true } },
    ],
  });

  console.log(JSON.stringify({
    collectionName,
    backupPath,
    matched: docs.length,
    modified,
    withScheduleConfig,
    countsByRecurrence,
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
