# Changelog — MITs Project

---

### [2026-03-16] - Fix biểu đồ Tổng quan Team: Dual-mode BarChart

**File:** `src/components/views/TeamOverviewView.tsx`

- **Dept view (all):** BarChart trục Y = tên phòng ban, width 55px (giữ nguyên)
- **Employee view (filtered):** BarChart trục Y = tên nhân viên (`memberPerformances`), width 120px
- **Chart title:** Động: "Tiến độ nhân viên OPS hôm nay" vs "Tiến độ phòng ban hôm nay"
- **Bug 2 (0/0):** Xác nhận đúng — chưa có dữ liệu `mit_tasks` hôm nay


### [2026-03-16] - Divider + Di chuyển Chuông thông báo

**Files:** `src/components/layout/Sidebar.tsx`, `src/components/views/IdeasView.tsx`

- **Sidebar:** Xóa bell + notification code (state, fetch, dropdown, Notification interface, supabase import)
- **IdeasView header:** Thêm bell icon cạnh search bar (`p-2 rounded-full hover:bg-gray-100`)
- **Divider:** Thêm `<hr className="border-gray-200" />` giữa stat cards và grid


### [2026-03-16] - Đại tu UI/UX Kho sáng kiến theo Stitch Reference

**File:** `src/components/views/IdeasView.tsx`

- **Search bar:** Di chuyển lên header top-right, `bg-gray-100` rounded
- **Xóa Toolbar:** Bỏ nút "Thêm sáng kiến mới" dạng button nguyên khối
- **Dashed Card:** Thẻ nét đứt "Thêm sáng kiến mới" luôn ở vị trí index 0 trong Grid, `border-dashed border-blue-300 bg-blue-50/50`
- **Stat Cards:** Giữ nguyên 4 thẻ clickable filter (amber/blue/violet/emerald)
- **Giữ nguyên:** timeAgo, creator name, "Mô tả:" label, admin feedback block


### [2026-03-16] - Fix thời gian âm + hiển thị tên tác giả trên Ticket Card

**File:** `src/components/views/IdeasView.tsx`

- **Fix timeAgo:** Thêm guard `if (diff < 0) return "Vừa xong"`. Thêm phút/giờ granularity thay vì chỉ ngày
- **Creator Name:** Fetch JOIN `profiles!tickets_creator_id_fkey(full_name)`, hiển thị avatar chữ cái đầu + tên ở footer card
- **Label Mô tả:** Thêm `<span>Mô tả:</span>` trước `pain_point` text


### [2026-03-12] - Tối ưu Header Kho sáng kiến: 4 Thẻ thống kê clickable

**File:** `src/components/views/IdeasView.tsx`

- **4 Stat Cards:** Thêm thẻ "Đang xây luồng" (resolved), layout `lg:grid-cols-4`
- **Clickable Filter:** Click thẻ → lọc theo status, click lại → hủy lọc (toggle)
- **Active Highlight:** `ring-2` + `bg-slate-50` + màu ring theo status (amber/blue/violet/emerald)
- **Xóa Dropdown:** Bỏ `<select>` lọc trạng thái thừa thãi, xóa `FILTER_OPTIONS` constant
- **Giữ nguyên:** Thanh tìm kiếm, nút "Thêm sáng kiến mới", block "Phản hồi từ Admin"


### [2026-03-12] - Đồng bộ Trạng thái + Hiển thị Phản hồi Admin trên Kho sáng kiến

**File:** `src/components/views/IdeasView.tsx`

- **Đồng bộ Status:** Đổi label từ ("Đang chờ", "Đang xử lý", "Đã áp dụng", "Đã đóng") → ("Chờ tiếp nhận", "Đang phân tích", "Đang xây luồng", "Đã triển khai")
- **Filter Tabs:** Thêm option "Đã triển khai", đổi tên tất cả cho khớp Admin
- **Stat Cards:** Cập nhật 3 label tương ứng
- **Fetch:** Bổ sung `admin_feedback` vào câu select
- **UI Admin Feedback:** Thêm block `bg-gray-50 rounded-md` trên mỗi Ticket Card, chỉ hiện khi `admin_feedback` có dữ liệu


### [2026-03-12] - Mở khóa trang Quản lý Ticket cho Admin (toàn phòng ban)

