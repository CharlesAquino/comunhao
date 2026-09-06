begin;

do $$
declare
  v_table text;
  v_privilege text;
begin
  foreach v_table in array array[
    'usuarios', 'pedidos', 'intercessoes', 'mensagens', 'app_notificacoes',
    'convites_oracao', 'kesef_ledger', 'loja_pedidos', 'oracao_jornadas',
    'estudos_trilhas', 'estudos_cursos', 'estudos_modulos', 'estudos_aulas',
    'estudos_aula_blocos', 'estudos_matriculas', 'estudos_aula_progresso',
    'estudos_certificados', 'estudos_curso_revisores',
    'estudos_curso_manifestacoes_pastorais', 'estudos_curso_fontes',
    'estudos_ai_execucoes'
  ] loop
    foreach v_privilege in array array['TRUNCATE', 'REFERENCES', 'TRIGGER', 'MAINTAIN'] loop
      if has_table_privilege('anon', 'public.' || v_table, v_privilege)
         or has_table_privilege('authenticated', 'public.' || v_table, v_privilege) then
        raise exception 'privilégio residual % em %', v_privilege, v_table;
      end if;
    end loop;
  end loop;

  if has_table_privilege('anon', 'public.mensagens', 'SELECT')
     or has_table_privilege('anon', 'public.kesef_ledger', 'SELECT')
     or has_table_privilege('anon', 'public.estudos_certificados', 'SELECT') then
    raise exception 'anon ainda acessa recurso privado';
  end if;

  if has_table_privilege('authenticated', 'public.mensagens', 'UPDATE')
     or has_table_privilege('authenticated', 'public.app_notificacoes', 'UPDATE') then
    raise exception 'UPDATE amplo voltou a mensagens/notificações';
  end if;
end;
$$;

select 'idor_least_privilege_checks_ok' as result;
rollback;
