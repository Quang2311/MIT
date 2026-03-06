# System Patterns — Tech Stack & Code Conventions

## Tech Stack
- React 18 + TypeScript + Vite 5
- Tailwind CSS 3 (with custom glassmorphism utilities)
- Supabase: Auth, PostgreSQL, RLS, Realtime
- State: React hooks + @tanstack/react-query
- Forms: react-hook-form + zod
- Icons: lucide-react + Material Symbols Outlined
- Charts: recharts (to be added for Manager Dashboard)

## Directory Structure
```
src/
├── App.tsx                    # Router (login, register, /app, /change-password)
├── main.tsx
├── index.css                  # Tailwind + glassmorphism utilities
├── assets/                    # Logo, images
├── components/                # Shared UI components
│   ├── AuthGuard.tsx          # Session check + redirect
│   ├── TaskInputModal.tsx     # MIT input (3–5 tasks)
│   ├── DashboardLayout.tsx    # Main dashboard (split-pane glassmorphism)
│   ├── CheckoutSuccess.tsx    # Post-checkout summary
│   ├── HistoryModal.tsx       # Session history viewer
│   └── AIAnalysisModal.tsx    # AI feedback modal
├── pages/
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx      # State machine: loading → input → dashboard → checkout
│   └── ChangePasswordPage.tsx
├── integrations/supabase/
│   ├── client.ts              # createClient init
│   └── types.ts               # Database types (auto-generated style)
└── lib/
    └── utils.ts               # clsx/tailwind-merge helper
```

## Database Schema (current)
- `profiles` — user info linked to auth.users (id, employee_code, full_name, email, role, department)
- `mit_tasks` — daily tasks (user_id, session_date, title, is_completed, completed_at)
- `mit_sessions` — checkout records (user_id, session_date, checkout_at, total_tasks, completed_tasks, completion_rate)
- `tickets` — FAST issue system (separate feature)

## Naming Conventions
- Components: PascalCase, exported as named exports
- Pages: PascalCase, default export
- Files: PascalCase for components, camelCase for utilities
- DB columns: snake_case
- TypeScript types: PascalCase

## RLS Pattern
- All tables have RLS enabled
- Default policy: `auth.uid() = user_id` (or `id` for profiles)
- Manager policies: need to add cross-user read for same department/team
