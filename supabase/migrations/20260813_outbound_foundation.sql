-- Base gratuita para importar leads de manera idempotente y guardar evidencia.
alter table public.cold_leads
  add column if not exists import_key text,
  add column if not exists country text,
  add column if not exists province text,
  add column if not exists website_url text,
  add column if not exists maps_url text,
  add column if not exists has_website boolean,
  add column if not exists source_url text,
  add column if not exists evidence_url text,
  add column if not exists discovered_at timestamptz,
  add column if not exists enrichment_status text not null default 'pendiente',
  add column if not exists contact_eligibility text not null default 'pendiente',
  add column if not exists consent_type text not null default 'pendiente';

create unique index if not exists cold_leads_import_key_unique
  on public.cold_leads (import_key)
  where import_key is not null;

create table if not exists public.contact_attempts (
  id uuid primary key default gen_random_uuid(),
  cold_lead_id uuid not null references public.cold_leads(id) on delete cascade,
  channel text not null,
  status text not null default 'borrador',
  occurred_at timestamptz not null default now(),
  summary text,
  created_at timestamptz not null default now()
);

create index if not exists contact_attempts_lead_occurred_idx
  on public.contact_attempts (cold_lead_id, occurred_at desc);