**Files:** `src/components/views/AdminTicketsView.tsx`, `src/pages/DashboardPage.tsx`

- **Fetch mở toang:** Xoá `.eq("department_in_charge",...)` → lấy TẤT CẢ ticket không giới hạn
- **Realtime toàn cục:** Xoá filter department → lắng nghe mọi sự kiện INSERT/UPDATE/DELETE trên bảng `tickets`
- **Dropdown lọc phòng ban:** Thêm `<select>` UI với 11 phòng ban (BOD→BD), lọc client-side qua `filterDept`
- **Xoá guard:** Bỏ `if (!userDepartment) return <Error/>` — Admin không cần department
- **Xoá prop:** `AdminTicketsView` không còn nhận `userDepartment` prop


### [2026-03-12] - Fix Kho sáng kiến: Staff thấy 0 ticket (Nguyên nhân gốc rễ)

**Files:** `src/components/views/IdeasView.tsx`, `src/pages/DashboardPage.tsx`

- **Root cause:** `IdeasView` tự fetch `userDepartment` bằng một `useEffect` riêng → nếu Staff profile chưa có `department` → `userDepartment = null` → `fetchTickets` early-return → 0 ticket
- **Fix:** Xóa `useEffect` profile-fetch bên trong `IdeasView`. Thay bằng nhận `userId` + `userDepartment` từ `DashboardPage` qua props (DashboardPage đã load đúng và đủ rồi)
- **DashboardPage:** `<IdeasView userId={userId} userDepartment={userDepartment} />`
- **Kết quả:** Staff và Manager dùng chung `userDepartment` từ một nguồn duy nhất, không còn race condition


### [2026-03-12] - Fix Manager không thấy Ticket phòng ban + Refactor AdminTicketsView

**Files:** `src/components/views/AdminTicketsView.tsx`, `src/pages/DashboardPage.tsx`, `supabase/migrations/20260312_admin_tickets_realdata.sql` [NEW]

- **AdminTicketsView — Full Rewrite:** Xóa toàn bộ mock data (5 ticket hardcode). Thay bằng Supabase real query:
  - `fetchTickets()`: Query `tickets` JOIN `profiles` (creator info) WHERE `department_in_charge = userDepartment`
  - **Realtime subscription**: `postgres_changes` filter `department_in_charge=eq.${userDepartment}` → ticket mới nảy lên tự động
  - **handleSave()**: `supabase.from('tickets').update({ status, admin_feedback })` → lưu thật vào DB
  - Loading / Empty / Error states hoàn chỉnh
- **DashboardPage:** Truyền `userDepartment` prop vào `<AdminTicketsView>`
- **SQL Migration cần chạy:**
  - `ALTER TABLE tickets ADD COLUMN admin_feedback text`
  - RLS: DROP + CREATE SELECT policy dùng `department_in_charge` thay vì subquery `creator_id`
  - RLS: CREATE UPDATE policy cho Manager cùng `department_in_charge`

---

### [2026-03-12] - Fix Hardcode BOD khi tạo Ticket (IdeasView)

**File:** `src/components/views/IdeasView.tsx`

- **Bug:** `department_in_charge: "BOD"` bị gán cứng trong hàm `handleSubmit()` → mọi ticket đều ghi phòng BOD
- **Fix:** Thêm state `userDepartment`, query `profiles.department` khi init, thay `"BOD"` bằng `userDepartment`
- **Guard:** Chặn submit nếu `userDepartment` chưa có giá trị

---

### [2026-03-10] - Tối ưu Toolbar + Grid + Pagination + Modal — Kho sáng kiến

**File:** `src/components/views/IdeasView.tsx`

- **Stats Summary**: 3 thẻ tổng quan (Đang chờ / Đang xử lý / Đã áp dụng) với icon pastel
- **Toolbar**: Search + Dropdown filter + CTA "Thêm sáng kiến mới"
- **Grid 3×2**: Card có color accent bar, pain preview, hover effects (shadow + translateY)
- **Empty State**: Icon lớn, mô tả rõ ràng, CTA "Tạo đề xuất đầu tiên"
- **Pagination**: Trước/1/2/3/Sau, active highlight
- **Modal**: Popup căn giữa via `createPortal` (thay Side Panel), bo góc `rounded-3xl`, gradient icon header

