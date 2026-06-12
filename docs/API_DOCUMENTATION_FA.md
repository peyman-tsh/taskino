# مستند فارسی API پروژه Taskino

این سند براساس وضعیت فعلی کد پروژه نوشته شده است و مسیرها، سطح دسترسی، مدل‌های داده و رفتارهای مهم سرویس‌ها را توضیح می‌دهد.

## اطلاعات عمومی

| مورد | مقدار |
| --- | --- |
| آدرس پایه | `http://localhost:3000/api` |
| Swagger پیش‌فرض | `http://localhost:3000/api/docs` |
| نوع احراز هویت | JWT Bearer Token |
| هدر احراز هویت | `Authorization: Bearer <accessToken>` |
| پایگاه داده | MongoDB |
| فرمت تاریخ | ISO 8601 همراه ساعت و timezone |
| فرمت ساعت | `HH:mm` مانند `09:30` |

تمام مسیرهای این سند بعد از prefix سراسری `/api` قرار دارند.

برای بررسی ساده در دسترس بودن برنامه:

```http
GET /api
```

### اجرای پروژه

```bash
npm install
npm run start:dev
```

متغیرهای محیطی اصلی:

```env
NODE_ENV=development
PORT=3000
MONGODB_URI=mongodb://localhost:27017/taskino
JWT_SECRET=your-secret
JWT_EXPIRES_IN=1d
SWAGGER_PATH=api/docs
CORS_ORIGINS=http://localhost:3000
```

> اعتبارسنجی فعلی `MONGODB_URI` فقط آدرس‌هایی با `mongodb://` را می‌پذیرد و `mongodb+srv://` را قبول نمی‌کند.

## قواعد عمومی API

### اعتبارسنجی

- فیلدهای ناشناخته در body به‌صورت سراسری حذف می‌شوند.
- تبدیل نوع query parameterها فعال است.
- اعتبارسنجی با اولین خطا متوقف می‌شود.
- شناسه‌های MongoDB باید ObjectId معتبر باشند.
- pagination معمولاً با `page` و `limit` انجام می‌شود.

نمونه درخواست صفحه‌بندی:

```http
GET /api/tasks?page=1&limit=20
```

پاسخ endpointهای صفحه‌بندی‌شده معمولاً شامل داده‌ها و اطلاعاتی مانند تعداد کل، صفحه جاری و تعداد صفحات است.

### ساختار خطا

```json
{
  "statusCode": 400,
  "path": "/api/tasks",
  "method": "POST",
  "message": "Validation failed",
  "errors": null,
  "timestamp": "2026-06-10T08:00:00.000Z"
}
```

خطای شناسه نامعتبر، اعتبارسنجی Mongoose و رکورد تکراری نیز توسط فیلتر سراسری مدیریت می‌شوند. رکورد تکراری با status code برابر `409` پاسخ داده می‌شود.

## نقش‌ها و enumها

### نقش کاربر

| مقدار | توضیح |
| --- | --- |
| `manager` | مدیر؛ مدیریت کاربران، گزارش‌ها و Taskها |
| `supervisor` | سرپرست؛ ساخت Task و مدیریت FixedTask |
| `specialist` | کارشناس؛ دریافت‌کننده وظایف |

نقش `supervisor` وجود دارد، اما ماژول مستقل Supervisor و ماژول Project در پروژه فعلی وجود ندارند.

### مقادیر مشترک

| نوع | مقادیر |
| --- | --- |
| وضعیت وظیفه | `todo`, `in_progress`, `done` |
| تناوب | `daily`, `weekly`, `monthly` |
| وضعیت عملکرد | `good`, `normal`, `weak` |
| وضعیت مرخصی | `pending`, `approved`, `rejected` |
| نوع Excel | `import`, `export` |
| وضعیت Excel | `pending`, `processing`, `completed`, `failed` |
| حوزه کاری | `it`, `human_resources`, `finance`, `sales`, `operations` |

## ماتریس دسترسی

| ماژول | مدیر | سرپرست | کارشناس | بدون توکن |
| --- | --- | --- | --- | --- |
| Auth | بله | بله | بله | بله |
| Users | بله | خیر | خیر | خیر |
| Tasks: ساخت | بله | بله | خیر | خیر |
| Tasks: مشاهده | بله | بله | بله | خیر |
| Tasks: ویرایش، حذف و تغییر وضعیت | بله | خیر | خیر | خیر |
| Fixed Tasks | بله | بله | خیر | خیر |
| Supervisor Panel | خیر | بله | خیر | خیر |
| Manager Reports | بله | فقط گزارش پیشرفت کاربران | خیر | خیر |
| Notifications | فقط اعلان‌های خود | فقط اعلان‌های خود | فقط اعلان‌های خود | خیر |
| Leave Requests | بله | بله | بله | **در کد فعلی بله** |
| Excel | بله | بله | بله | **در کد فعلی بله** |

> کنترلرهای LeaveRequest و Excel در حال حاضر فقط annotation مربوط به Swagger دارند و Guard احراز هویت روی آن‌ها اعمال نشده است. بنابراین endpointهای آن‌ها عملاً عمومی هستند و بهتر است قبل از production ایمن شوند.

## مرجع کامل Endpointها

در جدول‌های زیر تمام endpointهای موجود در controllerهای پروژه فهرست شده‌اند.

راهنمای سطح دسترسی:

- `Public`: بدون توکن نیز قابل فراخوانی است.
- `Authenticated`: هر کاربر دارای JWT معتبر.
- `Manager`: فقط مدیر.
- `Manager / Supervisor`: مدیر یا سرپرست.
- `Current User`: فقط روی داده‌های متعلق به کاربر داخل JWT کار می‌کند.

### App و Auth

| متد | مسیر | دسترسی | ورودی | پاسخ موفق |
| --- | --- | --- | --- | --- |
| GET | `/api` | Public | ندارد | `200`؛ پیام سلامت برنامه |
| POST | `/api/auth/register` | Public | body: `RegisterDto` | `201`؛ کاربر و `accessToken` |
| POST | `/api/auth/login` | Public | body: `LoginDto` | `200`؛ کاربر و `accessToken` |

### Users

تمام مسیرهای این جدول فقط برای مدیر هستند.

| متد | مسیر | ورودی | پاسخ موفق |
| --- | --- | --- | --- |
| POST | `/api/users` | body: `CreateUserDto` | `201`؛ کاربر ساخته‌شده |
| GET | `/api/users` | query: `page`, `limit` | `200`؛ لیست صفحه‌بندی‌شده |
| GET | `/api/users/:id` | path: `id` | `200`؛ یک کاربر |
| PATCH | `/api/users/:id` | path: `id`، body: `UpdateUserDto` | `200`؛ کاربر ویرایش‌شده |
| DELETE | `/api/users/:id` | path: `id` | `204`؛ بدون body |
| PATCH | `/api/users/:id/approve` | path: `id` | `200`؛ نتیجه تأیید و کاربر |
| POST | `/api/users/increase-score` | body: `userId`, `score` | `200`؛ کاربر با امتیاز جدید |

### Tasks

| متد | مسیر | دسترسی | ورودی | پاسخ موفق |
| --- | --- | --- | --- | --- |
| POST | `/api/tasks` | Manager / Supervisor | `multipart/form-data`؛ فیلدهای Task و فایل اختیاری `file` | `201`؛ Task یا `{ task, excelUpload }` |
| GET | `/api/tasks` | Authenticated | queryهای فیلتر و pagination | `200`؛ لیست صفحه‌بندی‌شده |
| GET | `/api/tasks/user` | Authenticated | query: `userName`, `lastName` | `200`؛ Taskهای کاربر پیدا‌شده |
| GET | `/api/tasks/:id` | Authenticated | path: `id` | `200`؛ یک Task |
| PATCH | `/api/tasks/:id` | Manager | path: `id`، body: `UpdateTaskDto` | `200`؛ Task ویرایش‌شده |
| DELETE | `/api/tasks/:id` | Manager | path: `id` | `204`؛ بدون body |
| PATCH | `/api/tasks/:id/status` | Manager | body: `status` | `200`؛ Task با وضعیت جدید |
| POST | `/api/tasks/completion-stats` | Manager | body: `managerId`, `expertId` | `200`؛ آمار تکمیل |
| POST | `/api/tasks/date-count` | Manager / Supervisor | body: `userId`, `startDate`, `endDate` | `200`؛ آمار بازه و نتیجه امتیاز |

### Fixed Tasks

ساخت، مشاهده و حذف FixedTask برای مدیر و سرپرست است. در endpoint ویرایش، مدیر و سرپرست اطلاعات وظیفه را ویرایش می‌کنند و مسئول همان FixedTask فقط می‌تواند `status` را تغییر دهد. endpoint seed عمومی است.

| متد | مسیر | دسترسی | ورودی | پاسخ موفق |
| --- | --- | --- | --- | --- |
| POST | `/api/fixed-tasks/seed/excel` | Public | بدون body | `201`؛ ثبت کاربران و FixedTaskهای چهار شیت |
| POST | `/api/fixed-tasks` | Manager / Supervisor | body: `CreateFixedTaskDto` | `201`؛ FixedTask ساخته‌شده با وضعیت `todo` |
| GET | `/api/fixed-tasks` | Manager / Supervisor | queryهای فیلتر و pagination | `200`؛ لیست صفحه‌بندی‌شده |
| GET | `/api/fixed-tasks/:id` | Manager / Supervisor | path: `id` | `200`؛ یک FixedTask |
| PATCH | `/api/fixed-tasks/:id` | Manager / Supervisor / Specialist مسئول | path: `id`، body: `UpdateFixedTaskDto` | `200`؛ FixedTask ویرایش‌شده |
| DELETE | `/api/fixed-tasks/:id` | Manager / Supervisor | path: `id` | `204`؛ بدون body |

### Manager

#### `GET /api/manager/users/by-name`

یک کاربر را براساس تطابق دقیق نام و نام خانوادگی پیدا می‌کند. این endpoint فقط برای مدیر قابل استفاده است.

```http
GET /api/manager/users/by-name?firstName=سینا&lastName=اعلایی
Authorization: Bearer MANAGER_TOKEN
```

#### `GET /api/manager/tasks`

تمام Taskهای معمولی و FixedTaskها را برای مدیر برمی‌گرداند. با query اختیاری `recurrence` می‌توان خروجی را براساس وظایف روزانه، هفتگی یا ماهانه فیلتر کرد.

```http
GET /api/manager/tasks
GET /api/manager/tasks?recurrence=daily
GET /api/manager/tasks?recurrence=weekly
GET /api/manager/tasks?recurrence=monthly
```

