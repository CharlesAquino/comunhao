# SPEC-001 — Auditoria do Estado Remoto do Supabase

**Status:** Approved  
**Versão:** 1.0  
**Tipo:** diagnóstico de segurança, estritamente somente leitura  
**Execução autorizada por esta SPEC:** nenhuma  
**Ambiente-alvo futuro:** projeto Supabase remoto, após revisão humana  
**Data:** 2026-07-25

## 1. Objetivo

Definir uma coleta reproduzível e sanitizada dos metadados reais do banco
Supabase, sem presumir que os scripts SQL históricos do repositório representam
o estado remoto.

A coleta deverá responder:

1. quais relações existem;
2. onde RLS e `FORCE ROW LEVEL SECURITY` estão habilitados;
3. quais policies existem e quais expressões aplicam;
4. quais funções existem, suas assinaturas, proprietários e modo de segurança;
5. quem pode executar cada função;
6. quais privilégios existem sobre schemas, tabelas, views e sequences;
7. quais views, triggers, publications, extensões, constraints e índices existem;
8. quais grants alcançam `PUBLIC`, `anon`, `authenticated` e `service_role`;
9. quais configurações de `search_path` afetam sessão, funções, banco ou papéis.

Esta SPEC não corrige vulnerabilidades. Ela produz evidência para uma futura
matriz de riscos confirmados.

## 2. Restrições obrigatórias

- Não executar migrations ou scripts SQL do repositório.
- Não criar tabelas temporárias, views, funções ou arquivos no banco.
- Não usar `INSERT`, `UPDATE`, `DELETE`, `MERGE`, `TRUNCATE`, `ALTER`, `CREATE`,
  `DROP`, `GRANT`, `REVOKE`, `COPY`, `CALL`, `DO`, `VACUUM` ou `ANALYZE`.
- Não invocar funções da aplicação, mesmo que pareçam somente leitura.
- Não consultar registros de tabelas da aplicação, `auth.users`,
  `storage.objects`, Vault ou tabelas de segredos.
- Não consultar corpos de funções com `pg_get_functiondef`.
- Não acessar `.env`, logs de autenticação, tokens, chaves ou configurações de
  Edge Functions.
- Não conectar com `service_role` por cliente HTTP.
- Não usar `EXPLAIN ANALYZE`, pois ele executa a consulta analisada.
- Não publicar os resultados brutos em issue, PR, chat ou commit.
- Interromper a coleta se qualquer consulta retornar dados de usuários,
  credenciais, tokens ou valores que não sejam metadados.

As consultas abaixo são `SELECT` de catálogos. Ainda assim, devem ser revisadas
antes da execução e executadas individualmente.

## 3. Perfis de execução

### Perfil E — SQL Editor

Consultas marcadas como **E** usam metadados normalmente visíveis no SQL Editor
do Supabase. O resultado pode variar conforme o papel efetivo da sessão.

Esse perfil é suficiente para o primeiro levantamento. Não exige conexão
externa nem uso de chave da API.

### Perfil A — administrativo

Consultas marcadas como **A** leem ACLs e configurações diretamente de
`pg_catalog`. Elas podem exigir o papel administrativo disponibilizado pelo SQL
Editor ou uma conexão PostgreSQL administrativa aprovada.

“Administrativo” não significa usar `service_role`: `service_role` é um papel
JWT/API e não deve ser usado como substituto de uma conexão PostgreSQL
administrativa.

Se uma consulta A falhar por permissão, registrar a falha. Não elevar
privilégios durante esta fase.

## 4. Envelope opcional de transação

Quando o cliente permitir executar toda uma coleta sem precisar baixar cada
grade separadamente, pode-se abrir uma transação somente leitura antes dos
`SELECT`s e encerrá-la sem commit:

```sql
BEGIN TRANSACTION READ ONLY;
```

Ao fim:

```sql
ROLLBACK;
```

Esses dois comandos apenas controlam a transação, mas não são necessários para
as consultas individuais. Se o SQL Editor dificultar a exportação dentro de uma
transação, executar apenas os `SELECT`s.

## 5. Convenções de filtro

