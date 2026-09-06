-- Menor privilégio complementar ao RLS.
-- TRUNCATE, REFERENCES, TRIGGER e MAINTAIN não são operações do cliente e
-- algumas delas não são contidas pelas policies de linha.

-- Perfil mantém os grants de leitura por coluna definidos pela migration de
-- privacidade; remove somente capacidades de escrita/DDL residuais.
revoke all on public.usuarios from anon;
revoke insert, update, delete, truncate, references, trigger, maintain
on public.usuarios from authenticated;
grant update (nome, foto_url, perfil_capa, status_anel)
on public.usuarios to authenticated;

revoke all on public.pedidos, public.intercessoes from anon;
revoke all on public.pedidos, public.intercessoes from authenticated;
grant select, insert, update, delete on public.pedidos to authenticated;
grant select, insert, delete on public.intercessoes to authenticated;

revoke all on public.mensagens from anon, authenticated;
grant select on public.mensagens to authenticated;
grant insert (remetente_id, destinatario_id, texto, tipo, figurinha_id, figurinha_pacote)
on public.mensagens to authenticated;
grant update (lida) on public.mensagens to authenticated;

revoke all on public.app_notificacoes from anon, authenticated;
grant select on public.app_notificacoes to authenticated;
grant update (lida) on public.app_notificacoes to authenticated;

revoke all on public.convites_oracao from anon, authenticated;
grant select on public.convites_oracao to authenticated;

revoke all on public.kesef_ledger from anon, authenticated;
grant select on public.kesef_ledger to authenticated;

revoke all on public.kesef_saldo from anon, authenticated;
grant select on public.kesef_saldo to authenticated;

revoke all on public.loja_pedidos from anon, authenticated;
grant select on public.loja_pedidos to authenticated;

revoke all on public.oracao_jornadas from anon, authenticated;
grant select, insert, update on public.oracao_jornadas to authenticated;

-- Comunhão Estudos não possui superfície anônima. O papel authenticated
-- recebe apenas os verbos que possuem policies correspondentes.
revoke all on
  public.estudos_trilhas,
  public.estudos_cursos,
  public.estudos_modulos,
  public.estudos_aulas,
  public.estudos_aula_blocos,
  public.estudos_matriculas,
  public.estudos_aula_progresso,
  public.estudos_certificados,
  public.estudos_curso_revisores,
  public.estudos_curso_manifestacoes_pastorais,
  public.estudos_curso_fontes,
  public.estudos_ai_execucoes
from anon, authenticated;

grant select, insert, update, delete on
  public.estudos_trilhas,
  public.estudos_cursos,
  public.estudos_modulos,
  public.estudos_aulas,
  public.estudos_aula_blocos,
  public.estudos_curso_revisores,
  public.estudos_curso_fontes
to authenticated;

grant select on
  public.estudos_matriculas,
  public.estudos_aula_progresso,
  public.estudos_certificados,
  public.estudos_ai_execucoes
to authenticated;

grant select, insert, update
on public.estudos_curso_manifestacoes_pastorais
to authenticated;
