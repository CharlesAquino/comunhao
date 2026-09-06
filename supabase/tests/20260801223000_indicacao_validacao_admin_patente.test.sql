do $$
begin
  if to_regclass('public.indicacao_validacoes') is null then
    raise exception 'indicacao_validacoes ausente';
  end if;
  if to_regprocedure('public.admin_validar_membro_indicado(uuid,text)') is null then
    raise exception 'RPC de validacao ausente';
  end if;
  if to_regprocedure('public.obter_programa_indicacao()') is null then
    raise exception 'RPC do programa de indicacao ausente';
  end if;
  if public.indicacao_bonus_por_xp(0) <> 5
     or public.indicacao_bonus_por_xp(300) <> 10
     or public.indicacao_bonus_por_xp(18500) <> 40 then
    raise exception 'progressao por patente incorreta';
  end if;
end;
$$;

select 'indicacao_validacao_admin_patente_ok' as result;