Para o inventário amplo, considerar schemas não internos:

```text
pg_catalog
information_schema
pg_toast
```

devem ser excluídos, assim como schemas cujo nome começa com `pg_temp_` ou
`pg_toast_temp_`.

Para a reconciliação da aplicação, priorizar:

```text
public
auth
storage
realtime
extensions
```

Metadados de `auth`, `storage` e `realtime` podem ser inventariados, mas não
devem ser tratados como objetos mantidos pelo aplicativo sem evidência.

## 6. Consultas do Perfil E — SQL Editor

### E00 — Contexto não secreto da sessão

**Objetivo:** registrar versão do PostgreSQL e identidade SQL usada na coleta.  
**Risco:** baixo; nome do banco e papel podem identificar o projeto e devem ser
sanitizados antes de compartilhamento.

```sql
SELECT
  current_database() AS database_name,
  current_user AS current_role,
  session_user AS session_role,
  current_setting('server_version_num') AS server_version_num,
  current_setting('search_path') AS session_search_path;
```

### E01 — Schemas existentes

**Objetivo:** identificar namespaces que podem conter objetos relevantes.  
**Risco:** baixo; revela apenas nomes e proprietários de schemas.

```sql
SELECT
  n.nspname AS schema_name,
  pg_get_userbyid(n.nspowner) AS owner_name
FROM pg_catalog.pg_namespace AS n
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND n.nspname NOT LIKE 'pg_temp_%'
  AND n.nspname NOT LIKE 'pg_toast_temp_%'
ORDER BY n.nspname;
```

### E02 — Relações, proprietários e flags de RLS

**Objetivo:** inventariar tabelas, tabelas particionadas, views,
materialized views, sequences e foreign tables, incluindo flags de RLS.  
**Risco:** baixo; não lê linhas das relações.

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS relation_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned_table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    WHEN 'S' THEN 'sequence'
    WHEN 'f' THEN 'foreign_table'
    ELSE c.relkind::text
  END AS relation_type,
  pg_get_userbyid(c.relowner) AS owner_name,
  c.relrowsecurity AS rls_enabled,
  c.relforcerowsecurity AS rls_forced,
  c.relpersistence AS persistence
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND n.nspname NOT LIKE 'pg_temp_%'
  AND n.nspname NOT LIKE 'pg_toast_temp_%'
ORDER BY n.nspname, relation_type, c.relname;
```

### E03 — Policies de RLS

**Objetivo:** capturar todas as policies, papéis, comandos e expressões
`USING`/`WITH CHECK`.  
**Risco:** baixo; expressões podem conter literais operacionais e devem ser
revisadas na sanitização.

```sql
SELECT
  schemaname AS schema_name,
  tablename AS table_name,
  policyname AS policy_name,
  permissive,
  roles,
  cmd,
  qual AS using_expression,
  with_check AS with_check_expression
FROM pg_catalog.pg_policies
ORDER BY schemaname, tablename, policyname;
```

### E04 — Funções e assinaturas, sem corpo

**Objetivo:** identificar funções, procedures, argumentos, retorno,
proprietário, volatilidade, paralelismo e `SECURITY DEFINER`.  
**Risco:** baixo; não extrai código-fonte. Argumentos e tipos podem revelar
nomes internos, mas não dados.

```sql
SELECT
  n.nspname AS schema_name,
  p.proname AS routine_name,
  p.oid::regprocedure::text AS identity_signature,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_result(p.oid) AS result_type,
  CASE p.prokind
    WHEN 'f' THEN 'function'
    WHEN 'p' THEN 'procedure'
    WHEN 'a' THEN 'aggregate'
    WHEN 'w' THEN 'window'
    ELSE p.prokind::text
  END AS routine_kind,
  pg_get_userbyid(p.proowner) AS owner_name,
  p.prosecdef AS security_definer,
  p.proleakproof AS leakproof,
  p.provolatile AS volatility,
  p.proparallel AS parallel_mode,
  p.proconfig IS NOT NULL AS has_function_config
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND n.nspname NOT LIKE 'pg_temp_%'
  AND n.nspname NOT LIKE 'pg_toast_temp_%'
