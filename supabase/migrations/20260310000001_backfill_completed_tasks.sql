-- ============================================================
-- FIX DATA: Đồng bộ mit_tasks.is_completed từ mit_sessions
-- Các session đã checkout nhưng tasks vẫn is_completed = FALSE
-- ============================================================

-- Nếu user đã có session (checkout_at IS NOT NULL) cho ngày hôm đó,
-- thì TẤT CẢ tasks của user trong ngày đó nên là is_completed = TRUE
-- (vì UI cũ chỉ update local state, không update DB)

UPDATE public.mit_tasks t
SET is_completed = TRUE,
    completed_at = s.checkout_at
FROM public.mit_sessions s
WHERE t.user_id = s.user_id
  AND t.session_date = s.session_date
  AND s.checkout_at IS NOT NULL
  AND t.is_completed = FALSE;