پاسخ شامل تعداد کل وظایف، تعداد Taskهای معمولی، تعداد FixedTaskها و دو لیست مجزای `tasks` و `fixedTasks` است.

تمام مسیرهای این جدول فقط برای مدیر هستند؛ به‌جز `GET /api/manager/users/progress` که سرپرست نیز به آن دسترسی دارد.

| متد | مسیر | ورودی | پاسخ موفق |
| --- | --- | --- | --- |
| GET | `/api/manager/statistics` | ندارد | `200`؛ آمار داشبورد |
| GET | `/api/manager/users` | query: `page`, `limit`, `isActive`, `role`, `name` | `200`؛ کاربران فیلترشده |
| GET | `/api/manager/users/by-name` | query: `firstName`, `lastName` | `200`؛ کاربر با نام و نام خانوادگی دقیق |
| PATCH | `/api/manager/users/:id/role` | body: `role` | `200`؛ کاربر با نقش جدید |
| GET | `/api/manager/tasks` | query اختیاری: `recurrence` | `200`؛ تمام Taskها و FixedTaskها |
| GET | `/api/manager/tasks/status` | ندارد | `200`؛ تعداد Taskها براساس وضعیت |
| GET | `/api/manager/tasks/users/counts` | ندارد | `200`؛ تعداد Taskهای هر کاربر |
| GET | `/api/manager/users/monthly-performance` | query: `month`, `year` | `200`؛ عملکرد ماهانه |
| GET | `/api/manager/users/progress` | دسترسی: Manager / Supervisor؛ ورودی ندارد | `200`؛ ارزیابی و ذخیره پیشرفت کاربران |

### Supervisor

تمام مسیرهای این جدول فقط برای سرپرست هستند. منظور از وظایف تحت نظارت، Task و FixedTaskهایی است که `createdBy` آن‌ها سرپرست جاری است.

| متد | مسیر | ورودی | پاسخ موفق |
| --- | --- | --- | --- |
| GET | `/api/supervisor/statistics` | query اختیاری: `recurrence` | `200`؛ آمار پنل سرپرست |
| GET | `/api/supervisor/members` | query: `page`, `limit` و `recurrence` اختیاری | `200`؛ اعضای زیرمجموعه و عملکرد آن‌ها |
| GET | `/api/supervisor/tasks` | query: `page`, `limit`, `status`, `recurrence` | `200`؛ Taskهای تحت نظارت |
| GET | `/api/supervisor/fixed-tasks` | query: `page`, `limit`, `status`, `recurrence`, `isActive` | `200`؛ FixedTaskهای تحت نظارت |

### Notifications

تمام مسیرهای این جدول نیازمند JWT هستند و فقط روی اعلان‌های کاربر جاری کار می‌کنند.

| متد | مسیر | ورودی | پاسخ موفق |
| --- | --- | --- | --- |
| GET | `/api/notifications/me` | query: `page`, `limit`, `type`, `isRead`, `search` | `200`؛ لیست اعلان‌ها |
| GET | `/api/notifications/me/unread-count` | ندارد | `200`؛ تعداد خوانده‌نشده‌ها |
| GET | `/api/notifications/me/unread` | ندارد | `200`؛ یک اعلان خوانده‌نشده |
| PATCH | `/api/notifications/me/read-all` | ندارد | `200`؛ نتیجه خوانده‌شدن همه |
| DELETE | `/api/notifications/me/read` | ندارد | `200`؛ نتیجه حذف خوانده‌شده‌ها |
| GET | `/api/notifications/:id` | path: `id` | `200`؛ یک اعلان متعلق به کاربر |
| PATCH | `/api/notifications/:id` | body: `isRead` | `200`؛ اعلان ویرایش‌شده |
| DELETE | `/api/notifications/:id` | path: `id` | `204`؛ بدون body |

### Leave Requests

این مسیرها در وضعیت فعلی کد Public هستند.

| متد | مسیر | ورودی | پاسخ موفق |
| --- | --- | --- | --- |
| POST | `/api/leave-requests` | body: `CreateLeaveRequestDto` | `201`؛ درخواست ساخته‌شده |
| GET | `/api/leave-requests` | query: `page`, `limit`, `user`, `status`, `approvedBy` | `200`؛ لیست درخواست‌ها |
| GET | `/api/leave-requests/:id` | path: `id` | `200`؛ یک درخواست |
| GET | `/api/leave-requests/user/:userId` | path: `userId`، query: `page`, `limit` | `200`؛ درخواست‌های کاربر |
| PATCH | `/api/leave-requests/:id` | body: `UpdateLeaveRequestDto` | `200`؛ درخواست ویرایش‌شده |
| DELETE | `/api/leave-requests/:id` | path: `id` | `204`؛ بدون body |
| POST | `/api/leave-requests/:id/approve` | body: `approvedBy` | `200`؛ درخواست تأییدشده |
| POST | `/api/leave-requests/:id/reject` | body: `approvedBy`, `rejectionReason` | `200`؛ درخواست ردشده |

### Excel

این مسیرها در وضعیت فعلی کد Public هستند.

| متد | مسیر | ورودی | پاسخ موفق |
| --- | --- | --- | --- |
| POST | `/api/excel` | body: `CreateExcelDto` | `201`؛ رکورد ساخته‌شده |
| POST | `/api/excel/upload` | query: `createdBy`, `type`؛ فایل `file` | `201`؛ اطلاعات فایل آپلودشده |
| GET | `/api/excel` | query: `page`, `limit`, `createdBy`, `status`, `type` | `200`؛ لیست رکوردها |
| GET | `/api/excel/:id` | path: `id` | `200`؛ یک رکورد |
| GET | `/api/excel/:id/download` | path: `id` | `200`؛ فایل باینری |
| PATCH | `/api/excel/:id` | body: `UpdateExcelDto` | `200`؛ رکورد ویرایش‌شده |
| DELETE | `/api/excel/:id` | path: `id` | `204`؛ بدون body |
| POST | `/api/excel/:id/process` | path: `id` | `200`؛ نتیجه پردازش import |
| GET | `/api/excel/statistics/:userId` | path: `userId` | `200`؛ آمار فایل‌های کاربر |
| POST | `/api/excel/export/generate` | body: `data`, `columns`, `sheetName` | `200`؛ فایل `export.xlsx` |

## توضیح جزئی هر Endpoint

### App و Auth

#### `GET /api`

برای بررسی در دسترس بودن برنامه استفاده می‌شود. این مسیر به دیتابیس یا JWT وابسته نیست و معمولاً برای health check ساده سرور مناسب است.

#### `POST /api/auth/register`

یک کاربر جدید با اطلاعات هویتی، رمز عبور و حوزه کاری ثبت می‌کند. رمز عبور قبل از ذخیره hash می‌شود، نقش اولیه کاربر `specialist` و وضعیت اولیه او غیرفعال است. پاسخ شامل اطلاعات کاربر و `accessToken` است.

#### `POST /api/auth/login`

کاربر را با `mobile` و `password` احراز هویت می‌کند. در صورت معتبر بودن اطلاعات، JWT جدید همراه اطلاعات کاربر بازگردانده می‌شود. برای اعمال نقش جدید کاربر نیز باید دوباره از این endpoint توکن دریافت شود.

### Users

تمام endpointهای این بخش فقط برای مدیر هستند.

#### `POST /api/users`

یک کاربر جدید از پنل مدیریتی ایجاد می‌کند. ایمیل باید یکتا و رمز عبور حداقل شش کاراکتر باشد. برخلاف ثبت‌نام عمومی، این مسیر برای مدیریت مستقیم کاربران توسط مدیر استفاده می‌شود.

#### `GET /api/users`

تمام کاربران را به‌صورت صفحه‌بندی‌شده برمی‌گرداند. با `page` و `limit` می‌توان تعداد و صفحه نتایج را کنترل کرد. برای فیلتر پیشرفته کاربران باید از `/api/manager/users` استفاده شود.

#### `GET /api/users/:id`

اطلاعات یک کاربر را با شناسه MongoDB برمی‌گرداند. رمز عبور در پاسخ نمایش داده نمی‌شود. اگر کاربر وجود نداشته باشد پاسخ `404` دریافت می‌شود.

#### `PATCH /api/users/:id`

اطلاعات قابل ویرایش کاربر مانند نام، نام خانوادگی، ایمیل، موبایل و رمز عبور را تغییر می‌دهد. رمز جدید قبل از ذخیره hash می‌شود و ایمیل جدید نباید متعلق به کاربر دیگری باشد.

#### `DELETE /api/users/:id`

کاربر مشخص‌شده را حذف می‌کند و در صورت موفقیت response body ندارد. این endpoint در وضعیت فعلی وابستگی‌های احتمالی کاربر در Taskها یا سایر collectionها را به‌صورت cascade حذف نمی‌کند.

#### `PATCH /api/users/:id/approve`

کاربر را فعال می‌کند و مقدار `isActive` را برابر `true` قرار می‌دهد. اگر کاربر قبلاً فعال شده باشد، پاسخ اعلام می‌کند که کاربر از قبل تأیید شده است.

#### `POST /api/users/increase-score`

مقدار `score` ارسال‌شده را به امتیاز فعلی کاربر اضافه می‌کند. در DTO عمومی این endpoint مقدار score باید مثبت باشد؛ کاهش خودکار امتیاز از داخل منطق Task انجام می‌شود.

### Tasks

#### `POST /api/tasks`

یک Task معمولی مستقل ایجاد می‌کند و شناسه سازنده را از JWT می‌گیرد؛ مقدار `createdBy` ارسالی کلاینت قابل اعتماد نیست. Task باید دقیقاً یک مسئول از نوع کارشناس یا سرپرست داشته باشد. در صورت ارسال فایل، یک رکورد Excel نیز ساخته و به Task متصل می‌شود. پس از ساخت، برای مسئول Task اعلان تخصیص ارسال می‌شود.

#### `GET /api/tasks`

Taskها را به‌صورت صفحه‌بندی‌شده و با فیلترهای سازنده، مسئول، وضعیت، تناوب و بازه زمانی برمی‌گرداند. فیلتر تاریخ براساس هم‌پوشانی بازه عمل می‌کند؛ یعنی Taskهایی را پیدا می‌کند که مهلت آن‌ها بعد از شروع بازه و زمان شروعشان قبل از پایان بازه باشد.

#### `GET /api/tasks/user`

ابتدا کاربر را با ترکیب `userName` و `lastName` پیدا می‌کند و سپس Taskهای تخصیص‌یافته به او را برمی‌گرداند. اگر کاربری با نام و نام خانوادگی داده‌شده وجود نداشته باشد، پاسخ `404` دریافت می‌شود.

