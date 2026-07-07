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

function compactDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function includesAll(value, terms) {
  const text = String(value ?? '').replace(/\s+/g, ' ').trim();
  return terms.every((term) => text.includes(term));
}

async function main() {
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const terms = ['ویرایش', 'اصلاحات', 'بهره', 'ماهانه', 'گلستان'];
  const docs = await db
    .collection('fixedtasktemplates')
    .find({})
    .sort({ createdAt: -1, _id: -1 })
    .toArray();

  const matches = docs.filter((doc) => includesAll(doc.title, terms));
  const users = await db
    .collection('users')
    .find({ _id: { $in: [...new Set(matches.flatMap((doc) => [doc.assignedTo, doc.createdBy]))] } })
    .project({ firstName: 1, lastName: 1, roles: 1 })
    .toArray();
  const usersById = new Map(users.map((user) => [user._id.toString(), user]));

  const output = matches.map((doc) => {
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
      startDate: compactDate(doc.startDate),
      endDate: compactDate(doc.endDate),
      startTime: doc.startTime ?? null,
      endTime: doc.endTime ?? null,
      doneTime: compactDate(doc.doneTime),
      nextRunAt: compactDate(doc.nextRunAt),
      createdAt: compactDate(doc.createdAt),
      updatedAt: compactDate(doc.updatedAt),
      scheduleConfig: doc.scheduleConfig ?? null,
      sourceSheet: doc.sourceSheet ?? null,
      sourceRow: doc.sourceRow ?? null,
      originalSourceRow: doc.originalSourceRow ?? null,
    };
  });

  console.log(JSON.stringify({ count: output.length, matches: output }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
