# مستند جامع API پروژه Taskino

این سند بر اساس کد فعلی پروژه تهیه شده و هدف آن ارائه توضیح فارسی برای تمام ماژول‌ها، APIها، ورودی‌ها، خروجی‌ها، محدودیت‌ها و خطاهای رایج است.

## اطلاعات عمومی

- آدرس پایه: `http://localhost:3000/api`
- Swagger: مسیر تنظیم‌شده در متغیر `SWAGGER_PATH`، معمولاً `http://localhost:3000/api/docs`
- فرمت بدنه درخواست‌ها: `application/json`
- احراز هویت: ارسال JWT در هدر زیر:

```http
Authorization: Bearer <accessToken>
```

### ساختار عمومی خطا

```json
{
  "statusCode": 400,
  "path": "/api/example",
  "method": "POST",
  "message": "Validation failed",
  "errors": null,
  "timestamp": "2026-06-06T12:00:00.000Z"
}
```

### ساختار عمومی Pagination

```json
{
  "data": [],
  "total": 25,
  "page": 1,
  "limit": 10
}
```

### Enumهای اصلی

| عنوان | مقادیر |
|---|---|
| نقش کاربر | `specialist`, `supervisor`, `manager` |
| حوزه کاری | `it`, `human_resources`, `finance`, `sales`, `operations` |
| وضعیت پروژه | `pending`, `in_progress`, `completed` |
| وضعیت تسک | `todo`, `in_progress`, `done` |
| توالی الگوی وظیفه ثابت | `daily`, `weekly`, `monthly` |
| وضعیت مرخصی | `pending`, `approved`, `rejected` |
| نوع Excel | `import`, `export` |
| وضعیت Excel | `pending`, `processing`, `completed`, `failed` |
| نوع اعلان | `task_assigned`, `task_completed`, `task_completion_stats`, `date_count`, `leave_request`, `leave_approved`, `leave_rejected`, `project_member_added` |

## سطح دسترسی فعلی ماژول‌ها

| ماژول | سطح دسترسی واقعی در کد فعلی |
|---|---|
| Auth | عمومی |
| User | بیشتر APIها عمومی؛ فقط approve نیازمند JWT مدیر است |
| Project | عمومی |
| Task | نیازمند JWT |
| LeaveRequest | عمومی |
| Excel | عمومی؛ وجود `ApiBearerAuth` فقط برای Swagger است |
| Notification | نیازمند JWT و محدود به اعلان‌های خود کاربر |
| Manager | نیازمند JWT و نقش `manager` |
| Supervisor | نیازمند JWT و نقش `supervisor` |

> نکته امنیتی: نمایش قفل در Swagger الزاماً به معنی محافظت API نیست. فقط وجود `JwtAuthGuard` دسترسی را واقعاً محدود می‌کند.

---

# ماژول App

## توضیح کلی

Endpoint ساده برای بررسی در دسترس بودن برنامه.

| متد | مسیر | دسترسی | توضیح |
|---|---|---|---|
| GET | `/api` | عمومی | دریافت پیام اولیه برنامه |

---

# ماژول Auth

## توضیح کلی

ثبت‌نام، اعتبارسنجی رمز عبور و صدور JWT را مدیریت می‌کند.

## مدل ورودی ثبت‌نام

| فیلد | نوع | الزامی | توضیح |
|---|---|---|---|
| `firstName` | string | بله | نام |
| `lastName` | string | بله | نام خانوادگی |
| `email` | email | بله | ایمیل یکتا |
| `mobile` | string | خیر | شماره موبایل |
| `password` | string | بله | حداقل ۶ کاراکتر |
| `roles` | UserRole | خیر | پیش‌فرض `specialist` |
| `workField` | WorkField | بله | حوزه کاری کاربر |

## APIها

### ثبت‌نام

`POST /api/auth/register`

- دسترسی: عمومی
- خروجی موفق `201`: اطلاعات کاربر بدون رمز و `accessToken`
- خطاها: ایمیل تکراری `409`، ورودی نامعتبر `400`

```json
{
  "firstName": "Ali",
  "lastName": "Ahmadi",
  "email": "ali@example.com",
  "mobile": "+989121234567",
  "password": "Pass1234",
  "roles": "specialist",
  "workField": "it"
}
```

### ورود

`POST /api/auth/login`

| فیلد | نوع | الزامی |
|---|---|---|
| `mobile` | string | بله |
| `password` | string، حداقل ۶ کاراکتر | بله |