ORDER BY n.nspname, p.proname, identity_signature;
```

### E05 — Configuração `search_path` por função

**Objetivo:** localizar funções com `search_path` fixado ou outras opções
locais, expondo apenas entradas relacionadas a `search_path`.  
**Risco:** baixo; não exibe outras configurações que eventualmente contenham
informação sensível.

```sql
SELECT
  n.nspname AS schema_name,
  p.oid::regprocedure::text AS identity_signature,
  cfg.setting AS function_search_path
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
CROSS JOIN LATERAL unnest(COALESCE(p.proconfig, ARRAY[]::text[])) AS cfg(setting)
WHERE cfg.setting LIKE 'search_path=%'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, identity_signature;
```

### E06 — Privilégios visíveis de tabelas e views

**Objetivo:** obter grants que a sessão consegue enxergar por
`information_schema`.  
**Risco:** baixo; pode ser incompleto para grants fora do alcance da sessão.

```sql
SELECT
  table_schema AS schema_name,
  table_name,
  grantor,
  grantee,
  privilege_type,
  is_grantable,
  with_hierarchy
FROM information_schema.table_privileges
WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_schema, table_name, grantee, privilege_type;
```

### E07 — Privilégios visíveis de sequences

**Objetivo:** verificar `USAGE`, `SELECT` e `UPDATE` em sequences.  
**Risco:** baixo; pode ser incompleto conforme o papel da sessão.

```sql
SELECT
  object_schema AS schema_name,
  object_name AS sequence_name,
  grantor,
  grantee,
  privilege_type,
  is_grantable
FROM information_schema.usage_privileges
WHERE object_type = 'SEQUENCE'
  AND object_schema NOT IN ('pg_catalog', 'information_schema')
ORDER BY object_schema, object_name, grantee, privilege_type;
```

### E08 — Views e opções de segurança

**Objetivo:** identificar `security_invoker`, `security_barrier`, check option
e proprietário. Não coleta a definição SQL nesta etapa.  
**Risco:** baixo.

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS view_name,
  pg_get_userbyid(c.relowner) AS owner_name,
  c.reloptions,
  COALESCE(
    EXISTS (
      SELECT 1
      FROM unnest(COALESCE(c.reloptions, ARRAY[]::text[])) AS opt
      WHERE opt = 'security_invoker=true'
    ),
    false
  ) AS security_invoker,
  COALESCE(
    EXISTS (
      SELECT 1
      FROM unnest(COALESCE(c.reloptions, ARRAY[]::text[])) AS opt
      WHERE opt = 'security_barrier=true'
    ),
    false
  ) AS security_barrier,
  v.check_option
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
LEFT JOIN information_schema.views AS v
  ON v.table_schema = n.nspname
 AND v.table_name = c.relname
WHERE c.relkind = 'v'
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname;
```

Se uma view desconhecida precisar ser reconciliada, sua definição poderá ser
coletada em uma segunda rodada aprovada. Não coletar definições por padrão, pois
elas podem conter literais ou referências operacionais.

### E09 — Triggers sem corpo da função

**Objetivo:** identificar triggers habilitados, evento, timing e função
associada.  
**Risco:** baixo; `pg_get_triggerdef` revela somente a declaração do trigger,
não o corpo da função.

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  t.tgname AS trigger_name,
  t.tgenabled AS enabled_mode,
  pn.nspname AS function_schema,
  p.oid::regprocedure::text AS function_signature,
  pg_get_triggerdef(t.oid, true) AS trigger_definition
FROM pg_catalog.pg_trigger AS t
JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
JOIN pg_catalog.pg_proc AS p ON p.oid = t.tgfoid
JOIN pg_catalog.pg_namespace AS pn ON pn.oid = p.pronamespace
WHERE NOT t.tgisinternal
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname, t.tgname;
```

### E10 — Publications e tabelas publicadas

**Objetivo:** confirmar objetos expostos ao Realtime e operações publicadas.  
**Risco:** baixo.

```sql
SELECT
  p.pubname AS publication_name,
  pg_get_userbyid(p.pubowner) AS owner_name,
  p.puballtables AS all_tables,
  p.pubinsert AS publishes_insert,
  p.pubupdate AS publishes_update,
  p.pubdelete AS publishes_delete,
  p.pubtruncate AS publishes_truncate
