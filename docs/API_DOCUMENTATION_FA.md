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
| وضعیت مرخصی | `pending`, `approved`, `rejected` |
| نقش ProjectMember | `manager`, `member`, `viewer` |
| نوع Excel | `import`, `export` |
| وضعیت Excel | `pending`, `processing`, `completed`, `failed` |
| نوع اعلان | `task_assigned`, `task_completed`, `task_completion_stats`, `date_count`, `leave_request`, `leave_approved`, `leave_rejected`, `project_member_added` |

## سطح دسترسی فعلی ماژول‌ها

| ماژول | سطح دسترسی واقعی در کد فعلی |
|---|---|
| Auth | عمومی |
| User | بیشتر APIها عمومی؛ فقط approve نیازمند JWT مدیر است |
| Project | عمومی |
| ProjectMember | عمومی |
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

مدیریت پروژه، مالک مدیر، سرپرست، اعضا، تسک‌های متصل و محاسبه پیشرفت پروژه.

## قوانین دامنه پروژه

- مالک پروژه باید نقش `manager` داشته باشد.
- `supervisorId` باید متعلق به کاربری با نقش `supervisor` باشد.
- مالک، سرپرست و اعضا باید با `workField` پروژه یکسان باشند.
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
| `members` | MongoId[] | خیر | اعضای پروژه |
| `startDate` | ISO date | خیر | تاریخ شروع |
| `endDate` | ISO date | خیر | تاریخ پایان |
| `isArchived` | boolean | خیر | آرشیو بودن پروژه |

## APIها

| متد | مسیر | ورودی | خروجی/عملکرد |
|---|---|---|---|
| POST | `/api/projects` | CreateProjectDto | ساخت پروژه |
| GET | `/api/projects` | `page`, `limit`, `owner?`, `member?`, `status?`, `isArchived?` | لیست پروژه‌ها |
| GET | `/api/projects/:id` | شناسه پروژه | پروژه با owner، supervisor، members و tasks |
| GET | `/api/projects/owner/:ownerId` | شناسه مالک | پروژه‌های مالک |
| PATCH | `/api/projects/:id` | فیلدهای قابل ویرایش پروژه | ویرایش پروژه |
| DELETE | `/api/projects/:id` | شناسه پروژه | حذف پروژه |
| PATCH | `/api/projects/:id/members/:memberId` | شناسه پروژه و کاربر | افزودن عضو هم‌حوزه |
| DELETE | `/api/projects/:id/members/:memberId` | شناسه پروژه و کاربر | حذف عضو |
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

# ماژول ProjectMember

## توضیح کلی

این ماژول یک کالکشن مستقل برای عضویت پروژه دارد و شامل نقش داخلی پروژه و فعال/غیرفعال بودن عضویت است. این داده با آرایه `Project.members` متفاوت است.

## مدل ورودی

| فیلد | نوع | توضیح |
|---|---|---|
| `project` | MongoId | پروژه |
| `user` | MongoId | کاربر هم‌حوزه با پروژه |
| `role` | `manager/member/viewer` | نقش داخلی، پیش‌فرض member |
| `isActive` | boolean | وضعیت عضویت |

## APIها

| متد | مسیر | توضیح |
|---|---|---|
| POST | `/api/project-members` | ساخت عضویت جدید |
| GET | `/api/project-members` | لیست با فیلترهای `project`, `user`, `role`, `isActive` و pagination |
| GET | `/api/project-members/:id` | دریافت عضویت با شناسه |
| GET | `/api/project-members/project/:projectId` | عضویت‌های فعال یک پروژه |
| GET | `/api/project-members/user/:userId` | پروژه‌های فعال یک کاربر |
| PATCH | `/api/project-members/:id` | تغییر `role` یا `isActive` |
| DELETE | `/api/project-members/:id` | حذف کامل عضویت |
| DELETE | `/api/project-members/:projectId/members/:userId` | حذف نرم با `isActive=false` |
| GET | `/api/project-members/:projectId/members/:userId/role` | دریافت نقش کاربر در پروژه |

---

# ماژول Task

## توضیح کلی

ساخت و مدیریت تسک‌ها، تخصیص افراد، وضعیت، آمار و گزارش بازه تاریخی. تمام APIهای این ماژول نیازمند JWT هستند.

## قوانین ساخت تسک

- سازنده واقعی از JWT دریافت می‌شود؛ مقدار `createdBy` بدنه قابل جعل نیست.
- سازنده باید مدیر و مالک پروژه باشد.
- پروژه باید وجود داشته باشد.
- افراد تخصیص‌یافته باید عضو یا سرپرست همان پروژه، هم‌حوزه و دارای نقش specialist/supervisor باشند.
- ساخت و تغییر تخصیص باعث تولید اعلان داخلی می‌شود.

## ورودی ساخت

| فیلد | نوع | الزامی | توضیح |
|---|---|---|---|
| `title` | string | بله | عنوان |
| `createdBy` | string | در DTO وجود دارد | در Controller با شناسه JWT جایگزین می‌شود |
| `projectId` | string | خیر | پروژه مربوط |
| `assignedTo` | string[] | خیر | کاربران مسئول |
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
| GET | `/api/manager/projects/:id/members` | شناسه پروژه | اعضای واقعی `Project.members` همراه نقش و وضعیت |
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

داشبورد سرپرست، پروژه‌های تحت نظارت، اعضا، عملکرد تیم، تسک‌های معوق و تغییر وضعیت تسک. تمام APIها نیازمند JWT و نقش `supervisor` هستند. سرپرست فقط به پروژه‌هایی دسترسی دارد که `supervisorId` آن‌ها برابر شناسه خودش باشد.

## APIها

| متد | مسیر | خروجی/عملکرد |
|---|---|---|
| GET | `/api/supervisor/statistics` | آمار پروژه‌ها و تسک‌های سرپرست |
| GET | `/api/supervisor/projects?page=1&limit=10` | پروژه‌های تحت نظارت با آمار تسک |
| GET | `/api/supervisor/projects/:projectId/members` | اعضای پروژه تحت نظارت |
| GET | `/api/supervisor/projects/:projectId/members/performance` | عملکرد اعضا |
| PATCH | `/api/supervisor/projects/:projectId/tasks/:taskId/status` | تغییر وضعیت تسک پروژه تحت نظارت |
| GET | `/api/supervisor/tasks/overdue?page=1&limit=10` | تسک‌های معوق تمام پروژه‌های تحت نظارت |
| GET | `/api/supervisor/projects/:projectId/report` | گزارش کامل پروژه |
| GET | `/api/supervisor/team/performance` | عملکرد تجمیعی تمام اعضای تیم |

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
  "membersCount": 2,
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