---

### [2026-03-10] - Tối ưu Sidebar + Xây dựng Kho sáng kiến hoàn chỉnh

**Files:** `Sidebar.tsx`, `DashboardPage.tsx`, `IdeasView.tsx`

- **Sidebar**: Xóa nút CTA "⚡ Đề xuất Tối ưu" + prop `onOpenOptimization`
- **DashboardPage**: Xóa 8 optimization states, 3 handlers, modal JSX, toast JSX
- **IdeasView**: Rebuild từ mock → Supabase real data, header + "➕ Thêm đề xuất", 4-tab filter, modal form 5 trường (Tiêu đề, Nỗi đau, Thời gian lãng phí dropdown, Phần mềm, Mô tả bước thủ công)

---

### [2026-03-10] - Tái cấu trúc Nhật ký Đội nhóm — Đơn mục đích

**File:** `TeamJournalView.tsx`

- Xóa toàn bộ tab "Sáng kiến Đội nhóm": interface, state, fetch, helpers, tab bar, content
- Trang chỉ còn Lịch sử MITs: date picker + member list + 🟢🔴 indicators
- ~330 dòng → ~155 dòng

---

### [2026-03-10] - Refactor Bộ lọc Thời gian — Clean UI + Default "Hôm nay"

**File:** `src/components/views/TeamOverviewView.tsx`

- **Default "Hôm nay"**: Trang mặc định hiển thị dữ liệu ngày hiện tại thay vì 7 ngày
- **Thu gọn Header**: Xóa chùm nút 7/14/30 + date inputs → 2 dropdown (Phòng ban + Thời gian)
- **Dual Chart Mode**: "Hôm nay" → BarChart ngang (so sánh % phòng ban). Range → AreaChart xu hướng

---

### [2026-03-10] - Fix Task Completion DB Persistence

**File:** `src/pages/DashboardPage.tsx`

- **handleToggleTask**: Thêm error handling, chỉ update UI nếu DB thành công
- **handleCheckout**: Thêm batch update `mit_tasks.is_completed` trước khi tạo session

---

### [2026-03-10] - Refactor Trang Tổng quan Team (Global Filters + Metric Cards)
- **Files changed:** `src/components/views/TeamOverviewView.tsx`, `src/pages/DashboardPage.tsx`
- **Details:**
  - **Global Filters di chuyển lên Header:** Dept Dropdown (Admin: xem toàn công ty hoặc dept cụ thể) + Quick Presets (7/14/30 ngày) + Custom Date Range. Xóa filters khỏi Chart.
  - **3 Thẻ thống kê mới:**
    - 🎯 Tỉ lệ Hoàn thành MITs (% thực tế trong kỳ)
    - ⚠️ MITs Tồn đọng (số task chưa hoàn thành, text đỏ)
    - 📊 Tiêu điểm Hiệu suất (🏆 Dept dẫn đầu vs 🚩 Dept cần chú ý)
  - **Data fetch refactor:** `refreshDashboardData()` đồng bộ toàn trang — thay đổi filter → recalc 3 thẻ + redraw Chart + re-render Leaderboard.
  - **Leaderboard nâng cấp:** thêm cột Phòng ban, hiển thị tiến độ trong kỳ (period-based) thay vì chỉ hôm nay, sắp xếp theo tỉ lệ hoàn thành.

---

### [2026-03-10] - Luồng Phê duyệt Pending Approval + Màn hình Chờ
- **Files changed:** `src/components/PendingApprovalScreen.tsx` [NEW], `src/pages/DashboardPage.tsx`, `src/components/views/AdminUsersView.tsx`
- **Details:**
  - **PendingApprovalScreen (Waiting Room):** Trang full-screen cho user pending — KHÔNG Sidebar, KHÔNG Header. Card giữa màn hình với icon ⏳, tiêu đề "Tài khoản đang chờ phê duyệt", nút Đăng xuất.
  - **DashboardPage Router Guard:**
    - Fetch `status` từ `profiles` table (thêm vào query `role, department, status`).
    - Nếu `status !== 'active'` → render `PendingApprovalScreen`, KHÔNG load tasks/sessions.
    - Nếu không có profile → coi như pending.
  - **AdminUsersView Enhancements:**
    - Pending users sorted lên đầu danh sách.
    - Hàng pending highlight `bg-yellow-50/60`.
    - Nút "✅ Phê duyệt" nâng cấp thành Primary Button (bg-emerald-500, text-white, shadow).
