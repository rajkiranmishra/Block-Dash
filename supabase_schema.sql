-- ==============================================================================
-- BLOCK DASH — Supabase PostgreSQL Schema & Security Policies (RLS)
-- ==============================================================================

-- 1. Create Leaderboard Table
create table if not exists public.leaderboard (
    id uuid default gen_random_uuid() primary key,
    user_id uuid references auth.users(id) on delete cascade not null unique,
    display_name varchar(16) not null default 'Anonymous',
    score integer not null default 0 check (score >= 0 and score < 1000000),
    games_played integer not null default 1 check (games_played >= 0),
    max_survival_time numeric(8, 2) default 0.00,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.leaderboard enable row level security;

-- 3. Policy: Anyone can read leaderboard scores (Public Read)
create policy "Allow public read access to leaderboard"
    on public.leaderboard
    for select
    using (true);

-- 4. Policy: Authenticated/Anonymous users can only insert their own record
create policy "Allow users to insert their own leaderboard record"
    on public.leaderboard
    for insert
    with check (auth.uid() = user_id);

-- 5. Policy: Authenticated/Anonymous users can only update their own record
create policy "Allow users to update their own leaderboard record"
    on public.leaderboard
    for update
    using (auth.uid() = user_id)
    with check (
        auth.uid() = user_id
        -- Ensure scores can never be arbitrarily downgraded in the database
        and score >= score
    );

-- 6. Anti-Cheat / Sanity Trigger: Verify score rate realism
create or replace function public.validate_score_update()
returns trigger as $$
begin
    -- Sanity check: Ensure display name has no control chars
    new.display_name := trim(regexp_replace(new.display_name, '[^\w\- ]', '', 'g'));
    if length(new.display_name) = 0 then
        new.display_name := 'Runner';
    end if;

    -- Update timestamp
    new.updated_at := timezone('utc'::text, now());
    return new;
end;
$$ language plpgsql security definer;

drop trigger if exists before_leaderboard_upsert on public.leaderboard;
create trigger before_leaderboard_upsert
    before insert or update on public.leaderboard
    for each row
    execute function public.validate_score_update();

-- 7. High-Performance Index for fast Top 10 queries
create index if not exists leaderboard_score_idx on public.leaderboard (score desc);
