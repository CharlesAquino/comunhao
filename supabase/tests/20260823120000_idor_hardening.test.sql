begin;

do $$
declare
  v_table text;
  v_count integer;
  v_def text;
begin
  foreach v_table in array array[
    'usuarios', 'pedidos', 'intercessoes', 'mensagens',
    'app_notificacoes', 'convites_oracao', 'kesef_ledger', 'loja_pedidos',
    'oracao_jornadas', 'estudos_matriculas', 'estudos_aula_progresso',
    'estudos_certificados'
  ] loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v_table and c.relrowsecurity
    ) then
      raise exception 'RLS ausente em recurso sensível: %', v_table;
    end if;
  end loop;

  -- Trocar o ID da mensagem/notificação não pode conceder escrita ampla.
  if has_table_privilege('authenticated', 'public.mensagens', 'UPDATE') then
    raise exception 'authenticated possui UPDATE amplo em mensagens';
  end if;
  if not has_column_privilege('authenticated', 'public.mensagens', 'lida', 'UPDATE')
     or has_column_privilege('authenticated', 'public.mensagens', 'texto', 'UPDATE')
     or has_column_privilege('authenticated', 'public.mensagens', 'destinatario_id', 'UPDATE') then
    raise exception 'privilégios por coluna de mensagens permitem mass assignment';
  end if;
  if has_table_privilege('authenticated', 'public.app_notificacoes', 'UPDATE') then
    raise exception 'authenticated possui UPDATE amplo em notificações';
  end if;
  if not has_column_privilege('authenticated', 'public.app_notificacoes', 'lida', 'UPDATE')
     or has_column_privilege('authenticated', 'public.app_notificacoes', 'usuario_id', 'UPDATE') then
    raise exception 'privilégios por coluna de notificações estão incorretos';
  end if;

  if has_table_privilege('authenticated', 'public.kesef_ledger', 'INSERT')
     or has_table_privilege('authenticated', 'public.kesef_ledger', 'UPDATE')
     or has_table_privilege('authenticated', 'public.kesef_ledger', 'DELETE') then
    raise exception 'ledger Kesef ainda permite mutação direta';
  end if;
  if has_table_privilege('authenticated', 'public.loja_pedidos', 'INSERT')
     or has_table_privilege('authenticated', 'public.loja_pedidos', 'UPDATE')
     or has_table_privilege('authenticated', 'public.loja_pedidos', 'DELETE') then
    raise exception 'pedidos da loja ainda permitem mutação direta';
  end if;
  if has_table_privilege('authenticated', 'public.convites_oracao', 'INSERT')
     or has_table_privilege('authenticated', 'public.convites_oracao', 'UPDATE')
     or has_table_privilege('authenticated', 'public.convites_oracao', 'DELETE') then
    raise exception 'convites ainda permitem mutação direta por ID';
  end if;

  -- Uma policy residual permissiva reabriria o objeto porque policies se somam com OR.
  select count(*) into v_count
  from pg_policies
  where schemaname = 'public' and tablename = 'mensagens'
    and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true');
  if v_count <> 0 then raise exception 'policy permissiva residual em mensagens'; end if;

  select count(*) into v_count
  from pg_policies
  where schemaname = 'public'
    and tablename in ('app_notificacoes', 'convites_oracao', 'kesef_ledger', 'loja_pedidos')
    and (coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true');
  if v_count <> 0 then raise exception 'policy permissiva residual em recurso privado'; end if;

  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'kesef_saldo'
      and c.reloptions @> array['security_invoker=true']
  ) then
    raise exception 'kesef_saldo não usa security_invoker';
  end if;

  v_def := pg_get_functiondef('public.creditar_kesef(uuid,text,integer,uuid)'::regprocedure);
  if v_def not like '%p_usuario_id is distinct from v_actor%'
     or v_def not like '%PERMISSAO_NEGADA%' then
    raise exception 'creditar_kesef não rejeita troca de usuario_id';
  end if;

  v_def := pg_get_functiondef('public.estornar_kesef(uuid,integer,uuid)'::regprocedure);
  if v_def not like '%economy.adjust%' or v_def not like '%PERMISSAO_NEGADA%' then
    raise exception 'estornar_kesef não exige permissão de economia';
  end if;

  if has_function_privilege('anon', 'public.creditar_kesef(uuid,text,integer,uuid)', 'EXECUTE')
     or has_function_privilege('anon', 'public.estornar_kesef(uuid,integer,uuid)', 'EXECUTE') then
    raise exception 'funções Kesef expostas a anon';
  end if;

  v_def := pg_get_functiondef('public.cancelar_convite_oracao(uuid)'::regprocedure);
  if v_def not like '%c.remetente_id = v_usuario%'
     or v_def not like '%c.id = p_convite_id%' then
    raise exception 'cancelamento de convite não vincula ID ao remetente autenticado';
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'estudos_pode_ler_curso'
      and coalesce(array_to_string(p.proconfig, ','), '') like 'search_path=%'
      and coalesce(array_to_string(p.proconfig, ','), '') not like '%public%'
  ) then
    raise exception 'estudos_pode_ler_curso sem search_path fechado';
  end if;
end;
$$;

select 'idor_hardening_negative_contract_checks_ok' as result;
rollback;