FROM pg_catalog.pg_publication AS p
ORDER BY p.pubname;
```

```sql
SELECT
  pubname AS publication_name,
  schemaname AS schema_name,
  tablename AS table_name
FROM pg_catalog.pg_publication_tables
ORDER BY pubname, schemaname, tablename;
```

### E11 — Extensões instaladas

**Objetivo:** registrar extensões, versões e schemas.  
**Risco:** baixo.

```sql
SELECT
  e.extname AS extension_name,
  e.extversion AS installed_version,
  n.nspname AS schema_name,
  pg_get_userbyid(e.extowner) AS owner_name,
  e.extrelocatable AS relocatable
FROM pg_catalog.pg_extension AS e
JOIN pg_catalog.pg_namespace AS n ON n.oid = e.extnamespace
ORDER BY e.extname;
```

### E12 — Constraints

**Objetivo:** inventariar PKs, FKs, unicidade, checks e exclusões, inclusive
estado de validação.  
**Risco:** baixo; definições podem conter literais de domínio, não registros.

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS table_name,
  con.conname AS constraint_name,
  CASE con.contype
    WHEN 'p' THEN 'primary_key'
    WHEN 'f' THEN 'foreign_key'
    WHEN 'u' THEN 'unique'
    WHEN 'c' THEN 'check'
    WHEN 'x' THEN 'exclusion'
    WHEN 'n' THEN 'not_null'
    ELSE con.contype::text
  END AS constraint_type,
  con.convalidated AS validated,
  con.condeferrable AS deferrable,
  con.condeferred AS initially_deferred,
  pg_get_constraintdef(con.oid, true) AS constraint_definition
FROM pg_catalog.pg_constraint AS con
JOIN pg_catalog.pg_class AS c ON c.oid = con.conrelid
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname, con.conname;
```

### E13 — Índices

**Objetivo:** identificar índices, unicidade, validade, readiness, método e
definição.  
**Risco:** baixo; predicados e expressões podem conter literais e precisam de
revisão antes de compartilhamento.

```sql
SELECT
  ns.nspname AS schema_name,
  tbl.relname AS table_name,
  idx.relname AS index_name,
  am.amname AS access_method,
  i.indisunique AS is_unique,
  i.indisprimary AS is_primary,
  i.indisvalid AS is_valid,
  i.indisready AS is_ready,
  i.indislive AS is_live,
  pg_get_indexdef(i.indexrelid) AS index_definition
FROM pg_catalog.pg_index AS i
JOIN pg_catalog.pg_class AS idx ON idx.oid = i.indexrelid
JOIN pg_catalog.pg_class AS tbl ON tbl.oid = i.indrelid
JOIN pg_catalog.pg_namespace AS ns ON ns.oid = tbl.relnamespace
JOIN pg_catalog.pg_am AS am ON am.oid = idx.relam
WHERE ns.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY ns.nspname, tbl.relname, idx.relname;
```

## 7. Consultas do Perfil A — ACLs e configuração administrativa

### A01 — EXECUTE efetivo declarado nas ACLs das funções

**Objetivo:** expandir `proacl`, incluindo privilégios padrão quando `proacl`
for nulo, para descobrir quem recebeu `EXECUTE`.  
**Risco:** baixo. Exige visibilidade adequada de catálogos.

```sql
SELECT
  n.nspname AS schema_name,
  p.oid::regprocedure::text AS identity_signature,
  pg_get_userbyid(p.proowner) AS owner_name,
  p.prosecdef AS security_definer,
  CASE
    WHEN acl.grantee = 0 THEN 'PUBLIC'
    ELSE pg_get_userbyid(acl.grantee)
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_catalog.pg_proc AS p
JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(p.proacl, acldefault('f', p.proowner))
) AS acl
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, identity_signature, grantee;
```

Na análise, destacar todas as funções `SECURITY DEFINER` executáveis por
`PUBLIC`, `anon` ou `authenticated`.

