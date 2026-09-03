-- Optional Octon persistent audit history (v1.2)
create table if not exists public.octon_audits (
  id uuid primary key default gen_random_uuid(),
  portal_id text not null,
  version text not null,
  score integer,
  component_status jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.octon_findings (
  id uuid primary key default gen_random_uuid(),
  audit_id uuid references public.octon_audits(id) on delete cascade,
  external_id text,
  dimension text not null,
  severity text not null,
  title text not null,
  evidence jsonb,
  operational_impact jsonb,
  commercial_impact jsonb,
  recommendation jsonb,
  affected_files jsonb not null default '[]'::jsonb,
  proposed_fix jsonb,
  tests jsonb not null default '[]'::jsonb,
  rollback jsonb,
  confidence numeric,
  requires_human_review boolean not null default false,
  sources jsonb not null default '[]'::jsonb,
  status text not null default 'OPEN',
  created_at timestamptz not null default now()
);
