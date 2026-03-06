# MITs — Most Important Tasks

## Mục tiêu dự án
Ứng dụng Web nội bộ giúp quản lý công việc quan trọng nhất hàng ngày (MITs) của toàn bộ nhân sự trong tổ chức — từ Staff, Manager, đến Admin/BOD.

## Đối tượng người dùng
| Role | Quyền hạn |
|------|-----------|
| **Staff** | Điền 3–5 MITs mỗi ngày, đánh dấu hoàn thành, Checkout cuối ngày |
| **Manager** | Như Staff + xem/quản lý task của toàn team (Manager Dashboard real-time) |
| **Admin** | Như Manager + quản trị users, phân quyền, xem toàn bộ phòng ban |

## Phòng ban
BOD, HR, OPS, MKT, ACC, CX, QAQC, R&D, SP, BD

## Tech Stack
- **Frontend:** React 18, Vite 5, TypeScript, Tailwind CSS 3
- **Backend/DB:** Supabase (Auth, PostgreSQL, Realtime, RLS)
- **Libraries:** react-hook-form, zod, lucide-react, @tanstack/react-query, date-fns
- **Deployment:** Vercel

## Tính năng cốt lõi
1. Đăng nhập / Đăng ký (Email + Supabase Auth)
2. Nhập MITs hàng ngày (3–5 task)
3. Dashboard cá nhân: theo dõi, toggle hoàn thành, checkout
4. Manager View: 3 summary cards + Line chart + real-time + chi tiết từng nhân viên
5. Checkout Rule: task chưa hoàn thành chuyển sang `INCOMPLETE_AT_CHECKOUT` (hiển thị đỏ)
6. Lịch sử phiên làm việc, AI phân tích
7. Đổi mật khẩu
