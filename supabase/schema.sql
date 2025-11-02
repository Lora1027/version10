
create extension if not exists "uuid-ossp";

create table if not exists public.transactions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  type text not null check (type in ('income','expense')),
  category text,
  method text not null check (method in ('cash','gcash','bank')),
  amount numeric not null check (amount >= 0),
  notes text,
  inserted_at timestamp with time zone default now()
);

create table if not exists public.inventory (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  sku text not null,
  name text not null,
  unit_cost numeric not null default 0,
  qty_on_hand integer not null default 0,
  created_at timestamp with time zone default now()
);

create table if not exists public.balances (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  kind text not null check (kind in ('cash','gcash','bank','capital')),
  balance numeric not null default 0,
  updated_at timestamp with time zone default now()
);

alter table public.transactions enable row level security;
alter table public.inventory enable row level security;
alter table public.balances enable row level security;

create or replace function public.set_user_id()
returns trigger language plpgsql as $$
begin
  if (new.user_id is null) then
    new.user_id := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists set_user_id_transactions on public.transactions;
create trigger set_user_id_transactions before insert on public.transactions
for each row execute procedure public.set_user_id();

drop trigger if exists set_user_id_inventory on public.inventory;
create trigger set_user_id_inventory before insert on public.inventory
for each row execute procedure public.set_user_id();

drop trigger if exists set_user_id_balances on public.balances;
create trigger set_user_id_balances before insert on public.balances
for each row execute procedure public.set_user_id();

drop policy if exists "tx_select_own" on public.transactions;
drop policy if exists "tx_insert_own" on public.transactions;
drop policy if exists "tx_update_own" on public.transactions;
drop policy if exists "tx_delete_own" on public.transactions;

create policy "tx_select_own" on public.transactions for select using (auth.uid() = user_id);
create policy "tx_insert_own" on public.transactions for insert with check (auth.uid() = user_id);
create policy "tx_update_own" on public.transactions for update using (auth.uid() = user_id);
create policy "tx_delete_own" on public.transactions for delete using (auth.uid() = user_id);

drop policy if exists "inv_select_own" on public.inventory;
drop policy if exists "inv_insert_own" on public.inventory;
drop policy if exists "inv_update_own" on public.inventory;
drop policy if exists "inv_delete_own" on public.inventory;

create policy "inv_select_own" on public.inventory for select using (auth.uid() = user_id);
create policy "inv_insert_own" on public.inventory for insert with check (auth.uid() = user_id);
create policy "inv_update_own" on public.inventory for update using (auth.uid() = user_id);
create policy "inv_delete_own" on public.inventory for delete using (auth.uid() = user_id);

drop policy if exists "bal_select_own" on public.balances;
drop policy if exists "bal_insert_own" on public.balances;
drop policy if exists "bal_update_own" on public.balances;
drop policy if exists "bal_delete_own" on public.balances;

create policy "bal_select_own" on public.balances for select using (auth.uid() = user_id);
create policy "bal_insert_own" on public.balances for insert with check (auth.uid() = user_id);
create policy "bal_update_own" on public.balances for update using (auth.uid() = user_id);
create policy "bal_delete_own" on public.balances for delete using (auth.uid() = user_id);

create index if not exists idx_tx_user_date on public.transactions(user_id, date);
create index if not exists idx_inv_user_sku on public.inventory(user_id, sku);
create index if not exists idx_bal_user_kind on public.balances(user_id, kind);

notify pgrst, 'reload schema';
