# Memória de implementação — auditoria e correção sistêmica

## Estado atual

A implementação local está verde: 55/55 testes, lint sem erros e build/PWA
aprovado. O funcionamento completo do membro depende da aplicação remota da
migration de identidade/RLS.

## Invariante de identidade

Nunca usar `auth.users.id` como substituto de `public.usuarios.id`.

Fluxo obrigatório:

`auth.uid()` → `usuarios.auth_user_id` → `usuarios.id`

`getUserId()` deve falhar com `USER_PROFILE_NOT_LINKED` se esse vínculo não
existir. Não restaurar o fallback anterior.

## Migration pendente

Arquivo:

`supabase/migrations/20260726120000_correcao_identidade_e_rls.sql`

Ela não foi aplicada ao remoto porque
`20260722_sessoes_oracao_grupo.sql` ainda não está reconciliada no histórico.
Não executar `supabase db push` antes dessa reconciliação.

Ordem segura:

1. backup;
2. conferir histórico remoto;
3. reconciliar `20260722`;
4. auditar `auth_user_id` nulo/duplicado;
5. aplicar em homologação;
6. executar E2E;
7. promover para produção.

## Correções que não devem regredir

- `intercederPorPedido()` verifica todos os erros de banco;
- crédito Kesef/XP só ocorre após INSERT confirmado;
- Timer só inicia depois de validar convite aceito e participação;
- Chat não acessa Supabase diretamente e não mostra estado vazio em erro;
- Login/Admin possuem labels associados e botão de senha nomeado.

Teste sentinela:

`src/test/authService.test.ts`

Ele garante que o ID do perfil é retornado e que não existe fallback para o ID
de autenticação.

## Artefatos de auditoria

- `audit/relatorio-fluxos-2026-07-26.md`
- `audit/plano-acao-sistemico-2026-07-26.md`
- `audit/evidencias-2026-07-26/`
- `audit/evidencias-pos-correcao-2026-07-26/`
- `audit/run-e2e-audit.mjs`
- `audit/verificar-correcoes.mjs`

## Figma

Plugins instalados:

- oficial: `figma@openai-curated`;
- local: `figma-auditoria@personal`;
- skill: `$figma-audit-board`.

O plugin local está em `/home/pcnono/plugins/figma-auditoria`.

Retomar em uma nova conversa para carregar as novas ferramentas. Concluir OAuth
e pedir:

`Use $figma-audit-board para criar um FigJam com a auditoria do oracao-app usando audit/evidencias-2026-07-26.`

## Próxima ação recomendada

Primeiro criar o FigJam em uma nova conversa. Depois abrir uma sessão técnica
separada para reconciliar e aplicar a migration com coleta de evidências do
Supabase remoto.