- **Security:** User pending TUYỆT ĐỐI không thấy Sidebar, Header, hay dữ liệu nội bộ.

---

### [2026-03-10] - Trang Quản lý Ticket cho Admin (Master-Detail Layout)
- **Files changed:** `src/components/views/AdminTicketsView.tsx` [NEW], `src/components/layout/Sidebar.tsx`, `src/pages/DashboardPage.tsx`, `src/styles/layout.css`
- **Details:**
  - **AdminTicketsView:** Giao diện Admin quản lý ticket dạng Split-pane (Master-Detail 35/65):
    - **Header:** 4 stat cards mini đếm ticket theo trạng thái (Chờ tiếp nhận / Đang phân tích / Đang xây luồng / Đã triển khai). Click để filter.
    - **Cột trái (Master List):** Thanh search + icon filter, danh sách card tickets với active state (ring-2 indigo highlight). Hiện mã ticket, badge trạng thái, tiêu đề, người gửi, thời gian.
    - **Cột phải (Detail View):** Header chi tiết (mã + badge + tiêu đề), thông tin người gửi (tên + phòng ban), nội dung chính trên nền xám (pain points, thời gian lãng phí, ứng dụng liên quan) — parse từ JSON `description`.
    - **Khối Admin Actions:** Select status, textarea admin_feedback, nút "💾 Lưu thay đổi" (gradient primary button).
    - **KHÔNG dùng Modal/Popup** — toàn bộ inline.
  - **Sidebar:** Thêm "Quản lý Ticket" (icon: `confirmation_number`) vào nhóm Admin.
  - **DashboardPage:** Route `admin-tickets` → `AdminTicketsView`.
  - **layout.css:** Thêm `.master-detail-pane` (grid 35fr/65fr).
  - Mock data 5 tickets với 4 trạng thái, format JSON giống `handleOptimizationSubmit`.
- **Testing:** `npx tsc --noEmit` passed ✅

---

### [2026-03-06] - Tạo tài khoản + Duyệt nhân viên (Admin Provisioning)
- **Files changed:** `src/components/views/AdminUsersView.tsx`, `supabase/functions/create-user/index.ts` [NEW]
- **Details:**
  - **Edge Function** `create-user`: Dùng `service_role` key → `auth.admin.createUser()` → không ảnh hưởng session Admin. Có JWT verify, profile insert, rollback khi lỗi.
  - **Modal Thêm nhân viên:** Form 6 trường (Họ tên, Mã NV, Email, Mật khẩu, Phòng ban, Quyền hạn) → gọi Edge Function.
  - **Cột Trạng thái:** Badge xanh "Đang hoạt động" (active) / Badge vàng "Chờ duyệt" (pending) + nút "✅ Duyệt" auto-save.
  - **Stat cards:** Thay "Nhân viên" → "Chờ duyệt" (card thứ 4).
  - SQL cần chạy: `ALTER TABLE profiles ADD COLUMN status text DEFAULT 'active'`
- **Testing:** `npx tsc --noEmit` passed ✅

---

### [2026-03-06] - Trang Quản lý Nhân sự cho Admin
- **Files changed:** `src/components/views/AdminUsersView.tsx` [NEW], `src/components/layout/Sidebar.tsx`, `src/pages/DashboardPage.tsx`
- **Details:**
  - Tạo mới `AdminUsersView.tsx`: 4 stat cards (Tổng/Staff/Manager/Admin), search bar, data table, role dropdown auto-save, toast notifications.
  - Thêm nhóm **"Quản trị Hệ thống"** vào Sidebar (chỉ hiện khi `role === 'admin'`). Admin cũng thấy menu Manager.
  - Routing: `activeView === "admin-users"` render `AdminUsersView`.
  - SQL cần chạy: `ALTER TYPE user_role ADD VALUE 'admin'` + RLS policies cho Admin.
- **Testing:** `npx tsc --noEmit` passed ✅

---

