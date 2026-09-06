do $$
begin
  if not has_column_privilege('authenticated', 'public.usuarios', 'perfil_capa', 'select') then
    raise exception 'authenticated sem SELECT em usuarios.perfil_capa';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'usuarios_publicos'
      and column_name = 'perfil_capa'
  ) then
    raise exception 'usuarios_publicos.perfil_capa ausente';
  end if;
end;
$$;

select 'perfil_capa_permissions_ok' as result;
