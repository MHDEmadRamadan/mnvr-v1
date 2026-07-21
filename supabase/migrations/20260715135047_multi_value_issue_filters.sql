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

grant execute on function public.text_filter_matches(text, jsonb) to anon, authenticated;;
