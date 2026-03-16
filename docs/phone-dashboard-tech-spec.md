# Technical Spec — TLS TD88 Phone Dashboard

## 1. Mục tiêu
Dashboard nội bộ để:
- import danh sách số điện thoại từ file `.xlsx`
- quản lý record điện thoại cho admin / staff / staff đang là tổ trưởng
- cập nhật status / ghi chú linh hoạt
- phân công và chuyển data trong phạm vi team
- hỗ trợ thao tác nhanh cho người gọi

App đang dùng:
- Next.js App Router
- Prisma + SQLite
- auth bằng username/password + cookie session

---

## 2. Domain model hiện tại

### 2.1 User role
Hệ thống **chỉ có 2 role**:
- `admin`
- `staff`

Không còn role `leader` riêng trong enum.

### 2.2 Team lead model
Quyền tổ trưởng được xác định bằng:
- `team.leaderId`

Một user có role `staff` nhưng nếu id của user đó đang là `team.leaderId`, user đó được xem là **tổ trưởng của team**.

Nói ngắn:
- role là `staff`
- quyền tổ trưởng đến từ quan hệ với `Team`

### 2.3 Phạm vi nhìn dữ liệu
- `admin`: thấy tất cả
- `staff` thường: chỉ thấy record được assign cho chính mình
- `staff` đang là tổ trưởng: thấy record của cả team mình

### 2.4 Quy tắc khi chuyển team
Khi staff bị chuyển sang team mới:
- user đó **không được tiếp tục thấy data cũ của team trước**
- các record đang assign cho user đó sẽ bị **gỡ assign**
- `leaderId` trên record được giữ theo team cũ để data vẫn thuộc đúng phạm vi quản lý cũ

---

## 3. Rule nghiệp vụ đã chốt

### 3.1 Import
- chỉ nhận file `.xlsx`
- chỉ đọc số điện thoại ở **cột A**
- mặc định xử lý theo kiểu **dòng 1 là header**, dữ liệu bắt đầu từ dòng 2
- chuẩn hóa số điện thoại về **9 số cuối**
- nếu trùng 9 số cuối với dữ liệu cũ thì:
  - giữ dữ liệu cũ
  - bỏ dữ liệu mới
  - trả danh sách duplicate

### 3.2 Normalize phone
Các bước normalize:
1. convert sang string
2. trim
3. bỏ khoảng trắng / dấu phân tách phổ biến
4. bỏ tiền tố `+84`, `84`, `0` theo rule
5. lấy đúng **9 số cuối**
6. nếu không ra đúng 9 chữ số thì invalid

Ví dụ:
- `+84912345678` -> `912345678`
- `0912345678` -> `912345678`
- `912345678` -> `912345678`

### 3.3 Copy / hiển thị
- copy số điện thoại phải copy đúng `phoneLast9`
- status/ghi chú nhập linh hoạt theo người gọi
- UI có autocomplete gợi ý theo status cũ + mẫu mặc định

### 3.4 Team / phân quyền
- chỉ có **1 admin duy nhất**
- có nhiều team
- mỗi team có tối đa 1 tổ trưởng tại `team.leaderId`
- admin có thể:
  - tạo team
  - đổi tên team
  - chọn tổ trưởng
  - tạo/chỉnh sửa staff
  - chuyển staff giữa team
- staff đang là tổ trưởng có thể:
  - tạo staff trong team mình
  - xem staff trong team mình
  - assign data cho staff trong team
  - import data cho staff trong team
  - chuyển data giữa staff trong team
  - nhận data vào chính account của mình như một staff bình thường

---

## 4. Data model hiện tại

### 4.1 `users`
Fields chính:
- `id`
- `username`
- `password_hash`
- `role` = `admin | staff`
- `team_id` nullable
- `is_active`
- `created_at`
- `updated_at`

Lưu ý:
- user đang làm tổ trưởng **có thể không cần role riêng**, chỉ cần được tham chiếu ở `teams.leader_id`

### 4.2 `teams`
Fields chính:
- `id`
- `name`
- `leader_id` nullable, unique
- `created_at`
- `updated_at`

Ý nghĩa:
- `leader_id` là nguồn sự thật cho quyền tổ trưởng

### 4.3 `phone_records`
Fields chính:
- `id`
- `phone_raw`
- `phone_last9`
- `status_text` nullable
- `note_text` nullable
- `assigned_staff_id` nullable
- `leader_id` nullable
- `import_job_id` nullable
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `deleted_at` nullable

Ý nghĩa field quan trọng:
- `assigned_staff_id`: record đang được giao cho ai
- `leader_id`: record hiện thuộc phạm vi quản lý của tổ trưởng nào