#### `GET /api/tasks/:id`

یک Task را با شناسه آن دریافت می‌کند. اطلاعات سازنده، مسئول و فایل Excel مرتبط در پاسخ populate می‌شوند. شناسه نامعتبر یا Task ناموجود باعث خطا می‌شود.

#### `PATCH /api/tasks/:id`

فیلدهای قابل ویرایش Task را تغییر می‌دهد و صحت مسئول، تاریخ‌ها و ساعت‌ها را دوباره بررسی می‌کند. اگر مسئول جدیدی تعیین شود، برای او اعلان تخصیص ارسال می‌شود. تغییر وضعیت به `done` مقدار `doneTime` را ثبت و برای سازنده اعلان تکمیل ایجاد می‌کند.

#### `DELETE /api/tasks/:id`

Task را حذف می‌کند. اگر Task دارای Excel مرتبط باشد، رکورد Excel و فایل فیزیکی آن نیز حذف می‌شوند. پاسخ موفق `204` و بدون body است.

#### `PATCH /api/tasks/:id/status`

فقط وضعیت Task را تغییر می‌دهد. هنگام تغییر به `done`، `doneTime` ثبت می‌شود و هنگام بازگرداندن به وضعیت دیگر پاک می‌شود. اعلان تکمیل فقط زمانی ارسال می‌شود که Task برای اولین بار از وضعیت غیرانجام‌شده به `done` تغییر کند.

#### `POST /api/tasks/completion-stats`

آمار Taskهایی را محاسبه می‌کند که یک مدیر مشخص برای یک کارشناس مشخص ساخته است. پاسخ شامل تعداد کل، انجام‌شده، در انتظار و تفکیک وضعیت‌های `todo`، `in_progress` و `done` است.

#### `POST /api/tasks/date-count`

Taskهای یک کاربر را در بازه تاریخی داده‌شده شمارش می‌کند و تعداد کل، انجام‌شده، در انتظار و todo را برمی‌گرداند. این endpoint منطق امتیازدهی را نیز اجرا می‌کند: انجام کامل به‌موقع می‌تواند امتیاز مثبت و Task عقب‌افتاده امتیاز منفی ایجاد کند. فیلد `scoreAdjusted` از اعمال چندباره امتیاز روی همان Taskها جلوگیری می‌کند.

### Fixed Tasks

ساخت، مشاهده، ویرایش اطلاعات و حذف FixedTask برای مدیر و سرپرست است. مسئول همان FixedTask نیز می‌تواند از endpoint ویرایش فقط برای تغییر `status` استفاده کند. endpoint مربوط به seed عمومی است.

#### `POST /api/fixed-tasks/seed/excel`

این endpoint عمومی است، به JWT یا نقش کاربری نیاز ندارد و فایل Excel چهارشیتی وظایف ثابت را seed می‌کند. مسیر فایل از قبل داخل سرویس seed تعریف شده است و درخواست body ندارد. کاربران پوریا یاری‌زاده، سینا اعلایی، اکبر گنجی، امیر گنجی و امیر رضا جلالیان با رمز اولیه `123456` ثبت یا به‌روزرسانی می‌شوند. پوریا مدیر، سینا سرپرست و سایر افراد کارشناس هستند.

در هر شیت، ستون `ورودی فرایند` داخل `title` و ستون `توالی` داخل `recurrence` ذخیره می‌شود. مقادیر فارسی `روزانه`، `هفتگی` و `ماهانه` به‌ترتیب به `daily`، `weekly` و `monthly` تبدیل می‌شوند. اجرای مجدد endpoint رکورد تکراری ایجاد نمی‌کند و داده‌های قبلی همان فایل، شیت و ردیف را به‌روزرسانی می‌کند.

```http
POST /api/fixed-tasks/seed/excel
```

#### `POST /api/fixed-tasks`

FixedTask همیشه با وضعیت اولیه `todo` ساخته می‌شود. ثبت `doneTime` و اعمال امتیاز فقط زمانی انجام می‌شود که مسئول وظیفه بعداً با `PATCH /api/fixed-tasks/:id` وضعیت را به `done` تغییر دهد.

یک وظیفه ثابت روزانه، هفتگی یا ماهانه با وضعیت اولیه `todo` ایجاد می‌کند. سازنده از JWT گرفته می‌شود و مسئول باید کارشناس یا سرپرستی با حوزه کاری یکسان با سازنده باشد. ارسال وضعیت اولیه‌ای غیر از `todo` پذیرفته نمی‌شود.

#### `GET /api/fixed-tasks`

وظایف ثابت را به‌صورت صفحه‌بندی‌شده برمی‌گرداند. امکان فیلتر براساس عنوان، مسئول، تناوب و فعال بودن وجود دارد. جست‌وجوی عنوان بخشی و بدون حساسیت به بزرگی حروف است.

#### `GET /api/fixed-tasks/:id`

یک FixedTask را با شناسه دریافت می‌کند. اطلاعات سازنده و مسئول در پاسخ populate می‌شوند. شناسه باید ObjectId معتبر باشد.

#### `PATCH /api/fixed-tasks/:id`

مدیر و سرپرست می‌توانند اطلاعات FixedTask را ویرایش کنند، اما اجازه تغییر `status` را ندارند. مسئول همان FixedTask از همین endpoint فقط فیلد `status` را تغییر می‌دهد. هنگام تغییر وضعیت توسط مسئول به `done`، سیستم `doneTime` را ثبت و امتیاز را اعمال می‌کند.

```json
{
  "status": "done"
}
```

مدیر و سرپرست هنگام ویرایش اطلاعات FixedTask تحت قوانین نقش، حوزه کاری و بازه ساعت قرار دارند. مسئول وظیفه فقط می‌تواند `status` را تغییر دهد؛ تغییر به `done` باعث ثبت `doneTime` و اجرای امتیازدهی می‌شود و خروج از `done` باعث پاک‌شدن `doneTime` می‌شود.

#### `DELETE /api/fixed-tasks/:id`

FixedTask مشخص‌شده را حذف می‌کند. این عملیات روی Taskهای معمولی اثری ندارد، زیرا بین Task و FixedTask ارتباط مستقیمی وجود ندارد.

### Manager

تمام endpointهای این بخش فقط برای مدیر هستند؛ به‌جز endpoint ارزیابی پیشرفت که مدیر و سرپرست می‌توانند آن را فراخوانی کنند.

#### `GET /api/manager/statistics`

آمار خلاصه داشبورد مدیر را برمی‌گرداند. در وضعیت فعلی شامل تعداد Taskهای باز با وضعیت `todo` یا `in_progress` و تعداد کاربران فعال است.

#### `GET /api/manager/users`

لیست مدیریتی کاربران را با pagination و فیلترهای `isActive`، `role` و `name` برمی‌گرداند. فیلتر نام می‌تواند چند کلمه داشته باشد و در نام و نام خانوادگی جست‌وجو می‌کند.

#### `GET /api/manager/users/by-name`

یک کاربر را با تطابق دقیق `firstName` و `lastName` پیدا می‌کند. این endpoint از `UserService.findByName` استفاده می‌کند و در صورت پیدا نشدن کاربر پاسخ `404` می‌دهد.

```http
GET /api/manager/users/by-name?firstName=سینا&lastName=اعلایی
```

#### `PATCH /api/manager/users/:id/role`

نقش کاربر را به یکی از نقش‌های معتبر تغییر می‌دهد. چون نقش داخل JWT ذخیره می‌شود، کاربر پس از تغییر نقش باید دوباره login کند تا سطح دسترسی جدید در توکن او قرار گیرد.

#### `GET /api/manager/tasks/status`

نمای کلی وضعیت تمام Taskها را برمی‌گرداند. پاسخ شامل تعداد کل Taskها و تعداد `todo`، `in_progress` و `done` است.

#### `GET /api/manager/tasks`

تمام Taskهای معمولی و FixedTaskها را در دو لیست مجزا برمی‌گرداند. فیلتر اختیاری `recurrence` مقادیر `daily`، `weekly` و `monthly` را می‌پذیرد. پاسخ شامل `total`، `totalTasks`، `totalFixedTasks`، `tasks` و `fixedTasks` است.

```http
GET /api/manager/tasks?recurrence=weekly
```

#### `GET /api/manager/tasks/users/counts`

Taskها را براساس مسئول گروه‌بندی می‌کند. برای هر کاربر، اطلاعات هویتی و تعداد کل Taskها به تفکیک وضعیت بازگردانده می‌شود و کاربران با Task بیشتر در ابتدای نتیجه قرار می‌گیرند.

#### `GET /api/manager/users/monthly-performance`

عملکرد ماهانه کاربران را براساس Taskهای ایجادشده در ماه و سال انتخاب‌شده محاسبه می‌کند. پاسخ شامل تعداد Taskها، نرخ تکمیل، Taskهای در حال انجام، Taskهای در انتظار و امتیاز کاربر است.

#### `GET /api/manager/users/progress`

این endpoint برای نقش‌های `manager` و `supervisor` قابل دسترسی است. تمام کارشناسان و سرپرستان را براساس Taskها و FixedTaskهایشان ارزیابی می‌کند. Taskهای معمولی و FixedTaskها هرکدام حداکثر ۵۰ درصد سهم دارند. وظیفه موفق امتیاز کامل، وظیفه `in_progress` نصف امتیاز و وظیفه `todo` یا Task دیرتحویل امتیاز صفر می‌گیرد. نتیجه داخل رکورد User ذخیره می‌شود.

### Supervisor

تمام endpointهای این بخش فقط برای نقش `supervisor` هستند.

#### `GET /api/supervisor/statistics`

آمار پنل سرپرست جاری را برمی‌گرداند. وظایف تحت نظارت، Task و FixedTaskهایی هستند که توسط سرپرست ساخته شده‌اند؛ وظایف خود سرپرست مواردی هستند که به او تخصیص داده شده‌اند. پاسخ شامل تعداد کل موارد تحت نظارت، موارد تحت نظارت در حال انجام، Task و FixedTaskهای در حال انجام خود سرپرست، Taskهای موفق و Taskهای موفق تکمیل‌شده قبل از موعد است. فیلتر اختیاری `recurrence` می‌تواند `daily`، `weekly` یا `monthly` باشد و روی تمام آمار پاسخ اعمال می‌شود.

#### `GET /api/supervisor/members`

