-- Support the complete Wuaya cold-lead spreadsheet as an idempotent source of truth.
-- Re-importing the same sheet updates the existing lead instead of duplicating it.

alter table public.cold_leads
  add column if not exists country text,
  add column if not exists province text,
  add column if not exists website_url text,
  add column if not exists maps_url text,
  add column if not exists has_website boolean,
  add column if not exists send_status text,
  add column if not exists ai_decision text,
  add column if not exists ai_reason text,
  add column if not exists ai_sales_angle text,
  add column if not exists final_subject text,
  add column if not exists final_email text,
  add column if not exists sent_at timestamptz,
  add column if not exists reply_status text,
  add column if not exists source_base text;

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

    saved_id := null;
    select lead.id::text into saved_id
    from public.cold_leads lead
    where lead.archived_at is null
      and (
        lead.dedupe_key = candidate.dedupe_key
        or (
          candidate.source_external_id is not null
          and lead.source_system = coalesce(candidate.source_system, 'google_sheets')
          and lead.source_external_id = candidate.source_external_id
        )
      )
    order by (lead.dedupe_key = candidate.dedupe_key) desc
    limit 1;
    existed := found;

    if existed then
      update public.cold_leads set
        lead_id = candidate.lead_id,
        company = candidate.company,
        industry = candidate.industry,
        country = candidate.country,
        province = candidate.province,
        city = candidate.city,
        address = candidate.address,
        maps_url = candidate.maps_url,
        phone = candidate.phone,
        email = candidate.email,
        whatsapp = candidate.whatsapp,
        instagram = candidate.instagram,
        facebook = candidate.facebook,
        linkedin = candidate.linkedin,
        owner_name = candidate.owner_name,
        owner_role = candidate.owner_role,
        website_status = candidate.website_status,
        website_url = candidate.website_url,
        has_website = candidate.has_website,
        problem = candidate.problem,
        opportunity = candidate.opportunity,
        recommended_solution = candidate.recommended_solution,
        priority = candidate.priority,
        lead_score = candidate.lead_score,
        initial_message = candidate.initial_message,
        observations = candidate.observations,
        batch = coalesce(nullif(candidate.batch, ''), public.cold_leads.batch),
        outbound_status = coalesce(nullif(candidate.outbound_status, ''), public.cold_leads.outbound_status),
        email_subject = candidate.email_subject,
        email_body = candidate.email_body,
        followup_1 = candidate.followup_1,
        followup_2 = candidate.followup_2,
        rating = candidate.rating,
        whatsapp_message = candidate.whatsapp_message,
        send_status = candidate.send_status,
        ai_decision = candidate.ai_decision,
        ai_reason = candidate.ai_reason,
        ai_sales_angle = candidate.ai_sales_angle,
        final_subject = candidate.final_subject,
        final_email = candidate.final_email,
        sent_at = candidate.sent_at,
        reply_status = candidate.reply_status,
        source_base = candidate.source_base,
        assigned_seller = coalesce(public.cold_leads.assigned_seller, candidate.assigned_seller),
        source_system = coalesce(candidate.source_system, 'google_sheets'),
        source_external_id = candidate.source_external_id,
        source_url = candidate.source_url,
        source_evidence = coalesce(candidate.source_evidence, '{}'::jsonb),
        source_observed_at = candidate.source_observed_at,
        enrichment_status = coalesce(candidate.enrichment_status, 'imported'),
        enrichment_evidence = coalesce(candidate.enrichment_evidence, '{}'::jsonb),
        dedupe_key = candidate.dedupe_key
      where id::text = saved_id;
      updated_count := updated_count + 1;
    else
      insert into public.cold_leads (
        lead_id, company, industry, country, province, city, address, maps_url, phone, email,
        whatsapp, instagram, facebook, linkedin, owner_name, owner_role, website_status,
        website_url, has_website, problem, opportunity, recommended_solution, priority, lead_score,
        initial_message, observations, batch, outbound_status, email_subject, email_body, followup_1,
        followup_2, rating, whatsapp_message, send_status, ai_decision, ai_reason, ai_sales_angle,
        final_subject, final_email, sent_at, reply_status, source_base, assigned_seller,
        source_system, source_external_id, source_url, source_evidence, source_observed_at,
        enrichment_status, enrichment_evidence, dedupe_key, contact_eligibility, consent_basis
      ) values (
        candidate.lead_id, candidate.company, candidate.industry, candidate.country, candidate.province,
        candidate.city, candidate.address, candidate.maps_url, candidate.phone, candidate.email,
        candidate.whatsapp, candidate.instagram, candidate.facebook, candidate.linkedin,
        candidate.owner_name, candidate.owner_role, candidate.website_status, candidate.website_url,
        candidate.has_website, candidate.problem, candidate.opportunity, candidate.recommended_solution,
        candidate.priority, candidate.lead_score, candidate.initial_message, candidate.observations,
        coalesce(nullif(candidate.batch, ''), 'Lote sin nombre'),
        coalesce(nullif(candidate.outbound_status, ''), 'sin_contactar'), candidate.email_subject,
        candidate.email_body, candidate.followup_1, candidate.followup_2, candidate.rating,
        candidate.whatsapp_message, candidate.send_status, candidate.ai_decision, candidate.ai_reason,
        candidate.ai_sales_angle, candidate.final_subject, candidate.final_email, candidate.sent_at,
        candidate.reply_status, candidate.source_base, candidate.assigned_seller,
        coalesce(candidate.source_system, 'google_sheets'), candidate.source_external_id,
        candidate.source_url, coalesce(candidate.source_evidence, '{}'::jsonb), candidate.source_observed_at,
        coalesce(candidate.enrichment_status, 'imported'), coalesce(candidate.enrichment_evidence, '{}'::jsonb),
        candidate.dedupe_key, 'review_required', 'unknown'
      ) returning id::text into saved_id;
      inserted_count := inserted_count + 1;
    end if;

    insert into public.cold_lead_activities (lead_id, activity_type, direction, actor_id, metadata)
    values (saved_id, 'imported', 'internal', p_actor_id,
      jsonb_build_object('source_system', candidate.source_system,
        'source_external_id', candidate.source_external_id, 'source_url', candidate.source_url,
        'source_evidence', candidate.source_evidence, 'reimport', existed));
  end loop;

  return jsonb_build_object('inserted', inserted_count, 'updated', updated_count,
    'total', inserted_count + updated_count);
end $$;

comment on function public.import_cold_leads(jsonb, text) is
  'Idempotently imports or refreshes Wuaya cold leads from the complete Google Sheet format.';
