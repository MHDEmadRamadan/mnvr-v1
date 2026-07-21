-- Multi-value text filters: values in the same field OR together; fields AND together.

create or replace function public.text_filter_matches(p_haystack text, p_filter jsonb)
returns boolean
language sql
immutable
as $$
  select case
    when p_filter is null or p_filter = 'null'::jsonb then true
    when jsonb_typeof(p_filter) = 'array' then
      case
        when jsonb_array_length(p_filter) = 0 then true
        else exists (
          select 1
          from jsonb_array_elements_text(p_filter) as t(val)
          where nullif(trim(t.val), '') is not null
            and coalesce(p_haystack, '') ilike '%' || public.escape_ilike_pattern(trim(t.val)) || '%'
        )
      end
    when jsonb_typeof(p_filter) = 'string' then
      case
        when nullif(trim(p_filter #>> '{}'), '') is null then true
        else coalesce(p_haystack, '') ilike '%' || public.escape_ilike_pattern(trim(p_filter #>> '{}')) || '%'
      end
    else true
  end;
$$;

create or replace function public.page_filtered_issues(
  p_filters jsonb default '{}'::jsonb,
  p_limit integer default 50,
  p_offset integer default 0,
  p_sort_key text default 'created_at',
  p_sort_asc boolean default false
)
returns table(id uuid, total_count bigint)
language plpgsql
stable
security invoker
set search_path = public
as $$
declare
  v_search text := nullif(trim(coalesce(p_filters->>'globalSearch', '')), '');
  v_search_pat text := case when v_search is null then null else '%' || public.escape_ilike_pattern(v_search) || '%' end;
  v_limit int := greatest(1, least(coalesce(p_limit, 50), 100000));
  v_offset int := greatest(0, coalesce(p_offset, 0));
  v_sort text := coalesce(nullif(trim(p_sort_key), ''), 'created_at');
  v_asc boolean := coalesce(p_sort_asc, false);
  v_critical boolean := coalesce((p_filters->>'criticalOnly')::boolean, false);
begin
  return query
  with base as (
    select
      i.id,
      i.created_at,
      i.edited_at,
      i.issue_type,
      i.motherboard_issue,
      i.pmm_issue,
      i.ssd_issue,
      i.other_issue,
      i.description as issue_description,
      d.imei as device_imei,
      d.tickets as device_tickets,
      v.vehicle_number,
      ds.flespi_status,
      ds.screen_status
    from public.issues i
    left join public.device d on d.id = i.device_id
    left join public.vehicles v on v.id = d.vehicle_id
    left join lateral (
      select ds0.* from public.device_status ds0
      where ds0.device_id = d.id order by ds0.created_at desc nulls last limit 1
    ) ds on true
    left join lateral (
      select h0.* from public.hardware h0
      where h0.device_id = d.id order by h0.created_at desc nulls last limit 1
    ) h on true
    left join lateral (
      select s0.* from public.storage s0
      where s0.device_id = d.id order by s0.created_at desc nulls last limit 1
    ) s on true
    left join lateral (
      select r0.* from public.replacements r0
      where r0.device_id = d.id order by r0.created_at desc nulls last limit 1
    ) r on true
    left join public.profiles created_p on created_p.id = i.created_by
    left join public.profiles edited_p on edited_p.id = i.resolved_by
    where
      (coalesce(p_filters->>'status', '') = '' or i.status::text = p_filters->>'status')
      and public.text_filter_matches(i.issue_type, p_filters->'issueType')
      and public.text_filter_matches(i.motherboard_issue, p_filters->'motherboardIssue')
      and public.text_filter_matches(i.pmm_issue, p_filters->'pmmIssue')
      and public.text_filter_matches(i.ssd_issue, p_filters->'ssdIssue')
      and public.text_filter_matches(i.other_issue, p_filters->'otherIssue')
      and public.text_filter_matches(i.description, p_filters->'description')
      and public.text_filter_matches(d.imei, p_filters->'deviceImei')
      and public.text_filter_matches(d.tickets, p_filters->'deviceTickets')
      and public.text_filter_matches(d.description, p_filters->'deviceDescription')
      and public.text_filter_matches(v.vehicle_number, p_filters->'vehicleNumber')
      and public.text_filter_matches(v.description, p_filters->'vehicleDescription')
      and public.text_filter_matches(ds.software_version, p_filters->'softwareVersion')
      and public.text_filter_matches(ds.flespi_status, p_filters->'flespiStatus')
      and public.text_filter_matches(ds.screen_status, p_filters->'screenStatus')
      and public.text_filter_matches(ds.dotmatrix_status, p_filters->'dotmatrixStatus')
      and public.text_filter_matches(ds.description, p_filters->'deviceStatusDescription')
      and (p_filters->>'sshStatus' is null or p_filters->>'sshStatus' = '' or ds.ssh_status = (p_filters->>'sshStatus')::boolean)
      and (
        p_filters->'pmmSoftware' is null
        or p_filters->'pmmSoftware' = 'null'::jsonb
        or (
          case
            when jsonb_typeof(p_filters->'pmmSoftware') = 'array' then
              exists (
                select 1 from jsonb_array_elements_text(p_filters->'pmmSoftware') t(val)
                where nullif(trim(t.val), '') is not null
                  and (
                    case when trim(t.val) ~ '^[0-9]+(\.[0-9]+)?$'
                      then ds.pmm_software = trim(t.val)::double precision
                      else cast(ds.pmm_software as text) ilike '%' || public.escape_ilike_pattern(trim(t.val)) || '%'
                    end
                  )
              )
            when nullif(trim(coalesce(p_filters->>'pmmSoftware', '')), '') is null then true
            when p_filters->>'pmmSoftware' ~ '^[0-9]+(\.[0-9]+)?$'
              then ds.pmm_software = (p_filters->>'pmmSoftware')::double precision
            else cast(ds.pmm_software as text) ilike '%' || public.escape_ilike_pattern(p_filters->>'pmmSoftware') || '%'
          end
        )
      )
      and public.text_filter_matches(h.motherboard_type, p_filters->'motherboardType')
      and public.text_filter_matches(h.pmm_type, p_filters->'pmmType')
      and public.text_filter_matches(h.description, p_filters->'hardwareDescription')
      and public.text_filter_matches(s.ssd_type, p_filters->'ssdType')
      and public.text_filter_matches(s.summary_ssd, p_filters->'summarySsd')
      and public.text_filter_matches(s.description, p_filters->'storageDescription')
      and (p_filters->>'diskHealth' is null or p_filters->>'diskHealth' = '' or s.disk_health = (p_filters->>'diskHealth')::boolean)
      and (p_filters->>'powerOnHoursMin' is null or p_filters->>'powerOnHoursMin' = '' or s.power_on_hours >= (p_filters->>'powerOnHoursMin')::integer)
      and (p_filters->>'powerOnHoursMax' is null or p_filters->>'powerOnHoursMax' = '' or s.power_on_hours <= (p_filters->>'powerOnHoursMax')::integer)
      and (p_filters->>'powerCyclesMin' is null or p_filters->>'powerCyclesMin' = '' or s.power_cycles >= (p_filters->>'powerCyclesMin')::integer)
      and (p_filters->>'powerCyclesMax' is null or p_filters->>'powerCyclesMax' = '' or s.power_cycles <= (p_filters->>'powerCyclesMax')::integer)
      and (p_filters->>'powerOffCountMin' is null or p_filters->>'powerOffCountMin' = '' or s.power_off >= (p_filters->>'powerOffCountMin')::integer)
      and (p_filters->>'powerOffCountMax' is null or p_filters->>'powerOffCountMax' = '' or s.power_off <= (p_filters->>'powerOffCountMax')::integer)
      and (p_filters->>'lifetimeMin' is null or p_filters->>'lifetimeMin' = '' or s.lifetime >= (p_filters->>'lifetimeMin')::integer)
      and (p_filters->>'lifetimeMax' is null or p_filters->>'lifetimeMax' = '' or s.lifetime <= (p_filters->>'lifetimeMax')::integer)
      and (coalesce(p_filters->>'ssd', '') = '' or r.ssd::text = p_filters->>'ssd')
      and (coalesce(p_filters->>'motherboard', '') = '' or r.motherboard::text = p_filters->>'motherboard')
      and (coalesce(p_filters->>'sataCable', '') = '' or r.sata_cable::text = p_filters->>'sataCable')
      and (p_filters->>'deviceChanged' is null or p_filters->>'deviceChanged' = '' or r.device_changed = (p_filters->>'deviceChanged')::boolean)
      and (
        coalesce(p_filters->>'imeiChanged', '') = ''
        or (
          case
            when lower(trim(p_filters->>'imeiChanged')) in ('false', 'no', 'no change')
              then lower(coalesce(r.imei_changed, '')) in ('false', 'no', 'no change', '')
            when lower(trim(p_filters->>'imeiChanged')) in ('true', 'yes')
              then lower(coalesce(r.imei_changed, '')) not in ('false', 'no', 'no change', '')
            else coalesce(r.imei_changed, '') ilike '%' || public.escape_ilike_pattern(p_filters->>'imeiChanged') || '%'
          end
        )
      )
      and (
        coalesce(p_filters->>'simChanged', '') = ''
        or (
          case
            when lower(trim(p_filters->>'simChanged')) in ('false', 'no', 'no change')
              then lower(coalesce(r.sim_changed, '')) in ('false', 'no', 'no change', '')
            when lower(trim(p_filters->>'simChanged')) in ('true', 'yes')
              then lower(coalesce(r.sim_changed, '')) not in ('false', 'no', 'no change', '')
            else coalesce(r.sim_changed, '') ilike '%' || public.escape_ilike_pattern(p_filters->>'simChanged') || '%'
          end
        )
      )
      and public.text_filter_matches(r.description, p_filters->'replacementsDescription')
      and (
        coalesce(p_filters->>'createdBy', '') = ''
        or coalesce(created_p.full_name, '') ilike '%' || public.escape_ilike_pattern(p_filters->>'createdBy') || '%'
        or coalesce(created_p.email, '') ilike '%' || public.escape_ilike_pattern(p_filters->>'createdBy') || '%'
      )
      and (
        coalesce(p_filters->>'editedBy', '') = ''
        or coalesce(edited_p.full_name, '') ilike '%' || public.escape_ilike_pattern(p_filters->>'editedBy') || '%'
        or coalesce(edited_p.email, '') ilike '%' || public.escape_ilike_pattern(p_filters->>'editedBy') || '%'
      )
      and (coalesce(p_filters->>'createdFrom', '') = '' or i.created_at >= (p_filters->>'createdFrom')::timestamptz)
      and (coalesce(p_filters->>'createdTo', '') = '' or i.created_at <= (p_filters->>'createdTo')::timestamptz)
      and (
        v_search_pat is null
        or i.issue_type ilike v_search_pat or i.motherboard_issue ilike v_search_pat or i.pmm_issue ilike v_search_pat
        or i.ssd_issue ilike v_search_pat or i.other_issue ilike v_search_pat or coalesce(i.description, '') ilike v_search_pat
        or coalesce(d.imei, '') ilike v_search_pat or coalesce(d.tickets, '') ilike v_search_pat or coalesce(d.description, '') ilike v_search_pat
        or coalesce(v.vehicle_number, '') ilike v_search_pat or coalesce(v.description, '') ilike v_search_pat
        or coalesce(ds.software_version, '') ilike v_search_pat or coalesce(ds.flespi_status, '') ilike v_search_pat
        or coalesce(ds.screen_status, '') ilike v_search_pat or coalesce(ds.dotmatrix_status, '') ilike v_search_pat
        or cast(ds.pmm_software as text) ilike v_search_pat
        or coalesce(h.motherboard_type, '') ilike v_search_pat or coalesce(h.pmm_type, '') ilike v_search_pat
        or coalesce(s.ssd_type, '') ilike v_search_pat
      )
      and (
        not v_critical
        or i.issue_type ilike '%critical%' or i.issue_type ilike '%urgent%'
        or i.motherboard_issue ilike '%critical%' or i.motherboard_issue ilike '%fail%'
        or i.pmm_issue ilike '%critical%' or i.pmm_issue ilike '%fail%'
        or i.ssd_issue ilike '%critical%' or i.ssd_issue ilike '%fail%'
      )
  ),
  ordered as (
    select b.id, count(*) over()::bigint as total_count
    from base b
    order by
      case when v_sort = 'created_at' and not v_asc then b.created_at end desc nulls last,
      case when v_sort = 'created_at' and v_asc then b.created_at end asc nulls last,
      case when v_sort = 'edited_at' and not v_asc then b.edited_at end desc nulls last,
      case when v_sort = 'edited_at' and v_asc then b.edited_at end asc nulls last,
      case when v_sort = 'issue_type' and not v_asc then b.issue_type end desc nulls last,
      case when v_sort = 'issue_type' and v_asc then b.issue_type end asc nulls last,
      case when v_sort = 'motherboard_issue' and not v_asc then b.motherboard_issue end desc nulls last,
      case when v_sort = 'motherboard_issue' and v_asc then b.motherboard_issue end asc nulls last,
      case when v_sort = 'pmm_issue' and not v_asc then b.pmm_issue end desc nulls last,
      case when v_sort = 'pmm_issue' and v_asc then b.pmm_issue end asc nulls last,
      case when v_sort = 'ssd_issue' and not v_asc then b.ssd_issue end desc nulls last,
      case when v_sort = 'ssd_issue' and v_asc then b.ssd_issue end asc nulls last,
      case when v_sort = 'other_issue' and not v_asc then b.other_issue end desc nulls last,
      case when v_sort = 'other_issue' and v_asc then b.other_issue end asc nulls last,
      case when v_sort = 'description' and not v_asc then b.issue_description end desc nulls last,
      case when v_sort = 'description' and v_asc then b.issue_description end asc nulls last,
      case when v_sort = 'imei' and not v_asc then b.device_imei end desc nulls last,
      case when v_sort = 'imei' and v_asc then b.device_imei end asc nulls last,
      case when v_sort = 'tickets' and not v_asc then b.device_tickets end desc nulls last,
      case when v_sort = 'tickets' and v_asc then b.device_tickets end asc nulls last,
      case when v_sort = 'vehicle_number' and not v_asc then b.vehicle_number end desc nulls last,
      case when v_sort = 'vehicle_number' and v_asc then b.vehicle_number end asc nulls last,
      case when v_sort = 'flespi_status' and not v_asc then b.flespi_status end desc nulls last,
      case when v_sort = 'flespi_status' and v_asc then b.flespi_status end asc nulls last,
      case when v_sort = 'screen_status' and not v_asc then b.screen_status end desc nulls last,
      case when v_sort = 'screen_status' and v_asc then b.screen_status end asc nulls last,
      b.created_at desc,
      b.id desc
    limit v_limit offset v_offset
  )
  select o.id, o.total_count from ordered o;
end;
$$;

grant execute on function public.text_filter_matches(text, jsonb) to anon, authenticated;
grant execute on function public.page_filtered_issues(jsonb, integer, integer, text, boolean) to anon, authenticated;