اعضای زیرمجموعه سرپرست جاری را به‌صورت صفحه‌بندی‌شده برمی‌گرداند. هر کاربری که حداقل یک Task یا FixedTask ساخته‌شده توسط سرپرست جاری به او تخصیص یافته باشد، عضو زیرمجموعه محسوب می‌شود؛ خود سرپرست از این لیست حذف می‌شود.

برای هر عضو، اطلاعات هویتی، نقش، فعال‌بودن، امتیاز، درصد پیشرفت، وضعیت عملکرد `good`، `normal` یا `weak`، زمان آخرین ارزیابی و تعداد Task و FixedTaskهای تخصیص‌یافته و انجام‌شده نمایش داده می‌شود. فیلتر اختیاری `recurrence` با مقادیر `daily`، `weekly` یا `monthly` روی تشخیص اعضا و شمار وظایف آن‌ها اعمال می‌شود.

مقادیر `progressPercentage` و `performanceStatus` آخرین نتیجه ذخیره‌شده روی User هستند. برای محاسبه و ذخیره مجدد عملکرد می‌توان endpoint مشترک مدیر و سرپرست یعنی `GET /api/manager/users/progress` را فراخوانی کرد.

نمونه:

```http
GET /api/supervisor/members?page=1&limit=20&recurrence=weekly
```

#### `GET /api/supervisor/tasks`

Taskهای ساخته‌شده توسط سرپرست جاری را به‌صورت صفحه‌بندی‌شده نمایش می‌دهد. با `status` می‌توان وضعیت و با `recurrence` می‌توان تناوب را فیلتر کرد. اطلاعات مسئول و فایل Excel مرتبط نیز در پاسخ populate می‌شوند.

#### `GET /api/supervisor/fixed-tasks`

FixedTaskهای ساخته‌شده توسط سرپرست جاری را به‌صورت صفحه‌بندی‌شده نمایش می‌دهد. فیلترهای وضعیت، تناوب و فعال‌بودن اختیاری هستند و اطلاعات مسئول در پاسخ populate می‌شود.

### Notifications

تمام endpointهای این بخش نیازمند JWT هستند و فقط اعلان‌های متعلق به کاربر جاری را مدیریت می‌کنند.

#### `GET /api/notifications/me`

اعلان‌های کاربر جاری را به‌صورت صفحه‌بندی‌شده برمی‌گرداند. امکان فیلتر براساس نوع، وضعیت خوانده‌شدن و جست‌وجو در عنوان یا متن اعلان وجود دارد.

#### `GET /api/notifications/me/unread-count`

فقط تعداد اعلان‌های خوانده‌نشده کاربر جاری را برمی‌گرداند. برای نمایش badge اعلان در رابط کاربری مناسب است.

#### `GET /api/notifications/me/unread`

یک اعلان خوانده‌نشده متعلق به کاربر جاری را برمی‌گرداند. این endpoint اعلان را خوانده‌شده نمی‌کند و اگر اعلان خوانده‌نشده‌ای وجود نداشته باشد پاسخ `404` می‌دهد.

#### `PATCH /api/notifications/me/read-all`

تمام اعلان‌های خوانده‌نشده کاربر جاری را خوانده‌شده می‌کند. پاسخ شامل تعداد رکوردهای تغییرکرده است.

#### `DELETE /api/notifications/me/read`

تمام اعلان‌هایی را که کاربر جاری قبلاً خوانده است حذف می‌کند. اعلان‌های خوانده‌نشده باقی می‌مانند و پاسخ شامل تعداد اعلان‌های حذف‌شده است.

#### `GET /api/notifications/:id`

یک اعلان مشخص را فقط در صورتی برمی‌گرداند که متعلق به کاربر داخل JWT باشد. بنابراین دانستن شناسه اعلان کاربر دیگر باعث دسترسی به آن نمی‌شود.

#### `PATCH /api/notifications/:id`

مقدار `isRead` یک اعلان متعلق به کاربر جاری را تغییر می‌دهد. body فقط باید شامل `isRead` باشد و فیلد ناشناخته در این endpoint خطا ایجاد می‌کند.

#### `DELETE /api/notifications/:id`

یک اعلان مشخص متعلق به کاربر جاری را حذف می‌کند. حذف اعلان کاربران دیگر ممکن نیست و پاسخ موفق بدون body است.

### Leave Requests

> endpointهای این بخش در کد فعلی Guard ندارند و عملاً Public هستند.

#### `POST /api/leave-requests`

یک درخواست مرخصی جدید برای کاربر مشخص‌شده ایجاد می‌کند. شناسه کاربر و بازه تاریخ اعتبارسنجی می‌شوند و تاریخ پایان نباید قبل از تاریخ شروع باشد.

#### `GET /api/leave-requests`

تمام درخواست‌های مرخصی را به‌صورت صفحه‌بندی‌شده برمی‌گرداند. فیلتر براساس درخواست‌دهنده، وضعیت و تأییدکننده پشتیبانی می‌شود.

#### `GET /api/leave-requests/:id`

یک درخواست مرخصی را با شناسه دریافت می‌کند. اطلاعات کاربر درخواست‌دهنده و تأییدکننده در پاسخ populate می‌شوند.

#### `GET /api/leave-requests/user/:userId`

تمام درخواست‌های مرخصی یک کاربر را به‌صورت صفحه‌بندی‌شده دریافت می‌کند. نتایج براساس تاریخ شروع مرتب می‌شوند.

#### `PATCH /api/leave-requests/:id`

فیلدهای درخواست مرخصی را ویرایش می‌کند. این endpoint علاوه بر کاربر، تاریخ‌ها و دلیل، فیلدهای وضعیت، تأییدکننده، زمان تأیید و دلیل رد را نیز می‌پذیرد. هنگام رد درخواست، وجود `rejectionReason` الزامی است.

#### `DELETE /api/leave-requests/:id`

درخواست مرخصی مشخص‌شده را حذف می‌کند. در صورت موفقیت پاسخ `204` و بدون body است.

#### `POST /api/leave-requests/:id/approve`

درخواست مرخصی را تأیید می‌کند، وضعیت را `approved` قرار می‌دهد و `approvedBy` و `approvedAt` را ثبت می‌کند. درخواست تأییدشده دوباره قابل تأیید نیست.

#### `POST /api/leave-requests/:id/reject`

درخواست مرخصی را رد می‌کند و اطلاعات تأییدکننده، زمان تصمیم و دلیل رد را ذخیره می‌کند. `rejectionReason` برای این عملیات الزامی است و درخواست تأییدشده قابل رد نیست.

### Excel

> endpointهای این بخش در کد فعلی Guard ندارند و عملاً Public هستند.

#### `POST /api/excel`

فقط یک رکورد metadata برای Excel داخل دیتابیس ایجاد می‌کند و فایل فیزیکی آپلود نمی‌کند. برای آپلود واقعی فایل باید از `/api/excel/upload` استفاده شود.

#### `POST /api/excel/upload`

فایل Excel یا CSV را دریافت، در مسیر uploads ذخیره و رکورد دیتابیس آن را ایجاد می‌کند. اولین sheet برای استخراج نام ستون‌ها و تعداد ردیف‌ها بررسی می‌شود. `createdBy` الزامی و نوع عملیات به‌صورت پیش‌فرض `import` است.

#### `GET /api/excel`

رکوردهای Excel را به‌صورت صفحه‌بندی‌شده برمی‌گرداند. فیلتر براساس سازنده، وضعیت پردازش و نوع import/export وجود دارد و Task مرتبط نیز در صورت وجود نمایش داده می‌شود.

#### `GET /api/excel/:id`

اطلاعات یک رکورد Excel را دریافت می‌کند. این endpoint فایل را دانلود نمی‌کند و فقط metadata، سازنده و Task مرتبط را برمی‌گرداند.

#### `GET /api/excel/:id/download`

فایل فیزیکی مرتبط با رکورد Excel را دانلود می‌کند. هدرهای `Content-Type` و `Content-Disposition` براساس اطلاعات فایل تنظیم می‌شوند و اگر فایل روی سرور وجود نداشته باشد پاسخ `404` دریافت می‌شود.

#### `PATCH /api/excel/:id`

metadata رکورد Excel مانند نام فایل، وضعیت، اطلاعات sheet و آمار ردیف‌ها را ویرایش می‌کند. این endpoint محتوای فایل فیزیکی را تغییر نمی‌دهد.

#### `DELETE /api/excel/:id`

رکورد Excel و فایل فیزیکی آن را حذف می‌کند. اگر Excel به Task متصل باشد، فیلدهای ارتباط فایل از Task نیز پاک می‌شوند.

#### `POST /api/excel/:id/process`

یک فایل از نوع `import` را پردازش می‌کند و تعداد ردیف‌های معتبر و خالی را محاسبه می‌کند. وضعیت فایل ابتدا `processing` و در پایان `completed` یا `failed` می‌شود. این endpoint برای فایل‌های نوع export قابل استفاده نیست.

#### `GET /api/excel/statistics/:userId`

آمار فایل‌های Excel یک کاربر را برمی‌گرداند. پاسخ شامل تعداد کل فایل‌ها، importها، exportها، importهای تکمیل‌شده و فایل‌های failed است.

#### `POST /api/excel/export/generate`

آرایه‌ای از objectها را به فایل Excel تبدیل می‌کند و مستقیماً فایل `export.xlsx` را در پاسخ می‌فرستد. `columns` ترتیب و انتخاب ستون‌ها و `sheetName` نام sheet خروجی را کنترل می‌کند. این عملیات به‌تنهایی رکورد Excel در دیتابیس ایجاد نمی‌کند.

## مرجع Body و Query

### هدر درخواست‌های محافظت‌شده

```http
Authorization: Bearer ACCESS_TOKEN
Content-Type: application/json
```

### `RegisterDto` و `CreateUserDto`

| فیلد | نوع | الزامی | توضیح |
| --- | --- | --- | --- |
| `firstName` | string | بله | نام |
| `lastName` | string | بله | نام خانوادگی |
| `email` | string | بله | ایمیل معتبر و یکتا |
| `mobile` | string | خیر | شماره موبایل |
| `password` | string | بله | حداقل ۶ کاراکتر |
| `workField` | enum | بله | یکی از حوزه‌های کاری |

### `UpdateUserDto`

فیلدهای `firstName`، `lastName`، `email`، `mobile` و `password` اختیاری هستند.

### `CreateTaskDto`