### A02 — ACLs de tabelas, views, materialized views e sequences

**Objetivo:** obter grants diretamente de `relacl`, inclusive `PUBLIC`, sem
depender da filtragem do `information_schema`.  
**Risco:** baixo.

```sql
SELECT
  n.nspname AS schema_name,
  c.relname AS object_name,
  CASE c.relkind
    WHEN 'r' THEN 'table'
    WHEN 'p' THEN 'partitioned_table'
    WHEN 'v' THEN 'view'
    WHEN 'm' THEN 'materialized_view'
    WHEN 'S' THEN 'sequence'
    WHEN 'f' THEN 'foreign_table'
    ELSE c.relkind::text
  END AS object_type,
  pg_get_userbyid(c.relowner) AS owner_name,
  CASE
    WHEN acl.grantee = 0 THEN 'PUBLIC'
    ELSE pg_get_userbyid(acl.grantee)
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_catalog.pg_class AS c
JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
CROSS JOIN LATERAL aclexplode(
  COALESCE(c.relacl, acldefault(
    CASE WHEN c.relkind = 'S' THEN 'S'::"char" ELSE 'r'::"char" END,
    c.relowner
  ))
) AS acl
WHERE c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
  AND n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
ORDER BY n.nspname, c.relname, grantee, acl.privilege_type;
```

### A03 — ACLs de schemas

**Objetivo:** confirmar `USAGE` e principalmente `CREATE` em schemas como
`public`.  
**Risco:** baixo.

```sql
SELECT
  n.nspname AS schema_name,
  pg_get_userbyid(n.nspowner) AS owner_name,
  CASE
    WHEN acl.grantee = 0 THEN 'PUBLIC'
    ELSE pg_get_userbyid(acl.grantee)
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_catalog.pg_namespace AS n
CROSS JOIN LATERAL aclexplode(
  COALESCE(n.nspacl, acldefault('n', n.nspowner))
) AS acl
WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
  AND n.nspname NOT LIKE 'pg_temp_%'
  AND n.nspname NOT LIKE 'pg_toast_temp_%'
ORDER BY n.nspname, grantee, acl.privilege_type;
```

`CREATE` para `PUBLIC`, `anon` ou `authenticated` em `public` deve ser tratado
como achado de alta prioridade, especialmente diante de funções
`SECURITY DEFINER` com `search_path = public`.

### A04 — Privilégios padrão

**Objetivo:** descobrir grants que serão herdados por objetos criados no
futuro.  
**Risco:** baixo.

```sql
SELECT
  pg_get_userbyid(d.defaclrole) AS owner_name,
  COALESCE(n.nspname, '(all schemas)') AS schema_name,
  CASE d.defaclobjtype
    WHEN 'r' THEN 'table'
    WHEN 'S' THEN 'sequence'
    WHEN 'f' THEN 'function'
    WHEN 'T' THEN 'type'
    WHEN 'n' THEN 'schema'
    ELSE d.defaclobjtype::text
  END AS object_type,
  CASE
    WHEN acl.grantee = 0 THEN 'PUBLIC'
    ELSE pg_get_userbyid(acl.grantee)
  END AS grantee,
  acl.privilege_type,
  acl.is_grantable
FROM pg_catalog.pg_default_acl AS d
LEFT JOIN pg_catalog.pg_namespace AS n ON n.oid = d.defaclnamespace
CROSS JOIN LATERAL aclexplode(d.defaclacl) AS acl
ORDER BY owner_name, schema_name, object_type, grantee, acl.privilege_type;
```

### A05 — Grants focados nos quatro papéis críticos

**Objetivo:** produzir uma visão resumida e verificável para `PUBLIC`, `anon`,
`authenticated` e `service_role`.  
**Risco:** baixo. Esta consulta mede privilégios explícitos/padrão de funções;
deve ser cruzada com A02 e A03 para relações e schemas.

