# MIT Daily

**Single Source of Truth**

## Project Overview
**Purpose**: A daily work management app for employees to select 3-5 focus tasks, track generic progress, and checkout at the end of the day.
**Goals**: Ship V1 self-signup web app on Vercel with Supabase Auth/DB.
**Non-goals (V1)**: No SSO, no Base.vn sync, no advanced BI, no server-side logic.

## Architecture & Decisions (LOCKED)
- **Stack**: Vite + React 18 + TypeScript + TailwindCSS + shadcn/ui.
- **Routing**: `react-router-dom` v6 (`BrowserRouter`).
- **Backend**: Supabase (Auth + DB) via Client SDK.
- **Auth**:
  - `employee_code` + password.
  - Email mapping: `${code}@thaimaucompany.com`.
  - Profiles table: `{ id, email, employee_code, full_name }`.
- **State**: React Hooks + React Query.
- **Deploy**: Vercel.

## Folder Conventions
- `src/pages`: Route-level views.
- `src/components`: Reusable UI.
- `src/lib`: Logic helpers (`auth.ts`).
- `src/integrations/supabase`: Client singleton & types.

## Session Log

### Session 2: Auth & Database (2026-01-21)
- **Database**: Created `profiles`, `mit_tasks`, `mit_sessions` tables with RLS policies.
- **Auth**: Implemented Login and Register pages using `react-hook-form`, `zod`, and Supabase Auth.
- **Security**: Added `AuthGuard` to protect `/app` route.
- **Assets**: Added `src/assets/logo.png` and integrated into Auth pages.
- **Next Steps**:
  - Run `npm install` to fix missing dependencies.
  - Test Auth flow (Sign Up -> Redirect -> Create Profile).
  - Begin implementing Dashboard UI (Task Selection).

### Session 1: Project Initialization (2026-01-21)
- Scaffolded project with Vite + React + TS.
- Set up TailwindCSS + Shadcn/UI structure.
- Defined locked architecture (Supabase, Vercel, Employee Code Auth). Pages, Dashboard Placeholder).
  - Created 16 core files including `vite.config.ts`, `auth.ts`, `supabase/client.ts`.
- **Next Steps**:
  - Implement Auth Logic (Connect Register/Login forms to Supabase).
  - Implement Daily Task List UI.
