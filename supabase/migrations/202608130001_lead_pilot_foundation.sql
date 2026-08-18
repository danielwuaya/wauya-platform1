-- Lead pilot foundation for the existing browser-to-Supabase architecture.
-- This migration adds data integrity and auditability. It intentionally does not
-- enable RLS because the current application uses its own localStorage session,
-- not Supabase Auth; enabling RLS without first migrating auth would lock out the app.

alter table public.cold_leads
  add column if not exists source_system text not null default 'manual',
  add column if not exists source_external_id text,
  add column if not exists source_url text,
  add column if not exists source_evidence jsonb not null default '{}'::jsonb,
  add column if not exists source_observed_at timestamptz,
  add column if not exists enrichment_status text not null default 'not_started',
  add column if not exists enrichment_evidence jsonb not null default '{}'::jsonb,
  add column if not exists dedupe_key text,
  add column if not exists duplicate_of_id text,
  add column if not exists archived_at timestamptz,
  add column if not exists contact_eligibility text not null default 'review_required',
  add column if not exists consent_basis text not null default 'unknown',
  add column if not exists consent_source text,
  add column if not exists consent_captured_at timestamptz,
  add column if not exists consent_expires_at timestamptz,
  add column if not exists eligibility_reviewed_at timestamptz,
  add column if not exists eligibility_reviewed_by text,
  add column if not exists eligibility_notes text,
  add column if not exists do_not_contact boolean not null default false,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists updated_at timestamptz not null default now();

-- Normalize the legacy Spanish value before applying the stricter vocabulary.
update public.cold_leads
set enrichment_status = 'not_started'
where enrichment_status = 'pendiente';

update public.cold_leads
set contact_eligibility = 'review_required'
where contact_eligibility = 'pendiente';

alter table public.cold_leads drop constraint if exists cold_leads_enrichment_status_check;
alter table public.cold_leads add constraint cold_leads_enrichment_status_check
  check (enrichment_status in ('not_started', 'imported', 'in_progress', 'verified', 'failed', 'stale'));
alter table public.cold_leads drop constraint if exists cold_leads_contact_eligibility_check;
alter table public.cold_leads add constraint cold_leads_contact_eligibility_check
  check (contact_eligibility in ('review_required', 'eligible', 'ineligible', 'expired'));
alter table public.cold_leads drop constraint if exists cold_leads_consent_basis_check;
alter table public.cold_leads add constraint cold_leads_consent_basis_check
  check (consent_basis in ('unknown', 'express', 'implied', 'existing_business_relationship', 'inquiry', 'other'));