- خروجی موفق `200`: اطلاعات کاربر و JWT
- خطا: اطلاعات ورود اشتباه `401`

---

# ماژول User

## توضیح کلی

مدیریت کاربران، ویرایش پروفایل، فعال‌سازی کاربر و امتیاز کاربران.

## مدل کاربر

خروجی کاربر معمولاً شامل `_id`, `firstName`, `lastName`, `email`, `mobile`, `roles`, `workField`, `score`, `isActive`, `createdAt`, `updatedAt` است. رمز عبور در خروجی حذف می‌شود.

## APIها

| متد | مسیر | ورودی | خروجی/عملکرد |
|---|---|---|---|
| POST | `/api/users` | `firstName`, `lastName`, `email`, `mobile?`, `password`, `workField` | ساخت کاربر با نقش پیش‌فرض specialist |
| GET | `/api/users?page=1&limit=10` | Query pagination | لیست صفحه‌بندی‌شده کاربران |
| GET | `/api/users/:id` | شناسه کاربر | اطلاعات یک کاربر |
| PATCH | `/api/users/:id` | `firstName?`, `lastName?`, `email?`, `mobile?`, `password?` | ویرایش اطلاعات کاربر |
| DELETE | `/api/users/:id` | شناسه کاربر | حذف کاربر، خروجی `204` |
| PATCH | `/api/users/:id/approve` | JWT مدیر | فعال‌کردن کاربر و تنظیم `isActive=true` |
| POST | `/api/users/increase-score` | `userId`, `score` | افزایش امتیاز کاربر |

### افزایش امتیاز

```json
{
  "userId": "64a7b1c2d3e4f5a6b7c8d9e1",
  "score": 10
}
```

- `score` باید عدد و حداقل `1` باشد.

---

# ماژول Project

## توضیح کلی

مدیریت پروژه، مالک مدیر، سرپرست، متخصص مسئول، تسک‌های متصل و محاسبه پیشرفت پروژه.

## قوانین دامنه پروژه

- مالک پروژه باید نقش `manager` داشته باشد.
- `supervisorId` باید متعلق به کاربری با نقش `supervisor` باشد.
- هر پروژه حداکثر یک متخصص مسئول در فیلد `assigneeId` دارد.
- متخصص مسئول باید فعال، دارای نقش `specialist` و هم‌حوزه با پروژه باشد.
- مالک، سرپرست و متخصص مسئول باید با `workField` پروژه یکسان باشند.
- پیشرفت پروژه بر اساس تسک‌هایی محاسبه می‌شود که `projectId` آن‌ها برابر شناسه پروژه است.

## ورودی ساخت پروژه

| فیلد | نوع | الزامی | توضیح |
|---|---|---|---|
| `title` | string | بله | عنوان پروژه |
| `description` | string | خیر | توضیحات |
| `status` | ProjectStatus | خیر | پیش‌فرض pending |
| `workField` | WorkField | بله | حوزه کاری |
| `owner` | MongoId | بله | شناسه مدیر مالک |
| `supervisorId` | MongoId | بله | شناسه سرپرست |
| `startDate` | ISO date | خیر | تاریخ شروع |
| `endDate` | ISO date | خیر | تاریخ پایان |
| `isArchived` | boolean | خیر | آرشیو بودن پروژه |

## APIها

| متد | مسیر | ورودی | خروجی/عملکرد |
|---|---|---|---|
| POST | `/api/projects` | CreateProjectDto | ساخت پروژه |
| GET | `/api/projects` | `page`, `limit`, `owner?`, `member?`, `status?`, `isArchived?` | لیست پروژه‌ها؛ `member` شناسه متخصص مسئول است |
| GET | `/api/projects/:id` | شناسه پروژه | پروژه با owner، supervisor، assigneeId و tasks |
| GET | `/api/projects/owner/:ownerId` | شناسه مالک | پروژه‌های مالک |
| PATCH | `/api/projects/:id` | فیلدهای قابل ویرایش پروژه | ویرایش پروژه |
| DELETE | `/api/projects/:id` | شناسه پروژه | حذف پروژه |
| PATCH | `/api/projects/:id/tasks/:taskId` | شناسه پروژه و تسک | افزودن شناسه تسک به آرایه tasks |
| DELETE | `/api/projects/:id/tasks/:taskId` | شناسه پروژه و تسک | حذف شناسه تسک از آرایه tasks |
| GET | `/api/projects/:id/progress` | شناسه پروژه | آمار و درصد پیشرفت |

### نمونه خروجی پیشرفت

