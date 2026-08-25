-- Keep manual CRM state/activity tracking independent from any future sending engine.
-- Explicit opt-outs remain blocked. No sending capability is introduced here.

create or replace function public.transition_cold_lead(p_lead_id text, p_status text, p_actor_id text default null)
returns void language plpgsql security invoker set search_path = public as $$
declare blocked boolean; unsubscribed timestamptz;
begin
  if p_status not in ('sin_contactar', 'escrito', 'no_respondio', 'respondio', 'reunion', 'descartado') then
    raise exception 'Invalid outbound status';
  end if;

  select do_not_contact, unsubscribed_at into blocked, unsubscribed
    from public.cold_leads where id::text = p_lead_id;
  if not found then raise exception 'Lead not found'; end if;
  if p_status = 'escrito' and (blocked or unsubscribed is not null) then
    raise exception 'Contact is blocked by an explicit opt-out';
  end if;

  update public.cold_leads set outbound_status = p_status where id::text = p_lead_id;
  insert into public.cold_lead_activities (lead_id, activity_type, direction, actor_id, metadata)
  values (p_lead_id, 'status_changed', 'internal', p_actor_id, jsonb_build_object('to', p_status));
end $$;

create or replace function public.enforce_cold_lead_contact_eligibility()
returns trigger language plpgsql set search_path = public as $$
declare blocked boolean; unsubscribed timestamptz;
begin
  select do_not_contact, unsubscribed_at into blocked, unsubscribed
    from public.cold_leads where id::text = new.lead_id;
  if not found then raise exception 'Lead not found'; end if;
  if new.activity_type = 'contact_attempt' and new.direction = 'outbound' and (blocked or unsubscribed is not null) then
    raise exception 'Contact is blocked by an explicit opt-out';
  end if;
  return new;
end $$;

-- Reserved for a future sender. Any actual automated outbound implementation
-- must call this guard before sending and continue to provide opt-out handling.
create or replace function public.assert_cold_lead_outbound_allowed(p_lead_id text)
returns void language plpgsql security invoker set search_path = public as $$
declare eligibility text; basis text; blocked boolean; unsubscribed timestamptz;
begin
  select contact_eligibility, consent_basis, do_not_contact, unsubscribed_at
    into eligibility, basis, blocked, unsubscribed
    from public.cold_leads where id::text = p_lead_id;
  if not found then raise exception 'Lead not found'; end if;
  if eligibility <> 'eligible' or basis = 'unknown' or blocked or unsubscribed is not null then
    raise exception 'Automated outbound requires documented eligibility and no opt-out';
  end if;
end $$;

comment on function public.assert_cold_lead_outbound_allowed(text) is
  'Mandatory guard for any future automated outbound sender. Not used by manual CRM tracking.';