| فیلد | نوع | الزامی | توضیح |
| --- | --- | --- | --- |
| `title` | string | بله | عنوان |
| `assignedTo` | string[] | بله | آرایه شامل دقیقاً یک شناسه کاربر |
| `status` | enum | خیر | فقط مقدار اولیه `todo` پذیرفته می‌شود |
| `description` | string | خیر | توضیحات |
| `taskComment` | string | خیر | یادداشت |
| `startDate` | ISO date-time | خیر | زمان شروع |
| `dueDate` | ISO date-time | خیر | مهلت انجام |
| `startTime` | `HH:mm` | خیر | ساعت شروع |
| `endTime` | `HH:mm` | خیر | ساعت پایان |
| `recurrence` | enum | خیر | `daily`, `weekly`, `monthly` |
| `file` | file | خیر | فایل Excel در multipart |

`UpdateTaskDto` فقط فیلدهای `title`، `assignedTo`، `status`، `taskComment`، `startDate`، `dueDate`، `startTime`، `endTime` و `recurrence` را به‌صورت اختیاری می‌پذیرد. فیلدهای `description`، `createdBy` و فایل در endpoint ویرایش قابل ارسال نیستند.

Queryهای `GET /api/tasks`:

| query | نوع | توضیح |
| --- | --- | --- |
| `page`, `limit` | number | pagination |
| `createdBy` | ObjectId | سازنده |
| `assignedTo` | ObjectId | مسئول |
| `status` | enum | وضعیت |
| `startDate`, `endDate` | ISO date-time | بازه هم‌پوشانی |
| `recurrence` | enum | تناوب |

### `CreateFixedTaskDto`

| فیلد | نوع | الزامی | توضیح |
| --- | --- | --- | --- |
| `title` | string | بله | عنوان |
| `assignedTo` | ObjectId | بله | مسئول |
| `recurrence` | enum | بله | تناوب |
| `status` | enum | خیر | فقط مقدار `todo` برای ساخت پذیرفته می‌شود |
| `description` | string | خیر | توضیحات |
| `isActive` | boolean | خیر | پیش‌فرض `true` |
| `nextRunAt` | ISO date-time | خیر | زمان اجرای بعدی |
| `startTime`, `endTime` | `HH:mm` | خیر | ساعت شروع و پایان |
| `endDate` | ISO date | خیر | تاریخ پایان مورد استفاده در امتیازدهی |

`UpdateFixedTaskDto` همین فیلدها را به‌صورت اختیاری می‌پذیرد.

Queryهای `GET /api/fixed-tasks`: `page`, `limit`, `title`, `assignedTo`, `recurrence`, `isActive`.

### `CreateLeaveRequestDto`

| فیلد | نوع | الزامی |
| --- | --- | --- |
| `user` | ObjectId | بله |
| `startDate` | ISO date | بله |
| `endDate` | ISO date | بله |
| `reason` | string | خیر |
| `status` | enum | خیر |
| `approvedBy` | ObjectId | خیر |

### `CreateExcelDto`

| فیلد | نوع | الزامی |
| --- | --- | --- |
| `createdBy` | ObjectId | بله |
| `fileName` | string | بله |
| `originalName`, `filePath`, `mimeType` | string | خیر |
| `fileSize` | number | خیر |
| `type` | enum | خیر |
| `status` | enum | خیر |
| `sheetName` | string | خیر |
| `totalRows`, `successRows`, `errorRows` | number | خیر |
| `errorMessage` | string | خیر |
| `columns` | array | خیر |
| `relatedLeave` | ObjectId | خیر |

### Status codeهای رایج

| کد | مفهوم |
| --- | --- |
| `200` | درخواست موفق |
| `201` | رکورد ساخته شد |
| `204` | عملیات موفق بدون response body |
| `400` | ورودی یا وضعیت عملیات نامعتبر |
| `401` | JWT نامعتبر یا ارسال‌نشده |
| `403` | نقش کاربر اجازه دسترسی ندارد |
| `404` | رکورد پیدا نشد |
| `409` | داده یکتا مانند ایمیل تکراری است |

## نمونه ساختار پاسخ‌ها

### پاسخ صفحه‌بندی Task

```json
{
  "data": [
    {
      "_id": "TASK_ID",
      "title": "تهیه گزارش",
      "createdBy": {},
      "assignedTo": [{}],
      "status": "done",
      "startDate": "2026-06-11T05:30:00.000Z",
      "dueDate": "2026-06-11T13:30:00.000Z",
      "startTime": "09:00",
      "endTime": "17:00",
      "recurrence": "daily",
      "doneTime": "2026-06-11T12:00:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 10
}
```

### پاسخ آمار تکمیل Task

```json
{
  "managerId": "MANAGER_ID",
  "expertId": "SPECIALIST_ID",
  "totalTasks": 5,
  "completedTasks": 3,
  "pendingTasks": 2,
  "pendingByStatus": {
    "todo": 1,
    "in_progress": 1
  },
  "completedByStatus": {
    "done": 3
  }
}
```

### پاسخ آمار Taskهای بازه زمانی

```json
{
  "userId": "USER_ID",
  "startDate": "2026-06-01",
  "endDate": "2026-06-30",
  "todoTasks": 2,
  "totalTasks": 10,
  "completedTasks": 7,
  "pendingTasks": 3
}
```

### پاسخ آمار داشبورد مدیر

```json
{
  "openTasks": 12,
  "activeUsers": 8
}
```

### پاسخ عملکرد ماهانه

```json
{
  "month": 6,
  "year": 2026,
  "users": [
    {
      "userId": "USER_ID",
      "firstName": "علی",
      "lastName": "احمدی",
      "email": "ali@example.com",
      "score": 20,
      "totalTasks": 10,
      "completedTasks": 8,
      "inProgressTasks": 1,
      "pendingTasks": 1,
      "completionRate": 80
    }
  ]
}
```

### پاسخ ارزیابی پیشرفت کاربران

```json
[
  {
    "userId": "USER_ID",
    "firstName": "علی",
    "lastName": "احمدی",
    "email": "ali@example.com",
    "role": "specialist",
    "totalTasks": 5,
    "completedTasks": 5,
    "onTimeTasks": 5,
    "inProgressTasks": 0,
    "totalFixedTasks": 2,
    "completedFixedTasks": 2,
    "inProgressFixedTasks": 0,
    "progressPercentage": 100,
    "performanceStatus": "good",
    "performanceEvaluatedAt": "2026-06-11T08:00:00.000Z"
  }
]
```

## مرجع کامل Schemaهای دیتابیس

این بخش ساختار collectionهای MongoDB را توضیح می‌دهد. تمام schemaهای پروژه با Mongoose ساخته شده‌اند و دارای شناسه خودکار `_id` از نوع `ObjectId` هستند.

در schemaهایی که گزینه `timestamps: true` دارند، فیلدهای `createdAt` و `updatedAt` نیز به‌صورت خودکار مدیریت می‌شوند.

### Schema کاربر — `User`

کاربرد: نگهداری اطلاعات هویتی، نقش، حوزه کاری، امتیاز و نتیجه ارزیابی عملکرد کاربران.

| فیلد | نوع | الزامی | پیش‌فرض | کاربرد |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | خودکار | خودکار | شناسه یکتای کاربر |
| `firstName` | string | بله | ندارد | نام کاربر؛ قبل از ذخیره trim می‌شود |
| `lastName` | string | بله | ندارد | نام خانوادگی؛ قبل از ذخیره trim می‌شود |
| `email` | string | بله | ندارد | ایمیل یکتا برای شناسایی کاربر |
| `mobile` | string | خیر | ندارد | شماره موبایل؛ برای login استفاده می‌شود |
| `password` | string | بله | ندارد | رمز hashشده؛ در queryهای عادی و JSON نمایش داده نمی‌شود |
| `roles` | string | خیر | `specialist` | نقش کاربر: `specialist`، `supervisor` یا `manager` |
| `workField` | enum | بله | ندارد | حوزه کاری کاربر |
| `score` | number | خیر | ندارد | امتیاز حاصل از عملکرد Taskها یا تغییر دستی مدیر |
| `isActive` | boolean | خیر | `false` | مشخص می‌کند کاربر تأیید و فعال شده است یا خیر |
| `progressPercentage` | number | خیر | `0` | درصد پیشرفت محاسبه‌شده؛ بین صفر تا صد |
| `performanceStatus` | enum | خیر | `weak` | نتیجه ارزیابی عملکرد: `good`، `normal` یا `weak` |
| `performanceEvaluatedAt` | Date | خیر | ندارد | زمان آخرین ارزیابی عملکرد |
| `createdAt` | Date | خودکار | زمان ایجاد | زمان ایجاد کاربر |
| `updatedAt` | Date | خودکار | زمان تغییر | زمان آخرین ویرایش |

نکات:

- روی `email` محدودیت unique وجود دارد.
- روی `workField` index وجود دارد.
- `password` با `select: false` تعریف شده و فقط در query ورود به‌صورت صریح دریافت می‌شود.
- هنگام تبدیل به JSON، فیلدهای `password` و `__v` حذف می‌شوند.

### Schema وظیفه معمولی — `Task`

کاربرد: نگهداری وظایف معمولی مستقل، مسئول انجام، مهلت، وضعیت، تناوب و فایل Excel مرتبط.

| فیلد | نوع | الزامی | پیش‌فرض | کاربرد |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | خودکار | خودکار | شناسه Task |
| `title` | string | بله | ندارد | عنوان وظیفه |
| `createdBy` | ObjectId → User | بله | ندارد | کاربری که Task را ساخته است |
| `assignedTo` | ObjectId[] → User | بله | ندارد | مسئول Task؛ آرایه باید دقیقاً یک کاربر داشته باشد |
| `status` | enum | خیر | `todo` | وضعیت Task: `todo`، `in_progress` یا `done` |
| `file` | string/null | خیر | `null` | نام فایل قدیمی برای سازگاری با داده‌های قبلی |
| `excelFile` | ObjectId → ExcelFile | خیر | ندارد | فایل Excel مرتبط؛ برای هر Task یکتا است |
| `taskComment` | string/null | خیر | `null` | یادداشت مربوط به Task |
| `description` | string | خیر | رشته خالی | توضیحات وظیفه |
| `isPublic` | boolean | خیر | `false` | مشخص می‌کند Task عمومی است یا خیر |
| `startDate` | Date | خیر | ندارد | تاریخ و زمان شروع |
| `dueDate` | Date | خیر | ندارد | آخرین مهلت انجام |
| `startTime` | string | خیر | ندارد | ساعت شروع روزانه با فرمت `HH:mm` |
| `endTime` | string | خیر | ندارد | ساعت پایان روزانه با فرمت `HH:mm` |
| `recurrence` | enum | خیر | ندارد | تناوب: `daily`، `weekly` یا `monthly` |
| `doneTime` | Date | خیر | ندارد | زمان واقعی تکمیل Task |
| `scoreAdjusted` | boolean | خیر | `false` | جلوگیری از تغییر چندباره امتیاز برای همان Task |
| `createdAt` | Date | خودکار | زمان ایجاد | توسط timestamps ساخته می‌شود |
| `updatedAt` | Date | خودکار | زمان تغییر | توسط timestamps به‌روز می‌شود |

