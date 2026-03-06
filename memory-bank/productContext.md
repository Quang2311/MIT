# Product Context — Business Rules

## Rule 1: Manager Dashboard (Real-time)
- Giao diện Manager View có **3 thẻ Summary Cards:**
  1. **Nhân viên đã check out** — số lượng / tổng nhân viên trong team
  2. **Hiệu suất trung bình** — % trung bình completion_rate của team hôm nay
  3. **Task hoàn thành** — tổng task completed / tổng task toàn team
- Toàn bộ dữ liệu phải cập nhật **REAL-TIME** (Supabase Realtime subscriptions)
- Biểu đồ chính: **Line chart** với element tương tác — click để xem chi tiết từng nhân viên

## Rule 2: Checkout Rule — Task Status Logic
- Khi nhân viên bấm **Checkout**, tất cả task **CHƯA** hoàn thành (`is_completed = false`) phải:
  1. Được đánh dấu trạng thái `INCOMPLETE_AT_CHECKOUT` trong DB (cột `status`)
  2. Hiển thị UI **đỏ cảnh báo** để phân biệt rõ ràng

## Rule 3: Manager & Admin cũng phải điền task
- Manager/Admin **BẮT BUỘC** phải điền task cá nhân mỗi ngày như Staff
- Họ có thêm tính năng **Manager View** (toggle giữa "Cá nhân" và "Team")

## Rule 4: Phân quyền
| Role | Xem task cá nhân | Điền task | Manager View | Admin Panel |
|------|:-:|:-:|:-:|:-:|
| Staff | ✅ | ✅ | ❌ | ❌ |
| Manager | ✅ | ✅ | ✅ (team) | ❌ |
| Admin | ✅ | ✅ | ✅ (all) | ✅ |
