-- Permite que uma publicação editorial atualize a aba EBD sem novo APK
-- e sem exigir que o jovem feche e abra novamente a tela.

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'ebd_editorial_lessons'
  ) then
    alter publication supabase_realtime
      add table public.ebd_editorial_lessons;
  end if;
end;
$$;