### [2026-03-06] - Bộ lọc Ngày tự chọn + Export Excel/PDF (Team Overview)
- **Files changed:** `src/components/views/TeamOverviewView.tsx`, `package.json`
- **Packages added:** `xlsx`, `jspdf`, `jspdf-autotable`
- **Details:**
  - Thêm bộ lọc ngày: 3 preset nhanh (7/14/30 ngày) + 2 input date tùy chọn (Từ/Đến).
  - Biểu đồ tự động refetch khi thay đổi khoảng thời gian, X-axis tự điều chỉnh interval khi >14 ngày.
  - **Export Excel:** File `.xlsx` gồm 2 sheet (Xu hướng MITs + Bảng xếp hạng XP), cột có width chuẩn.
  - **Export PDF:** File `.pdf` gồm 2 bảng (Xu hướng + XP), header màu indigo.
  - Tách riêng fetch profiles (1 lần) và fetch trend data (theo ngày) để tối ưu performance.
- **Testing:** `npx tsc --noEmit` passed ✅

---

### [2026-03-06] - Biểu đồ Xu hướng MITs 7 ngày (Team Overview)
- **Files changed:** `src/components/views/TeamOverviewView.tsx`, `package.json`
- **Details:**
  - Cài thêm `recharts` để render biểu đồ đường tương tác.
  - Thêm **AreaChart** (line chart + gradient fill) vào giữa 3 Summary Cards và Bảng xếp hạng XP.
  - Fetch batch toàn bộ `mit_tasks` 7 ngày gần nhất (1 query thay vì N queries) → tính tỉ lệ hoàn thành theo ngày.
  - Đường cong mềm (`monotone`), fill gradient indigo, custom Tooltip hiện ngày + tỉ lệ + số lượng.
  - Fallback "Chưa có dữ liệu 7 ngày qua" khi không có task nào.
- **Testing:** `npx tsc --noEmit` passed ✅

---


### [2026-03-06] - Staff Dashboard Overhaul (8-Element Architecture)
- **Files changed:** `src/styles/layout.css`, `src/styles/components.css`, `src/styles/utilities.css`, `src/styles/progress.css` [NEW], `src/components/layout/Sidebar.tsx`, `src/components/layout/TopHeader.tsx`, `src/components/views/PersonalView.tsx`, `src/components/views/JourneyView.tsx` [NEW], `src/utils/chart-config.ts` [NEW], `src/pages/DashboardPage.tsx`, `src/index.css`
- **Details:**
  - Viết lại toàn bộ giao diện Dashboard dành riêng cho Staff (xóa Manager/System/Ticket views).
  - **App Shell Flexbox:** `flex h-screen overflow-hidden` → aside `flex-shrink-0 h-full` + main `flex-1 flex-col` + `.content-scroll` (scrollable). Không dùng position:fixed.
  - **Sidebar:** 4 menu Staff (Công việc / Hành trình / Kho sáng kiến / Cẩm nang), avatar popup (Cài đặt + Đăng xuất 1-click).
  - **TopHeader:** Search + 🔔 Bell + ⚡ Đề xuất Tối ưu (gradient CTA).
  - **PersonalView (Công việc):** 70/30 split-pane. Trái: MITs Oversized UI (h-16, text-base, space-y-4). Phải: Progress Ring + 🏆 Bảng Vàng + 🤖 AI + 💡 Cảm hứng mỗi ngày (5 quotes random).
  - **JourneyView (Hành trình):** 3 khối — Gamification Hero Metrics (🌟 XP / 👑 Ngày xuất sắc / 🎯 Tỷ lệ), SVG Line Chart (bezier h-56), Accordion Nhật ký (task badges xanh/đỏ).
  - **XP Scoring Logic:** +10 XP/task done, +50 bonus nếu 100%. Ghi chú trong chart-config.ts cho Supabase integration sau.
  - **CSS Module:** layout.css, components.css, utilities.css, progress.css — không inline CSS.
- **Status:** Hoàn thành