```json
{
  "projectId": "...",
  "projectName": "Taskino",
  "totalTasks": 4,
  "completedTasks": 1,
  "inProgressTasks": 1,
  "pendingTasks": 2,
  "progressPercentage": 25
}
```

---

# ماژول Task

## توضیح کلی

ساخت و مدیریت اجرای واقعی تسک‌ها، تخصیص افراد، وضعیت، آمار و گزارش بازه تاریخی. تمام APIهای این ماژول نیازمند JWT هستند. اگر تسک توسط زمان‌بند از یک الگوی ثابت تولید شود، فیلد `fixedTaskTemplateId` آن را به الگوی اصلی متصل می‌کند.

## قوانین ساخت تسک

- سازنده واقعی از JWT دریافت می‌شود؛ مقدار `createdBy` بدنه قابل جعل نیست.
- سازنده تسک پروژه باید مدیر مالک پروژه یا سرپرست همان پروژه باشد.
- پروژه باید وجود داشته باشد.
- هر تسک باید دقیقاً یک مسئول داشته باشد.
- تسک پروژه فقط به متخصص مسئول ثبت‌شده در `Project.assigneeId` تخصیص داده می‌شود.
- ساخت و تغییر تخصیص باعث تولید اعلان داخلی می‌شود.

## ورودی ساخت

| فیلد | نوع | الزامی | توضیح |
|---|---|---|---|
| `title` | string | بله | عنوان |
| `createdBy` | string | در DTO وجود دارد | در Controller با شناسه JWT جایگزین می‌شود |
| `projectId` | string | خیر | پروژه مربوط |
| `assignedTo` | string[] | بله | آرایه‌ای شامل دقیقاً شناسه یک کاربر مسئول |
| `status` | TaskStatus | خیر | پیش‌فرض todo |
| `description` | string | خیر | توضیحات |
| `taskComment` | string | خیر | نظر |
| `startDate` | string | خیر | تاریخ شروع |
| `dueDate` | string | خیر | موعد |
| `file` | multipart file | خیر | فایل Excel همراه |

## APIها

| متد | مسیر | ورودی | خروجی/عملکرد |
|---|---|---|---|
| POST | `/api/tasks` | multipart یا JSON CreateTaskDto + JWT | ساخت تسک |
| GET | `/api/tasks` | `page`, `limit`, `createdBy?`, `assignedTo?`, `status?` | لیست تسک‌ها |
| GET | `/api/tasks/:id` | شناسه تسک | تسک با کاربران populateشده |
| PATCH | `/api/tasks/:id` | `title?`, `assignedTo?`, `status?`, `taskComment?` | ویرایش تسک |
| DELETE | `/api/tasks/:id` | شناسه تسک | حذف تسک، خروجی `204` |
| PATCH | `/api/tasks/:id/status` | `{ "status": "done" }` | تغییر وضعیت معتبر |
| POST | `/api/tasks/completion-stats` | `managerId`, `expertId`, `projectId?` | آمار تکمیل تسک مدیر/کارشناس |
| POST | `/api/tasks/date-count` | `projectId`, `userId`, `startdate`, `enddate` | آمار تسک‌های هم‌پوشان با بازه |

### خروجی completion-stats

```json
{
  "managerId": "...",
  "expertId": "...",
  "totalTasks": 2,
  "completedTasks": 1,
  "pendingTasks": 1,
  "pendingByStatus": { "todo": 0, "in_progress": 1 },
  "completedByStatus": { "done": 1 }
}
```

---

# ماژول FixedTask

## توضیح کلی

این ماژول جدول مستقل تعریف وظایف ثابت را نگه می‌دارد. هر رکورد فقط یک‌بار تعریف می‌شود و در آینده زمان‌بند سیستم می‌تواند بر اساس `recurrence` بارها از روی آن Task واقعی تولید کند.

## مدل FixedTaskTemplate

| فیلد | توضیح |
|---|---|
| `title` | عنوان یا ورودی فرایند |
| `assignedTo` | مسئول ثابت وظیفه؛ یک کاربر |
| `createdBy` | مدیر سازنده الگو |
| `projectId` | پروژه اختیاری |
| `recurrence` | `daily`, `weekly`, `monthly` |
| `description` | توضیحات |
| `isActive` | فعال یا متوقف بودن تولید دوره‌ای |
| `lastGeneratedAt` | آخرین زمان تولید Task واقعی |
| `nextRunAt` | زمان بعدی تولید |
| `sourceExcel`, `sourceSheet`, `sourceRow` | اطلاعات منبع Excel برای جلوگیری از داده تکراری |

