import { readFile } from 'node:fs/promises';
import ExcelJS from 'exceljs';
import mongoose from 'mongoose';

const baseUrl = process.env.API_BASE_URL ?? 'http://localhost:3000/api';
const runId = Date.now().toString();
const suffix = runId.slice(-9);
const password = 'TestPass123';
const results = [];

async function request(name, method, path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body:
      options.form ?? (options.body ? JSON.stringify(options.body) : undefined),
  });
  const contentType = response.headers.get('content-type') ?? '';
  const body = options.binary
    ? { byteLength: (await response.arrayBuffer()).byteLength, contentType }
    : await parseResponse(response);
  const expectedStatus = options.expectedStatus ?? 200;
  results.push({ name, method, path, status: response.status, expectedStatus });
  if (response.status !== expectedStatus) {
    throw new Error(
      `${name} failed with ${response.status}: ${JSON.stringify(body)}`,
    );
  }
  return body;
}

async function parseResponse(response) {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function register(label, mobile) {
  return request(`register ${label}`, 'POST', '/auth/register', {
    expectedStatus: 201,
    body: {
      firstName: 'Integration',
      lastName: label,
      email: `integration.${label.toLowerCase()}.${runId}@example.com`,
      mobile,
      password,
      workField: 'it',
    },
  });
}

async function getMongoUri() {
  if (process.env.MONGODB_URI) return process.env.MONGODB_URI;
  const envFile = await readFile('.env', 'utf8');
  return envFile
    .match(/^MONGODB_URI=(.+)$/m)[1]
    .trim()
    .replace('localhost', '127.0.0.1');
}

async function promoteUsers(managerId, supervisorId) {
  await mongoose.connect(await getMongoUri());
  const users = mongoose.connection.collection('users');
  await Promise.all([
    users.updateOne(
      { _id: new mongoose.Types.ObjectId(managerId) },
      { $set: { roles: 'manager' } },
    ),
    users.updateOne(
      { _id: new mongoose.Types.ObjectId(supervisorId) },
      { $set: { roles: 'supervisor' } },
    ),
  ]);
  await mongoose.disconnect();
}

async function createExcelUploadForm() {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Tasks');
  worksheet.addRow(['title', 'status']);
  worksheet.addRow([`Task ${runId}`, 'done']);
  const buffer = Buffer.from(await workbook.xlsx.writeBuffer());
  const form = new FormData();
  form.append(
    'file',
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `integration-${runId}.xlsx`,
  );
  return form;
}

async function createTaskWithExcelForm(assignedTo, startDate, dueDate) {
  const form = await createExcelUploadForm();
  form.append('title', `Task with Excel ${runId}`);
  form.append('assignedTo', assignedTo);
  form.append('recurrence', 'monthly');
  form.append('startDate', startDate);
  form.append('dueDate', dueDate);
  return form;
}

function assertContainsRecord(result, id, label) {
  if (!result.data.some((item) => String(item._id ?? item.id) === String(id))) {
    throw new Error(`${label} filter did not return the expected record`);
  }
}

await request('health check', 'GET', '/');
const managerRegistration = await register('Manager', `98910${suffix}`);
const supervisorRegistration = await register('Supervisor', `98911${suffix}`);
const specialist = await register('Specialist', `98912${suffix}`);
await promoteUsers(
  managerRegistration.user._id,
  supervisorRegistration.user._id,
);

const manager = await request('login Manager', 'POST', '/auth/login', {
  body: { mobile: `98910${suffix}`, password },
});
const supervisor = await request('login Supervisor', 'POST', '/auth/login', {
  body: { mobile: `98911${suffix}`, password },
});
const managerId = manager.user._id;
const supervisorId = supervisor.user._id;
const specialistId = specialist.user._id;

await request('reject unauthenticated task list', 'GET', '/tasks', {
  expectedStatus: 401,
});
await request('approve specialist', 'PATCH', `/users/${specialistId}/approve`, {
  token: manager.accessToken,
  body: {},
});

const startDate = new Date(Date.now() + 60 * 60 * 1000);
const dueDate = new Date(startDate.getTime() + 8 * 60 * 60 * 1000);
const task = await request('create independent task', 'POST', '/tasks', {
  token: manager.accessToken,
  expectedStatus: 201,
  body: {
    title: `Independent Task ${runId}`,
    assignedTo: [specialistId],
    startDate: startDate.toISOString(),
    dueDate: dueDate.toISOString(),
    startTime: '09:00',
    endTime: '17:00',
    recurrence: 'weekly',
  },
});
if (task.startTime !== '09:00' || task.endTime !== '17:00') {
  throw new Error('Task startTime/endTime were not saved');
}
const linkedTaskResult = await request(
  'create task with related Excel',
  'POST',
  '/tasks',
  {
    token: manager.accessToken,
    expectedStatus: 201,
    form: await createTaskWithExcelForm(
      specialistId,
      startDate.toISOString(),
      dueDate.toISOString(),
    ),
  },
);
const linkedTask = linkedTaskResult.task;
const linkedExcel = linkedTaskResult.excelUpload;
const linkedExcelId = linkedExcel.id ?? linkedExcel._id;
if (String(linkedTask.excelFile) !== String(linkedExcelId)) {
  throw new Error('Task does not reference its uploaded Excel record');
}
const linkedTaskDetails = await request(
  'get task with populated Excel',
  'GET',
  `/tasks/${linkedTask._id}`,
  { token: manager.accessToken },
);
if (
  String(
    linkedTaskDetails.excelFile?.id ?? linkedTaskDetails.excelFile?._id,
  ) !== String(linkedExcelId)
) {
  throw new Error('Task Excel relationship was not populated');
}
const linkedExcelDetails = await request(
  'get Excel with populated task',
  'GET',
  `/excel/${linkedExcelId}`,
);
if (
  String(
    linkedExcelDetails.relatedTask?._id ?? linkedExcelDetails.relatedTask?.id,
  ) !== String(linkedTask._id)
) {
  throw new Error('Excel task relationship was not populated');
}
await request('reject invalid task time range', 'POST', '/tasks', {
  token: manager.accessToken,
  expectedStatus: 400,
  body: {
    title: `Invalid Time Task ${runId}`,
    assignedTo: [specialistId],
    startTime: '18:00',
    endTime: '09:00',
  },
});
const filteredRecurringTasks = await request(
  'filter tasks by date range and recurrence',
  'GET',
  `/tasks?startDate=${encodeURIComponent(startDate.toISOString())}&endDate=${encodeURIComponent(
    dueDate.toISOString(),
  )}&recurrence=weekly`,
  { token: manager.accessToken },
);
if (!filteredRecurringTasks.data.some((item) => item._id === task._id)) {
  throw new Error(
    'Task date-range and recurrence filter did not return the task',
  );
}
const monthlyTasks = await request(
  'filter monthly tasks',
  'GET',
  '/tasks?recurrence=monthly',
  { token: manager.accessToken },
);
assertContainsRecord(monthlyTasks, linkedTask._id, 'Monthly task recurrence');
await request(
  'reject invalid task recurrence filter',
  'GET',
  '/tasks?recurrence=yearly',
  {
    token: manager.accessToken,
    expectedStatus: 400,
  },
);
const supervisorTask = await request(
  'create task by supervisor',
  'POST',
  '/tasks',
  {
    token: supervisor.accessToken,
    expectedStatus: 201,
    body: {
      title: `Supervisor Task ${runId}`,
      assignedTo: [specialistId],
      startDate: startDate.toISOString(),
      dueDate: dueDate.toISOString(),
      recurrence: 'daily',
    },
  },
);
const dailyTasks = await request(
  'filter daily tasks',
  'GET',
  '/tasks?recurrence=daily',
  {
    token: manager.accessToken,
  },
);
assertContainsRecord(dailyTasks, supervisorTask._id, 'Daily task recurrence');
await request('complete manager task', 'PATCH', `/tasks/${task._id}/status`, {
  token: manager.accessToken,
  body: { status: 'done' },
});
await request(
  'complete supervisor task',
  'PATCH',
  `/tasks/${supervisorTask._id}/status`,
  {
    token: manager.accessToken,
    body: { status: 'done' },
  },
);
const completedLinkedTask = await request(
  'complete task with related Excel',
  'PATCH',
  `/tasks/${linkedTask._id}/status`,
  {
    token: manager.accessToken,
    body: { status: 'done' },
  },
);
if (!completedLinkedTask.doneTime) {
  throw new Error('Task doneTime was not saved');
}
await request('create weak supervisor task', 'POST', '/tasks', {
  token: manager.accessToken,
  expectedStatus: 201,
  body: {
    title: `Weak Supervisor Task ${runId}`,
    assignedTo: [supervisorId],
    startDate: startDate.toISOString(),
    dueDate: dueDate.toISOString(),
  },
});
const beforeScore = await request(
  'get specialist before score',
  'GET',
  `/users/${specialistId}`,
  {
    token: manager.accessToken,
  },
);
const dateCountBody = {
  userId: specialistId,
  startdate: startDate.toISOString(),
  enddate: dueDate.toISOString(),
};
await request('calculate task date count', 'POST', '/tasks/date-count', {
  token: manager.accessToken,
  body: dateCountBody,
});
const afterScore = await request(
  'get specialist after score',
  'GET',
  `/users/${specialistId}`,
  {
    token: manager.accessToken,
  },
);
if (afterScore.score !== (beforeScore.score ?? 0) + 10) {
  throw new Error('On-time independent tasks did not add 10 score');
}
await request('repeat task date count', 'POST', '/tasks/date-count', {
  token: manager.accessToken,
  body: dateCountBody,
});
const afterRepeatedScore = await request(
  'get specialist after repeated score',
  'GET',
  `/users/${specialistId}`,
  { token: manager.accessToken },
);
if (afterRepeatedScore.score !== afterScore.score) {
  throw new Error('Repeated date count added duplicate score');
}

const fixedTask = await request(
  'create independent fixed task',
  'POST',
  '/fixed-tasks',
  {
    token: manager.accessToken,
    expectedStatus: 201,
    body: {
      title: `Independent Fixed Task ${runId}`,
      assignedTo: specialistId,
      recurrence: 'weekly',
      isActive: true,
      startTime: '08:30',
      endTime: '16:30',
    },
  },
);
if (fixedTask.startTime !== '08:30' || fixedTask.endTime !== '16:30') {
  throw new Error('FixedTask startTime/endTime were not saved');
}
const supervisorFixedTask = await request(
  'create independent fixed task by supervisor',
  'POST',
  '/fixed-tasks',
  {
    token: supervisor.accessToken,
    expectedStatus: 201,
    body: {
      title: `Supervisor Fixed Task ${runId}`,
      assignedTo: specialistId,
      recurrence: 'daily',
      isActive: true,
    },
  },
);
const completedFixedTask = await request(
  'complete fixed task',
  'PATCH',
  `/fixed-tasks/${fixedTask._id}`,
  {
    token: manager.accessToken,
    body: { status: 'done' },
  },
);
if (!completedFixedTask.doneTime) {
  throw new Error('FixedTask doneTime was not saved');
}
await request(
  'complete supervisor-created fixed task',
  'PATCH',
  `/fixed-tasks/${supervisorFixedTask._id}`,
  {
    token: supervisor.accessToken,
    body: { status: 'done' },
  },
);
await request(
  'filter fixed tasks by title',
  'GET',
  `/fixed-tasks?title=${runId}`,
  {
    token: manager.accessToken,
  },
);
const weeklyFixedTasks = await request(
  'filter weekly fixed tasks',
  'GET',
  '/fixed-tasks?recurrence=weekly',
  { token: manager.accessToken },
);
assertContainsRecord(
  weeklyFixedTasks,
  fixedTask._id,
  'Weekly fixed-task recurrence',
);
const dailyFixedTasks = await request(
  'filter daily fixed tasks',
  'GET',
  '/fixed-tasks?recurrence=daily',
  { token: manager.accessToken },
);
assertContainsRecord(
  dailyFixedTasks,
  supervisorFixedTask._id,
  'Daily fixed-task recurrence',
);
await request('update fixed task', 'PATCH', `/fixed-tasks/${fixedTask._id}`, {
  token: manager.accessToken,
  body: { recurrence: 'monthly', startTime: '10:00', endTime: '18:00' },
});
const monthlyFixedTasks = await request(
  'filter monthly fixed tasks',
  'GET',
  '/fixed-tasks?recurrence=monthly',
  { token: manager.accessToken },
);
assertContainsRecord(
  monthlyFixedTasks,
  fixedTask._id,
  'Monthly fixed-task recurrence',
);
await request(
  'reject invalid fixed task recurrence filter',
  'GET',
  '/fixed-tasks?recurrence=yearly',
  {
    token: manager.accessToken,
    expectedStatus: 400,
  },
);
await request(
  'reject invalid fixed task time range',
  'PATCH',
  `/fixed-tasks/${fixedTask._id}`,
  {
    token: manager.accessToken,
    expectedStatus: 400,
    body: { startTime: '20:00', endTime: '08:00' },
  },
);

await request('manager statistics', 'GET', '/manager/statistics', {
  token: manager.accessToken,
});
await request('manager task status', 'GET', '/manager/tasks/status', {
  token: manager.accessToken,
});
await request('manager task counts', 'GET', '/manager/tasks/users/counts', {
  token: manager.accessToken,
});
await request(
  'manager monthly performance',
  'GET',
  '/manager/users/monthly-performance',
  {
    token: manager.accessToken,
  },
);
const progress = await request(
  'evaluate specialist and supervisor progress',
  'GET',
  '/manager/users/progress',
  { token: manager.accessToken },
);
const specialistProgress = progress.find(
  (item) => item.userId === specialistId,
);
const supervisorProgress = progress.find(
  (item) => item.userId === supervisorId,
);
if (
  specialistProgress?.performanceStatus !== 'good' ||
  specialistProgress?.progressPercentage !== 100
) {
  throw new Error('Specialist was not evaluated as good with 100% progress');
}
if (supervisorProgress?.performanceStatus !== 'weak') {
  throw new Error('Supervisor with unfinished work was not evaluated as weak');
}
const persistedSpecialist = await request(
  'get persisted specialist performance',
  'GET',
  `/users/${specialistId}`,
  { token: manager.accessToken },
);
if (
  persistedSpecialist.performanceStatus !== 'good' ||
  persistedSpecialist.progressPercentage !== 100 ||
  !persistedSpecialist.performanceEvaluatedAt
) {
  throw new Error('Specialist performance was not persisted');
}

const leave = await request('create leave request', 'POST', '/leave-requests', {
  expectedStatus: 201,
  body: {
    user: specialistId,
    startDate: new Date(Date.now() + 86_400_000).toISOString(),
    endDate: new Date(Date.now() + 172_800_000).toISOString(),
    reason: 'Integration',
  },
});
await request(
  'approve leave request',
  'POST',
  `/leave-requests/${leave._id}/approve`,
  {
    expectedStatus: 201,
    body: { approvedBy: managerId },
  },
);

const uploadedExcel = await request(
  'upload Excel',
  'POST',
  `/excel/upload?createdBy=${managerId}`,
  {
    expectedStatus: 201,
    form: await createExcelUploadForm(),
  },
);
const excelId = uploadedExcel.id ?? uploadedExcel._id;
await request('process Excel', 'POST', `/excel/${excelId}/process`, {
  expectedStatus: 201,
});
const downloadedExcel = await request(
  'download Excel',
  'GET',
  `/excel/${excelId}/download`,
  {
    binary: true,
  },
);
if (downloadedExcel.byteLength === 0)
  throw new Error('Excel download was empty');

await new Promise((resolve) => setTimeout(resolve, 100));
const notifications = await request(
  'list specialist notifications',
  'GET',
  '/notifications/me',
  {
    token: specialist.accessToken,
  },
);
if (!notifications.data.length)
  throw new Error('Expected task assignment notifications');

await request('delete uploaded Excel', 'DELETE', `/excel/${excelId}`, {
  expectedStatus: 204,
});
await request(
  'delete task with related Excel',
  'DELETE',
  `/tasks/${linkedTask._id}`,
  {
    token: manager.accessToken,
    expectedStatus: 204,
  },
);
await request(
  'confirm related Excel cascade deletion',
  'GET',
  `/excel/${linkedExcelId}`,
  {
    expectedStatus: 404,
  },
);
await request('delete fixed task', 'DELETE', `/fixed-tasks/${fixedTask._id}`, {
  token: manager.accessToken,
  expectedStatus: 204,
});
await request(
  'delete supervisor fixed task',
  'DELETE',
  `/fixed-tasks/${supervisorFixedTask._id}`,
  {
    token: supervisor.accessToken,
    expectedStatus: 204,
  },
);
await request(
  'delete supervisor task',
  'DELETE',
  `/tasks/${supervisorTask._id}`,
  {
    token: manager.accessToken,
    expectedStatus: 204,
  },
);

console.log(
  JSON.stringify(
    {
      runId,
      passed: true,
      requests: results.length,
      records: {
        managerId,
        specialistId,
        taskId: task._id,
        fixedTaskId: fixedTask._id,
      },
      results,
    },
    null,
    2,
  ),
);