```sql
WITH function_acl AS (
  SELECT
    n.nspname AS schema_name,
    p.oid::regprocedure::text AS object_name,
    'function'::text AS object_type,
    p.prosecdef AS security_definer,
    CASE
      WHEN acl.grantee = 0 THEN 'PUBLIC'
      ELSE pg_get_userbyid(acl.grantee)
    END AS grantee,
    acl.privilege_type
  FROM pg_catalog.pg_proc AS p
  JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
  CROSS JOIN LATERAL aclexplode(
    COALESCE(p.proacl, acldefault('f', p.proowner))
  ) AS acl
  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')
)
SELECT
  schema_name,
  object_type,
  object_name,
  security_definer,
  grantee,
  privilege_type
FROM function_acl
WHERE grantee IN ('PUBLIC', 'anon', 'authenticated', 'service_role')
ORDER BY schema_name, object_name, grantee;
```

### A06 — Configurações de `search_path` por banco e papel

**Objetivo:** localizar overrides persistentes de `search_path` sem exibir
outras configurações.  
**Risco:** baixo; nomes de banco e papéis devem ser sanitizados.

```sql
SELECT
  CASE
    WHEN s.setdatabase = 0 THEN '(all databases)'
    ELSE d.datname
  END AS database_name,
  CASE
    WHEN s.setrole = 0 THEN '(all roles)'
    ELSE r.rolname
  END AS role_name,
  cfg.setting AS search_path_setting
FROM pg_catalog.pg_db_role_setting AS s
LEFT JOIN pg_catalog.pg_database AS d ON d.oid = s.setdatabase
LEFT JOIN pg_catalog.pg_roles AS r ON r.oid = s.setrole
CROSS JOIN LATERAL unnest(s.setconfig) AS cfg(setting)
WHERE cfg.setting LIKE 'search_path=%'
ORDER BY database_name, role_name;
```

### A07 — Membership dos papéis críticos

**Objetivo:** verificar herança entre papéis sem listar atributos ou senhas.  
**Risco:** baixo; revela estrutura de autorização.

```sql
SELECT
  granted_role.rolname AS granted_role,
  member_role.rolname AS member_role,
  grantor_role.rolname AS grantor_role,
  membership.admin_option,
  membership.inherit_option,
  membership.set_option
FROM pg_catalog.pg_auth_members AS membership
JOIN pg_catalog.pg_roles AS granted_role
  ON granted_role.oid = membership.roleid
JOIN pg_catalog.pg_roles AS member_role
  ON member_role.oid = membership.member
JOIN pg_catalog.pg_roles AS grantor_role
  ON grantor_role.oid = membership.grantor
WHERE granted_role.rolname IN ('anon', 'authenticated', 'service_role')
   OR member_role.rolname IN ('anon', 'authenticated', 'service_role')
ORDER BY granted_role.rolname, member_role.rolname;
```

Se a versão PostgreSQL não expuser `inherit_option` ou `set_option` nessa view,
registrar a incompatibilidade e executar uma variante aprovada que selecione
somente `admin_option`. Não improvisar durante a coleta.

## 8. Consultas deliberadamente excluídas

Não fazem parte desta coleta:

- `SELECT *` em qualquer tabela da aplicação;
- consultas em `auth.users`, identidades, sessões ou tokens;
- consultas em Vault ou secrets;
- `pg_get_functiondef`, `prosrc` ou código-fonte de funções;
- conteúdo de buckets ou `storage.objects`;
- estatísticas com textos de queries, como `pg_stat_activity` ou
  `pg_stat_statements`;
- logs de Edge Functions;
- configurações completas de papéis/banco além de `search_path`;
- testes de exploração ou chamadas RPC.

## 9. Matriz de resultados esperada

Cada arquivo exportado deve corresponder a exatamente uma consulta:

| ID | Nome sugerido |
|---|---|
| E00 | `E00-contexto.csv` |
| E01 | `E01-schemas.csv` |
| E02 | `E02-relacoes-rls.csv` |
| E03 | `E03-policies.csv` |
| E04 | `E04-funcoes.csv` |
| E05 | `E05-function-search-path.csv` |
| E06 | `E06-table-privileges.csv` |
| E07 | `E07-sequence-privileges.csv` |
| E08 | `E08-views.csv` |
| E09 | `E09-triggers.csv` |
| E10a | `E10a-publications.csv` |
| E10b | `E10b-publication-tables.csv` |
| E11 | `E11-extensions.csv` |
| E12 | `E12-constraints.csv` |
| E13 | `E13-indexes.csv` |
| A01 | `A01-function-execute.csv` |
| A02 | `A02-relation-acls.csv` |
| A03 | `A03-schema-acls.csv` |
| A04 | `A04-default-privileges.csv` |
| A05 | `A05-critical-role-function-grants.csv` |
| A06 | `A06-search-path-settings.csv` |
| A07 | `A07-role-membership.csv` |