روابط:

- `createdBy` به یک User اشاره می‌کند.
- `assignedTo` به آرایه Userها اشاره می‌کند، اما validation فعلی دقیقاً یک مسئول را الزام می‌کند.
- `excelFile` به ExcelFile اشاره می‌کند و به‌صورت unique و sparse تعریف شده است.

indexها:

- index روی `dueDate`
- index روی `recurrence`
- index ترکیبی روی `recurrence`، `startDate` و `dueDate`

### Schema وظیفه ثابت — `FixedTaskTemplate`

کاربرد: نگهداری وظایف ثابت روزانه، هفتگی یا ماهانه که مستقل از Taskهای معمولی هستند.

| فیلد | نوع | الزامی | پیش‌فرض | کاربرد |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | خودکار | خودکار | شناسه وظیفه ثابت |
| `title` | string | بله | ندارد | عنوان؛ قبل از ذخیره trim می‌شود |
| `assignedTo` | ObjectId → User | بله | ندارد | مسئول انجام وظیفه ثابت |
| `createdBy` | ObjectId → User | بله | ندارد | سازنده وظیفه ثابت |
| `recurrence` | enum | بله | ندارد | تناوب `daily`، `weekly` یا `monthly` |
| `description` | string | خیر | رشته خالی | توضیحات |
| `isActive` | boolean | خیر | `true` | فعال بودن template |
| `status` | enum | خیر | `todo` | وضعیت فعلی وظیفه ثابت |
| `doneTime` | Date | خیر | ندارد | زمان تکمیل |
| `scoreAdjusted` | boolean | خیر | `false` | جلوگیری از اعمال دوباره امتیاز همان FixedTask |
| `lastGeneratedAt` | Date | خیر | ندارد | آخرین زمان تولید یا اجرای مرتبط |
| `nextRunAt` | Date | خیر | ندارد | زمان اجرای بعدی |
| `startTime` | string | خیر | ندارد | ساعت شروع با فرمت `HH:mm` |
| `endTime` | string | خیر | ندارد | ساعت پایان با فرمت `HH:mm` |
| `endDate` | Date | خیر | ندارد | تاریخ پایان مورد استفاده در امتیازدهی FixedTask |
| `sourceExcel` | string | خیر | ندارد | منبع Excel یا شناسه منبع دستی |
| `sourceSheet` | string | خیر | ندارد | نام sheet منبع |
| `sourceRow` | number | خیر | ندارد | شماره ردیف منبع |
| `createdAt` | Date | خودکار | زمان ایجاد | توسط timestamps ساخته می‌شود |
| `updatedAt` | Date | خودکار | زمان تغییر | توسط timestamps به‌روز می‌شود |

indexها:

- index روی `assignedTo`، `recurrence`، `isActive` و `status`
- index یکتای ترکیبی روی `sourceExcel`، `sourceSheet` و `sourceRow`
- index ترکیبی منبع فقط زمانی اعمال می‌شود که هر سه فیلد نوع معتبر داشته باشند.

### Schema اعلان — `Notification`

کاربرد: نگهداری اعلان‌های داخل برنامه برای هر کاربر.

| فیلد | نوع | الزامی | پیش‌فرض | کاربرد |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | خودکار | خودکار | شناسه یکتای اعلان |
| `user` | ObjectId → User | بله | ندارد | دریافت‌کننده اعلان |
| `title` | string | بله | ندارد | عنوان کوتاه اعلان |
| `message` | string | بله | ندارد | متن کامل اعلان |
| `type` | enum | بله | ندارد | نوع رویدادی که اعلان برای آن ساخته شده است |
| `isRead` | boolean | خیر | `false` | خوانده‌شدن اعلان |
| `link` | string | خیر | ندارد | مسیر اختیاری صفحه مرتبط |
| `createdAt` | Date | خودکار | زمان ایجاد | زمان ساخت اعلان |
| `updatedAt` | Date | خودکار | زمان تغییر | زمان آخرین تغییر |

مقادیر `type`:

`task_assigned`، `task_completed`، `task_completion_stats`، `date_count`، `leave_request`، `leave_approved` و `leave_rejected`.

indexها:

- index ترکیبی `user` و `createdAt` برای نمایش سریع اعلان‌های جدید
- index ترکیبی `user`، `isRead` و `createdAt` برای شمارش و دریافت اعلان‌های خوانده‌نشده

### Schema درخواست مرخصی — `Leave`

کاربرد: نگهداری درخواست مرخصی، وضعیت تأیید یا رد و اطلاعات تصمیم‌گیرنده.

| فیلد | نوع Schema | الزامی | پیش‌فرض | کاربرد |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | خودکار | خودکار | شناسه درخواست |
| `user` | ObjectId → User | بله | ندارد | کاربری که درخواست مرخصی برای او ثبت شده است |
| `startDate` | string | بله | ندارد | تاریخ شروع مرخصی |
| `endDate` | string | بله | ندارد | تاریخ پایان مرخصی |
| `reason` | string | خیر | رشته خالی | علت درخواست؛ trim می‌شود |
| `status` | enum | خیر | `pending` | وضعیت `pending`، `approved` یا `rejected` |
| `approvedBy` | ObjectId → User | خیر | ندارد | کاربری که درخواست را تأیید یا رد کرده است |
| `approvedAt` | string | خیر | ندارد | زمان تأیید یا رد |
| `rejectionReason` | string | خیر | ندارد | دلیل رد درخواست |
| `createdAt` | Date | خودکار | زمان ایجاد | توسط timestamps ساخته می‌شود |
| `updatedAt` | Date | خودکار | زمان تغییر | توسط timestamps به‌روز می‌شود |

> نکته فنی: فیلدهای `startDate`، `endDate` و `approvedAt` در schema فعلی به‌صورت `string` تعریف شده‌اند، اما سرویس در برخی عملیات مقدار Date در آن‌ها قرار می‌دهد. بهتر است نوع schema و رفتار سرویس در آینده یکسان‌سازی شوند.

### Schema فایل Excel — `ExcelFile`

کاربرد: نگهداری metadata فایل‌های Excel و CSV، وضعیت پردازش، آمار ردیف‌ها و ارتباط اختیاری با Task یا Leave.

| فیلد | نوع | الزامی | پیش‌فرض | کاربرد |
| --- | --- | --- | --- | --- |
| `_id` | ObjectId | خودکار | خودکار | شناسه رکورد فایل |
| `createdBy` | ObjectId → User | بله | ندارد | کاربری که فایل را ایجاد یا آپلود کرده است |
| `fileName` | string | بله | ندارد | نام ذخیره‌شده فایل روی سرور |
| `originalName` | string | خیر | رشته خالی | نام اصلی فایل کاربر |
| `filePath` | string | خیر | رشته خالی | مسیر فیزیکی فایل |
| `mimeType` | string | خیر | رشته خالی | نوع MIME فایل |
| `fileSize` | number | خیر | `0` | اندازه فایل برحسب byte |
| `type` | enum | خیر | `export` | نوع عملیات: `import` یا `export` |
| `status` | enum | خیر | `pending` | وضعیت پردازش فایل |
| `sheetName` | string | خیر | رشته خالی | نام sheet پردازش‌شده |
| `totalRows` | number | خیر | `0` | تعداد کل ردیف‌ها |
| `successRows` | number | خیر | `0` | تعداد ردیف‌های موفق |
| `errorRows` | number | خیر | `0` | تعداد ردیف‌های ناموفق یا خالی |
| `errorMessage` | string | خیر | رشته خالی | خطای پردازش فایل |
| `columns` | string[] | خیر | آرایه خالی | نام ستون‌های استخراج‌شده |
| `relatedLeave` | ObjectId → Leave | خیر | ندارد | درخواست مرخصی مرتبط |
| `expiresAt` | Date | خیر | ندارد | زمان حذف خودکار رکورد |
| `relatedTask` | virtual → Task | مجازی | ندارد | Task مرتبط از طریق `Task.excelFile` |
| `createdAt` | Date | خودکار | زمان ایجاد | توسط timestamps ساخته می‌شود |
| `updatedAt` | Date | خودکار | زمان تغییر | توسط timestamps به‌روز می‌شود |

مقادیر وضعیت Excel:

- `pending`: در انتظار پردازش
- `processing`: در حال پردازش
- `completed`: پردازش موفق
- `failed`: پردازش ناموفق

indexها و رفتار ویژه:

- index ترکیبی روی `createdBy` و `createdAt`
- index روی `status` و `type`
- TTL index روی `expiresAt` برای حذف خودکار رکورد منقضی‌شده
- `relatedTask` یک virtual است و داخل خود document ذخیره نمی‌شود.
- هنگام تبدیل به JSON، `_id` به `id` تبدیل و `__v` حذف می‌شود.

### خلاصه روابط بین Schemaها

```text
User
 ├── creates → Task
 ├── assigned to → Task
 ├── creates → FixedTaskTemplate
 ├── assigned to → FixedTaskTemplate
 ├── receives → Notification
 ├── requests → Leave
 └── creates/uploads → ExcelFile

Task
 └── has optional one-to-one → ExcelFile

ExcelFile
 ├── virtual relatedTask → Task
 └── optional relatedLeave → Leave
```

نکات مهم روابط:

- Task و FixedTaskTemplate هیچ ارتباط مستقیمی با یکدیگر ندارند.
- ماژول و schema مربوط به Project در پروژه فعلی وجود ندارد.
- حذف Task می‌تواند ExcelFile مرتبط و فایل فیزیکی آن را حذف کند.
- حذف ExcelFile ارتباط آن را از Task پاک می‌کند.
- حذف User در وضعیت فعلی به‌صورت خودکار Taskها، اعلان‌ها یا مرخصی‌های مرتبط را حذف نمی‌کند.

## معماری وظایف

پروژه دو نوع وظیفه مستقل دارد:

1. `Task`: وظیفه معمولی با بازه زمانی، مسئول، وضعیت و فایل Excel اختیاری.
2. `FixedTask`: وظیفه ثابت با تناوب روزانه، هفتگی یا ماهانه.

بین `Task` و `FixedTask` هیچ ارتباط مستقیم یا شناسه مشترکی وجود ندارد. همچنین هیچ‌کدام به Project وابسته نیستند.

