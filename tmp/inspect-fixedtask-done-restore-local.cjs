const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const exportPath = 'D:\\database\\taskino.fixedtasktemplates-4.json';
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  throw new Error('Refusing non-local MongoDB URI');
}

function reviveExtendedJson(value) {
  if (Array.isArray(value)) return value.map(reviveExtendedJson);
  if (!value || typeof value !== 'object') return value;
  if (Object.keys(value).length === 1 && typeof value.$oid === 'string') {
    return new mongoose.Types.ObjectId(value.$oid);
  }
  if (Object.keys(value).length === 1 && typeof value.$date === 'string') {
    return new Date(value.$date);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, reviveExtendedJson(item)]),
  );
}

function hasDateAttachment(doc) {
  return Boolean(doc.startDate || doc.endDate || doc.doneTime);
}

function comparable(value) {
  if (value instanceof Date) return value.toISOString();
  if (value instanceof mongoose.Types.ObjectId) return value.toString();
  if (Array.isArray(value)) return value.map(comparable);
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, comparable(value[key])]),
  );
}

async function main() {
  const exportedDocs = reviveExtendedJson(JSON.parse(fs.readFileSync(exportPath, 'utf8')));
  const exportDoneDated = exportedDocs.filter(
    (doc) => doc.status === 'done' && hasDateAttachment(doc),
  );
  const exportIds = exportDoneDated.map((doc) => doc._id);

  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('fixedtasktemplates');

  const [
    localTotal,
    localDone,
    localDoneDated,
    localMatches,
    localNonDoneDated,
  ] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ status: 'done' }),
    collection.countDocuments({
      status: 'done',
      $or: [
        { startDate: { $type: 'date' } },
        { endDate: { $type: 'date' } },
        { doneTime: { $type: 'date' } },
      ],
    }),
    collection.countDocuments({ _id: { $in: exportIds } }),
    collection.countDocuments({
      status: { $ne: 'done' },
      $or: [
        { startDate: { $type: 'date' } },
        { endDate: { $type: 'date' } },
        { doneTime: { $type: 'date' } },
      ],
    }),
  ]);

  const localDoneDocs = await collection.find({ _id: { $in: exportIds } }).toArray();
  const localById = new Map(localDoneDocs.map((doc) => [doc._id.toString(), doc]));
  const differentDoneDocs = exportDoneDated.filter((doc) => {
    const localDoc = localById.get(doc._id.toString());
    return JSON.stringify(comparable(localDoc)) !== JSON.stringify(comparable(doc));
  });

  const output = {
    export: {
      total: exportedDocs.length,
      doneDated: exportDoneDated.length,
      doneDatedWithScheduleConfig: exportDoneDated.filter((doc) =>
        Boolean(doc.scheduleConfig?.weekdays?.length || doc.scheduleConfig?.monthDays?.length),
      ).length,
    },
    local: {
      total: localTotal,
      done: localDone,
      doneDated: localDoneDated,
      exportDoneDatedIdsAlreadyPresent: localMatches,
      exportDoneDatedDocsDifferent: differentDoneDocs.length,
      nonDoneDated: localNonDoneDated,
    },
    sampleExportDoneDatedIds: exportDoneDated.slice(0, 5).map((doc) => doc._id.toString()),
  };

  console.log(JSON.stringify(output, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
