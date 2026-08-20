# Xếp TKB UIT

## Giới thiệu
Xếp TKB UIT là web application hỗ trợ sinh viên UIT upload dữ liệu thời khóa biểu từ file Excel Kế hoạch giảng dạy, lựa chọn lớp học phần, tự động kiểm tra xung đột lịch học và trực quan hóa thời khóa biểu một cách chính xác.

## Demo
- Frontend (Vercel): https://xep-tkb-uit-tau.vercel.app
- Backend (Render): https://xeptkbuit.onrender.com

## Tính năng

### Excel Import
- Upload file Excel
- Detect format
- Detect header
- Normalize dữ liệu
- Parse môn học và lớp học
- Parse lịch học

### Dữ liệu môn học
- Mã môn học
- Tên môn học
- Số tín chỉ
- Mã lớp
- Giảng viên
- Phòng học
- Thứ
- Tiết
- Cách tuần
- Ngày bắt đầu
- Ngày kết thúc

### Hình thức giảng dạy
- LT
- HT1
- HT2
- ĐA
- KLTN
- TTTN

### Quan hệ LT ↔ TH
Trường dữ liệu `MA LOP LT` (hoặc `MA_LOP_LT`) được sử dụng làm quan hệ chính thức để xác định một lớp Thực hành (TH) thuộc lớp Lý thuyết (LT) nào.
Ví dụ:
Lớp `CE118.R11.1` và `CE118.R11.2` sẽ tham chiếu trực tiếp đến lớp LT cha là `CE118.R11` thông qua dữ liệu ở cột `MA LOP LT`.
Hệ thống KHÔNG cắt chuỗi (suffix `.1`, `.2`) để suy luận quan hệ, nhằm đảm bảo tính toàn vẹn của dữ liệu gốc.

### Xếp thời khóa biểu
- Chọn lớp
- Thay lớp
- Kiểm tra trùng lịch
- Hiển thị TKB
- Hiển thị tiết 1–10 (Main Grid)
- Hiển thị tiết >10 ở khu vực Ngoài giờ
- HT2 không có lịch cố định hiển thị ở Ngoài giờ
- Hiển thị giáo viên
- Hiển thị phòng
- Hiển thị tín chỉ

### Quản lý TKB
- Hoàn tác
- Xóa toàn bộ
- Xuất ảnh
- Lưu TKB
- Mở TKB
- Xóa TKB

## Excel Data Pipeline

Excel
↓
Detect Format
↓
Detect Header
↓
Column Mapping
↓
Normalize
↓
Parse
↓
Course / Offering / ClassOption / Session
↓
PostgreSQL
↓
REST API
↓
React UI

## Các trường Excel quan trọng
- MAMH
- MALOP
- TENMH
- MAGV
- TENGV (Hỗ trợ cả CBGD, Trợ giảng)
- SOTC (Hỗ trợ cả TC, Số TC)
- HTGD
- THU
- TIET
- CACHTUAN
- PHONGHOC
- NBD
- NKT
- MA LOP LT

## Quy tắc bóc tách tiết
Hệ thống xử lý chuẩn xác định dạng tiết học nén (Compact Notation) của UIT, bóc tách thành các mảng tiết học tăng liên tiếp:
- `123` → `[1,2,3]`
- `12345` → `[1,2,3,4,5]`
- `67890` → `[6,7,8,9,10]` (Số `0` đứng sau `9` đại diện cho tiết `10`)
- `90` → `[9,10]`
- `121314` → `[12,13,14]`
- `11121314` → `[11,12,13,14]`

Các tiết có giá trị > 10 (ví dụ: 11, 12, 13, 14, 15) vẫn được giữ nguyên vẹn trong Database/API và được Frontend tự động tách để hiển thị riêng tại khu vực Ngoài giờ.

## HT2 không có lịch
Nếu các lớp HT2 (hoặc Đồ án, Khóa luận) không có dữ liệu THỨ và TIẾT trong Excel:
- Hệ thống không xóa dữ liệu.
- Vẫn giữ nguyên `ClassOption` trong Database.
- Thuộc tính `sessions` rỗng (không có lịch cố định) và `hasSchedule = false`.
- Hiển thị trực quan ở khu vực Ngoài giờ với nhãn "Chưa có tiết cố định".

## Conflict Engine
Logic kiểm tra xung đột thời khóa biểu hoạt động dựa trên các nguyên tắc thực tế:
- Cùng mã môn + cùng type: Bị chặn (Ví dụ: Không thể chọn 2 lớp LT của cùng 1 môn).
- Trùng ngày + Trùng/giao nhau tiết học: Bị chặn.
- Trùng ngày + Khác tiết học: Hợp lệ.
- Week pattern / week phase: Xử lý cách tuần (Tuần A + Tuần B hợp lệ; Tuần A + Tuần A bị chặn).
- LT / TH compatibility: Yêu cầu phải chọn lớp LT trước khi chọn lớp TH tương ứng.