### [2026-03-06] - Tích hợp Supabase: XP Gamification + Live Data
- **Files changed:** `supabase/migrations/20260121000000_init_schema.sql`, `src/components/views/PersonalView.tsx`, `src/pages/DashboardPage.tsx`, `src/components/views/JourneyView.tsx`, `src/utils/chart-config.ts`, `src/styles/components.css`
- **Details:**
  - **SQL Migration:** ALTER TABLE `profiles` ADD `total_xp` (int4). ALTER TABLE `mit_sessions` ADD `xp_earned` (int4). RLS policies cho leaderboard read-all + sessions update.
  - **Logic 1 (Leaderboard):** `PersonalView` query `profiles` ORDER BY `total_xp` DESC LIMIT 3.
  - **Logic 2 (Checkout XP):** `DashboardPage.handleCheckout` tính XP (10/task + 50 bonus nếu 100%). Upsert `mit_sessions.xp_earned`. Increment `profiles.total_xp`. Task chưa xong → CSS `.task-card-warning`.
  - **Logic 3 (Journey Live):** `JourneyView` fetch live data từ Supabase theo tháng filter. Hero metrics, Chart, Accordion history.
  - **CSS:** Thêm `.task-card-warning` (nền đỏ nhạt, viền đỏ).
- **Status:** Hoàn thành

### [2026-03-06] - Hệ thống Thông báo (Notifications)
- **Files changed:** `supabase/migrations/20260121000000_init_schema.sql`, `src/components/layout/TopHeader.tsx`
- **Details:**
  - **SQL:** Tạo bảng `notifications` (id, user_id, title, message, is_read, created_at) + RLS (select/update own, insert all).
  - **TopHeader:** Xóa thanh Tìm kiếm. Xây dựng Dropdown chuông thông báo:
    - Badge đỏ hiện số unread (ẩn khi = 0).
    - Dropdown: top 10 thông báo, unread in đậm + chấm xanh, relative time.
    - Nút "Đánh dấu đã đọc" → update `is_read = true`.
  - Click ngoài dropdown → tự đóng.
- **Status:** Hoàn thành

### [2026-03-06] - Trang "Kho sáng kiến" (Ideas Repository)
- **Files changed:** `src/components/views/IdeasView.tsx` [NEW], `src/pages/DashboardPage.tsx`
- **Details:**
  - Tạo component `IdeasView` thay placeholder "sắp ra mắt".
  - Header: "💡 Kho sáng kiến của tôi" + sub-text.
  - Tabs: Tất cả / ⏳ Đang chờ / ✅ Đã áp dụng (filter client-side).
  - 3 Ticket Cards mock data với 3 trạng thái: Đang phân tích (vàng), Đang xây dựng (tím), Đã áp dụng (xanh lá).
  - Card anatomy: mã ticket + ngày, status badge, tiêu đề + mô tả, tags pastel, admin feedback (tùy chọn).
  - Wire vào DashboardPage thay placeholder.
- **Status:** Hoàn thành

### [2026-03-06] - Di chuyển nút "Đề xuất Tối ưu" sang Sidebar
- **Files changed:** `src/components/layout/Sidebar.tsx`, `src/components/layout/TopHeader.tsx`, `src/pages/DashboardPage.tsx`
- **Details:**
  - **TopHeader:** Xóa nút "⚡ Đề xuất Tối ưu". Chỉ còn 🔔 chuông thông báo.
  - **Sidebar:** Thêm CTA button phía trên avatar, bg-indigo-600, hover lift. Dùng `sidebar-label` → ẩn text khi sidebar thu gọn, chỉ giữ icon ⚡.
  - **DashboardPage:** Pass `onOpenOptimization` prop xuống Sidebar.
- **Status:** Hoàn thành

### [2026-03-06] - Xóa Top Header, Bell → Sidebar
- **Files changed:** `src/components/layout/Sidebar.tsx`, `src/pages/DashboardPage.tsx`, `src/styles/layout.css`
- **Details:**
  - **TopHeader:** Xóa hoàn toàn `<TopHeader>` component khỏi DashboardPage. Xóa `.top-header` CSS.
  - **Sidebar:** Merge toàn bộ notification logic (state, fetch unread, dropdown, mark-read) từ TopHeader vào Sidebar.
  - 🔔 Bell icon đặt cạnh Avatar (flex row justify-between). Dropdown xổ sang phải (`left-full bottom-0 ml-3`).
  - **Main content:** Giờ chiếm full height, thêm `pt-8` padding top thay cho TopHeader.
- **Status:** Hoàn thành

