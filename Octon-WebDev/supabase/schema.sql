-- OCTON CONTROL PLANE SCHEMA
-- Use a dedicated Octon Supabase project. Do not store pooled client accounting/operational data here.

create extension if not exists pgcrypto;

create table if not exists octon_portals (
  id text primary key,
  name text not null,
  repo text,
  public_url text,
  jurisdiction jsonb not null default '[]'::jsonb,
  status text not null default 'registered',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists octon_audits (
  id uuid primary key default gen_random_uuid(),
  portal_id text not null references octon_portals(id) on delete cascade,
  mode text not null,
  score integer,
  evidence jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists octon_findings (
  id uuid primary key default gen_random_uuid(),
  portal_id text not null references octon_portals(id) on delete cascade,
  audit_id uuid references octon_audits(id) on delete set null,
  category text not null,
  title text not null,
  summary text not null,
  severity text not null check (severity in ('low','medium','high','critical')),
  expected_impact text,
  risk text,
  evidence jsonb not null default '{}'::jsonb,
  status text not null default 'proposed',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table if not exists octon_changes (
  id uuid primary key default gen_random_uuid(),
  finding_id uuid references octon_findings(id) on delete set null,
  portal_id text not null references octon_portals(id) on delete cascade,
  repo text not null,
  branch text not null default 'main',
  change_payload jsonb not null,
  change_hash text not null,
  test_plan jsonb not null default '[]'::jsonb,
  rollback_plan jsonb not null default '{}'::jsonb,
  status text not null default 'draft',
  created_at timestamptz not null default now()
);

create table if not exists octon_approvals (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references octon_changes(id) on delete cascade,
  approved_by text not null,
  approved_change_hash text not null,
  status text not null default 'approved',
  approved_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists octon_deployments (
  id uuid primary key default gen_random_uuid(),
  change_id uuid not null references octon_changes(id) on delete cascade,
  approval_id uuid references octon_approvals(id) on delete set null,
  commit_sha text,
  commit_url text,
  verification jsonb not null default '{}'::jsonb,
  status text not null default 'submitted',
  created_at timestamptz not null default now()
);

alter table octon_portals enable row level security;
alter table octon_audits enable row level security;
alter table octon_findings enable row level security;
alter table octon_changes enable row level security;
alter table octon_approvals enable row level security;
alter table octon_deployments enable row level security;

-- v1.0 expects these tables to be accessed server-side with the service role only.
-- Do not expose service-role credentials to the browser.
