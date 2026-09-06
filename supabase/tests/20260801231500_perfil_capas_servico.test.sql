do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'usuarios' and column_name = 'perfil_capa'
  ) then
    raise exception 'usuarios.perfil_capa ausente';
  end if;
end;
$$;

select 'perfil_capas_servico_ok' as result;