## 10. Salvamento e sanitização

### 10.1 Diretório de trabalho

Os resultados não devem ser salvos dentro do repositório por padrão. Usar um
diretório temporário local com acesso restrito, por exemplo:

```text
auditoria-supabase-AAAA-MM-DD/
├── raw/
├── sanitized/
├── manifest.txt
└── review-notes.md
```

O diretório `raw/` não deve ser sincronizado com nuvem, anexado a tickets ou
versionado.

### 10.2 Processo

1. Baixar cada grade como CSV, sem copiar e colar em chat.
2. Registrar no manifesto: ID da consulta, horário, executor e quantidade de
   linhas.
3. Calcular hash SHA-256 de cada arquivo bruto para preservar integridade.
4. Revisar os arquivos brutos localmente.
5. Criar cópias sanitizadas em `sanitized/`.
6. Remover ou substituir:
   - nome real do banco;
   - IDs do projeto;
   - nomes de papéis personalizados que identifiquem pessoas;
   - URLs, hostnames ou referências externas inesperadas;
   - literais que pareçam telefone, e-mail, token ou segredo;
   - qualquer linha que não seja claramente metadado.
7. Calcular hashes também das cópias sanitizadas.
8. Compartilhar apenas o conjunto sanitizado e o manifesto sem identificadores.

### 10.3 Critério de interrupção

Se qualquer saída contiver valores de usuário ou segredos:

1. parar;
2. não copiar o valor;
3. excluir a exportação compartilhável;
4. manter apenas uma nota local dizendo qual consulta produziu conteúdo
   inesperado;
5. revisar a consulta antes de nova execução.

Se a coleta demonstrar qualquer uma das condições abaixo, pausar imediatamente
antes da próxima consulta e escalar o achado ao responsável pela segurança:

- RLS ausente em tabela sensível;
- função `SECURITY DEFINER` executável por `PUBLIC` ou `anon`;
- privilégio `CREATE` no schema `public` concedido a `PUBLIC`, `anon` ou
  `authenticated`;
- grant inesperado para `PUBLIC` sobre objeto da aplicação.

Essa pausa não autoriza contenção, exploração adicional ou mudança no banco. O
responsável decide se a coleta pode continuar para medir o alcance ou se deve
ser aberta uma SPEC emergencial de contenção.

## 11. Critérios de comparação com o repositório

A comparação deve tratar o remoto como fato operacional e os SQLs locais como
histórico não confiável.

### 11.1 Chaves de comparação

- Relação: `(schema, nome, tipo)`.
- Policy: `(schema, tabela, nome, comando, permissive, roles, USING, WITH CHECK)`.
- Função: `(schema, nome, argumentos de identidade)`.
- Grant: `(tipo do objeto, schema, objeto/assinatura, grantee, privilégio,
  grantable)`.
- Constraint: `(schema, tabela, nome, tipo, definição)`.
- Índice: `(schema, tabela, nome, definição)`.
- Trigger: `(schema, tabela, nome, função, definição)`.
- Publication: `(publication, schema, tabela)`.

Antes de comparar expressões, normalizar apenas espaços em branco e
capitalização não semântica. Não remover casts, qualificadores de schema ou
parênteses sem análise.

### 11.2 Classificação de divergências

- **Remoto somente:** objeto existe no banco, mas não há declaração local
  correspondente.
- **Local somente:** objeto está em SQL local, mas não aparece no remoto.
- **Mesmo nome, definição diferente:** possível substituição parcial ou drift.
- **Duplicidade histórica:** múltiplos arquivos locais redefinem a mesma
  assinatura.
