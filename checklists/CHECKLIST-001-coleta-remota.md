# CHECKLIST-001 — Coleta remota do estado do Supabase

**Versão:** 1.0  
**Status:** approved  
**SPEC associada:** [`SPEC-001`](../specs/SPEC-001-auditoria-estado-remoto-supabase.md)

## Regra de uso

Este checklist não autoriza a coleta. Ele só pode ser usado após o Gate 2 da
SPEC-001. Nenhum item permite alterar o banco, executar migrations, ler dados da
aplicação ou acessar segredos.

Usar uma cópia operacional fora do repositório para marcar os itens.

## 1. Aprovação

- [ ] SPEC-001 revisada e no estado `Approved`.
- [ ] Gate 2 autorizado pelo responsável pelo ambiente.
- [ ] Executor identificado.
- [ ] Data e janela da coleta registradas.
- [ ] Canal de escalonamento definido.
- [ ] Critérios P0 e de interrupção relidos.

## 2. Ambiente

- [ ] Projeto Supabase correto confirmado por duas referências independentes.
- [ ] Ambiente classificado explicitamente: produção, homologação ou
      desenvolvimento.
- [ ] Produção identificada visualmente antes de abrir o SQL Editor.
- [ ] Usuário SQL correto confirmado.
- [ ] Nenhuma chave `service_role` será usada como cliente HTTP.
- [ ] Nenhum terminal ou cliente está apontando para outro projeto.
- [ ] Backup e capacidade de recuperação confirmados pelo responsável.
- [ ] Não há migration, deploy ou manutenção concorrente na janela.

## 3. Estação de trabalho

- [ ] Diretório temporário local criado fora do repositório.
- [ ] Subdiretórios locais `raw/` e `sanitized/` criados.
- [ ] Diretório temporário não sincroniza com nuvem.
- [ ] Permissões locais restritas ao executor.
- [ ] Ferramenta de SHA-256 disponível.
- [ ] Espaço em disco suficiente.
- [ ] Captura automática de clipboard, terminal ou tela desativada quando
      aplicável.
- [ ] Nenhum CSV será salvo em `audit/` ou em outro diretório do Git.

## 4. Preparação da coleta

- [ ] Consultas copiadas diretamente da versão aprovada da SPEC.
- [ ] Nenhuma consulta foi editada ou combinada informalmente.
- [ ] Cada consulta será executada individualmente.
- [ ] Consultas Perfil E separadas das Perfil A.
- [ ] Está confirmado que não será usado `EXPLAIN ANALYZE`.
- [ ] Está confirmado que funções da aplicação não serão chamadas.
- [ ] Está confirmado que tabelas da aplicação não terão registros lidos.
- [ ] Está confirmado que corpos de funções não serão extraídos.

## 5. Execução

Para cada consulta:

- [ ] Conferir o identificador E/A da consulta.
- [ ] Conferir que o texto corresponde à SPEC aprovada.
- [ ] Executar somente a consulta atual.
- [ ] Verificar visualmente se a saída contém apenas metadados.
- [ ] Parar se aparecer dado de usuário, token, credencial ou valor inesperado.
- [ ] Exportar a grade diretamente para o arquivo correspondente em `raw/`.
- [ ] Registrar horário, executor, quantidade de linhas e resultado no
      manifesto local.
- [ ] Calcular e registrar SHA-256 do arquivo bruto.
- [ ] Não compartilhar, anexar ou copiar o CSV bruto.

## 6. Pausa obrigatória

Pausar antes da consulta seguinte e escalar se for observado:

- [ ] RLS ausente em tabela sensível.
- [ ] `SECURITY DEFINER` executável por `PUBLIC` ou `anon`.
- [ ] `CREATE` no schema `public` para `PUBLIC`, `anon` ou `authenticated`.
- [ ] Grant inesperado para `PUBLIC` sobre objeto da aplicação.
- [ ] Qualquer dado de usuário ou segredo na saída.
- [ ] Projeto ou papel diferente do esperado.
- [ ] Consulta modificada, erro de escopo ou dúvida sobre o resultado.

Não testar exploração. Não corrigir. Não continuar sem decisão registrada.

## 7. Retomada após pausa

- [ ] Responsável pelo ambiente recebeu o achado e o contexto disponível.
- [ ] Decisão de retomar ou encerrar foi registrada.
- [ ] Escopo autorizado para retomada está explícito.
- [ ] A retomada serve apenas para medir alcance por consultas já aprovadas.
- [ ] Não haverá exploração, prova de conceito ou correção durante a coleta.
- [ ] Nova janela e executor foram confirmados, se aplicável.

Sem autorização registrada, a coleta permanece pausada.

## 8. Sanitização

- [ ] Todos os arquivos brutos foram revisados apenas localmente.
- [ ] Nome real do banco foi removido ou substituído.
- [ ] IDs de projeto foram removidos.
- [ ] Papéis personalizados identificáveis foram sanitizados quando necessário.
- [ ] URLs e hostnames inesperados foram removidos.
- [ ] Literais semelhantes a telefone, e-mail, token ou segredo foram removidos.
- [ ] Nenhuma linha contém registro da aplicação.
- [ ] Cópias sanitizadas foram salvas em `sanitized/`.
- [ ] SHA-256 das cópias sanitizadas foi registrado.
- [ ] Uma segunda revisão local confirmou a sanitização.

## 9. Encerramento e descarte

- [ ] Todas as consultas executadas ou omitidas estão registradas.
- [ ] Falhas de permissão foram registradas sem tentativa de elevação.
- [ ] O manifesto não contém identificadores sensíveis.
- [ ] Somente material sanitizado foi separado para futura entrada em `audit/`.
- [ ] Nenhum arquivo bruto entrou no repositório.
- [ ] Nenhum conteúdo foi publicado em issue, PR ou chat.
- [ ] Status da auditoria atualizado para `Collected` ou `Sanitized`, conforme
      a etapa realmente concluída.
- [ ] Retenção necessária dos artefatos brutos foi decidida pelo responsável.
- [ ] Após a retenção aprovada, arquivos brutos foram apagados com método
      compatível com o meio de armazenamento.
- [ ] Diretório temporário e cópias auxiliares foram removidos.
- [ ] Lixeira local e destinos de sincronização foram conferidos.
- [ ] O descarte foi registrado sem incluir nomes ou conteúdos sensíveis.
- [ ] Próximo gate solicitado; nenhuma correção iniciada.