### [2026-03-06] - Sidebar Manager + RLS phân quyền phòng ban
- **Files changed:** `src/components/layout/Sidebar.tsx`, `src/pages/DashboardPage.tsx`, `supabase/migrations/20260121000000_init_schema.sql`
- **Files added:** `src/components/views/TeamOverviewView.tsx`, `src/components/views/TeamJournalView.tsx`
- **Details:**
  - **Sidebar UI:** 3 nhóm menu (CÁ NHÂN / QUẢN LÝ TEAM / HỆ THỐNG). Nhóm QUẢN LÝ TEAM chỉ hiện khi `role = manager/executive`.
  - **TeamOverviewView:** Dashboard realtime — danh sách NV cùng phòng ban + tỉ lệ MITs hôm nay (progress bar) + XP leaderboard.
  - **TeamJournalView:** 2 tabs:
    - Tab 1 "Lịch sử MITs": Date picker + danh sách MITs mỗi NV, 🟢 = xong, 🔴 = miss.
    - Tab 2 "Sáng kiến Đội nhóm": Tickets read-only (KHÔNG có nút Duyệt/Từ chối).
  - **RLS Policies:** 4 policies mới (profiles, mit_tasks, mit_sessions, tickets) — Manager SELECT cùng `department`. Tickets chỉ SELECT, KHÔNG UPDATE/DELETE.
  - **DashboardPage:** Fetch `role` + `department` từ profiles, truyền xuống Sidebar + views.
- **Status:** Hoàn thành

### [2026-03-06] - Redesign Settings theo Stitch (Minimalist Tabbed Settings V3)
- **Files changed:** `src/components/views/SettingsView.tsx`
- **Stitch screen ref:** `054a7627732e4cbda06d40ec9feb1061` (Setting Staff)
- **Details:**
  - **Layout đổi:** Horizontal tab bar (không dùng left sidebar navigation nữa).
  - **Tab Hồ sơ:** 2-column layout — Avatar picker (6-col grid + large preview + "Đang chọn") bên trái, Profile Preview card (TOP 5 badge, XP/Huy hiệu stats) bên phải. Identity grid 2×2 read-only full-width ở dưới.
  - Tab icons: `person_outline`, `shield_moon`, `notifications_active`.
  - Tab Bảo mật: CTA gradient + login history.
  - Tab Thông báo: toggle switches.
- **Status:** Hoàn thành

### [2026-03-06] - Cập nhật Form Đăng ký + SQL Trigger tự tạo Profile
- **Files changed:** `src/pages/RegisterPage.tsx`, `supabase/migrations/20260121000000_init_schema.sql`
- **Details:**
  - **SQL Trigger:** Tạo `handle_new_user()` + trigger `on_auth_user_created` — tự động INSERT `profiles` từ `raw_user_meta_data` khi auth user mới được tạo (`SECURITY DEFINER`).
  - **RegisterPage:** Thêm ô "Mã nhân viên" (format cố định `TMxxxx`, regex validate). Truyền `full_name`, `employee_code`, `department` vào `signUp({ options.data })`. **Xóa** block `profiles.insert()` thủ công (fix lỗi RLS).
  - Thứ tự form: Email → Họ tên → Mã NV → Phòng ban → Mật khẩu.
- **Status:** Hoàn thành

### [2026-03-06] - Trang Cài đặt tài khoản (Full-page Settings)
- **Files changed:** `src/components/views/SettingsView.tsx` [NEW], `src/components/layout/Sidebar.tsx`, `src/pages/DashboardPage.tsx`
- **Details:**
  - **SettingsView:** Trang full-page 2 cột (sub-nav 1/4 + content 3/4):
    - Tab "Hồ sơ": Avatar emoji picker 8x3 + save, identity read-only 2x2 grid (tên, mã NV, phòng, email).
    - Tab "Bảo mật": Nút navigate `/change-password` + mock login history (3 entries).
    - Tab "Thông báo": Toggle switches (Email, Daily reminder, Weekly report).
  - **Sidebar:** Thêm ⚙️ "Cài đặt" vào menu chính. Popup "Cài đặt tài khoản" giờ chuyển view thay vì navigate.
  - **DashboardPage:** Import + render `<SettingsView />` khi `activeView === "settings"`.