create or replace function public.cold_lead_identity_key(
  p_email text, p_whatsapp text, p_phone text, p_company text, p_city text
) returns text
language sql immutable
set search_path = public
as $$
  select case
    when position('@' in lower(trim(coalesce(p_email, '')))) > 1
      then 'email:' || lower(trim(p_email))
    when length(regexp_replace(coalesce(nullif(p_whatsapp, ''), p_phone, ''), '[^0-9]', '', 'g')) >= 7
      then 'phone:' || regexp_replace(coalesce(nullif(p_whatsapp, ''), p_phone), '[^0-9]', '', 'g')
    else 'company:' ||
      trim(regexp_replace(translate(lower(coalesce(p_company, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g')) || '|' ||
      trim(regexp_replace(translate(lower(coalesce(p_city, '')), 'áéíóúüñ', 'aeiouun'), '[^a-z0-9]+', ' ', 'g'))
  end
$$;

update public.cold_leads
set dedupe_key = public.cold_lead_identity_key(email, whatsapp, phone, company, city)
where dedupe_key is null;

-- Preserve legacy duplicates without deleting them. The oldest row remains canonical.
with ranked as (
  select id::text as id_text, dedupe_key,
    first_value(id::text) over (partition by dedupe_key order by created_at nulls last, id::text) as canonical_id,
    row_number() over (partition by dedupe_key order by created_at nulls last, id::text) as duplicate_rank
  from public.cold_leads
  where archived_at is null and dedupe_key is not null
)
update public.cold_leads lead
set duplicate_of_id = ranked.canonical_id,
    archived_at = coalesce(lead.archived_at, now()),
    dedupe_key = ranked.dedupe_key || ':legacy-duplicate:' || ranked.id_text
from ranked
where lead.id::text = ranked.id_text and ranked.duplicate_rank > 1;

create unique index if not exists cold_leads_active_dedupe_key_uidx
  on public.cold_leads (dedupe_key) where archived_at is null;
create unique index if not exists cold_leads_source_external_uidx
  on public.cold_leads (source_system, source_external_id)
  where source_external_id is not null and archived_at is null;
create index if not exists cold_leads_eligibility_idx
  on public.cold_leads (contact_eligibility, do_not_contact, unsubscribed_at);

create or replace function public.set_cold_lead_integrity_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.dedupe_key is null or
     (tg_op = 'UPDATE' and (new.email, new.whatsapp, new.phone, new.company, new.city)
       is distinct from (old.email, old.whatsapp, old.phone, old.company, old.city)) then
    new.dedupe_key := public.cold_lead_identity_key(new.email, new.whatsapp, new.phone, new.company, new.city);
  end if;
  new.updated_at := now();
  if new.do_not_contact or new.unsubscribed_at is not null then
    new.contact_eligibility := 'ineligible';
  elsif new.consent_expires_at is not null and new.consent_expires_at <= now() then
    new.contact_eligibility := 'expired';
  end if;
  return new;
end $$;

drop trigger if exists cold_leads_integrity_fields on public.cold_leads;
create trigger cold_leads_integrity_fields
before insert or update on public.cold_leads
for each row execute function public.set_cold_lead_integrity_fields();

create table if not exists public.cold_lead_activities (
  id bigint generated by default as identity primary key,
  lead_id text not null,
  activity_type text not null check (activity_type in
    ('imported', 'enriched', 'status_changed', 'note', 'contact_attempt', 'reply', 'meeting', 'consent_review', 'unsubscribe', 'archived')),
  channel text check (channel is null or channel in ('email', 'phone', 'whatsapp', 'instagram', 'facebook', 'linkedin', 'other')),
  direction text check (direction is null or direction in ('inbound', 'outbound', 'internal')),
  outcome text,
  notes text,
  occurred_at timestamptz not null default now(),
  actor_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists cold_lead_activities_lead_time_idx
  on public.cold_lead_activities (lead_id, occurred_at desc);

create or replace function public.enforce_cold_lead_contact_eligibility()
returns trigger language plpgsql set search_path = public as $$
declare eligibility text; blocked boolean; unsubscribed timestamptz;
begin
  select contact_eligibility, do_not_contact, unsubscribed_at into eligibility, blocked, unsubscribed
    from public.cold_leads where id::text = new.lead_id;
  if not found then raise exception 'Lead not found'; end if;
  if new.activity_type = 'contact_attempt' and new.direction = 'outbound' then
    if eligibility <> 'eligible' or blocked or unsubscribed is not null then
      raise exception 'Outbound contact requires reviewed eligibility and no opt-out';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists cold_lead_activities_eligibility on public.cold_lead_activities;
create trigger cold_lead_activities_eligibility before insert on public.cold_lead_activities
for each row execute function public.enforce_cold_lead_contact_eligibility();

create or replace function public.prevent_cold_lead_activity_mutation()
returns trigger language plpgsql as $$
begin
  raise exception 'Lead activities are append-only';
end $$;
drop trigger if exists cold_lead_activities_append_only on public.cold_lead_activities;
create trigger cold_lead_activities_append_only before update or delete on public.cold_lead_activities
for each row execute function public.prevent_cold_lead_activity_mutation();

create or replace function public.import_cold_leads(p_leads jsonb, p_actor_id text default null)
returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  item jsonb;
  candidate public.cold_leads%rowtype;
  saved_id text;
  existed boolean;
  inserted_count integer := 0;
  updated_count integer := 0;
begin
  if jsonb_typeof(p_leads) <> 'array' then raise exception 'p_leads must be a JSON array'; end if;
  if jsonb_array_length(p_leads) > 500 then raise exception 'Maximum import size is 500 leads'; end if;

  for item in select value from jsonb_array_elements(p_leads)
  loop
    candidate := jsonb_populate_record(null::public.cold_leads, item);
    candidate.dedupe_key := public.cold_lead_identity_key(candidate.email, candidate.whatsapp, candidate.phone, candidate.company, candidate.city);
    if nullif(trim(candidate.company), '') is null then continue; end if;

    select exists(select 1 from public.cold_leads where dedupe_key = candidate.dedupe_key and archived_at is null) into existed;
    insert into public.cold_leads (
      lead_id, company, industry, city, address, phone, email, instagram, facebook, linkedin,
      owner_name, owner_role, website_status, problem, opportunity, recommended_solution, priority,
      lead_score, initial_message, observations, batch, outbound_status, email_subject, email_body,
      followup_1, followup_2, whatsapp, rating, whatsapp_message, assigned_seller,
      source_system, source_external_id, source_url, source_evidence, source_observed_at,
      enrichment_status, enrichment_evidence, dedupe_key, contact_eligibility, consent_basis
    ) values (
      candidate.lead_id, candidate.company, candidate.industry, candidate.city, candidate.address,
      candidate.phone, candidate.email, candidate.instagram, candidate.facebook, candidate.linkedin,
      candidate.owner_name, candidate.owner_role, candidate.website_status, candidate.problem,
      candidate.opportunity, candidate.recommended_solution, candidate.priority, candidate.lead_score,
      candidate.initial_message, candidate.observations, coalesce(candidate.batch, 'Lote sin nombre'),
      coalesce(candidate.outbound_status, 'sin_contactar'), candidate.email_subject, candidate.email_body,
      candidate.followup_1, candidate.followup_2, candidate.whatsapp, candidate.rating,
      candidate.whatsapp_message, candidate.assigned_seller, coalesce(candidate.source_system, 'manual'),
      candidate.source_external_id, candidate.source_url, coalesce(candidate.source_evidence, '{}'::jsonb),
      candidate.source_observed_at, coalesce(candidate.enrichment_status, 'imported'),
      coalesce(candidate.enrichment_evidence, '{}'::jsonb), candidate.dedupe_key,
      'review_required', 'unknown'
    )
    on conflict (dedupe_key) where archived_at is null do update set
      company = coalesce(nullif(excluded.company, ''), cold_leads.company),
      industry = coalesce(nullif(excluded.industry, ''), cold_leads.industry),
      city = coalesce(nullif(excluded.city, ''), cold_leads.city),
      address = coalesce(nullif(excluded.address, ''), cold_leads.address),
      phone = coalesce(nullif(excluded.phone, ''), cold_leads.phone),
      email = coalesce(nullif(excluded.email, ''), cold_leads.email),
      whatsapp = coalesce(nullif(excluded.whatsapp, ''), cold_leads.whatsapp),
      instagram = coalesce(nullif(excluded.instagram, ''), cold_leads.instagram),
      facebook = coalesce(nullif(excluded.facebook, ''), cold_leads.facebook),
      linkedin = coalesce(nullif(excluded.linkedin, ''), cold_leads.linkedin),
      owner_name = coalesce(nullif(excluded.owner_name, ''), cold_leads.owner_name),
      owner_role = coalesce(nullif(excluded.owner_role, ''), cold_leads.owner_role),
      problem = coalesce(nullif(excluded.problem, ''), cold_leads.problem),
      opportunity = coalesce(nullif(excluded.opportunity, ''), cold_leads.opportunity),
      recommended_solution = coalesce(nullif(excluded.recommended_solution, ''), cold_leads.recommended_solution),
      source_system = excluded.source_system,
      source_external_id = excluded.source_external_id,
      source_url = excluded.source_url,
      source_evidence = excluded.source_evidence,
      source_observed_at = excluded.source_observed_at,
      enrichment_status = excluded.enrichment_status,
      enrichment_evidence = excluded.enrichment_evidence,
      assigned_seller = coalesce(cold_leads.assigned_seller, excluded.assigned_seller)
    returning id::text into saved_id;

    if existed then updated_count := updated_count + 1; else inserted_count := inserted_count + 1; end if;
    insert into public.cold_lead_activities (lead_id, activity_type, direction, actor_id, metadata)
    values (saved_id, 'imported', 'internal', p_actor_id,
      jsonb_build_object('source_system', candidate.source_system, 'source_external_id', candidate.source_external_id,
        'source_url', candidate.source_url, 'source_evidence', candidate.source_evidence, 'reimport', existed));
  end loop;
  return jsonb_build_object('inserted', inserted_count, 'updated', updated_count, 'total', inserted_count + updated_count);
end $$;

create or replace function public.transition_cold_lead(p_lead_id text, p_status text, p_actor_id text default null)
returns void language plpgsql security invoker set search_path = public as $$
declare eligibility text; blocked boolean; unsubscribed timestamptz;
begin
  if p_status not in ('sin_contactar', 'escrito', 'no_respondio', 'respondio', 'reunion', 'descartado') then
    raise exception 'Invalid outbound status';
  end if;
  select contact_eligibility, do_not_contact, unsubscribed_at into eligibility, blocked, unsubscribed
    from public.cold_leads where id::text = p_lead_id;
  if not found then raise exception 'Lead not found'; end if;
  if p_status = 'escrito' and (eligibility <> 'eligible' or blocked or unsubscribed is not null) then
    raise exception 'Contact requires reviewed eligibility and no opt-out';
  end if;
  update public.cold_leads set outbound_status = p_status where id::text = p_lead_id;
  if not found then raise exception 'Lead not found'; end if;
  insert into public.cold_lead_activities (lead_id, activity_type, direction, actor_id, metadata)
  values (p_lead_id, 'status_changed', 'internal', p_actor_id, jsonb_build_object('to', p_status));
end $$;

create or replace function public.review_cold_lead_eligibility(
  p_lead_id text, p_eligibility text, p_consent_basis text, p_notes text default null,
  p_consent_source text default null, p_consent_captured_at timestamptz default null,
  p_consent_expires_at timestamptz default null, p_actor_id text default null
) returns void language plpgsql security invoker set search_path = public as $$
begin
  if p_eligibility not in ('review_required', 'eligible', 'ineligible', 'expired') then raise exception 'Invalid eligibility'; end if;
  if p_consent_basis not in ('unknown', 'express', 'implied', 'existing_business_relationship', 'inquiry', 'other') then raise exception 'Invalid consent basis'; end if;
  if p_eligibility = 'eligible' and p_consent_basis = 'unknown' then raise exception 'Eligible leads require a documented basis'; end if;
  if p_eligibility = 'eligible' and (nullif(trim(coalesce(p_consent_source, '')), '') is null or nullif(trim(coalesce(p_notes, '')), '') is null) then
    raise exception 'Eligible leads require evidence source and review notes';
  end if;
  if p_eligibility = 'eligible' and p_consent_basis in ('implied', 'existing_business_relationship', 'inquiry') and p_consent_expires_at is null then
    raise exception 'This basis requires an explicit expiry date';
  end if;
  update public.cold_leads set contact_eligibility = p_eligibility, consent_basis = p_consent_basis,
    consent_source = p_consent_source, consent_captured_at = p_consent_captured_at,
    eligibility_notes = p_notes, consent_expires_at = p_consent_expires_at,
    eligibility_reviewed_at = now(), eligibility_reviewed_by = p_actor_id
  where id::text = p_lead_id;
  if not found then raise exception 'Lead not found'; end if;
  insert into public.cold_lead_activities (lead_id, activity_type, direction, actor_id, notes, metadata)
  values (p_lead_id, 'consent_review', 'internal', p_actor_id, p_notes,
    jsonb_build_object('eligibility', p_eligibility, 'consent_basis', p_consent_basis,
      'consent_source', p_consent_source, 'captured_at', p_consent_captured_at, 'expires_at', p_consent_expires_at));
end $$;

create or replace function public.mark_cold_lead_unsubscribed(
  p_lead_id text, p_notes text default null, p_actor_id text default null
) returns void language plpgsql security invoker set search_path = public as $$
begin
  update public.cold_leads set do_not_contact = true, unsubscribed_at = coalesce(unsubscribed_at, now()),
    contact_eligibility = 'ineligible', eligibility_notes = coalesce(p_notes, eligibility_notes),
    eligibility_reviewed_at = now(), eligibility_reviewed_by = p_actor_id
  where id::text = p_lead_id;
  if not found then raise exception 'Lead not found'; end if;
  insert into public.cold_lead_activities (lead_id, activity_type, direction, actor_id, notes)
  values (p_lead_id, 'unsubscribe', 'inbound', p_actor_id, p_notes);
end $$;

create or replace function public.archive_cold_lead(p_lead_id text, p_actor_id text default null)
returns void language plpgsql security invoker set search_path = public as $$
begin
  insert into public.cold_lead_activities (lead_id, activity_type, direction, actor_id)
  select id::text, 'archived', 'internal', p_actor_id from public.cold_leads
  where id::text = p_lead_id and archived_at is null;
  if not found then raise exception 'Lead not found'; end if;
  update public.cold_leads set archived_at = now() where id::text = p_lead_id;
end $$;

create or replace function public.archive_cold_lead_batch(p_batch text, p_actor_id text default null)
returns integer language plpgsql security invoker set search_path = public as $$
declare affected integer;
begin
  insert into public.cold_lead_activities (lead_id, activity_type, direction, actor_id, metadata)
  select id::text, 'archived', 'internal', p_actor_id, jsonb_build_object('batch', p_batch)
  from public.cold_leads where batch = p_batch and archived_at is null;
  get diagnostics affected = row_count;
  update public.cold_leads set archived_at = now() where batch = p_batch and archived_at is null;
  return affected;
end $$;

comment on table public.cold_lead_activities is
  'Immutable audit trail for lead imports, state changes, consent reviews and manually recorded contacts. No sending capability.';
comment on column public.cold_leads.contact_eligibility is
  'Operational review result only; eligible must have a documented basis and does not replace legal review.';
