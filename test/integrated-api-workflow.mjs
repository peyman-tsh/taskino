import { readFile } from 'node:fs/promises';
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
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  let body;
  try {
    body = text ? JSON.parse(text) : undefined;
  } catch {
    body = text;
  }

  const expectedStatus = options.expectedStatus ?? 200;
  const passed = response.status === expectedStatus;
  results.push({
    name,
    method,
    path,
    status: response.status,
    expectedStatus,
    passed,
  });

  if (!passed) {
    throw new Error(
      `${name} failed with ${response.status}: ${JSON.stringify(body)}`,
    );
  }

  return body;
}

async function register(label, mobile, requestedRole) {
  return request(`register ${label}`, 'POST', '/auth/register', {
    expectedStatus: 201,
    body: {
      firstName: 'Integration',
      lastName: label,
      email: `integration.${label.toLowerCase()}.${runId}@example.com`,
      mobile,
      password,
      ...(requestedRole ? { roles: requestedRole } : {}),
      workField: 'it',
    },
  });
}

async function getMongoUri() {
  if (process.env.MONGODB_URI) {
    return process.env.MONGODB_URI;
  }

  const envFile = await readFile('.env', 'utf8');
  const match = envFile.match(/^MONGODB_URI=(.+)$/m);
  if (!match) {
    throw new Error('MONGODB_URI is missing');
  }

  return match[1].trim().replace('localhost', '127.0.0.1');
}

