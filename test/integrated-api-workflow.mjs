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
  results.push({ name, method, path, status: response.status, expectedStatus, passed });

  if (!passed) {
    throw new Error(`${name} failed with ${response.status}: ${JSON.stringify(body)}`);
  }

  return body;
}

async function register(label, role, mobile) {
  return request(`register ${label}`, 'POST', '/auth/register', {
    expectedStatus: 201,
    body: {
      firstName: 'Integration',
      lastName: label,
      email: `integration.${label.toLowerCase()}.${runId}@example.com`,
      mobile,
      password,
      roles: role,
      workField: 'it',
    },
  });
}

const manager = await register('Manager', 'manager', `98910${suffix}`);
const supervisor = await register('Supervisor', 'supervisor', `98911${suffix}`);
const specialist = await register('Specialist', 'specialist', `98912${suffix}`);
const roleCandidate = await register('RoleCandidate', 'specialist', `98913${suffix}`);

const managerId = manager.user._id;
const supervisorId = supervisor.user._id;
const specialistId = specialist.user._id;
const roleCandidateId = roleCandidate.user._id;

await request('get specialist user', 'GET', `/users/${specialistId}`);
await request('update specialist user', 'PATCH', `/users/${specialistId}`, {
  body: { lastName: `Specialist-${suffix}` },
});
await request('approve specialist', 'PATCH', `/users/${specialistId}/approve`, {
  token: manager.accessToken,
  body: {},
});
await request('increase specialist score', 'POST', '/users/increase-score', {
  body: { userId: specialistId, score: 15 },
});
await request('list users', 'GET', '/users?page=1&limit=20');

const project = await request('create project', 'POST', '/projects', {
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

await request('get project', 'GET', `/projects/${projectId}`);
await request('list projects by owner', 'GET', `/projects?owner=${managerId}`);
await request('update project', 'PATCH', `/projects/${projectId}`, {
  body: { status: 'in_progress', description: 'Integrated workflow is running' },
});

await request('reject inactive specialist assignment', 'PATCH', `/supervisor/projects/${projectId}/assignee`, {
  token: supervisor.accessToken,
  expectedStatus: 400,
  body: { assigneeId: roleCandidateId },
});
await request('assign specialist to project', 'PATCH', `/supervisor/projects/${projectId}/assignee`, {
  token: supervisor.accessToken,
  body: { assigneeId: specialistId },
});

const task = await request('create project task', 'POST', '/tasks', {
  token: manager.accessToken,
  expectedStatus: 201,
  body: {
    title: `Integration Task ${runId}`,
    createdBy: managerId,
    projectId,
    assignedTo: [specialistId],
    description: 'Created by integrated API workflow',
    startDate: new Date().toISOString(),
    dueDate: new Date(Date.now() + 86_400_000).toISOString(),
  },
});
const taskId = task._id;

await request('reject wrong project task assignee', 'PATCH', `/tasks/${taskId}`, {
  token: manager.accessToken,
  expectedStatus: 400,
  body: { assignedTo: [supervisorId] },
});
await request('update task', 'PATCH', `/tasks/${taskId}`, {
  token: manager.accessToken,
  body: { taskComment: 'Integration workflow update', status: 'in_progress' },
});
await request('complete task', 'PATCH', `/tasks/${taskId}/status`, {
  token: manager.accessToken,
  body: { status: 'done' },
});
await request('get task', 'GET', `/tasks/${taskId}`, { token: manager.accessToken });
await request('list specialist tasks', 'GET', `/tasks?assignedTo=${specialistId}`, {
  token: manager.accessToken,
});

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

const dailyFixedTask = await request('create daily fixed task', 'POST', '/fixed-tasks', {
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
});
const weeklyFixedTask = await request('create weekly fixed task', 'POST', '/fixed-tasks', {
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
});

await request('update fixed task', 'PATCH', `/fixed-tasks/${fixedTaskId}`, {
  token: manager.accessToken,
  body: { description: 'Integrated workflow verified', recurrence: 'monthly' },
});
await request('get fixed task', 'GET', `/fixed-tasks/${fixedTaskId}`, {
  token: manager.accessToken,
});
await request('list project fixed tasks', 'GET', `/fixed-tasks?projectId=${projectId}`, {
  token: manager.accessToken,
});
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
  throw new Error('Incomplete fixed task reports did not include all recurrence fixtures');
}

await request('manager statistics', 'GET', '/manager/statistics', {
  token: manager.accessToken,
});
await request('manager users', 'GET', '/manager/users?page=1&limit=20&role=specialist', {
  token: manager.accessToken,
});
await request('manager update role', 'PATCH', `/manager/users/${roleCandidateId}/role`, {
  token: manager.accessToken,
  body: { role: 'supervisor' },
});
await request('manager project specialist', 'GET', `/manager/projects/${projectId}/members`, {
  token: manager.accessToken,
});
await request('manager project progress', 'GET', `/manager/projects/${projectId}/progress`, {
  token: manager.accessToken,
});
await request('manager projects progress', 'GET', '/manager/projects/progress?page=1&limit=20', {
  token: manager.accessToken,
});
await request('manager task status overview', 'GET', `/manager/tasks/status?projectId=${projectId}`, {
  token: manager.accessToken,
});
await request('manager task counts by user', 'GET', `/manager/tasks/users/counts?projectId=${projectId}`, {
  token: manager.accessToken,
});
const now = new Date();
await request(
  'manager monthly performance',
  'GET',
  `/manager/users/monthly-performance?month=${now.getMonth() + 1}&year=${now.getFullYear()}&projectId=${projectId}`,
  { token: manager.accessToken },
);
await request('manager deactivate project', 'PATCH', `/manager/projects/${projectId}/activation`, {
  token: manager.accessToken,
  body: { isActive: false },
});
await request('manager reactivate project', 'PATCH', `/manager/projects/${projectId}/activation`, {
  token: manager.accessToken,
  body: { isActive: true },
});

const finalProject = await request('verify persisted project', 'GET', `/projects/${projectId}`);
const finalTask = await request('verify persisted task', 'GET', `/tasks/${taskId}`, {
  token: manager.accessToken,
});
const finalFixedTask = await request('verify persisted fixed task', 'GET', `/fixed-tasks/${fixedTaskId}`, {
  token: manager.accessToken,
});

console.log(JSON.stringify({
  runId,
  passed: results.every((result) => result.passed),
  requests: results.length,
  records: {
    managerId,
    supervisorId,
    specialistId,
    roleCandidateId,
    projectId,
    taskId,
    fixedTaskId,
    dailyFixedTaskId: dailyFixedTask._id,
    weeklyFixedTaskId: weeklyFixedTask._id,
  },
  persisted: {
    projectAssigneeId: finalProject.assigneeId?._id ?? finalProject.assigneeId,
    projectArchived: finalProject.isArchived,
    taskStatus: finalTask.status,
    fixedTaskRecurrence: finalFixedTask.recurrence,
  },
  results,
}, null, 2));