تمام APIهای این ماژول نیازمند JWT و نقش `manager` هستند. در Template مستقل، مسئول باید با مدیر هم‌حوزه و دارای نقش `specialist` یا `supervisor` باشد. اگر `projectId` ارسال شود، مدیر باید مالک همان پروژه باشد و مسئول فقط متخصص ثبت‌شده در `Project.assigneeId` است.

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/api/fixed-tasks` | ساخت Template جدید |
| GET | `/api/fixed-tasks` | لیست با pagination و فیلترهای `assignedTo`, `projectId`, `recurrence`, `isActive` |
| GET | `/api/fixed-tasks/reports/incomplete` | گزارش وظایف ثابت انجام‌نشده روزانه، هفتگی و ماهانه |
| GET | `/api/fixed-tasks/:id` | دریافت یک Template |
| PATCH | `/api/fixed-tasks/:id` | ویرایش Template |
| DELETE | `/api/fixed-tasks/:id` | حذف Template با خروجی `204` |

### گزارش وظایف ثابت انجام‌نشده

این گزارش فقط Templateهای فعال ساخته‌شده توسط مدیر فعلی را بررسی می‌کند. اگر در دوره انتخاب‌شده هیچ Task متصل با `fixedTaskTemplateId` و وضعیت `done` وجود نداشته باشد، آن وظیفه در گزارش نمایش داده می‌شود.

- دوره `daily`: از ابتدای روز تا پایان همان روز
- دوره `weekly`: از ابتدای شنبه تا پایان پنج‌شنبه
- دوره `monthly`: از ابتدای ماه تا پایان همان ماه
- اگر Task واقعی `dueDate` داشته باشد، مهلت همان مقدار مدیر است؛ در غیر این صورت پایان دوره به‌عنوان مهلت استفاده می‌شود.
- `periodAt`: تاریخی داخل دوره مورد گزارش؛ پیش‌فرض زمان فعلی
- `reportAt`: زمان ارزیابی مهلت؛ پیش‌فرض زمان فعلی
- `deadlineStatus`: فیلتر `overdue` یا `within_deadline`
- فیلترهای دیگر: `recurrence`, `assignedTo`, `projectId`, `page`, `limit`

نمونه گزارش دوره جاری:

`GET /api/fixed-tasks/reports/incomplete?recurrence=weekly`

نمونه بررسی یک دوره قدیمی و فقط موارد مهلت‌گذشته:

`GET /api/fixed-tasks/reports/incomplete?periodAt=2026-04-10T12:00:00.000Z&deadlineStatus=overdue`

---

# ماژول LeaveRequest

## توضیح کلی

مدیریت درخواست‌های مرخصی، تأیید و رد درخواست‌ها.

## ورودی ساخت

| فیلد | نوع | الزامی |
|---|---|---|
| `user` | MongoId | بله |
| `startDate` | ISO date string | بله |
| `endDate` | ISO date string | بله |
| `reason` | string | خیر |
| `status` | LeaveStatus | خیر |
| `approvedBy` | MongoId | خیر |

## APIها

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/api/leave-requests` | ساخت درخواست؛ پایان نباید قبل از شروع باشد |
| GET | `/api/leave-requests` | لیست با `page`, `limit`, `user?`, `status?`, `approvedBy?` |
| GET | `/api/leave-requests/:id` | دریافت درخواست |
| GET | `/api/leave-requests/user/:userId` | درخواست‌های یک کاربر |
| PATCH | `/api/leave-requests/:id` | ویرایش کاربر، تاریخ، دلیل، وضعیت و اطلاعات تأیید |
| DELETE | `/api/leave-requests/:id` | حذف درخواست |
| POST | `/api/leave-requests/:id/approve` | بدنه `{ "approvedBy": "..." }` |
| POST | `/api/leave-requests/:id/reject` | بدنه شامل `approvedBy` و `rejectionReason` |

> وضعیت فعلی: این ماژول Guard ندارد و اطلاعات تأییدکننده را از body دریافت می‌کند.

---

# ماژول Excel

## توضیح کلی

ثبت اطلاعات فایل Excel، آپلود، پردازش import، دانلود و تولید export از JSON.

## APIها

