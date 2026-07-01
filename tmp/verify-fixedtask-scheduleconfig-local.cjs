const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const env = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf8');
const uri = env.split(/\r?\n/).find((line) => line.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();
const startDate = new Date('2026-07-01T10:07:18.008+00:00');
const endDate = new Date('2026-07-01T20:30:00.000+00:00');

async function main() {
  await mongoose.connect(uri);
  const collection = mongoose.connection.db.collection('fixedtasktemplates');
  const [total, dateMatched, withScheduleConfig, daily, weekly, monthly] = await Promise.all([
    collection.countDocuments({}),
    collection.countDocuments({ startDate, endDate }),
    collection.countDocuments({ $or: [{ 'scheduleConfig.weekdays.0': { $exists: true } }, { 'scheduleConfig.monthDays.0': { $exists: true } }] }),
    collection.countDocuments({ recurrence: 'daily', 'scheduleConfig.weekdays.0': { $exists: true } }),
    collection.countDocuments({ recurrence: 'weekly', 'scheduleConfig.weekdays.0': { $exists: true } }),
    collection.countDocuments({ recurrence: 'monthly', 'scheduleConfig.monthDays.0': { $exists: true } }),
  ]);
  console.log(JSON.stringify({ total, dateMatched, withScheduleConfig, daily, weekly, monthly }, null, 2));
}

main().finally(async () => mongoose.disconnect());
