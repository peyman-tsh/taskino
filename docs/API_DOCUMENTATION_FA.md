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
| وضعیت عملکرد | `good`, `weak` |
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
| Manager Reports | بله | خیر | خیر | خیر |
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

تمام مسیرهای این جدول برای مدیر و سرپرست هستند.

| متد | مسیر | ورودی | پاسخ موفق |
| --- | --- | --- | --- |
| POST | `/api/fixed-tasks` | body: `CreateFixedTaskDto` | `201`؛ FixedTask ساخته‌شده |
| GET | `/api/fixed-tasks` | queryهای فیلتر و pagination | `200`؛ لیست صفحه‌بندی‌شده |
| GET | `/api/fixed-tasks/:id` | path: `id` | `200`؛ یک FixedTask |
| PATCH | `/api/fixed-tasks/:id` | path: `id`، body: `UpdateFixedTaskDto` | `200`؛ FixedTask ویرایش‌شده |
| DELETE | `/api/fixed-tasks/:id` | path: `id` | `204`؛ بدون body |

### Manager

تمام مسیرهای این جدول فقط برای مدیر هستند.

| متد | مسیر | ورودی | پاسخ موفق |
| --- | --- | --- | --- |
| GET | `/api/manager/statistics` | ندارد | `200`؛ آمار داشبورد |
| GET | `/api/manager/users` | query: `page`, `limit`, `isActive`, `role`, `name` | `200`؛ کاربران فیلترشده |
| PATCH | `/api/manager/users/:id/role` | body: `role` | `200`؛ کاربر با نقش جدید |
| GET | `/api/manager/tasks/status` | ندارد | `200`؛ تعداد Taskها براساس وضعیت |
| GET | `/api/manager/tasks/users/counts` | ندارد | `200`؛ تعداد Taskهای هر کاربر |
| GET | `/api/manager/users/monthly-performance` | query: `month`, `year` | `200`؛ عملکرد ماهانه |
| GET | `/api/manager/users/progress` | ندارد | `200`؛ ارزیابی و ذخیره پیشرفت کاربران |

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

تمام endpointهای این بخش فقط برای مدیر و سرپرست هستند.

#### `POST /api/fixed-tasks`

یک وظیفه ثابت روزانه، هفتگی یا ماهانه ایجاد می‌کند. سازنده از JWT گرفته می‌شود و مسئول باید کارشناس یا سرپرستی با حوزه کاری یکسان با سازنده باشد. اگر وضعیت اولیه `done` باشد، `doneTime` همان زمان ثبت می‌شود.

#### `GET /api/fixed-tasks`

وظایف ثابت را به‌صورت صفحه‌بندی‌شده برمی‌گرداند. امکان فیلتر براساس عنوان، مسئول، تناوب و فعال بودن وجود دارد. جست‌وجوی عنوان بخشی و بدون حساسیت به بزرگی حروف است.

#### `GET /api/fixed-tasks/:id`

یک FixedTask را با شناسه دریافت می‌کند. اطلاعات سازنده و مسئول در پاسخ populate می‌شوند. شناسه باید ObjectId معتبر باشد.

#### `PATCH /api/fixed-tasks/:id`

اطلاعات FixedTask را ویرایش می‌کند و قوانین نقش، حوزه کاری و بازه ساعت را دوباره بررسی می‌کند. تغییر وضعیت به `done` باعث ثبت `doneTime` و خروج از `done` باعث پاک‌شدن آن می‌شود.

#### `DELETE /api/fixed-tasks/:id`

FixedTask مشخص‌شده را حذف می‌کند. این عملیات روی Taskهای معمولی اثری ندارد، زیرا بین Task و FixedTask ارتباط مستقیمی وجود ندارد.

### Manager

تمام endpointهای این بخش فقط برای مدیر هستند.

#### `GET /api/manager/statistics`

آمار خلاصه داشبورد مدیر را برمی‌گرداند. در وضعیت فعلی شامل تعداد Taskهای باز با وضعیت `todo` یا `in_progress` و تعداد کاربران فعال است.

#### `GET /api/manager/users`

لیست مدیریتی کاربران را با pagination و فیلترهای `isActive`، `role` و `name` برمی‌گرداند. فیلتر نام می‌تواند چند کلمه داشته باشد و در نام و نام خانوادگی جست‌وجو می‌کند.

