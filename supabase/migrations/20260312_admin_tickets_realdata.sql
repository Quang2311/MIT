-- ============================================================
-- MIGRATION: AdminTicketsView — Real Supabase Data (2026-03-12)
-- ============================================================

-- 1. Thêm cột admin_feedback cho bảng tickets
ALTER TABLE public.tickets
  ADD COLUMN IF NOT EXISTS admin_feedback text DEFAULT '';

-- 2. Sửa RLS: Manager SELECT tickets theo department_in_charge (thay vì chỉ creator_id department)
-- Drop policy cũ nếu tồn tại
DROP POLICY IF EXISTS "Managers can view department tickets" ON public.tickets;

-- Tạo policy mới: Manager được SELECT tickets có department_in_charge = department của mình
CREATE POLICY "Managers can view department tickets" ON public.tickets
  FOR SELECT USING (
    public.get_my_role() IN ('manager', 'executive')
    AND public.get_my_department() = department_in_charge
  );

-- 3. Thêm RLS: Manager UPDATE tickets cùng phòng ban (để cập nhật status + admin_feedback)
CREATE POLICY "Managers can update department tickets" ON public.tickets
  FOR UPDATE USING (
    public.get_my_role() IN ('manager', 'executive')
    AND public.get_my_department() = department_in_charge
  );
