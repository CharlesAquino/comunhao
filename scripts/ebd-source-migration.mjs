// Alvo e migration fixos: não aplica migrations pendentes de outras tarefas.
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const ref = 'csxrhvgfnkqmkehgmnkp';
const version = '20260907030000';
const cli = process.env.EBD_SUPABASE_CLI;
if (!cli) throw new Error('Informe EBD_SUPABASE_CLI com o caminho da CLI.');
if (readFileSync('supabase/.temp/project-ref', 'utf8').trim() !== ref) throw new Error('Projeto vinculado divergente.');
const mode = process.argv[2];
const migration = readFileSync(`supabase/migrations/${version}_ebd_source_days.sql`, 'utf8');
const checks = `
do $$ begin
  if to_regprocedure('public.admin_tem_permissao(text)') is null then raise exception 'Permissão ausente'; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='ebd_editorial_lessons' and column_name='id' and data_type='text') then raise exception 'FK incompatível'; end if;
  if to_regclass('public.ebd_source_days') is not null then raise exception 'Tabela já existe'; end if;
end $$;`;
let sql;
if (mode === 'preflight') {
  sql = `select to_regclass('public.ebd_source_days') as target, to_regprocedure('public.admin_tem_permissao(text)') as permission_function,
  (select data_type from information_schema.columns where table_schema='public' and table_name='ebd_editorial_lessons' and column_name='id') as lesson_id_type,
  (select count(*) from supabase_migrations.schema_migrations where version='${version}') as history_entries;`;
} else if (mode === 'dry-run' || mode === 'apply') {
  const history = mode === 'apply' ? `insert into supabase_migrations.schema_migrations(version,name,statements) values ('${version}','ebd_source_days',array['${migration.replaceAll("'", "''")}']);` : '';
  sql = `begin; set local lock_timeout = '5s'; ${checks} ${migration} ${history}
  do $$ begin
    if has_table_privilege('anon','public.ebd_source_days','SELECT') then raise exception 'Acesso anônimo indevido'; end if;
    if has_table_privilege('authenticated','public.ebd_source_days','UPDATE') or has_table_privilege('authenticated','public.ebd_source_days','DELETE') then raise exception 'Revisão mutável'; end if;
    if not exists(select 1 from pg_class where oid='public.ebd_source_days'::regclass and relrowsecurity) then raise exception 'RLS desativada'; end if;
  end $$; ${mode === 'apply' ? 'commit' : 'rollback'}; select '${mode}' as result;`;
} else if (mode === 'verify') {
  sql = `select c.relrowsecurity as rls, (select count(*) from pg_policies where schemaname='public' and tablename='ebd_source_days') as policies,
  has_table_privilege('anon',c.oid,'SELECT') as anon_read, has_table_privilege('authenticated',c.oid,'UPDATE') as can_update,
  (select count(*) from public.ebd_source_days) as imported_days,
  (select count(*) from supabase_migrations.schema_migrations where version='${version}') as history_entries
  from pg_class c where c.oid=to_regclass('public.ebd_source_days');`;
} else throw new Error('Use preflight, dry-run, apply ou verify.');
process.stdout.write(execFileSync(cli, ['db', 'query', '--project-ref', ref, '--linked', sql, '--output', 'json'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
