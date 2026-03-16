# Technical Spec — Dashboard quản lý số điện thoại cho nhân viên

## 1) Mục tiêu
Xây dựng web dashboard nội bộ để:
- import danh sách số điện thoại từ file `.xlsx`
- quản lý và phân phối số điện thoại cho nhân viên
- theo dõi trạng thái xử lý linh hoạt
- ghi chú theo từng số điện thoại
- hỗ trợ copy nhanh dữ liệu
- quản trị người dùng theo vai trò: `admin`, `leader`, `staff`

Ứng dụng được xây bằng Next.js.

---

## 2) Phạm vi MVP
MVP cần có đủ các khả năng sau:

### 2.1 Import dữ liệu
- Upload file `.xlsx`
- Chỉ đọc dữ liệu số điện thoại từ **cột A**
- Chuẩn hóa số điện thoại về dạng **9 số cuối**
- Phát hiện trùng theo **9 số cuối**
- Nếu trùng:
  - giữ dữ liệu cũ
  - không import dữ liệu mới
  - ghi lại danh sách số bị trùng
- Cho phép leader chọn nhân viên nhận dữ liệu khi import

### 2.2 Quản lý dữ liệu số điện thoại
- Danh sách record dạng bảng
- Tìm kiếm theo số điện thoại
- Lọc theo nhân viên phụ trách
- Lọc theo status
- Xem chi tiết record
- Cập nhật status
- Cập nhật ghi chú
- Gán/chuyển nhân viên phụ trách
- Copy số điện thoại
- Copy status

### 2.3 Quản lý người dùng
- Chỉ có **1 admin duy nhất** trong hệ thống
- Nhiều leader
- Nhiều staff
- Admin có quyền chỉnh sửa thông tin nhân viên
- Leader có quyền import data và phân phối số điện thoại cho nhân viên riêng
- Staff chỉ thao tác trên dữ liệu được giao

### 2.4 Quản lý status linh hoạt
- Status không khóa cứng hoàn toàn
- Người gọi có thể nhập status linh hoạt
- UI nên hỗ trợ gợi ý status cũ đã tồn tại
- Status được lưu dưới dạng text

---

## 3) Quy tắc nghiệp vụ cốt lõi

## 3.1 Nguồn import
- File đầu vào: `.xlsx`
- Cột chứa số điện thoại: **cột A**
- Các cột khác trong file MVP có thể bỏ qua hoặc để mở rộng sau

## 3.2 Định dạng số điện thoại đầu vào hợp lệ
Chấp nhận các dạng:
- `+84xxxxxxxxx`
- `0xxxxxxxxx`
- `xxxxxxxxx` (9 số)

Ví dụ hợp lệ:
- `+84912345678`
- `0912345678`
- `912345678`

## 3.3 Quy tắc chuẩn hóa số điện thoại
Mục tiêu là lưu và hiển thị thống nhất dưới dạng **9 số cuối**.

### Thuật toán normalize
Input: chuỗi lấy từ cột A

Các bước:
1. Convert về string
2. Trim khoảng trắng đầu/cuối
3. Bỏ các ký tự phân tách phổ biến:
   - space
   - `.`
   - `-`
   - `(`
   - `)`
4. Nếu bắt đầu bằng `+84` thì bỏ tiền tố `+84`
5. Nếu bắt đầu bằng `84` thì bỏ tiền tố `84`
6. Nếu sau đó bắt đầu bằng `0` thì bỏ `0` đầu
7. Sau khi xử lý, chuỗi còn lại phải là số
8. Lấy **9 số cuối**
9. Nếu kết quả không đủ đúng 9 chữ số => invalid

### Kết quả lưu trữ
- `phone_raw`: giữ nguyên giá trị đầu vào đọc được từ file hoặc nhập tay
- `phone_last9`: giá trị chuẩn hóa 9 số cuối
- UI hiển thị chính bằng `phone_last9`

### Ví dụ normalize
- `+84912345678` -> `912345678`
- `0912345678` -> `912345678`
- `912345678` -> `912345678`
- `(+84) 912-345-678` -> `912345678`

## 3.4 Quy tắc trùng lặp
Một record được xem là **trùng** nếu `phone_last9` đã tồn tại trong hệ thống.

### Xử lý khi import trùng
- Không tạo record mới
- Không ghi đè record cũ
- Record mới bị skip
- Ghi log vào danh sách trùng

### Kết quả import phải trả ra
- `total_rows`
- `success_rows`
- `duplicate_rows`
- `invalid_rows`
- danh sách số trùng
- danh sách số lỗi format

## 3.5 Quy tắc gán dữ liệu khi import
Leader có thể import theo 2 hướng:

### Mode A — import cho một nhân viên cụ thể
- Leader chọn 1 staff trước khi import
- Các số hợp lệ, không trùng sẽ được gán cho staff đó

### Mode B — import vào hệ thống trước
- Leader import dữ liệu vào pool chưa phân công
- Sau đó leader phân phối thủ công cho staff

### MVP khuyến nghị
Triển khai trước **Mode A**.
Mode B có thể làm sau nếu còn thời gian.

## 3.6 Quy tắc status
Status được lưu dưới dạng text tự do:
- ví dụ: `Đã gọi`
- `Không nghe máy`
- `Gọi lại chiều`
- `Quan tâm`
- `Sai số`

### Hành vi UI
- input kiểu combobox
- cho phép chọn từ danh sách gợi ý
- cho phép nhập mới
- status mới sau khi lưu sẽ được dùng làm gợi ý cho lần sau

### Ghi chú kỹ thuật
Không được hard-code enum status ở backend cho MVP.
Có thể lưu thêm bảng suggestions/history để autocomplete.

## 3.7 Quy tắc copy dữ liệu
UI phải hỗ trợ thao tác copy nhanh:
- copy số điện thoại
- copy status

Khi copy thành công:
- hiển thị toast ngắn: `Đã copy`

---

## 4) Vai trò và phân quyền

## 4.1 Admin
Số lượng:
- chỉ có **1 admin duy nhất** trong hệ thống

Quyền:
- xem toàn bộ dữ liệu
- tạo/sửa/khóa nhân viên
- chỉnh sửa thông tin nhân viên
- xem toàn bộ import jobs
- cấu hình hệ thống cơ bản

## 4.2 Leader
Số lượng:
- nhiều leader

Quyền:
- import file data
- chọn nhân viên nhận data khi import
- phân phối/chuyển số điện thoại cho staff thuộc phạm vi quản lý
- xem dữ liệu thuộc phạm vi mình quản lý
- cập nhật status / note nếu business cho phép

## 4.3 Staff
Quyền:
- xem danh sách số điện thoại được giao cho mình
- cập nhật status
- cập nhật ghi chú
- copy dữ liệu cần thiết

## 4.4 Permission rules tối thiểu
- Admin: full access
- Leader: không được sửa tài khoản admin
- Staff: không được xem dữ liệu không thuộc về mình
- Mọi permission phải được kiểm tra ở backend, không chỉ ở UI

---

## 5) Data model đề xuất

## 5.1 users
Dùng cho admin / leader / staff.

### Fields
- `id`
- `name`
- `employee_code` nullable
- `phone` nullable
- `username`
- `password_hash`
- `role` — `admin | leader | staff`
- `is_active`
- `created_at`
- `updated_at`

### Constraints
- chỉ cho phép đúng 1 user có `role = admin`
- `username` unique

## 5.2 phone_records
Bảng chính quản lý số điện thoại.