| متد | مسیر | ورودی/خروجی |
|---|---|---|
| POST | `/api/excel` | ساخت رکورد با `createdBy`, `fileName` و اطلاعات اختیاری فایل |
| POST | `/api/excel/upload?createdBy=:id&type=import` | multipart با فیلد `file`؛ آپلود فایل |
| GET | `/api/excel` | لیست با `page`, `limit`, `createdBy?`, `status?`, `type?` |
| GET | `/api/excel/:id` | دریافت رکورد |
| GET | `/api/excel/:id/download` | دانلود فایل فیزیکی |
| PATCH | `/api/excel/:id` | ویرایش مسیر، MIME، سایز، status، sheet و آمار ردیف‌ها |
| DELETE | `/api/excel/:id` | حذف رکورد و فایل، خروجی `204` |
| POST | `/api/excel/:id/process` | پردازش فایل import |
| GET | `/api/excel/statistics/:userId` | آمار فایل‌های کاربر |
| POST | `/api/excel/export/generate` | تولید و دانلود `export.xlsx` از JSON |

### ورودی تولید Export

```json
{
  "data": [
    { "name": "Ali", "email": "ali@example.com" }
  ],
  "columns": ["name", "email"],
  "sheetName": "Users"
}
```

- خروجی `export/generate` فایل binary اکسل است، نه JSON.
- وضعیت فعلی: Controller دارای Guard نیست.

---

# ماژول Notification

## توضیح کلی

اعلان‌ها فقط توسط سرویس‌های داخلی و eventهای سیستم ساخته می‌شوند. API عمومی ساخت اعلان وجود ندارد. هر کاربر فقط اعلان‌های خودش را می‌بیند و مدیریت می‌کند.

## APIها

| متد | مسیر | توضیح |
|---|---|---|
| GET | `/api/notifications/me` | اعلان‌های کاربر فعلی |
| GET | `/api/notifications/me/unread-count` | تعداد خوانده‌نشده |
| PATCH | `/api/notifications/me/read-all` | خوانده‌شدن همه اعلان‌ها |
| DELETE | `/api/notifications/me/read` | حذف همه اعلان‌های خوانده‌شده |
| GET | `/api/notifications/:id` | دریافت اعلان خود کاربر؛ اعلان دیگری `404` |
| PATCH | `/api/notifications/:id` | فقط تغییر `{ "isRead": true }` |
| DELETE | `/api/notifications/:id` | حذف اعلان خود کاربر، خروجی `204` |

### Queryهای لیست اعلان

| Query | نوع | توضیح |
|---|---|---|
| `page` | integer >= 1 | صفحه |
| `limit` | integer 1..100 | تعداد |
| `type` | NotificationType | نوع اعلان |
| `isRead` | `"true"` یا `"false"` | وضعیت خواندن |
| `search` | string حداکثر ۱۰۰ | جستجو در title و message |

---

# ماژول Manager

## توضیح کلی

داشبورد و ابزارهای مدیریتی. تمام APIها نیازمند JWT و نقش `manager` هستند.

## APIها

| متد | مسیر | ورودی | خروجی/عملکرد |
|---|---|---|---|
| GET | `/api/manager/statistics` | - | تعداد پروژه فعال، تسک باز و کاربر فعال |
| GET | `/api/manager/users` | `page`, `limit`, `isActive?`, `role?` | لیست کاربران |
| PATCH | `/api/manager/users/:id/role` | `{ "role": "supervisor" }` | تغییر نقش کاربر |
| PATCH | `/api/manager/projects/:id/activation` | `{ "isActive": true }` | فعال/آرشیو کردن پروژه |
| GET | `/api/manager/projects/progress` | pagination | پیشرفت تمام پروژه‌ها |
| GET | `/api/manager/projects/:id/members` | شناسه پروژه | متخصص مسئول پروژه همراه نقش و وضعیت؛ نام مسیر برای سازگاری حفظ شده است |
| GET | `/api/manager/projects/:id/progress` | شناسه پروژه | پیشرفت پروژه |
| GET | `/api/manager/tasks/status?projectId=:id` | projectId اختیاری | تعداد تسک بر اساس وضعیت |
| GET | `/api/manager/tasks/users/counts?projectId=:id` | projectId اختیاری | تعداد تسک هر کاربر |
| GET | `/api/manager/users/monthly-performance` | `month`, `year`, `projectId?` | عملکرد ماهانه کاربران |

### خروجی statistics

```json
{
  "activeProjects": 2,
  "openTasks": 3,
  "activeUsers": 5
}
```

---

# ماژول Supervisor

## توضیح کلی

