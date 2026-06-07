import { readFileSync } from 'fs';
import mongoose from 'mongoose';

function loadEnv(): Record<string, string> {
  return Object.fromEntries(
    readFileSync('.env', 'utf8')
      .split(/\r?\n/)
      .filter(
        (line) => line && !line.trim().startsWith('#') && line.includes('='),
      )
      .map((line) => {
        const separatorIndex = line.indexOf('=');
        return [
          line.slice(0, separatorIndex).trim(),
          line.slice(separatorIndex + 1).trim(),
        ];
      }),
  );
}

async function run() {
  const env = loadEnv();
  await mongoose.connect(env.MONGODB_URI.replace('localhost', '127.0.0.1'));
  const projects = mongoose.connection.collection('projects');

  const [publicProjects, privateProjects] = await Promise.all([
    projects.updateMany(
      { assigneeId: null },
      { $set: { isPublic: true } },
    ),
    projects.updateMany(
      { assigneeId: { $exists: true, $ne: null } },
      { $set: { isPublic: false } },
    ),
  ]);

  console.log(
    JSON.stringify(
      {
        publicProjectsModified: publicProjects.modifiedCount,
        privateProjectsModified: privateProjects.modifiedCount,
      },
      null,
      2,
    ),
  );
}

run()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