#### `PATCH /api/manager/users/:id/role`

نقش کاربر را به یکی از نقش‌های معتبر تغییر می‌دهد. چون نقش داخل JWT ذخیره می‌شود، کاربر پس از تغییر نقش باید دوباره login کند تا سطح دسترسی جدید در توکن او قرار گیرد.

#### `GET /api/manager/tasks/status`

نمای کلی وضعیت تمام Taskها را برمی‌گرداند. پاسخ شامل تعداد کل Taskها و تعداد `todo`، `in_progress` و `done` است.

#### `GET /api/manager/tasks/users/counts`

Taskها را براساس مسئول گروه‌بندی می‌کند. برای هر کاربر، اطلاعات هویتی و تعداد کل Taskها به تفکیک وضعیت بازگردانده می‌شود و کاربران با Task بیشتر در ابتدای نتیجه قرار می‌گیرند.

#### `GET /api/manager/users/monthly-performance`

عملکرد ماهانه کاربران را براساس Taskهای ایجادشده در ماه و سال انتخاب‌شده محاسبه می‌کند. پاسخ شامل تعداد Taskها، نرخ تکمیل، Taskهای در حال انجام، Taskهای در انتظار و امتیاز کاربر است.

#### `GET /api/manager/users/progress`

تمام کارشناسان و سرپرستان را براساس Taskها و FixedTaskهایشان ارزیابی می‌کند. درصد پیشرفت و وضعیت `good` یا `weak` محاسبه و داخل رکورد User ذخیره می‌شود. کاربر زمانی `good` است که تمام FixedTaskها انجام شده و تمام Taskهای معمولی قبل از موعد تکمیل شده باشند.

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
| `status` | enum | خیر | پیش‌فرض `todo` |
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
| `status` | enum | خیر | پیش‌فرض `todo` |
| `description` | string | خیر | توضیحات |
| `isActive` | boolean | خیر | پیش‌فرض `true` |
| `nextRunAt` | ISO date-time | خیر | زمان اجرای بعدی |
| `startTime`, `endTime` | `HH:mm` | خیر | ساعت شروع و پایان |

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
    "totalFixedTasks": 2,
    "completedFixedTasks": 2,
    "progressPercentage": 100,
    "performanceStatus": "good",
    "performanceEvaluatedAt": "2026-06-11T08:00:00.000Z"
  }
]
```

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
| `performanceStatus` | `good` یا `weak` |
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

### منطق امتیاز Task

در endpoint `date-count`:

- اگر تمام Taskهای انتخاب‌شده `done` باشند و موعد آن‌ها هنوز نگذشته باشد، `10+` امتیاز ثبت می‌شود.
- اگر حداقل یک Task تکمیل‌نشده و عقب‌افتاده باشد، `10-` امتیاز ثبت می‌شود.
- با استفاده از `scoreAdjusted` هر مجموعه Task فقط یک‌بار باعث تغییر امتیاز می‌شود.

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

تمام مسیرهای این بخش فقط برای `manager` هستند.

| متد | مسیر | توضیح |
| --- | --- | --- |
| GET | `/api/manager/statistics` | تعداد Taskهای باز و کاربران فعال |
| GET | `/api/manager/users` | لیست و فیلتر کاربران |
| PATCH | `/api/manager/users/:id/role` | تغییر نقش |
| GET | `/api/manager/tasks/status` | آمار Taskها براساس وضعیت |
| GET | `/api/manager/tasks/users/counts` | تعداد Taskهای هر مسئول |
| GET | `/api/manager/users/monthly-performance` | عملکرد ماهانه کاربران |
| GET | `/api/manager/users/progress` | محاسبه و ذخیره پیشرفت و عملکرد |

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

endpoint زیر تمام کارشناسان و سرپرستان را ارزیابی می‌کند:

```http
GET /api/manager/users/progress
```

فرمول درصد پیشرفت:

```text
تعداد Task و FixedTask انجام‌شده / تعداد کل Task و FixedTask × 100
```

قواعد عملکرد:

- کاربر فقط زمانی `good` است که حداقل یک وظیفه داشته باشد.
- تمام FixedTaskهای او باید `done` باشند.
- تمام Taskهای معمولی باید `done` باشند و `doneTime` آن‌ها قبل از `dueDate` باشد.
- در غیر این صورت عملکرد `weak` ثبت می‌شود.
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
