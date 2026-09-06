-- O convite de oração é o sinalizador que conduz ambos os participantes
-- para a mesma sala. A inclusão idempotente evita falha em ambientes onde a
-- tabela já tenha sido habilitada manualmente no Realtime.
alter table public.convites_oracao replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'convites_oracao'
  ) then
    alter publication supabase_realtime add table public.convites_oracao;
  end if;
end;
$$;
