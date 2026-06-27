# Fixed Task Scheduling Frontend Guide

This document explains how the frontend should send scheduling data for fixed tasks and how the backend generates future fixed-task occurrences.

## Main Concept

Each fixed task has:

- `recurrence`: defines the general repeat type.
- `scheduleConfig`: defines the exact days when the task should be generated.

Supported recurrence values:

```ts
daily
weekly
monthly
```

## scheduleConfig

### Weekdays

Used for `daily` and `weekly` fixed tasks.

Weekday values follow JavaScript format:

```txt
0 = Sunday
1 = Monday
2 = Tuesday
3 = Wednesday
4 = Thursday
5 = Friday
6 = Saturday
```

Example: Saturday to Thursday:

```json
{
  "recurrence": "daily",
  "scheduleConfig": {
    "weekdays": [6, 0, 1, 2, 3, 4]
  }
}
```

Example: Saturday, Monday, Wednesday:

```json
{
  "recurrence": "weekly",
  "scheduleConfig": {
    "weekdays": [6, 1, 3]
  }
}
```

### Month Days

Used for `monthly` fixed tasks.

Example: generate on the 2nd and 20th day of each month:

```json
{
  "recurrence": "monthly",
  "scheduleConfig": {
    "monthDays": [2, 20]
  }
}
```

## Create Fixed Task

Endpoint:

```http
POST /api/fixed-tasks
```

Example body:

```json
{
  "title": "Daily warehouse report",
  "assignedTo": "USER_ID",
  "recurrence": "daily",
  "description": "Daily warehouse operation report",
  "scheduleConfig": {
    "weekdays": [6, 0, 1, 2, 3, 4]
  },
  "isActive": true
}
```

The frontend can also send `startDate`, `endDate`, `startTime`, and `endTime` if needed, but scheduling is controlled by `scheduleConfig`.

## Update Fixed Task Schedule

Endpoint:

```http
PATCH /api/fixed-tasks/:id
```

Example body:

```json
{
  "scheduleConfig": {
    "weekdays": [6, 1, 3]
  }
}
```

For monthly fixed tasks:

```json
{
  "scheduleConfig": {
    "monthDays": [2, 20]
  }
}
```

## Cron Generation Flow

The backend cron checks active fixed tasks every day.

For each active fixed task:

1. Backend checks the task `recurrence`.
2. Backend checks `scheduleConfig`.
3. If today is not included in `scheduleConfig`, nothing is generated.
4. If the current occurrence was already generated today, backend skips it.
5. If today is valid, backend deactivates the old occurrence:

```json
{
  "isActive": false
}
```

6. Backend creates a new occurrence:

```json
{
  "isActive": true,
  "status": "todo",
  "startedAt": null,
  "doneTime": null,
  "actualDurationMinutes": null,
  "scoreAdjusted": false
}
```

The new occurrence keeps:

- `title`
- `assignedTo`
- `createdBy`
- `recurrence`
- `description`
- `scheduleConfig`
- approved timing fields, if the previous occurrence was approved

## Default Behavior

If `scheduleConfig` is not sent:

- `daily`: can be generated every working day, depending on holiday/Friday rules.
- `weekly`: defaults to Saturday.
- `monthly`: defaults to the first day of the month.

## Approved Timing Behavior

If a fixed task has approved timing:

```json
{
  "approvedDurationMinutes": 90,
  "timingApprovalStatus": "approved",
  "timingApprovedBy": "USER_ID",
  "timingApprovedAt": "DATE"
}
```

then future cron-generated occurrences inherit these fields.

## Important Frontend Notes

- Do not send Persian weekday names to the backend.
- Always send weekday numbers using JavaScript weekday format.
- For monthly recurrence, send numeric month days only.
- `scheduleConfig.weekdays` is used for `daily` and `weekly`.
- `scheduleConfig.monthDays` is used for `monthly`.
- `scheduleConfig` is optional, but recommended for exact scheduling.