### Fields
- `id`
- `phone_raw`
- `phone_last9`
- `status_text` nullable
- `note_text` nullable
- `assigned_staff_id` nullable
- `leader_id` nullable — leader tạo/import record này
- `import_job_id` nullable
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`
- `deleted_at` nullable

### Constraints
- `phone_last9` unique
- index trên `assigned_staff_id`
- index trên `leader_id`
- index trên `status_text`

## 5.3 phone_record_notes
Nếu muốn tách note lịch sử riêng thay vì chỉ note hiện tại.

### Fields
- `id`
- `phone_record_id`
- `content`
- `created_by`
- `created_at`

### MVP note
Nếu cần đi nhanh, MVP có thể giữ `note_text` trực tiếp trong `phone_records` trước.
Nếu đủ thời gian thì thêm `phone_record_notes` để có lịch sử chuẩn hơn.

## 5.4 import_jobs
Theo dõi mỗi lần import.

### Fields
- `id`
- `file_name`
- `imported_by_user_id`
- `assigned_staff_id` nullable
- `total_rows`
- `success_rows`
- `duplicate_rows`
- `invalid_rows`
- `status` — `processing | done | failed`
- `created_at`
- `finished_at` nullable

## 5.5 import_duplicates
Lưu danh sách số trùng khi import.

### Fields
- `id`
- `import_job_id`
- `row_number`
- `phone_raw`
- `phone_last9`
- `existing_record_id` nullable
- `reason`
- `created_at`

## 5.6 status_suggestions (khuyến nghị)
Dùng để autocomplete status linh hoạt.

### Fields
- `id`
- `value`
- `usage_count`
- `last_used_at`
- `created_at`
- `updated_at`

### Constraint
- `value` unique

---

## 6) API contract đề xuất

## 6.1 Auth
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

## 6.2 Users
- `GET /api/users`
- `POST /api/users`
- `PATCH /api/users/:id`
- `PATCH /api/users/:id/active`

### Rules
- chỉ admin được create/update users
- không cho tạo thêm user role `admin` nếu đã tồn tại admin khác

## 6.3 Phone records
- `GET /api/phone-records`
- `POST /api/phone-records`
- `GET /api/phone-records/:id`
- `PATCH /api/phone-records/:id`
- `POST /api/phone-records/:id/assign`
- `POST /api/phone-records/:id/status`
- `POST /api/phone-records/:id/copy-log` (optional, không bắt buộc)

### Query params cho list
- `q` — search theo số điện thoại
- `assignedStaffId`
- `leaderId`
- `status`
- `page`
- `pageSize`

### List response gợi ý
```json
{
  "items": [
    {
      "id": 1,
      "phone_raw": "0912345678",
      "phone_last9": "912345678",
      "status_text": "Không nghe máy",
      "note_text": "Gọi lại chiều",
      "assigned_staff": {
        "id": 10,
        "name": "Nguyen Van A"
      },
      "leader": {
        "id": 4,
        "name": "Leader 1"
      },
      "updated_at": "2026-03-16T08:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 20,
    "total": 100
  }
}
```

## 6.4 Import
- `POST /api/imports/phone-records`
- `GET /api/imports`
- `GET /api/imports/:id`
- `GET /api/imports/:id/duplicates`

### Input cho import
FormData:
- `file`
- `assignedStaffId` nullable

### Rules
- chỉ admin hoặc leader được import
- file phải là `.xlsx`
- chỉ đọc cột A
- skip record trùng

### Import response gợi ý
```json
{
  "importJobId": 12,
  "totalRows": 120,
  "successRows": 95,
  "duplicateRows": 20,
  "invalidRows": 5,
  "duplicates": [
    {
      "rowNumber": 4,
      "phoneRaw": "0912345678",
      "phoneLast9": "912345678",
      "reason": "Duplicate by last 9 digits"
    }
  ],
  "invalids": [
    {
      "rowNumber": 7,
      "phoneRaw": "abc",
      "reason": "Invalid phone format"
    }
  ]
}
```

## 6.5 Status suggestions
- `GET /api/status-suggestions`
- `POST /api/status-suggestions` optional

### Rules
- endpoint list dùng cho autocomplete
- backend có thể tự upsert suggestion khi record được update status

---

## 7) UI / UX spec

## 7.1 Routes MVP
- `/login`
- `/dashboard`
- `/phone-records`
- `/imports`
- `/users`

## 7.2 Trang `/phone-records`
Đây là trang trọng tâm.

### Layout
- Sidebar trái
- Topbar trên
- Filter bar
- Data table
- Drawer chi tiết bên phải

### Cột bảng
- Số điện thoại
- Status
- Nhân viên phụ trách
- Leader/import owner (nếu cần)
- Ghi chú ngắn
- Cập nhật lần cuối
- Actions

### Hành vi
- click số điện thoại => copy
- click icon copy status => copy status
- click row => mở drawer chi tiết
- search theo `phone_last9`
- filter theo staff
- filter theo status

## 7.3 Drawer chi tiết record
### Fields
- số điện thoại chuẩn hóa
- số gốc nhập vào
- status text
- note
- nhân viên phụ trách
- người import / leader
- thời gian cập nhật

### Actions
- lưu status
- lưu note
- gán/chuyển nhân viên
- copy số
- copy status

## 7.4 Trang import
### Thành phần
- upload `.xlsx`
- hướng dẫn: “Hệ thống đọc số điện thoại từ cột A”
- chọn nhân viên nhận data
- preview kết quả import
- summary:
  - tổng dòng
  - thành công
  - trùng
  - lỗi
- bảng danh sách số trùng

## 7.5 Trang users
### Quyền truy cập
- chỉ admin

### Chức năng
- tạo leader/staff
- sửa thông tin nhân viên
- khóa/mở user
- không hiển thị chức năng tạo thêm admin

---

## 8) Quy tắc xử lý import chi tiết

## 8.1 Parse Excel
Khuyến nghị dùng thư viện đọc `.xlsx` phía server.
Ví dụ: `xlsx`.

### Luồng xử lý
1. Nhận file upload
2. Đọc workbook đầu tiên
3. Lấy sheet đầu tiên
4. Duyệt từng dòng bắt đầu từ dòng 1 hoặc bỏ qua header theo rule UI
5. Chỉ đọc giá trị ở cột A
6. Normalize
7. Validate
8. Check duplicate
9. Insert nếu hợp lệ và không trùng
10. Ghi log import

## 8.2 Header handling
MVP cần chốt 1 trong 2 cách:
- **Cách A:** file không có header, đọc từ dòng đầu tiên luôn
- **Cách B:** file có header ở dòng 1, dữ liệu bắt đầu từ dòng 2

### Khuyến nghị MVP
Dùng **Cách B**: dòng 1 là header.
Cột A có tên ví dụ: `phone` hoặc `phone_number`.
Nhưng trong code vẫn nên chỉ đọc cột A.

## 8.3 Validation rules
Một dòng bị xem là invalid nếu:
- ô cột A rỗng
- normalize xong không ra đúng 9 chữ số
- giá trị không phải số điện thoại hợp lệ theo rule normalize

## 8.4 Duplicate rules
Một dòng bị xem là duplicate nếu:
- `phone_last9` đã tồn tại trong `phone_records`

### Duplicate behavior
- skip insert
- ghi vào `import_duplicates`
- trả về trong response

---

## 9) Kỹ thuật triển khai đề xuất

## 9.1 Frontend
- Next.js App Router
- Tailwind CSS
- component UI nội bộ hoặc `shadcn/ui`
- fetch API bằng route handlers hoặc server actions tùy kiến trúc

## 9.2 Backend
- Next.js route handlers (`app/api/...`)
- validation bằng `zod`
- đọc excel bằng `xlsx`

## 9.3 Database
Khuyến nghị:
- Prisma ORM
- SQLite cho local MVP hoặc PostgreSQL nếu muốn bền hơn ngay từ đầu

### MVP practical choice
Nếu cần đi nhanh:
- Prisma + SQLite

---

## 10) Acceptance criteria

## 10.1 Import
- Import được file `.xlsx`
- Đọc đúng cột A
- Chuẩn hóa đúng về 9 số cuối
- Số trùng không được import đè
- Có danh sách số trùng sau import
- Có danh sách dòng lỗi format

## 10.2 Quản lý record
- Xem được danh sách record
- Search theo số điện thoại hoạt động đúng
- Filter theo staff/status hoạt động đúng
- Update status được
- Update note được
- Gán/chuyển staff được

## 10.3 Copy interaction
- Click copy số điện thoại hoạt động
- Click copy status hoạt động
- Có feedback `Đã copy`

## 10.4 Phân quyền
- Chỉ admin vào được trang users
- Leader import được
- Staff không import được nếu không có quyền
- Staff không xem được record không thuộc về mình

---

## 11) Rủi ro cần chú ý
- Normalize số điện thoại sai làm trùng hoặc sót trùng
- Excel làm biến dạng giá trị số
- Dữ liệu cột A chứa công thức hoặc format lạ
- Status tự do dễ bị loạn chính tả
- Permission bị chặn ở UI nhưng backend quên chặn

### Giảm rủi ro
- luôn convert cell về string trước khi normalize
- log invalid/duplicate rõ theo row
- dùng autocomplete cho status
- backend enforce permission ở mọi endpoint

---

## 12) Thứ tự triển khai đề xuất cho dev-team

### Phase 1
- setup app shell
- schema Prisma
- auth cơ bản
- users CRUD tối thiểu
- phone records CRUD/list

### Phase 2
- import `.xlsx` cột A
- normalize phone
- duplicate detection theo last9
- import summary + duplicate list

### Phase 3
- drawer chi tiết
- copy actions
- status suggestions
- polish UI

---

## 13) Quyết định đã chốt
Các quyết định dưới đây được xem là locked cho MVP:

1. Chỉ import file `.xlsx`
2. Chỉ đọc số điện thoại ở cột A
3. Chuẩn hóa về đúng 9 số cuối
4. Trùng thì giữ dữ liệu cũ, bỏ dữ liệu mới
5. Hệ thống chỉ có 1 admin duy nhất
6. Leader có quyền import và phân phối số cho nhân viên
7. Status là text linh hoạt, không enum cứng
8. UI phải hỗ trợ copy số điện thoại và status

---

## 14) Open questions nhỏ cần confirm trước khi code
1. File import có header ở dòng 1 hay không?
2. Khi leader import, có bắt buộc chọn staff ngay không?
3. Staff có được tự đổi người phụ trách không, hay chỉ leader/admin?
4. Có cần lưu lịch sử note riêng ngay MVP không, hay chỉ cần note hiện tại?
5. Có cần export ở MVP đầu tiên không, hay làm sau import?

---

## 15) Kết luận
Đây là spec kỹ thuật đủ chi tiết để dev-team bắt đầu triển khai MVP.
Nếu không có thay đổi thêm từ nghiệp vụ, team nên bám chính xác theo file này để tránh lệch scope.