---

# Auth

## ثبت‌نام

```http
POST /api/auth/register
```

دسترسی: عمومی

```json
{
  "firstName": "علی",
  "lastName": "احمدی",
  "email": "ali@example.com",
  "mobile": "09121234567",
  "password": "12345678",
  "workField": "it"
}
```

- کاربر جدید به‌صورت پیش‌فرض `specialist` است.
- کاربر جدید به‌صورت پیش‌فرض غیرفعال است.
- وضعیت عملکرد اولیه `weak` و درصد پیشرفت اولیه `0` است.
- پاسخ شامل اطلاعات کاربر و `accessToken` است.

## ورود

```http
POST /api/auth/login
```

```json
{
  "mobile": "09121234567",
  "password": "12345678"
}
```

ورود با `mobile` و رمز عبور انجام می‌شود، نه با email. پاسخ شامل کاربر و `accessToken` است.

> نقش کاربر داخل JWT ذخیره می‌شود. بعد از تغییر نقش، کاربر باید دوباره وارد شود تا توکن جدید نقش تازه را داشته باشد.

---

# Users

تمام endpointهای این بخش فقط برای `manager` هستند.

## مدل User

| فیلد | توضیح |
| --- | --- |
| `firstName`, `lastName` | نام و نام خانوادگی |
| `email` | ایمیل یکتا |
| `mobile` | شماره موبایل |
| `roles` | نقش کاربر |
| `workField` | حوزه کاری |
| `score` | امتیاز |
| `isActive` | وضعیت فعال بودن |
| `progressPercentage` | درصد پیشرفت محاسبه‌شده |
| `performanceStatus` | `good`، `normal` یا `weak` |
| `performanceEvaluatedAt` | آخرین زمان ارزیابی عملکرد |

## مسیرها

| متد | مسیر | توضیح |
| --- | --- | --- |
| POST | `/api/users` | ساخت کاربر |
| GET | `/api/users` | لیست کاربران |
| GET | `/api/users/:id` | مشاهده کاربر |
| PATCH | `/api/users/:id` | ویرایش کاربر |
| DELETE | `/api/users/:id` | حذف کاربر |
| PATCH | `/api/users/:id/approve` | فعال‌سازی کاربر |
| POST | `/api/users/increase-score` | افزایش امتیاز کاربر |

نمونه افزایش امتیاز:

```json
{
  "userId": "USER_ID",
  "score": 10
}
```

در endpoint عمومی افزایش امتیاز، مقدار `score` باید حداقل `1` باشد.

---

# Tasks

## مدل Task

| فیلد | توضیح |
| --- | --- |
| `title` | عنوان وظیفه |
| `createdBy` | سازنده؛ هنگام ساخت از JWT گرفته می‌شود |
| `assignedTo` | آرایه‌ای شامل دقیقاً یک کاربر مسئول |
| `status` | `todo`, `in_progress`, `done` |
| `description` | توضیحات اختیاری |
| `taskComment` | یادداشت اختیاری |
| `isPublic` | عمومی بودن وظیفه |
| `startDate` | تاریخ و زمان شروع |
| `dueDate` | تاریخ و زمان مهلت |
| `startTime`, `endTime` | ساعت شروع و پایان با فرمت `HH:mm` |
| `recurrence` | تناوب اختیاری |
| `doneTime` | زمان واقعی تکمیل |
| `excelFile` | رکورد Excel مرتبط |
| `file` | مسیر قدیمی فایل برای سازگاری |
| `scoreAdjusted` | جلوگیری از تغییر چندباره امتیاز |

## قواعد Task

- فقط مدیر یا سرپرست می‌تواند Task بسازد.
- مسئول Task باید `specialist` یا `supervisor` باشد.
- هر Task دقیقاً یک مسئول دارد.
- `dueDate` باید بعد از `startDate` باشد.
- `endTime` باید بعد از `startTime` باشد؛ بازه شبانه پشتیبانی نمی‌شود.
- تاریخ‌ها باید ISO 8601 و شامل ساعت/timezone باشند.
- هنگام تغییر وضعیت به `done`، مقدار `doneTime` ثبت می‌شود.
- هنگام بازگرداندن Task از `done`، مقدار `doneTime` پاک می‌شود.
- هنگام ساخت Task برای مسئول آن اعلان ساخته می‌شود.
- هنگام تکمیل Task برای سازنده آن اعلان ساخته می‌شود.

## ساخت Task

```http
POST /api/tasks
Content-Type: multipart/form-data
```

دسترسی: `manager`, `supervisor`

فیلد `file` اختیاری است و می‌تواند فایل Excel باشد.

```json
{
  "title": "تهیه گزارش روزانه",
  "assignedTo": ["USER_ID"],
  "description": "گزارش وضعیت امروز",
  "startDate": "2026-06-10T09:00:00+03:30",
  "dueDate": "2026-06-10T17:00:00+03:30",
  "startTime": "09:00",
  "endTime": "17:00",
  "recurrence": "daily"
}
```

اگر فایل ارسال شود، پاسخ شامل `task` و `excelUpload` است. بدون فایل، خود Task بازگردانده می‌شود.

## لیست و فیلتر Taskها

```http
GET /api/tasks
```

دسترسی: هر کاربر احراز هویت‌شده

| query | توضیح |
| --- | --- |
| `page`, `limit` | صفحه‌بندی |
| `createdBy` | فیلتر سازنده |
| `assignedTo` | فیلتر مسئول |
| `status` | فیلتر وضعیت |
| `startDate` | ابتدای بازه |
| `endDate` | انتهای بازه |
| `recurrence` | `daily`, `weekly`, `monthly` |

فیلتر تاریخی Taskهایی را برمی‌گرداند که با بازه درخواستی هم‌پوشانی دارند.

```http
GET /api/tasks?assignedTo=USER_ID&status=done&startDate=2026-06-01T00:00:00Z&endDate=2026-06-30T23:59:59Z&recurrence=weekly
```

## سایر مسیرهای Task

| متد | مسیر | دسترسی | توضیح |
| --- | --- | --- | --- |
| GET | `/api/tasks/user` | کاربر واردشده | جست‌وجوی Taskها با queryهای `userName` و `lastName` |
| GET | `/api/tasks/:id` | کاربر واردشده | مشاهده Task |
| PATCH | `/api/tasks/:id` | manager | ویرایش Task |
| DELETE | `/api/tasks/:id` | manager | حذف Task |
| PATCH | `/api/tasks/:id/status` | manager | تغییر وضعیت |
| POST | `/api/tasks/completion-stats` | manager | آمار تکمیل وظایف |
| POST | `/api/tasks/date-count` | manager, supervisor | آمار بازه زمانی و تنظیم امتیاز |

نمونه تغییر وضعیت:

```json
{
  "status": "done"
}
```

نمونه گزارش تکمیل Taskهای ساخته‌شده توسط یک مدیر برای یک کارشناس:

```json
{
  "managerId": "MANAGER_ID",
  "expertId": "SPECIALIST_ID"
}
```

نمونه گزارش بازه زمانی:

```json
{
  "userId": "USER_ID",
  "startDate": "2026-06-01",
  "endDate": "2026-06-30"
}
```

### منطق امتیاز Task و FixedTask

- امتیازدهی خودکار فقط برای کاربر دارای نقش `specialist` اعمال می‌شود.
- موعد مؤثر Task معمولی از تاریخ `dueDate` و ساعت `endTime` ساخته می‌شود؛ اگر `endTime` وجود نداشته باشد، خود `dueDate` موعد است.
- Task معمولی که قبل یا دقیقاً در موعد مؤثر تکمیل شود، یک‌بار `۱۰+` امتیاز می‌دهد.
- Task معمولی تکمیل‌شده بعد از موعد مؤثر یا Task موعدگذشته و انجام‌نشده، یک‌بار `۱۰-` امتیاز می‌دهد.
- موعد امتیازدهی FixedTask فقط از ترکیب `endDate` و `endTime` ساخته می‌شود.
- امتیاز FixedTask فقط زمانی اعمال می‌شود که مسئول همان وظیفه با `PATCH /api/fixed-tasks/:id` وضعیت را به `done` تغییر دهد.
- هر Task یا FixedTask که قبل یا دقیقاً در تاریخ و ساعت پایان مقرر تکمیل شود، یک‌بار `۱۰+` امتیاز می‌دهد.
- Task یا FixedTask تکمیل‌شده بعد از تاریخ و ساعت مقرر، یا موعدگذشته و انجام‌نشده، یک‌بار `۱۰-` امتیاز می‌دهد.
- بررسی وظایف انجام‌نشده و موعدگذشته هنگام دریافت لیست Taskها یا FixedTaskها اجرا می‌شود.
- فیلد `scoreAdjusted` مانع اعمال دوباره امتیاز همان وظیفه می‌شود.
- امتیاز User هیچ‌وقت کمتر از صفر ذخیره نمی‌شود.

## ارتباط Task و Excel

- هر Task حداکثر یک رکورد Excel دارد.
- شناسه Excel در `Task.excelFile` نگهداری می‌شود.
- در پاسخ Excel، فیلد مجازی `relatedTask` قابل نمایش است.
- حذف Task، رکورد Excel مرتبط و فایل فیزیکی آن را حذف می‌کند.
- حذف Excel، ارتباط آن را از Task پاک می‌کند.

---

# Fixed Tasks

## مدل FixedTask

| فیلد | توضیح |
| --- | --- |
| `title` | عنوان وظیفه ثابت |
| `assignedTo` | کاربر مسئول |
| `createdBy` | سازنده |
| `recurrence` | `daily`, `weekly`, `monthly` |
| `description` | توضیحات |
| `isActive` | فعال یا غیرفعال |
| `status` | وضعیت انجام |
| `doneTime` | زمان تکمیل |
| `lastGeneratedAt`, `nextRunAt` | اطلاعات زمان‌بندی |
| `startTime`, `endTime` | ساعت شروع و پایان |

## قواعد FixedTask

- تمام مسیرها فقط برای `manager` و `supervisor` هستند.
- سازنده باید مدیر یا سرپرست باشد.
- مسئول باید کارشناس یا سرپرست باشد.
- سازنده و مسئول باید حوزه کاری یکسان داشته باشند.
- وضعیت `done` باعث ثبت `doneTime` می‌شود.
- خروج از وضعیت `done` باعث پاک شدن `doneTime` می‌شود.
- FixedTask هیچ ارتباط مستقیمی با Task ندارد.

## مسیرها

