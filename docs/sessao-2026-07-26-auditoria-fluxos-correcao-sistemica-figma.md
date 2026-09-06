# Sessão 26/07 — Auditoria de fluxos, correção sistêmica e Figma

**Status:** implementação local concluída; ativação remota pendente  
**Data:** 2026-07-26  
**Escopo:** testes ponta a ponta, identidade/RLS, Mural, Timer, Chat,
acessibilidade e integração Figma

## Objetivo

Testar os fluxos do aplicativo desde a autenticação até inserções de dados,
registrar evidências, corrigir as falhas sistêmicas encontradas e preparar um
conector Figma para apresentar a auditoria.

## Auditoria funcional

O app foi executado localmente com Vite e inspecionado no Chrome headless via
Playwright Core, em viewport móvel de 390 × 844. Foram percorridas as rotas:

- Login, cadastro e verificação periódica;
- Home, Mural, Ranking, EBD, Tesouro, Carteira, Comunidade, Perfil e Guia;
- Chat, Sala LiveKit e Timer com identificadores inválidos;
- painel administrativo como membro e como professor.

As evidências originais estão em
[`audit/evidencias-2026-07-26`](../audit/evidencias-2026-07-26), com relatório
em
[`audit/relatorio-fluxos-2026-07-26.md`](../audit/relatorio-fluxos-2026-07-26.md).

### Resultado inicial

Autenticação funcionava, mas a conta membro autenticada não conseguia resolver
seu perfil em `public.usuarios`. O fallback de identidade passava a usar o UUID
de `auth.users` como se fosse `usuarios.id`, causando:

- HTTP 406 nas consultas de perfil e papel;
- Home, Comunidade e Perfil indisponíveis;
- HTTP 409 ao criar pedido e intercessão;
- tentativa de crédito Kesef após falha da intercessão;
- erro não tratado no navegador;
- Timer iniciado mesmo com convite inexistente;
- Chat exibindo loading e estado vazio simultaneamente.

O painel administrativo do Charles autenticou e carregou métricas e membros. O
sorteio e os envios WhatsApp não foram executados porque alterariam dados e
contatariam pessoas reais.

## Correção sistêmica implementada

### Identidade

`src/services/authService.ts` não usa mais `auth.users.id` como fallback.
`getUserId()` agora:

1. exige sessão válida;
2. consulta `usuarios.auth_user_id`;
3. retorna somente `usuarios.id`;
4. lança `USER_PROFILE_NOT_LINKED` quando não existe vínculo.

`ensureCurrentUserProfileLink()` foi adicionado a `dataService.ts` e chamado
após o login. Para perfis legados, ele usa a RPC
`vincular_usuario_auth_seguro`.

### Migration

Foi criada:

[`20260726120000_correcao_identidade_e_rls.sql`](../supabase/migrations/20260726120000_correcao_identidade_e_rls.sql)

Ela adiciona:

- índice único parcial para `usuarios.auth_user_id`;
- helpers `usuario_atual_id()` e `usuario_atual_e_admin()`;
- RPC `vincular_usuario_auth_seguro(p_telefone)`;
- validação do telefone informado contra o telefone do JWT;
- policies de `usuarios`, `pedidos` e `intercessoes` baseadas no ID real do
  perfil.

A migration **não foi aplicada ao remoto**. Antes disso é obrigatório
reconciliar `20260722_sessoes_oracao_grupo.sql` com o histórico remoto, conforme
já documentado na sessão anterior.

### Mural

- leitura de intercessão passou de `.single()` para `.maybeSingle()`;
- erros de SELECT, INSERT e DELETE agora interrompem o fluxo;
- Kesef e XP só são creditados depois de a intercessão persistir;
- os dois créditos são aguardados com `Promise.all`.

### Timer

- valida convite existente, status aceito e participação do usuário;
- valida registro em `sessoes_oracao_timer`;
- só inicia cronômetro após validação;
- convite inválido mostra “Sessão indisponível”;
- botão “Amém” não aparece em sessão inválida;
- acesso direto ao Supabase saiu do componente e foi movido ao serviço.

### Chat

- usa `authService` e `dataService`, sem Supabase direto no componente;
- diferencia perfil desvinculado, membro inexistente, erro de conversa e estado
  vazio;
- destinatário inválido bloqueia textarea e envio;
- controles de voltar, mensagem e envio receberam nomes acessíveis.

### Acessibilidade

Login e autenticação administrativa receberam:

- `id` e `htmlFor` em telefone e senha;
- nome acessível “Mostrar senha”/“Ocultar senha”.

## Validação pós-correção

- 55 de 55 testes aprovados em 9 arquivos;
- 2 testes novos impedem o retorno do fallback de identidade;
- lint sem erros, com 18 avisos preexistentes;
- build Vite e PWA aprovados;
- Timer inválido bloqueado visualmente;
- Chat inválido sem estado vazio contraditório;
- campos de Login encontrados pelo navegador pelos respectivos rótulos.

Evidências pós-correção:

[`audit/evidencias-pos-correcao-2026-07-26`](../audit/evidencias-pos-correcao-2026-07-26)

Plano executado:

[`audit/plano-acao-sistemico-2026-07-26.md`](../audit/plano-acao-sistemico-2026-07-26.md)

## Integração Figma

Foram instalados:

- `figma@openai-curated` — plugin oficial Figma;
- `figma-auditoria@personal` — extensão local da auditoria;
- skill `$figma-audit-board`.

Fonte local da extensão:

`/home/pcnono/plugins/figma-auditoria`

Versão instalada:

`0.1.0+codex.20260726084232`

O skill organiza capturas em Section, adiciona saúde, severidade, evidência e
recomendação, verifica imagens após upload e evita dados pessoais.

Plugins instalados durante uma conversa não são incorporados à lista de
ferramentas daquela conversa. Para usar:

1. abrir uma nova conversa no Codex;
2. confirmar Figma e Figma Auditoria habilitados;
3. concluir o OAuth oficial quando solicitado;
4. enviar:

   `Use $figma-audit-board para criar um FigJam com a auditoria do oracao-app usando audit/evidencias-2026-07-26.`

## Pendências para retomada

1. Reconciliar o histórico remoto da migration `20260722`.
2. Fazer backup e revisar usuários com `auth_user_id` nulo ou duplicado.
3. Aplicar a nova migration primeiro em homologação.
4. Repetir Login → Home → Perfil → Mural → Intercessão → Carteira.
5. Validar convite real entre duas contas, Timer e LiveKit.
6. Criar o FigJam na nova conversa após OAuth.
7. Tratar bundle principal acima de 500 kB e os avisos de lint em lotes
   separados.

Nenhum commit ou `supabase db push` foi executado nesta sessão.
