# Auditoria de migrations — 01/08/2026

## Ambiente

- projeto Supabase: `csxrhvgfnkqmkehgmnkp`;
- fonte local: `app/supabase/migrations`;
- CLI utilizada: Supabase CLI 2.111.0;
- dados de usuários não foram exportados;
- segredos não foram exibidos nem registrados.

## Preflight

O histórico remoto possuía migrations até `20260730030000`. O dry-run apontou,
na ordem, três migrations pendentes:

1. `20260730130000_security_sentinel_phase1.sql`;
2. `20260801010000_mural_social_dev1.sql`;
3. `20260801133000_bloquear_auto_notificacoes.sql`.

Aplicar apenas o Mural não seria seguro porque quebraria a ordem histórica e
ignoraria a fundação Sentinela precedente.

## Aplicação

As três migrations foram aplicadas pelo fluxo `db push --linked`. A CLI encerrou
com código zero e registrou as três no histórico remoto.

## Validação

- `migration list --linked`: 24 migrations locais e remotas alinhadas;
- dump posterior somente dos schemas `public` e `storage` concluído;
- `public.mural_midias` e `public.mural_comentarios` presentes;
- PKs, FKs, índices, constraints e `REPLICA IDENTITY FULL` presentes;
- policies autenticadas para mídia e comentários presentes;
- policies do bucket privado `mural-media` presentes;
- `public.publicar_ebd_editorial_seguro(...)` presente;
- `public.security_events` e demais estruturas Sentinela presentes;
- migration do Mural contém inclusão idempotente das duas tabelas na publicação
  `supabase_realtime`;
- migration contém criação/atualização idempotente do bucket `mural-media`,
  privado, limite de 1.200.000 bytes e MIME types controlados.

## Estado funcional

A estrutura está disponível e a flag canônica foi ativada. A configuração
`.env.development.local` foi reconstruída pela CLI autenticada usando somente a
URL e a chave pública cliente do projeto; o valor da chave não foi exibido nem
registrado nesta auditoria. O WebApp respondeu HTTP 200 e o endpoint Auth do
Supabase respondeu HTTP 200 quando consultado com essa chave pública.

O teste funcional de criação de publicação, upload e comentário continua sendo
uma ação autenticada de usuário e deve ser executado pela interface.

## Contenção

Em caso de falha funcional, desativar `VITE_MURAL_SOCIAL_SCHEMA` no cliente
interrompe o uso das extensões do Mural sem excluir conteúdo. Qualquer rollback
destrutivo de schema exige migration específica e avaliação dos dados criados.