- **Status:** Hoàn thành

---

### [2026-03-05] - Tích hợp Supabase cho Modal Đề xuất Tối ưu
- **Files changed:** `src/components/DashboardLayout.tsx`
- **Details:**
  - Thêm form state management (processName, painPoints, timeWasted, softwareUsed, workflowDesc).
  - Logic `handleOptimizationSubmit`: insert vào bảng `tickets` (status=open, department=BOD, ticket_code=OPT-YYYYMMDD-XXXX).
  - Pain points chips có toggle selection (highlight khi chọn).
  - Metadata (pain_points, time_wasted, software) lưu dạng JSON trong cột `description`.
  - Loading spinner trên nút submit, Success Toast sau khi gửi, tự động đóng modal.
  - Error handling: catch lỗi insert + thông báo user.
- **Status:** Hoàn thành

### [2026-03-05] - Post-Checkout Lock + Đề xuất Tối ưu (Stitch Design)
- **Files changed:** `src/components/DashboardLayout.tsx`, `src/components/CheckoutSuccess.tsx`, `src/components/HistoryModal.tsx`, `src/pages/DashboardPage.tsx`
- **Details:**
  - Khóa toàn bộ quyền chỉnh sửa MITs (task cards + checkbox + checkout button) ngay sau khi bấm Check-out.
  - Sau checkout, dashboard hiển thị ở trạng thái đóng băng (locked): task hiện rõ nhưng không thao tác được.
  - Nút Checkout đổi thành "✓ Đã Check-out" (disabled, green styling).
  - Chỉ "Phân tích AI" và "Đề xuất Tối ưu" vẫn tương tác được.
  - Xóa nút bút chì (Sửa lại) trong HistoryModal — không cho phép chỉnh sửa sau checkout.
  - Thêm nút "Quay lại giao diện" trong CheckoutSuccess để quay về dashboard (ở trạng thái locked).
  - Thêm nút "⚡ Đề xuất Tối ưu" trong header + modal form matching Stitch design.
  - Khi reload trang, nếu đã checkout hôm nay → hiển thị locked dashboard (không phải CheckoutSuccess).
- **Status:** Hoàn thành

### [2026-03-03] - Khởi tạo Memory Bank
- **Files changed:** `memory-bank/projectbrief.md`, `memory-bank/productContext.md`, `memory-bank/systemPatterns.md`, `memory-bank/changelog.md`
- **Details:** Tạo hệ thống Memory Bank theo megaprompt. Ghi nhận toàn bộ tech stack, business rules, patterns, và cấu trúc hiện tại của dự án.
- **Status:** Hoàn thành

### [2026-03-03] - Thay giao diện Dashboard bằng Stitch Design
- **Files changed:** `src/components/DashboardLayout.tsx`, `src/index.css`
- **Details:** Viết lại DashboardLayout theo design Stitch glassmorphism split-pane: task list bên trái (glassmorphism cards), SVG donut chart + performance bar bên phải. Thêm CSS utilities: glass-panel, glass-card, mesh-gradient-light.
- **Status:** Hoàn thành

### [2026-03-03] - Thay giao diện Đổi mật khẩu bằng Stitch Design
- **Files changed:** `src/pages/ChangePasswordPage.tsx`
- **Details:** Viết lại ChangePasswordPage theo design Stitch "MIT Change MK": glassmorphism card, decorative blur orbs, password strength indicator 4-level, gradient submit button.
- **Status:** Hoàn thành

### [2026-03-03] - Fix lỗi Foreign Key khi submit tasks
- **Files changed:** `src/pages/DashboardPage.tsx`
- **Details:** Thêm logic auto-create profile khi user vào Dashboard nếu chưa có profile trong DB. Fix lỗi `mit_tasks_user_id_fkey` violation. Thêm debug logging cho handleTasksSubmit.
- **Status:** Hoàn thành

### [2026-02-26] - Chuyển sang Supabase account mới
- **Files changed:** `.env`, `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `supabase/migrations/20260121000000_init_schema.sql`, `src/pages/RegisterPage.tsx`
- **Details:** Cập nhật URL/key Supabase, đồng bộ schema (enums, tickets table, RLS policies), fix email confirmation, debug auth flow.
- **Status:** Hoàn thành