async function promoteTestUsers(managerId, supervisorId) {
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

const managerRegistration = await register(
  'Manager',
  `98910${suffix}`,
  'manager',
);
const supervisorRegistration = await register(
  'Supervisor',
  `98911${suffix}`,
  'supervisor',
);
const specialist = await register('Specialist', `98912${suffix}`);
const roleCandidate = await register('RoleCandidate', `98913${suffix}`);

if (
  managerRegistration.user.roles !== 'specialist' ||
  supervisorRegistration.user.roles !== 'specialist'
) {
  throw new Error('Public registration must not allow privileged roles');
}

await promoteTestUsers(
  managerRegistration.user._id,
  supervisorRegistration.user._id,
);

const manager = await request('login promoted Manager', 'POST', '/auth/login', {
  body: { mobile: `98910${suffix}`, password },
});
const supervisor = await request(
  'login promoted Supervisor',
  'POST',
  '/auth/login',
  {
    body: { mobile: `98911${suffix}`, password },
  },
);

const managerId = manager.user._id;
const supervisorId = supervisor.user._id;
const specialistId = specialist.user._id;
const roleCandidateId = roleCandidate.user._id;

await request('reject unauthenticated project list', 'GET', '/projects', {
  expectedStatus: 401,
});
await request('reject specialist user list', 'GET', '/users', {
  token: specialist.accessToken,
  expectedStatus: 403,
});
await request('reject specialist project creation', 'POST', '/projects', {
  token: specialist.accessToken,
  expectedStatus: 403,
  body: {
    title: 'Forbidden project',
    workField: 'it',
    owner: managerId,
    supervisorId,
  },
});

await request('get specialist user', 'GET', `/users/${specialistId}`, {
  token: manager.accessToken,
});
await request('update specialist user', 'PATCH', `/users/${specialistId}`, {
  token: manager.accessToken,
  body: { lastName: `Specialist-${suffix}` },
});
await request('approve specialist', 'PATCH', `/users/${specialistId}/approve`, {
  token: manager.accessToken,
  body: {},
});
await request('increase specialist score', 'POST', '/users/increase-score', {
  token: manager.accessToken,
  body: { userId: specialistId, score: 15 },
});
await request('list users', 'GET', '/users?page=1&limit=20', {
  token: manager.accessToken,
});

const project = await request('create project', 'POST', '/projects', {
  token: manager.accessToken,
  expectedStatus: 201,
  body: {
    title: `Integration Project ${runId}`,
    description: 'Created by integrated API workflow',
    workField: 'it',
    owner: managerId,
    supervisorId,
    startDate: new Date().toISOString(),
    isArchived: false,
  },
});
const projectId = project._id;

if (project.isPublic !== true || project.assigneeId) {
  throw new Error('A project created without assigneeId must be public');
}

await request('get project', 'GET', `/projects/${projectId}`, {
  token: manager.accessToken,
});
await request('list projects by owner', 'GET', `/projects?owner=${managerId}`, {
  token: manager.accessToken,
});
await request('list public projects', 'GET', '/projects?isPublic=true', {
  token: manager.accessToken,
});
await request('update project', 'PATCH', `/projects/${projectId}`, {
  token: manager.accessToken,
  body: {
    status: 'in_progress',
    description: 'Integrated workflow is running',
  },
});

await request(
  'reject inactive specialist assignment',
  'PATCH',
  `/supervisor/projects/${projectId}/assignee`,
  {
    token: supervisor.accessToken,
    expectedStatus: 400,
    body: { assigneeId: roleCandidateId },
  },
);
const assignedProject = await request(
  'assign specialist to project',
  'PATCH',
  `/supervisor/projects/${projectId}/assignee`,
  {
    token: supervisor.accessToken,
    body: { assigneeId: specialistId },
  },
);

if (assignedProject.project.isPublic !== false) {
  throw new Error('A project must become private when an assignee is added');
}

const privateProject = await request(
  'create private project with assignee',
  'POST',
  '/projects',
  {
    token: manager.accessToken,
    expectedStatus: 201,
    body: {
      title: `Integration Private Project ${runId}`,
      description: 'Created privately with an assignee',
      workField: 'it',
      owner: managerId,
      supervisorId,
      assigneeId: specialistId,
      isPublic: true,
    },
  },
);

if (privateProject.isPublic !== false || !privateProject.assigneeId) {
  throw new Error('A project created with assigneeId must be private');
}

await request('list private projects', 'GET', '/projects?isPublic=false', {
  token: manager.accessToken,
});

const taskStartDate = new Date();
taskStartDate.setUTCHours(6, 15, 0, 0);
const taskDueDate = new Date(taskStartDate.getTime() + 8 * 60 * 60 * 1000);

await request('reject task date without time', 'POST', '/tasks', {
  token: manager.accessToken,
  expectedStatus: 400,
  body: {
    title: `Invalid date-only Task ${runId}`,
    projectId,
    assignedTo: [specialistId],
    startDate: '2026-06-07',
    dueDate: '2026-06-08',
  },
});

await request('reject deadline before start time', 'POST', '/tasks', {
  token: manager.accessToken,
  expectedStatus: 400,
  body: {
    title: `Invalid deadline Task ${runId}`,
    projectId,
    assignedTo: [specialistId],
    startDate: taskDueDate.toISOString(),
    dueDate: taskStartDate.toISOString(),
  },
});

const task = await request(
  'create project task with exact hours',
  'POST',
  '/tasks',
  {
    token: manager.accessToken,
    expectedStatus: 201,
    body: {
      title: `Integration Task ${runId}`,
      createdBy: managerId,
      projectId,
      assignedTo: [specialistId],
      description: 'Created by integrated API workflow',
      startDate: taskStartDate.toISOString(),
      dueDate: taskDueDate.toISOString(),
    },
  },
);
const taskId = task._id;

if (
  task.startDate !== taskStartDate.toISOString() ||
  task.dueDate !== taskDueDate.toISOString()
) {
  throw new Error('Task start and deadline hours were not preserved');
}

await request('reject specialist task update', 'PATCH', `/tasks/${taskId}`, {
  token: specialist.accessToken,
  expectedStatus: 403,
  body: { status: 'done' },
});
await request(
  'reject wrong project task assignee',
  'PATCH',
  `/tasks/${taskId}`,
  {
    token: manager.accessToken,
    expectedStatus: 400,
    body: { assignedTo: [supervisorId] },
  },
);
await request('update task', 'PATCH', `/tasks/${taskId}`, {
  token: manager.accessToken,
  body: { taskComment: 'Integration workflow update', status: 'in_progress' },
});
await request('reject invalid deadline update', 'PATCH', `/tasks/${taskId}`, {
  token: manager.accessToken,
  expectedStatus: 400,
  body: { dueDate: new Date(taskStartDate.getTime() - 60_000).toISOString() },
});
await request('complete task', 'PATCH', `/tasks/${taskId}/status`, {
  token: manager.accessToken,
  body: { status: 'done' },
});
await request('get task', 'GET', `/tasks/${taskId}`, {
  token: manager.accessToken,
});
await request(
  'list specialist tasks',
  'GET',
  `/tasks?assignedTo=${specialistId}`,
  {
    token: manager.accessToken,
  },
);
const dateFilteredTasks = await request(
  'list tasks overlapping date range',
  'GET',
  `/tasks?startDate=${encodeURIComponent(new Date(taskStartDate.getTime() + 60_000).toISOString())}&endDate=${encodeURIComponent(new Date(taskDueDate.getTime() - 60_000).toISOString())}`,
  {
    token: manager.accessToken,
  },
);
if (
  !dateFilteredTasks.data.some((filteredTask) => filteredTask._id === taskId)
) {
  throw new Error('Task date-range filter did not return the overlapping task');
}
await request(
  'reject invalid task date range',
  'GET',
  `/tasks?startDate=${encodeURIComponent(taskDueDate.toISOString())}&endDate=${encodeURIComponent(taskStartDate.toISOString())}`,
  {
    token: manager.accessToken,
    expectedStatus: 400,
  },
);

const fixedTask = await request('create fixed task', 'POST', '/fixed-tasks', {
  token: manager.accessToken,
  expectedStatus: 201,
  body: {
    title: `Integration Fixed Task ${runId}`,
    assignedTo: specialistId,
    projectId,
    recurrence: 'weekly',
    description: 'Created by integrated API workflow',
    isActive: true,
    nextRunAt: new Date(Date.now() + 86_400_000).toISOString(),
  },
});
const fixedTaskId = fixedTask._id;

const dailyFixedTask = await request(
  'create daily fixed task',
  'POST',
  '/fixed-tasks',
  {
    token: manager.accessToken,
    expectedStatus: 201,
    body: {
      title: `Integration Daily Fixed Task ${runId}`,
      assignedTo: specialistId,
      projectId,
      recurrence: 'daily',
      description: 'Daily incomplete report fixture',
      isActive: true,
    },
  },
);
const weeklyFixedTask = await request(
  'create weekly fixed task',
  'POST',
  '/fixed-tasks',
  {
    token: manager.accessToken,
    expectedStatus: 201,
    body: {
      title: `Integration Weekly Fixed Task ${runId}`,
      assignedTo: specialistId,
      projectId,
      recurrence: 'weekly',
      description: 'Weekly incomplete report fixture',
      isActive: true,
    },
  },
);

await request('update fixed task', 'PATCH', `/fixed-tasks/${fixedTaskId}`, {
  token: manager.accessToken,
  body: { description: 'Integrated workflow verified', recurrence: 'monthly' },
});
await request('get fixed task', 'GET', `/fixed-tasks/${fixedTaskId}`, {
  token: manager.accessToken,
});
await request(
  'list project fixed tasks',
  'GET',
  `/fixed-tasks?projectId=${projectId}`,
  {
    token: manager.accessToken,
  },
);
const dailyReport = await request(
  'daily incomplete fixed task report',
  'GET',
  `/fixed-tasks/reports/incomplete?projectId=${projectId}&recurrence=daily`,
  { token: manager.accessToken },
);
const weeklyReport = await request(
  'weekly incomplete fixed task report',
  'GET',
  `/fixed-tasks/reports/incomplete?projectId=${projectId}&recurrence=weekly`,
  { token: manager.accessToken },
);
const monthlyReport = await request(
  'monthly incomplete fixed task report',
  'GET',
  `/fixed-tasks/reports/incomplete?projectId=${projectId}&recurrence=monthly`,
  { token: manager.accessToken },
);
const historicalPeriodAt = new Date();
historicalPeriodAt.setMonth(historicalPeriodAt.getMonth() - 2);
const overdueReport = await request(
  'overdue incomplete fixed task report',
  'GET',
  `/fixed-tasks/reports/incomplete?projectId=${projectId}&periodAt=${encodeURIComponent(historicalPeriodAt.toISOString())}&deadlineStatus=overdue`,
  { token: manager.accessToken },
);
if (
  !dailyReport.data.some((item) => item.templateId === dailyFixedTask._id) ||
  !weeklyReport.data.some((item) => item.templateId === weeklyFixedTask._id) ||
  !monthlyReport.data.some((item) => item.templateId === fixedTaskId) ||
  overdueReport.total < 3
) {
  throw new Error(
    'Incomplete fixed task reports did not include all recurrence fixtures',
  );
}

await request('manager statistics', 'GET', '/manager/statistics', {
  token: manager.accessToken,
});
await request(
  'manager users',
  'GET',
  '/manager/users?page=1&limit=20&role=specialist',
  {
    token: manager.accessToken,
  },
);
await request(
  'manager update role',
  'PATCH',
  `/manager/users/${roleCandidateId}/role`,
  {
    token: manager.accessToken,
    body: { role: 'supervisor' },
  },
);
await request(
  'manager project specialist',
  'GET',
  `/manager/projects/${projectId}/assignee`,
  {
    token: manager.accessToken,
  },
);
await request(
  'manager project progress',
  'GET',
  `/manager/projects/${projectId}/progress`,
  {
    token: manager.accessToken,
  },
);
await request(
  'manager projects progress',
  'GET',
  '/manager/projects/progress?page=1&limit=20',
  {
    token: manager.accessToken,
  },
);
await request(
  'manager task status overview',
  'GET',
  `/manager/tasks/status?projectId=${projectId}`,
  {
    token: manager.accessToken,
  },
);
await request(
  'manager task counts by user',
  'GET',
  `/manager/tasks/users/counts?projectId=${projectId}`,
  {
    token: manager.accessToken,
  },
);
const now = new Date();
await request(
  'manager monthly performance',
  'GET',
  `/manager/users/monthly-performance?month=${now.getMonth() + 1}&year=${now.getFullYear()}&projectId=${projectId}`,
  { token: manager.accessToken },
);
await request(
  'manager deactivate project',
  'PATCH',
  `/manager/projects/${projectId}/activation`,
  {
    token: manager.accessToken,
    body: { isActive: false },
  },
);
await request(
  'manager reactivate project',
  'PATCH',
  `/manager/projects/${projectId}/activation`,
  {
    token: manager.accessToken,
    body: { isActive: true },
  },
);

const finalProject = await request(
  'verify persisted project',
  'GET',
  `/projects/${projectId}`,
  {
    token: manager.accessToken,
  },
);
const finalTask = await request(
  'verify persisted task',
  'GET',
  `/tasks/${taskId}`,
  {
    token: manager.accessToken,
  },
);
const finalFixedTask = await request(
  'verify persisted fixed task',
  'GET',
  `/fixed-tasks/${fixedTaskId}`,
  {
    token: manager.accessToken,
  },
);

console.log(
  JSON.stringify(
    {
      runId,
      passed: results.every((result) => result.passed),
      requests: results.length,
      records: {
        managerId,
        supervisorId,
        specialistId,
        roleCandidateId,
        projectId,
        privateProjectId: privateProject._id,
        taskId,
        fixedTaskId,
        dailyFixedTaskId: dailyFixedTask._id,
        weeklyFixedTaskId: weeklyFixedTask._id,
      },
      persisted: {
        projectAssigneeId:
          finalProject.assigneeId?._id ?? finalProject.assigneeId,
        projectIsPublic: finalProject.isPublic,
        projectArchived: finalProject.isArchived,
        taskStatus: finalTask.status,
        fixedTaskRecurrence: finalFixedTask.recurrence,
      },
      results,
    },
    null,
    2,
  ),
);
