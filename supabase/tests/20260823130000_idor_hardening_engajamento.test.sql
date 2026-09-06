begin;

do $$
declare
  v_name text;
  v_def text;
begin
  foreach v_name in array array['creditar_xp', 'creditar_pc', 'registrar_evento_engajamento'] loop
    select pg_get_functiondef(p.oid) into v_def
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = v_name
    order by p.oid desc limit 1;

    if v_def is null
       or v_def not like '%p_usuario_id is distinct from v_actor%'
       or v_def not like '%PERMISSAO_NEGADA%'
       or v_def like '%SET search_path TO ''public''%' then
      raise exception 'RPC % sem contrato anti-IDOR', v_name;
    end if;
  end loop;

  if has_function_privilege('anon', 'public.creditar_xp(uuid,integer,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.creditar_pc(uuid,integer,text)', 'EXECUTE')
     or has_function_privilege('anon', 'public.registrar_evento_engajamento(uuid,text,text)', 'EXECUTE') then
    raise exception 'RPC de engajamento exposta a anon';
  end if;
end;
$$;

select 'idor_hardening_engagement_checks_ok' as result;
rollback;
