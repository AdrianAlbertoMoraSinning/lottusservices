-- Sumaq on 17th - Kitchen Order Hub + print queue
-- Safe migration. Run once in the Sumaq Supabase SQL Editor.

alter table public.orders add column if not exists source_channel text not null default 'web_pickup';
alter table public.orders add column if not exists external_order_id text;
alter table public.orders add column if not exists kitchen_status text not null default 'New';

create index if not exists orders_source_channel_idx on public.orders(source_channel, created_at desc);
create index if not exists orders_kitchen_status_idx on public.orders(kitchen_status, created_at desc);
create unique index if not exists orders_external_source_uidx
  on public.orders(source_channel, external_order_id)
  where external_order_id is not null and external_order_id <> '';

create table if not exists public.kitchen_print_jobs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null unique references public.orders(id) on delete cascade,
  printer_target text not null default 'kitchen',
  status text not null default 'pending' check (status in ('pending','claimed','printed','error')),
  attempts integer not null default 0,
  requested_at timestamptz not null default now(),
  claimed_at timestamptz,
  printed_at timestamptz,
  last_error text not null default '',
  agent_name text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists kitchen_print_jobs_status_idx on public.kitchen_print_jobs(status, requested_at);

alter table public.kitchen_print_jobs enable row level security;
drop policy if exists "Admin full access kitchen_print_jobs" on public.kitchen_print_jobs;
create policy "Admin full access kitchen_print_jobs"
on public.kitchen_print_jobs for all to authenticated using (true) with check (true);

create or replace function public.sumaq_queue_paid_order_for_kitchen()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(new.payment_status,'') ilike 'Paid%' and
     coalesce(old.payment_status,'') not ilike 'Paid%' then
    if coalesce(new.order_type,'') = 'pickup' then
      insert into public.kitchen_print_jobs(order_id, printer_target, status, requested_at, updated_at)
      values(new.id, 'kitchen', 'pending', now(), now())
      on conflict (order_id) do update set
        status = 'pending',
        requested_at = now(),
        claimed_at = null,
        printed_at = null,
        last_error = '',
        updated_at = now();
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists sumaq_queue_paid_order_trigger on public.orders;
create trigger sumaq_queue_paid_order_trigger
after update of payment_status on public.orders
for each row execute function public.sumaq_queue_paid_order_for_kitchen();

-- Existing web pickup orders are explicitly labelled.
update public.orders
set source_channel = 'web_pickup'
where order_type = 'pickup' and (source_channel is null or source_channel = '');