داشبورد سرپرست، پروژه‌های تحت نظارت، متخصصان مسئول، عملکرد تیم، تسک‌های معوق و تغییر وضعیت تسک. تمام APIها نیازمند JWT و نقش `supervisor` هستند. سرپرست فقط به پروژه‌هایی دسترسی دارد که `supervisorId` آن‌ها برابر شناسه خودش باشد.

## APIها

| متد | مسیر | خروجی/عملکرد |
|---|---|---|
| GET | `/api/supervisor/statistics` | آمار پروژه‌ها و تسک‌های سرپرست |
| GET | `/api/supervisor/projects?page=1&limit=10` | پروژه‌های تحت نظارت با آمار تسک |
| PATCH | `/api/supervisor/projects/:projectId/assignee` | تخصیص یا جایگزینی متخصص مسئول و انتقال تمام تسک‌ها و وظایف ثابت پروژه به او |
| GET | `/api/supervisor/projects/:projectId/members` | متخصص مسئول پروژه؛ نام مسیر برای سازگاری حفظ شده است |
| GET | `/api/supervisor/projects/:projectId/members/performance` | عملکرد متخصص مسئول |
| PATCH | `/api/supervisor/projects/:projectId/tasks/:taskId/status` | تغییر وضعیت تسک پروژه تحت نظارت |
| GET | `/api/supervisor/tasks/overdue?page=1&limit=10` | تسک‌های معوق تمام پروژه‌های تحت نظارت |
| GET | `/api/supervisor/projects/:projectId/report` | گزارش کامل پروژه |
| GET | `/api/supervisor/team/performance` | عملکرد تجمیعی متخصصان مسئول پروژه‌های تحت نظارت |

### ورودی تخصیص متخصص پروژه

متخصص باید فعال، دارای نقش `specialist` و دارای `workField` یکسان با پروژه باشد.

```json
{
  "assigneeId": "64a7b1c2d3e4f5a6b7c8d9e1"
}
```

### ورودی تغییر وضعیت

```json
{
  "status": "done"
}
```

### خروجی گزارش پروژه

```json
{
  "projectId": "...",
  "projectName": "Taskino",
  "membersCount": 1,
  "totalTasks": 4,
  "todoTasks": 2,
  "inProgressTasks": 1,
  "doneTasks": 1,
  "overdueTasks": 0,
  "completionRate": 25
}
```

---

# کدهای وضعیت مهم

| کد | معنی |
|---|---|
| `200` | عملیات موفق |
| `201` | رکورد ساخته شد |
| `204` | حذف موفق بدون بدنه |
| `400` | ورودی، MongoId، enum یا قانون دامنه نامعتبر |
| `401` | JWT وجود ندارد یا معتبر نیست |
| `403` | JWT معتبر است اما نقش اجازه دسترسی ندارد |
| `404` | رکورد پیدا نشد یا کاربر اجازه مشاهده آن را ندارد |
| `409` | داده تکراری مانند ایمیل |

# پیشنهاد استفاده در Postman

1. ابتدا از `/api/auth/login` توکن بگیرید.
2. یک Environment Variable با نام `token` بسازید.
3. هدر را به شکل `Authorization: Bearer {{token}}` قرار دهید.
4. شناسه‌های `userId`, `projectId`, `taskId` را در متغیرهای محیطی ذخیره کنید.
5. برای تست قوانین حوزه کاری، کاربران و پروژه را با `workField` یکسان بسازید.

# Seed تسک‌های ثابت از Excel

برای فایل‌هایی که هر Sheet متعلق به یک شخص است و ستون‌های `ورودی فرایند` و `توالي` دارند:

```bash
npm run seed:fixed-tasks -- "C:\path\to\fixed-tasks.xlsx"
```

- مقدار `ورودی فرایند` به عنوان `title` ذخیره می‌شود.
- مقدار فارسی `روزانه`، `هفتگي/هفتگی` و `ماهانه` به‌ترتیب به `daily`، `weekly` و `monthly` تبدیل می‌شود.
- تمام ردیف‌ها داخل جدول مستقل `FixedTaskTemplate` ذخیره می‌شوند و هیچ Task واقعی هنگام seed ساخته نمی‌شود.
- فایل فیزیکی داخل `uploads/excel` کپی و رکورد آن در کالکشن Excel ذخیره می‌شود.
- برای Sheetهایی که کاربر متناظر ندارند، کاربران seed با حوزه کاری `operations` ساخته می‌شوند.
- Seed تکرارپذیر است و اجرای مجدد، Template تکراری ایجاد نمی‌کند.