## Tech Stack

### Frontend
- React
- Vite
- TailwindCSS
- Axios
- Socket.IO-client

### Backend
- Node.js
- Express
- Socket.IO

### Database
- PostgreSQL
- Prisma ORM

### Excel
- xlsx (SheetJS)
- multer

### Deployment
- Frontend: Vercel
- Backend & Database: Render

## Architecture

React Frontend
↓
Axios / Socket.IO
↓
Node.js + Express
↓
Excel Parser
Conflict Engine
Schedule Services
↓
Prisma ORM
↓
PostgreSQL

## Project Structure

Xếp TKB UIT/
├── client/
│   ├── src/
│   │   ├── api/
│   │   ├── components/
│   │   ├── constants/
│   │   ├── hooks/
│   │   ├── services/
│   │   └── App.jsx
│   ├── package.json
│   └── vite.config.js
├── server/
│   ├── prisma/
│   │   └── schema.prisma
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   └── services/
│   ├── tests/
│   ├── package.json
│   └── index.js
├── README.md
└── .gitignore

## Database
Các Model chính được định nghĩa trong `prisma/schema.prisma` và quan hệ của chúng (Kiến trúc Import Isolation):
- `Import`: Lưu trữ phiên bản file Excel tải lên.
- `Course`: Thông tin gốc của môn học (thuộc về 1 Import).
- `Offering`: Phân nhóm môn học theo HTGD (LT, HT1, HT2...).
- `ClassOption`: Lớp học cụ thể mang mã lớp, giảng viên, mã LT cha.
- `Session`: Thời gian, địa điểm học của một ClassOption.
- `Schedule`: Bản lưu cấu hình TKB của người dùng (gắn với Import ID).
- `ScheduleSelection`: Danh sách các ClassOption đã được chọn trong một Schedule.

## API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Kiểm tra trạng thái hoạt động của Server và Database |
| POST | `/api/import/xlsx` | Upload file Excel, bóc tách dữ liệu và lưu trữ |
| GET | `/api/courses` | Truy xuất danh sách môn học, lớp và session theo importId |
| POST | `/api/schedules/validate` | Xác thực xung đột lịch học của danh sách lớp hiện tại |
| POST | `/api/schedules` | Lưu cấu hình thời khóa biểu mới |
| GET | `/api/schedules/:id` | Mở và khôi phục thời khóa biểu đã lưu theo ID |

## Local Development

Yêu cầu môi trường: Node.js và PostgreSQL.

Clone repository và cài đặt Backend:
    
    git clone <repository-url>
    cd "Xếp TKB UIT"
    cd server
    npm install

Cài đặt Frontend:

    cd ../client
    npm install

## Environment Variables

Tạo file `.env` cho `server`:
    
    DATABASE_URL="postgresql://user:password@localhost:5432/xeptkbuit?schema=public"
    PORT=10000

Tạo file `.env` cho `client`:

    VITE_API_URL="http://localhost:10000"

## Database Setup

Tại thư mục `server`, chạy lệnh để đồng bộ cấu trúc Database:

    npx prisma generate
    npx prisma db push

## Chạy Local

Khởi chạy Backend (Terminal 1):

    cd server
    npm start

Khởi chạy Frontend (Terminal 2):

    cd client
    npm run dev

## Testing
Dự án có tích hợp Unit Test cho Parser Engine (sử dụng Jest). 
Các cases kiểm tra bóc tách tiết học Compact Notation:
- `123` → `[1,2,3]`
- `67890` → `[6,7,8,9,10]`
- `90` → `[9,10]`
- `11121314` → `[11,12,13,14]`

Lệnh chạy test tại thư mục `server`:

    npm test

## Screenshot
TODO: Add screenshots.

## Known Limitations
- Hệ thống hỗ trợ xếp lịch thủ công (kéo/chọn lớp), chưa hỗ trợ tính năng tự động tạo lịch tối ưu (Auto-Schedule).
- Chưa tích hợp hệ thống Authentication (Đăng nhập/Đăng ký tài khoản). TKB được lưu trữ dựa trên ID định danh chia sẻ.
- Thuật toán Parser được tinh chỉnh tối ưu dành riêng cho định dạng dữ liệu Kế hoạch giảng dạy của UIT.

## Roadmap
- Planned: Tích hợp hệ thống tài khoản cá nhân.
- Planned: Hỗ trợ tự động gợi ý lịch học tối ưu.

## License
License: Not specified.

## Author
Project developed as a student software project.