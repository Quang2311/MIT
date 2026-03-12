-- ============================================================
-- MIGRATION: RLS cho Admin xem TẤT CẢ ticket (2026-03-12)
-- Chạy toàn bộ file này trên Supabase SQL Editor
-- ============================================================

-- ========================
-- BƯỚC 1: Thêm 'admin' vào enum user_role (nếu chưa có)
-- ========================
-- Kiểm tra: nếu tài khoản Admin đang dùng role = 'admin' nhưng
-- enum user_role chỉ có ('member','manager','executive'),
-- cần bổ sung giá trị 'admin' vào enum:
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'admin' AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'admin';
  END IF;
END $$;

-- ========================
-- BƯỚC 2: Policy cho Admin SELECT toàn bộ tickets
-- ========================
DROP POLICY IF EXISTS "Admin can view all tickets" ON public.tickets;
CREATE POLICY "Admin can view all tickets" ON public.tickets
  FOR SELECT USING (
    public.get_my_role() IN ('admin', 'executive')
  );

-- ========================
-- BƯỚC 3: Policy cho Admin UPDATE toàn bộ tickets
-- ========================
DROP POLICY IF EXISTS "Admin can update all tickets" ON public.tickets;
CREATE POLICY "Admin can update all tickets" ON public.tickets
  FOR UPDATE USING (
    public.get_my_role() IN ('admin', 'executive')
  );

-- ========================
-- BƯỚC 4 (NẾU CẦN): Cập nhật role cho tài khoản Admin
-- ========================
-- Nếu tài khoản Admin hiện tại có role = 'executive',
-- và bạn muốn đổi sang 'admin', chạy dòng này:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'admin@example.com';
--
-- Hoặc nếu muốn giữ 'executive' thì không cần làm gì —
-- policy trên đã bao gồm 'executive'.
