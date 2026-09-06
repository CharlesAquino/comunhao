begin;

do $$
begin
  if to_regprocedure('public.admin_tem_permissao(text)') is null
    or to_regprocedure('public.admin_listar_metricas_contatos()') is null
    or to_regprocedure('public.admin_atualizar_participacao_sorteio(uuid,boolean)') is null
    or to_regprocedure('public.admin_listar_elegiveis_sorteio(timestamp with time zone)') is null
    or to_regprocedure('public.admin_aplicar_sorteio_circulo(jsonb)') is null
    or to_regprocedure('public.admin_notificar_sorteio_circulo(uuid[])') is null then
    raise exception 'uma ou mais funções administrativas estão ausentes';
  end if;
  if has_column_privilege('authenticated', 'public.usuarios', 'auth_user_id', 'SELECT')
    or has_column_privilege('authenticated', 'public.usuarios', 'codigo_indicacao', 'SELECT')
    or has_column_privilege('authenticated', 'public.usuarios', 'last_login', 'SELECT') then
    raise exception 'uma ou mais colunas internas continuam expostas';
  end if;
end;
$$;

select '1..1';
select 'ok 1 - permissões administrativas e colunas internas';
rollback;
