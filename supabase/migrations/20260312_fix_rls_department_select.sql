-- ============================================================
-- MIGRATION: Fix Staff không thấy Ticket phòng ban (2026-03-12)
-- Chạy toàn bộ file này trên Supabase SQL Editor
-- ============================================================

-- 1. Thêm cột admin_feedback (nếu chưa có)
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS admin_feedback text DEFAULT '';

-- 2. Policy cho tất cả user: SELECT ticket của phòng ban mình
-- (Staff/member cũng được xem toàn bộ ticket cùng phòng)
DROP POLICY IF EXISTS "Members can view department tickets" ON public.tickets;
CREATE POLICY "Members can view department tickets" ON public.tickets
  FOR SELECT USING (
    public.get_my_department() = department_in_charge
  );

-- 3. Giữ lại policy cũ tự xem ticket của mình (creator/assignee)
-- (đã tồn tại từ đầu, không cần tạo lại)

-- 4. Policy Manager UPDATE ticket cùng phòng (để ghi status + admin_feedback)
DROP POLICY IF EXISTS "Managers can update department tickets" ON public.tickets;
CREATE POLICY "Managers can update department tickets" ON public.tickets
  FOR UPDATE USING (
    public.get_my_role() IN ('manager', 'executive')
    AND public.get_my_department() = department_in_charge
  );