| متد | مسیر | توضیح |
| --- | --- | --- |
| POST | `/api/fixed-tasks` | ساخت وظیفه ثابت |
| GET | `/api/fixed-tasks` | لیست و فیلتر |
| GET | `/api/fixed-tasks/:id` | مشاهده |
| PATCH | `/api/fixed-tasks/:id` | ویرایش |
| DELETE | `/api/fixed-tasks/:id` | حذف |

نمونه ساخت:

```json
{
  "title": "بررسی گزارش روزانه",
  "assignedTo": "USER_ID",
  "recurrence": "daily",
  "description": "بررسی گزارش تا پایان ساعت کاری",
  "startTime": "09:00",
  "endTime": "17:00"
}
```

فیلترها:

| query | توضیح |
| --- | --- |
| `page`, `limit` | صفحه‌بندی |
| `title` | جست‌وجوی بخشی و بدون حساسیت به بزرگی حروف |
| `assignedTo` | مسئول |
| `recurrence` | تناوب |
| `isActive` | فعال یا غیرفعال |

```http
GET /api/fixed-tasks?title=گزارش&assignedTo=USER_ID&recurrence=daily&isActive=true
```

---

# Manager

تمام مسیرهای این بخش فقط برای `manager` هستند؛ به‌جز `GET /api/manager/users/progress` که نقش `supervisor` نیز به آن دسترسی دارد.

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/api/manager/statistics` | تعداد Taskهای باز و کاربران فعال |
| GET | `/api/manager/users` | لیست و فیلتر کاربران |
| GET | `/api/manager/users/by-name` | پیدا کردن کاربر با نام و نام خانوادگی دقیق |
| PATCH | `/api/manager/users/:id/role` | تغییر نقش |
| GET | `/api/manager/tasks` | تمام Taskها و FixedTaskها با فیلتر اختیاری تناوب |
| GET | `/api/manager/tasks/status` | آمار Taskها براساس وضعیت |
| GET | `/api/manager/tasks/users/counts` | تعداد Taskهای هر مسئول |
| GET | `/api/manager/users/monthly-performance` | عملکرد ماهانه کاربران |
| GET | `/api/manager/users/progress` | محاسبه و ذخیره پیشرفت و عملکرد؛ قابل دسترسی برای مدیر و سرپرست |

نمونه تغییر نقش:

```http
PATCH /api/manager/users/USER_ID/role
```

```json
{
  "role": "supervisor"
}
```

فیلترهای لیست کاربران:

```http
GET /api/manager/users?page=1&limit=20&isActive=true&role=specialist&name=علی احمدی
```

گزارش عملکرد ماهانه:

```http
GET /api/manager/users/monthly-performance?month=6&year=2026
```

### محاسبه پیشرفت

endpoint زیر برای مدیر و سرپرست قابل دسترسی است و تمام کارشناسان و سرپرستان را ارزیابی می‌کند:

```http
GET /api/manager/users/progress
```

فرمول درصد پیشرفت:

```text
امتیاز Taskهای معمولی از ۵۰ + امتیاز FixedTaskها از ۵۰

امتیاز هر گروه =
((تعداد موفق + نصف تعداد in_progress) / تعداد کل گروه) × ۵۰
```

قواعد عملکرد:

- Task معمولی فقط زمانی موفق محسوب می‌شود که `done` باشد و `doneTime` قبل از `dueDate` قرار بگیرد.
- FixedTask با وضعیت `done` موفق محسوب می‌شود.
- وظیفه `in_progress` نصف امتیاز همان وظیفه را دریافت می‌کند.
- وظیفه `todo` و Task تکمیل‌شده بعد از موعد امتیاز دریافت نمی‌کنند.
- درصد `۰` تا `۴۰` وضعیت `weak` دارد.
- درصد بیشتر از `۴۰` تا `۷۰` وضعیت `normal` دارد.
- درصد بیشتر از `۷۰` وضعیت `good` دارد.
- مقادیر `progressPercentage`، `performanceStatus` و `performanceEvaluatedAt` در User ذخیره می‌شوند.

---

# Notifications

تمام مسیرها نیازمند JWT هستند و هر کاربر فقط اعلان‌های خودش را مشاهده یا تغییر می‌دهد.

## انواع اعلان

`task_assigned`, `task_completed`, `task_completion_stats`, `date_count`, `leave_request`, `leave_approved`, `leave_rejected`

در وضعیت فعلی پروژه، اعلان‌های تخصیص Task و تکمیل Task به‌صورت خودکار ایجاد می‌شوند.

## مسیرها

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/api/notifications/me` | لیست اعلان‌های کاربر جاری |
| GET | `/api/notifications/me/unread-count` | تعداد خوانده‌نشده‌ها |
| GET | `/api/notifications/me/unread` | دریافت یک اعلان خوانده‌نشده |
| PATCH | `/api/notifications/me/read-all` | خوانده‌شدن همه |
| DELETE | `/api/notifications/me/read` | حذف اعلان‌های خوانده‌شده |
| GET | `/api/notifications/:id` | مشاهده یک اعلان |
| PATCH | `/api/notifications/:id` | تغییر وضعیت خوانده‌شدن |
| DELETE | `/api/notifications/:id` | حذف اعلان |

فیلترها:

```http
GET /api/notifications/me?page=1&limit=20&type=task_assigned&isRead=false&search=گزارش
```

تغییر وضعیت:

```json
{
  "isRead": true
}
```

---

# Leave Requests

> این endpointها در کد فعلی Guard احراز هویت ندارند.

## مدل مرخصی

| فیلد | توضیح |
| --- | --- |
| `user` | درخواست‌دهنده |
| `startDate`, `endDate` | بازه مرخصی |
| `reason` | علت |
| `status` | `pending`, `approved`, `rejected` |
| `approvedBy` | تأیید یا ردکننده |
| `approvedAt` | زمان تصمیم |
| `rejectionReason` | علت رد |

## مسیرها

| متد | مسیر | توضیح |
| --- | --- | --- |
| POST | `/api/leave-requests` | ثبت درخواست |
| GET | `/api/leave-requests` | لیست و فیلتر |
| GET | `/api/leave-requests/:id` | مشاهده درخواست |
| GET | `/api/leave-requests/user/:userId` | درخواست‌های یک کاربر |
| PATCH | `/api/leave-requests/:id` | ویرایش |
| DELETE | `/api/leave-requests/:id` | حذف |
| POST | `/api/leave-requests/:id/approve` | تأیید |
| POST | `/api/leave-requests/:id/reject` | رد |

نمونه ثبت:

```json
{
  "user": "USER_ID",
  "startDate": "2026-06-15",
  "endDate": "2026-06-17",
  "reason": "مرخصی شخصی"
}
```

نمونه تأیید:

```json
{
  "approvedBy": "MANAGER_ID"
}
```

نمونه رد:

```json
{
  "approvedBy": "MANAGER_ID",
  "rejectionReason": "تداخل با برنامه کاری"
}
```

فیلترهای لیست: `page`, `limit`, `user`, `status`, `approvedBy`.

---

# Excel

> این endpointها در کد فعلی Guard احراز هویت ندارند.

## مدل Excel

| فیلد | توضیح |
| --- | --- |
| `createdBy` | سازنده |
| `fileName`, `originalName`, `filePath` | اطلاعات فایل |
| `mimeType`, `fileSize` | نوع و اندازه |
| `type` | `import` یا `export` |
| `status` | وضعیت پردازش |
| `sheetName` | نام شیت |
| `totalRows`, `successRows`, `errorRows` | آمار ردیف‌ها |
| `errorMessage` | خطای پردازش |
| `columns` | ستون‌ها |
| `relatedTask` | Task مرتبط به‌صورت virtual |
| `expiresAt` | زمان انقضا |

فرمت‌های قابل آپلود شامل `xlsx`، `xls` و `csv` هستند. فایل‌ها در `uploads/excel` ذخیره می‌شوند.

## مسیرها

| متد | مسیر | توضیح |
| --- | --- | --- |
| POST | `/api/excel` | ساخت رکورد Excel |
| POST | `/api/excel/upload` | آپلود فایل |
| GET | `/api/excel` | لیست و فیلتر |
| GET | `/api/excel/:id` | مشاهده رکورد |
| GET | `/api/excel/:id/download` | دانلود فایل |
| PATCH | `/api/excel/:id` | ویرایش |
| DELETE | `/api/excel/:id` | حذف رکورد و فایل |
| POST | `/api/excel/:id/process` | پردازش import |
| GET | `/api/excel/statistics/:userId` | آمار فایل‌های کاربر |
| POST | `/api/excel/export/generate` | تولید فایل خروجی |

نمونه آپلود:

```http
POST /api/excel/upload?createdBy=USER_ID&type=import
Content-Type: multipart/form-data
```

فیلترهای لیست:

```http
GET /api/excel?page=1&limit=20&createdBy=USER_ID&status=completed&type=import
```

نمونه تولید خروجی:

```json
{
  "sheetName": "گزارش",
  "columns": ["name", "score"],
  "data": [
    {
      "name": "علی احمدی",
      "score": 100
    }
  ]
}
```

---

# اسکریپت‌های کاربردی

## Build و Test

```bash
npm run build
npm run test
npm run test:integrated-api
```

تست یکپارچه به API و MongoDB تنظیم‌شده متصل می‌شود و داده آزمایشی می‌سازد.

## Seed وظایف ثابت از Excel

```bash
npm run seed:fixed-tasks -- "C:\path\to\file.xlsx"
```

- مسیر فایل Excel الزامی است و باید وجود داشته باشد.
- اسکریپت کاربران، رکورد Excel و FixedTaskها را ایجاد یا به‌روزرسانی می‌کند.
- رمز پیش‌فرض کاربران seedشده `SeedPass1234` است.
- اتصال MongoDB از `.env` خوانده می‌شود.

## مهاجرت تاریخ Taskها

```bash
npm run migrate:task-dates
```

این اسکریپت تاریخ‌های قدیمی Task را از string به Date تبدیل می‌کند.

---

# نکات مهم پیش از Production

1. روی کنترلرهای Excel و LeaveRequest حتماً Guard و Role مناسب اضافه شود.
2. `JWT_SECRET` امن و غیرقابل حدس تنظیم شود.
3. مسیر `uploads/excel` از نظر دسترسی فایل و پاک‌سازی دوره‌ای بررسی شود.
4. رمز پیش‌فرض seed در محیط واقعی تغییر کند.
5. برای پشتیبانی MongoDB Atlas، اعتبارسنجی `mongodb+srv://` اصلاح شود.
6. Swagger و endpointهای مدیریتی در محیط production محدود شوند.
