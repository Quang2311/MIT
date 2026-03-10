-- ============================================================
-- FIX HOÀN CHỈNH: Trigger handle_new_user (Bulletproof version)
-- Chạy TOÀN BỘ đoạn SQL này trên Supabase Dashboard → SQL Editor
-- ============================================================

-- Bước 1: Xóa profile "mồ côi" từ các lần test bị lỗi (nếu có)
-- (Profile tồn tại nhưng không có auth user tương ứng)
DELETE FROM public.profiles
WHERE id NOT IN (SELECT id FROM auth.users);

-- Bước 2: Trigger BULLETPROOF — KHÔNG BAO GIỜ crash auth signup
-- Nếu INSERT profile thất bại (duplicate employee_code, etc.),
-- trigger vẫn RETURN NEW → auth user vẫn được tạo.
-- Frontend sẽ tự upsert profile sau.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, employee_code, department)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data ->> 'full_name',
    COALESCE(NEW.raw_user_meta_data ->> 'employee_code', UPPER(SPLIT_PART(NEW.email, '@', 1))),
    (NEW.raw_user_meta_data ->> 'department')::department_code
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    employee_code = EXCLUDED.employee_code,
    department = EXCLUDED.department;
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Ghi log lỗi nhưng KHÔNG crash signup
  RAISE LOG 'handle_new_user error for %: % [%]', NEW.email, SQLERRM, SQLSTATE;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bước 3: Đảm bảo status default = pending
ALTER TABLE public.profiles ALTER COLUMN status SET DEFAULT 'pending';
