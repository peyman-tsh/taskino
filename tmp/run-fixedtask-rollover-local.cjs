const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { NestFactory } = require('@nestjs/core');
const { AppModule } = require('../dist/app.module');
const { FixedTaskRolloverService } = require('../dist/fixedTask/services/fixed-task-rollover.service');

const envPath = path.join(__dirname, '..', '.env');
const env = fs.readFileSync(envPath, 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  throw new Error('Refusing to run rollover against non-local MongoDB URI');
}

function countChanged(before, after, predicate) {
  const beforeMatches = before.filter(predicate).length;
  const afterMatches = after.filter(predicate).length;
  return { before: beforeMatches, after: afterMatches, delta: afterMatches - beforeMatches };
}

async function backupCollection() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('fixedtasktemplates');
  const docs = await collection.find({}).sort({ createdAt: -1, _id: -1 }).toArray();
  const backupPath = path.join(
    __dirname,
    `fixedtask-before-real-rollover-${Date.now()}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(docs, null, 2));
  await mongoose.disconnect();
  return { backupPath, docs };
}

async function readCollection() {
  await mongoose.connect(uri);
  const docs = await mongoose.connection.db
    .collection('fixedtasktemplates')
    .find({})
    .sort({ createdAt: -1, _id: -1 })
    .toArray();
  await mongoose.disconnect();
  return docs;
}

async function main() {
  const before = await backupCollection();
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['log', 'warn', 'error'],
  });

  try {
    const service = app.get(FixedTaskRolloverService);
    await service.handleDailyRollover();
    await service.handleWeeklyRollover();
    await service.handleMonthlyRollover();
  } finally {
    await app.close();
  }

  const after = await readCollection();
  const beforeIds = new Set(before.docs.map((doc) => doc._id.toString()));
  const afterById = new Map(after.map((doc) => [doc._id.toString(), doc]));
  const created = after.filter((doc) => !beforeIds.has(doc._id.toString()));
  const deactivated = before.docs
    .filter((doc) => doc.isActive === true)
    .filter((doc) => afterById.get(doc._id.toString())?.isActive === false);

  const summary = {
    backupPath: before.backupPath,
    totals: {
      before: before.docs.length,
      after: after.length,
      created: created.length,
      deactivated: deactivated.length,
    },
    activeTodoOrInProgress: countChanged(
      before.docs,
      after,
      (doc) => doc.isActive === true && ['todo', 'in_progress'].includes(doc.status),
    ),
    created: created.map((doc) => ({
      _id: doc._id.toString(),
      title: doc.title,
      recurrence: doc.recurrence,
      status: doc.status,
      isActive: doc.isActive,
      startDate: doc.startDate?.toISOString?.() ?? null,
      endDate: doc.endDate?.toISOString?.() ?? null,
      scheduleConfig: doc.scheduleConfig ?? null,
      sourceSheet: doc.sourceSheet ?? null,
      originalSourceRow: doc.originalSourceRow ?? doc.sourceRow ?? null,
    })),
    deactivated: deactivated.map((doc) => {
      const updated = afterById.get(doc._id.toString());
      return {
        _id: doc._id.toString(),
        title: doc.title,
        recurrence: doc.recurrence,
        status: doc.status,
        oldIsActive: doc.isActive,
        newIsActive: updated?.isActive,
        startDate: doc.startDate?.toISOString?.() ?? null,
        endDate: doc.endDate?.toISOString?.() ?? null,
        lastGeneratedAt: updated?.lastGeneratedAt?.toISOString?.() ?? null,
        scheduleConfig: doc.scheduleConfig ?? null,
        sourceSheet: doc.sourceSheet ?? null,
        originalSourceRow: doc.originalSourceRow ?? doc.sourceRow ?? null,
      };
    }),
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
