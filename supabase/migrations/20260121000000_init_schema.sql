-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- PROFILES TABLE
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  employee_code text not null unique,
  full_name text,
  email text,
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
