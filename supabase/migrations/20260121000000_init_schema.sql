-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ENUM TYPES
create type user_role as enum ('member', 'manager', 'executive');
create type department_code as enum ('BOD', 'HR', 'OPS', 'MKT', 'ACC', 'CX', 'QAQC', 'R&D', 'SP', 'BD');
create type ticket_status as enum ('open', 'in_progress', 'resolved', 'closed');
create type ticket_priority as enum ('low', 'medium', 'high', 'urgent');

-- PROFILES TABLE
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  employee_code text not null unique,
  full_name text,
  email text,
  role user_role default 'member',
  department department_code,
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- MIT TASKS TABLE
create table public.mit_tasks (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_date date not null,
  title text not null,
  is_completed boolean default false,
  completed_at timestamptz,
  created_at timestamptz default now()
);

alter table public.mit_tasks enable row level security;

create policy "Users can view own tasks" on public.mit_tasks
  for select using (auth.uid() = user_id);

create policy "Users can insert own tasks" on public.mit_tasks
  for insert with check (auth.uid() = user_id);

create policy "Users can update own tasks" on public.mit_tasks
  for update using (auth.uid() = user_id);

create policy "Users can delete own tasks" on public.mit_tasks
  for delete using (auth.uid() = user_id);

-- MIT SESSIONS TABLE (Daily Checkout history)
create table public.mit_sessions (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  session_date date not null,
  checkout_at timestamptz default now(),
  total_tasks int default 0,
  completed_tasks int default 0,
  completion_rate numeric default 0,
  created_at timestamptz default now()
);

alter table public.mit_sessions enable row level security;

create policy "Users can view own sessions" on public.mit_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert own sessions" on public.mit_sessions
  for insert with check (auth.uid() = user_id);

-- TICKETS TABLE (FAST Issue system)
create table public.tickets (
  id uuid default uuid_generate_v4() primary key,
  ticket_code text unique,
  creator_id uuid references public.profiles(id) not null,
  assignee_id uuid references public.profiles(id),
  department_in_charge department_code not null,
  title text not null,
  description text,
  status ticket_status default 'open',
  priority ticket_priority default 'medium',
  due_date timestamptz,
  resolved_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.tickets enable row level security;

create policy "Users can view own tickets" on public.tickets
  for select using (auth.uid() = creator_id or auth.uid() = assignee_id);

create policy "Users can create tickets" on public.tickets
  for insert with check (auth.uid() = creator_id);

create policy "Users can update own tickets" on public.tickets
  for update using (auth.uid() = creator_id or auth.uid() = assignee_id);

-- ============================================================
-- XP GAMIFICATION (Added 2026-03-06)
-- ============================================================

-- Add XP columns
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_xp INT4 DEFAULT 0;
ALTER TABLE public.mit_sessions ADD COLUMN IF NOT EXISTS xp_earned INT4 DEFAULT 0;

-- Allow all authenticated users to read profiles (for leaderboard)
CREATE POLICY "All authenticated users can view profiles" ON public.profiles
  FOR SELECT USING (auth.role() = 'authenticated');

-- Allow users to update their own sessions (for XP upsert)
CREATE POLICY "Users can update own sessions" ON public.mit_sessions
  FOR UPDATE USING (auth.uid() = user_id);

-- ============================================================
-- NOTIFICATIONS TABLE (Added 2026-03-06)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- ============================================================
-- AUTO-CREATE PROFILE TRIGGER (Added 2026-03-06)
-- When a new user signs up via Supabase Auth, automatically
-- insert their profile into public.profiles using metadata
-- passed from signUp({ options: { data: { ... } } })
-- ============================================================

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
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: fires after a new auth user is created
CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