### 4.4 `import_jobs`
Fields chính:
- `id`
- `file_name`
- `imported_by_user_id`
- `assigned_staff_id` nullable
- `total_rows`
- `success_rows`
- `duplicate_rows`
- `invalid_rows`
- `status`
- `created_at`
- `finished_at`

### 4.5 `import_duplicates`
Fields chính:
- `id`
- `import_job_id`
- `row_number`
- `phone_raw`
- `phone_last9`
- `existing_record_id` nullable
- `reason`
- `created_at`

---

## 5. API hiện tại

### 5.1 Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### 5.2 Users / Teams
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `DELETE /api/users/:id`
- `PATCH /api/users/:id/active`
- `POST /api/users/:id/transfer-records`
- `GET /api/teams`
- `POST /api/teams`
- `PATCH /api/teams/:id`

### 5.3 Phone records
- `GET /api/phone-records`
- `POST /api/phone-records`
- `GET /api/phone-records/:id`
- `PATCH /api/phone-records/:id`
- `POST /api/phone-records/:id/assign`
- `POST /api/phone-records/:id/status`

### 5.4 Imports
- `POST /api/imports/phone-records`
- `GET /api/imports`
- `GET /api/imports/:id/duplicates`

---

## 6. Permission rules hiện tại

### 6.1 Admin
- full access
- thấy toàn bộ users / teams / phone records / imports

### 6.2 Staff thường
- không quản lý users
- không import
- chỉ thấy record được assign cho chính mình
- không thấy record unassigned của team

### 6.3 Staff đang là tổ trưởng
- được xem như manager của team mình
- có thể quản lý staff thuộc team mình
- có thể assign record cho staff thuộc team mình
- có thể import cho staff thuộc team mình
- có thể import / assign / transfer record vào chính account của mình
- chỉ thấy users và records trong phạm vi team mình

### 6.4 Access data rule
- khi data chuyển từ A sang B thì A không còn thấy nữa
- khi staff chuyển từ team cũ sang team mới thì staff đó không còn thấy data cũ của team trước

---

## 7. UI routes hiện tại
- `/login`
- `/dashboard`
- `/phone-records`
- `/imports`
- `/users`

### 7.1 Dashboard
- card tổng quan
- list record cập nhật gần đây
- staff thường chỉ thấy snapshot của record thuộc về mình

### 7.2 Phone records
- filter theo số / status / staff
- edit inline status/ghi chú
- autosave
- assign staff nếu có quyền
- copy nhanh số / ghi chú
- phân trang 50 record / trang

### 7.3 Imports
- upload `.xlsx`
- chọn staff nhận data hoặc để chưa gán
- hiển thị kết quả import:
  - tổng dòng
  - thành công
  - duplicate
  - invalid
- hiển thị lịch sử import gần đây

### 7.4 Users
- admin: tạo team, đổi tổ trưởng, tạo/chuyển staff, khóa user, xóa user hợp lệ
- staff đang là tổ trưởng: quản lý team mình
- thao tác edit dùng modal
- có flow chuyển toàn bộ data từ staff nguồn sang staff đích

---

## 8. Acceptance criteria hiện tại

### Import
- import `.xlsx` đúng cột A
- normalize đúng 9 số cuối
- duplicate không ghi đè record cũ
- trả được duplicate list + invalid list

### Permission
- admin thấy tất cả
- staff thường chỉ thấy data của mình
- tổ trưởng thấy data team mình
- tổ trưởng có thể assign/import/transfer trong team
- tổ trưởng có thể nhận data vào chính account của mình
- staff chuyển team không còn thấy data cũ team trước

### User / Team management
- admin tạo team mới được
- admin set tổ trưởng từ staff được
- admin chuyển staff giữa team được
- tổ trưởng chỉ quản lý staff thuộc team mình

---

## 9. Nợ kỹ thuật còn mở
- docs cũ đã được thay bằng bản này; nếu đổi business tiếp phải update cùng code
- nên bổ sung test tự động cho permission flows và regression flows
- nên harden bằng transaction cho các flow nhiều bước
- rename domain sâu ở schema/relation name (`leaderId`, `LeaderRecords`, ...) là việc lớn hơn, chưa bắt buộc để release

---

## 10. Kết luận
Spec này phản ánh **codebase hiện tại**, không còn theo model `admin | leader | staff` cũ nữa.
Nếu business tiếp tục dùng mô hình “staff có thể là tổ trưởng thông qua `team.leaderId`”, mọi thay đổi sau này nên bám theo file này để tránh lệch giữa doc và code.
