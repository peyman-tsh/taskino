const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const exportPath = 'D:\\database\\taskino.fixedtasktemplates-4.json';
const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
  throw new Error('Refusing to update non-local MongoDB URI');
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

async function main() {
  const exportedDocs = reviveExtendedJson(JSON.parse(fs.readFileSync(exportPath, 'utf8')));
  const doneDatedDocs = exportedDocs.filter(
    (doc) => doc.status === 'done' && hasDateAttachment(doc),
  );

  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('fixedtasktemplates');
  const currentDocs = await collection.find({}).toArray();
  const backupPath = path.join(
    __dirname,
    `fixedtask-before-done-dated-restore-${Date.now()}.json`,
  );
  fs.writeFileSync(backupPath, JSON.stringify(currentDocs, null, 2));

  let matched = 0;
  let modified = 0;
  let upserted = 0;

  for (const doc of doneDatedDocs) {
    const result = await collection.replaceOne({ _id: doc._id }, doc, {
      upsert: true,
    });
    matched += result.matchedCount;
    modified += result.modifiedCount;
    upserted += result.upsertedCount;
  }

  const doneDated = await collection.countDocuments({
    status: 'done',
    $or: [
      { startDate: { $type: 'date' } },
      { endDate: { $type: 'date' } },
      { doneTime: { $type: 'date' } },
    ],
  });

  console.log(
    JSON.stringify(
      {
        source: exportPath,
        backupPath,
        selectedDoneDated: doneDatedDocs.length,
        matched,
        modified,
        upserted,
        localDoneDatedAfterRestore: doneDated,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
