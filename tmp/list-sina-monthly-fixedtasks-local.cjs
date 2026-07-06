const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uriLine = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI='));
if (!uriLine) throw new Error('MONGODB_URI not found');
const uri = uriLine.slice('MONGODB_URI='.length).trim();
if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) throw new Error('Refusing non-local Mongo URI');

const FARSI_YEH = String.fromCharCode(0x06cc);
const ARABIC_YEH = String.fromCharCode(0x064a);
const FARSI_KEH = String.fromCharCode(0x06a9);
const ARABIC_KEH = String.fromCharCode(0x0643);
const SINA = String.fromCharCode(0x0633, 0x06cc, 0x0646, 0x0627);
const ALAEI = String.fromCharCode(0x0627, 0x0639, 0x0644, 0x0627, 0x06cc, 0x06cc);

function normalize(value) {
  return String(value ?? '')
    .trim()
    .split(ARABIC_YEH).join(FARSI_YEH)
    .split(ARABIC_KEH).join(FARSI_KEH)
    .toLowerCase();
}

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

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const users = await db.collection('users').find({}).toArray();
  const sinaUsers = users.filter((user) => {
    const fullName = normalize(`${user.firstName ?? ''} ${user.lastName ?? ''}`);
    return fullName.includes(SINA) && fullName.includes(ALAEI);
  });

  const userIds = sinaUsers.map((user) => user._id);
  const docs = userIds.length === 0 ? [] : await db.collection('fixedtasktemplates')
    .find({ recurrence: 'monthly', assignedTo: { $in: userIds } })
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  const unique = new Map();
  for (const doc of docs) {
    const key = seriesKey(doc);
    if (!unique.has(key)) unique.set(key, doc);
  }

  const result = {
    users: sinaUsers.map((user) => ({
      _id: user._id.toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      roles: user.roles,
      workField: user.workField,
      isActive: user.isActive,
    })),
    totalMonthlyDocs: docs.length,
    uniqueMonthlyDocs: unique.size,
    documents: [...unique.values()].map((doc) => ({
      _id: doc._id.toString(),
      title: doc.title,
      assignedTo: doc.assignedTo?.toString?.(),
      createdBy: doc.createdBy?.toString?.(),
      isActive: doc.isActive,
      status: doc.status,
      sourceSheet: doc.sourceSheet,
      sourceRow: doc.sourceRow,
      originalSourceRow: doc.originalSourceRow,
      monthDays: doc.scheduleConfig?.monthDays ?? null,
      startDate: doc.startDate?.toISOString?.() ?? null,
      endDate: doc.endDate?.toISOString?.() ?? null,
    })),
  };

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => mongoose.disconnect());