- **Policy residual:** policy remota não pertence ao conjunto canônico
  proposto.
- **Grant residual:** privilégio remoto não possui justificativa explícita.
- **Dependência quebrada:** função remota referencia modelo de identidade ou
  coluna incompatível com as relações atuais.

### 11.3 Regras específicas de segurança

Marcar como risco confirmado se a coleta demonstrar:

- `SECURITY DEFINER` executável por `PUBLIC` ou `anon`;
- RPC pessoal privilegiada executável por `authenticated` que recebe
  `p_usuario_id` sem controle server-side demonstrável;
- tabela de aplicação sem RLS;
- tabela sensível com RLS habilitada, mas com policy `USING (true)` ou
  `WITH CHECK (true)` para papéis públicos;
- policies antigas permissivas coexistindo com policies novas;
- `CREATE` em schema `public` para `PUBLIC`, `anon` ou `authenticated`;
- view exposta sem `security_invoker` quando depender de RLS da tabela base;
- grants diretos que permitem contornar a API/RPC esperada;
- função privilegiada com `search_path` mutável ou inseguro;
- tabela sensível incluída no Realtime sem justificativa e policy adequada.

Marcar como **não confirmado** quando a conclusão depender do corpo da função.
Uma segunda fase poderá revisar corpos específicos, com aprovação e
sanitização próprias.

## 12. Severidade dos achados

| Nível | Critério operacional |
|---|---|
| **P0** | Risco plausível de comprometimento ativo, acesso administrativo indevido, exposição de segredos ou alteração não autorizada de dados. Produção e coleta devem ser pausadas e escaladas. |
| **P1** | Vulnerabilidade confirmada que precisa ser corrigida antes da próxima release. |
| **P2** | Fraqueza de segurança ou governança que deve ser corrigida no ciclo de estabilização atual. |
| **P3** | Hardening, dívida técnica ou melhoria sem risco imediato demonstrado. |

A severidade deve ser atribuída somente a partir de evidência coletada. Uma
hipótese local sem confirmação remota permanece como “inconclusiva”, sem
severidade operacional definitiva.

## 13. Limitações

Mesmo após a coleta, esta auditoria não demonstrará:

- a lógica interna das Edge Functions;
- a correção das regras de negócio;
- a ausência de bugs no frontend ou nos serviços;
- a explorabilidade prática de um achado;
- controles externos de API gateway, WAF, rate limit ou infraestrutura;
- o histórico de incidentes, acessos ou uso de credenciais;
- o conteúdo ou a segurança de dados armazenados.

A auditoria responde principalmente “quais capacidades e permissões o banco
declara”. Ela não responde, isoladamente, “o sistema é explorável”.

## 14. Entregáveis da coleta futura

1. Manifesto das consultas executadas e falhas.
2. Conjunto de CSVs sanitizados.
3. Inventário remoto consolidado.
4. Diff remoto versus declarações locais.
5. Matriz de riscos com estados:
   - confirmado;
   - refutado;
   - inconclusivo;
   - não aplicável.
6. Lista priorizada de correções, ainda sem executá-las.

## 15. Gates de aprovação

- **Gate 1 — revisão desta SPEC:** confirmar que todas as consultas são
  somente leitura e não expõem dados.
- **Gate 2 — autorização de coleta:** aprovar projeto, executor, janela e
  armazenamento local.
- **Gate 3 — revisão dos resultados brutos:** realizada localmente por pessoa
  autorizada.
- **Gate 4 — liberação do conjunto sanitizado:** somente após inspeção.
- **Gate 5 — matriz de riscos confirmados:** nenhuma migration deve ser escrita
  antes deste gate.

## 16. Sequência posterior, fora do escopo desta SPEC

```text
Estado remoto real
        ↓
Matriz de riscos confirmados
        ↓
Rotação de segredos
        ↓
Bloqueio emergencial de RPCs e endpoints
        ↓
Modelo único de identidade
        ↓
RLS e grants canônicos
        ↓
Recompensas atômicas no servidor
        ↓
Baseline de migrations
        ↓
Testes negativos de segurança
```

Nenhuma etapa dessa sequência é autorizada pela criação deste documento.
