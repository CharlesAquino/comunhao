# oracao-app — Contexto do Projeto

> **Fonte ativa:** este diretório `app/` é a versão operacional oficial.
> Antes de implementar, leia também
> `../CONTEXTO_MESTRE_IMPLEMENTACAO.md`. O diretório
> `../Versões anteriores ou paralelas./` é somente histórico e não deve ser
> usado para builds, migrations ou releases.

## Identidade
**Nome:** oracao-app (Comunhão | Oração Constante)  
**Propósito:** Plataforma de intercessão e comunhão para mocidade (Assembleia de Deus)  
**Público:** Jovens de EBD que participam do círculo de oração  
**Professor/Stakeholder:** Charles (idealizador da dinâmica presencial)  

## Stack
| Tecnologia | Versão | Função |
|---|---|---|
| React | ^19.2.7 | Framework frontend |
| TypeScript | ^7.0.2 (strict) | Tipagem |
| Vite | ^8.1.1 | Build/Dev |
| Tailwind CSS | ^4.3.2 | Estilização (@theme no index.css, sem tailwind.config.js) |
| React Router DOM | ^7.18.1 | Rotas SPA |
| Lucide React | ^1.24.0 | Ícones |
| Supabase JS | ^2.110.2 | Auth (phone OTP) + Postgres + Realtime + Storage |
| Vite PWA Plugin | ^1.3.0 | Service Worker + manifest |
| LiveKit Client | ^2.11.2 | WebRTC (salas de oração) |
| Oxlint | ^1.71.0 | Linter |
| Vitest + Testing Library | ^4.1.10 / ^16.3.2 | Testes |
| GitHub Actions | — | CI (lint → test → build) |
| Capacitor | — | Empacotamento mobile (configurado, Android adicionado) |

## Rotas (App.tsx)
- `/login` → Login.tsx (username + senha via Edge Function `login-username`)
- `/register` → Register.tsx (nome + username + WhatsApp + senha + e-mail opcional + OTP)
- `/verify-otp` → VerifyOtp.tsx (código 6 dígitos — usado no cadastro e recuperação)
- `/recuperar-senha` → RecuperarSenha.tsx (username + nova senha + OTP por WhatsApp/e-mail)
- `/sala/:salaId` → SalaOracao.tsx (LiveKit — fora do BaseLayout, sem bottom nav)
- `/timer/:conviteId` → TimerOracao.tsx (oração silenciosa sincronizada — fora do BaseLayout)
- `/chat/:userId` → Chat.tsx (mensagens de texto 1:1 — fora do BaseLayout)
- `/` → Home.tsx (dashboard: missão, convites, grid mocidade, toggle disponibilidade, modal Mensagem)
- `/guia` → GuiaPatentes.tsx (guia completo da Jornada de Serviço)
- `/mural` → Mural.tsx (feed pedidos/testemunhos, intercessão toggle + 1 Kesef/1 XP, criar pedido)
- `/ranking` → Ranking.tsx (Jornada de Serviço — patentes com membros + progresso pessoal)
- `/ebd` → EBD.tsx (Escola Bíblica Digital — renderer da jornada editorial ou fallback legado)
- `/admin/ebd-studio` → EbdStudio.tsx (estação editorial administrativa)
- `/loja` → Loja.tsx (Tesouro — resgate de itens com Kesef + aba Admin para processar pedidos)
- `/carteira` → Carteira.tsx (saldo + histórico + código de indicação)
- `/perfil` → Perfil.tsx (foto, identidade, métricas, patente e atalhos pessoais)
- `/perfil/:userId` → PerfilUsuario.tsx (perfil público de outro membro)
- `/comunidade` → Comunidade.tsx (listagem/visão expandida da mocidade)
- `/admin` → Admin.tsx (sorteio círculo + moderação mural + métricas pastorais + gerenciar guardiões)
- Rotas autenticadas usam `BaseLayout` (bottom nav + aurora + theme toggle)

## Camada de Serviços (src/services/)
Nunca chame Supabase diretamente nos componentes — use as funções de serviço.

### dataService.ts
| Função | Descrição |
|---|---|
| `getCurrentUserId()` | `supabase.auth.getUser().id` (NÃO localStorage) |
| `getCurrentUserProfile()` | Perfil completo do usuário logado |
| `getDashboardData()` | Missão, sustentador, grid mocidade |
| `getMuralData()` | Feed pedidos + contagem intercessores |
| `toggleUserAvailability()` | Toggle status_anel (disponivel ↔ offline) |
| `intercederPorPedido(id)` | Toggle intercessão (insert/delete) |
| `criarPedidoOracao(texto)` | Insert pedido (tipo 'em_clamor') |
| `getRankingData()` | Leaderboard por pontos_comunhao |
| `getAllPedidos()` | Admin: lista com autor + contagem |
| `updatePedido(id, updates)` | Admin: editar texto/tipo |
| `deletePedido(id)` | Admin: excluir |
| `uploadAvatar(file, userId)` | Storage bucket avatars |
| `checkPhoneExists(phone)` | Verifica se telefone existe |
| `sendOtp(phone, options?)` | Envia OTP via WhatsApp/e-mail (Edge Function `enviar-otp`) |
| `verifyOtp(phone, token, nome?, senha?, codigo?, username?, email?, mode?)` | Valida OTP, cria/auth user ou redefine senha e retorna session (Edge Function `verificar-otp`) |
| `registerUser(nome, phone, codigoIndicacao?)` | Cria perfil + opcionalmente vincula indicação |
| `linkExistingUserToAuth(phone)` | Vincula auth_user_id a usuário pré-existente |
| `subscribeToDataChanges(cb)` | Realtime channel |
| `getLicoes()` | Lista lições EBD |
| `getLicaoCompleta(id)` | Lição com perguntas do quiz |
| `verificarRespostaQuiz(perguntaId, alternativaIndex)` | Verifica resposta |
| `getMetricasEngajamento()` | Métricas pastorais (semáforo) |
| `gerarCodigoIndicacao()` | Gera/obtém código de indicação do usuário |
| `registrarIndicacao(codigo)` | Vincula indicado_por_id |

### kesefService.ts
| Função | Descrição |
|---|---|
| `getSaldoKesef()` | Saldo atual via view `kesef_saldo` |
| `getHistoricoKesef()` | Últimos 50 movimentos do ledger |
| `creditarKesef(tipo, qtd, ref?)` | RPC `creditar_kesef` |
| `creditarXp(qtd, ref?)` | RPC `creditar_xp` |
| `debitarKesef(tipo, qtd, ref?)` | RPC `debitar_kesef` |
| `estornarKesef(ledgerId)` | RPC `estornar_kesef` (admin) |
| `subscribeToKesefChanges(uid, cb)` | Realtime channel |

### kesefConstants.ts
```typescript
KESEF_VALORES = { ORACAO_CONFIRMADA: 10, INTERCEDER: 1, LICAO_CONCLUIDA: 10, QUIZ_ACERTO: 2, STREAK_7_DIAS: 15, STREAK_30_DIAS: 50, INDICACAO_MEMBRO: 30 }
KESEF_CAP_DIARIO = 60
KESEF_PRECOS_LOJA = { CUPOM_CANTINA: 20, ADESIVO_LEMBRANCINHA: 30, LIVRO_DEVOCIONAL: 150, CAMISA_GRUPO: 300, ADORNO_ESPECIAL: 400, BIBLIA_ESTUDO: 500 }
```

### patente.ts
- `calcularPatente(xp)` — Retorna patente baseada no XP (8 patentes, 3 etapas)
- `calcularDivisao(xp)` — Patente + divisão (I-IV) + % progresso
- `calcularProgressoProximoNivel(xp)` — Atual + próximo + %
- `XP_ACOES` — Constantes: ORAR=5, INTERCEDER=1, LICAO=10, QUIZ=3, STREAK_7=12, STREAK_30=50, INDICAR=15
- `PC_ACOES` — Constantes equivalentes para pontos_comunhao
- `calcularChama(ultimaAtividade?)` — Nível da chama (acesa → apagada)
- `PATENTES[]` — 8 patentes: Servo Fiel, Guardião, Intercessor, Atalaia, Discipulador, Missionário, Conselheiro e Pacificador

### prayerRoomService.ts
| Função | Descrição |
|---|---|
| `criarSalaOracao(tipoSala)` | Cria sala + insere host |
| `entrarSalaOracao(salaId)` | Entra em sala existente |
| `finalizarSalaOracao(salaId)` | Encerra + credita (se fora da dupla) |
| `obterTokenLiveKit(salaId)` | Invoca Edge Function `gerar-token-livekit` |
| `listarSalasAguardando()` | Salas disponíveis |
| `subscribeToSalasChanges(cb)` | Realtime |

### adminAuth.ts
- `checkUserRole()`: async — retorna `'membro' | 'mod' | 'admin'` via `supabase.auth.getUser()` + `usuarios.papel`
- `checkAdminAuth()`: async — verifica `supabase.auth.getUser()` + `usuarios.papel === 'admin'`
- `logoutAdmin()`: `supabase.auth.signOut()`

### AdminContext (src/contexts/AdminContext.tsx)
- Contexto global que expõe `role`, `isAdmin`, `isMod`, `isGuardiao`, `refreshRole()`
- Persiste estado entre navegações

### conviteService.ts
| Função | Descrição |
|---|---|
| `enviarConviteOracao(destId, tipoConexao)` | RPC `enviar_convite_oracao` |
| `responderConviteOracao(id, resposta, tipoConexao)` | RPC `responder_convite_oracao` |
| `finalizarSessaoTimer(conviteId)` | RPC `finalizar_sessao_timer` |
| `getConvitesPendentes()` | Convites recebidos com status 'pendente' |
| `getConviteEnviadoPendente()` | Convite enviado ainda pendente |
| `subscribeToConvites(userId, cb)` | Realtime p/ convites do usuário |
| `subscribeToSessaoTimer(conviteId, cb)` | Realtime p/ sessão de timer |

### mensagemService.ts
| Função | Descrição |
|---|---|
| `getConversa(parceiroId)` | Mensagens entre dois usuários |
| `enviarMensagem(destId, texto)` | Insere mensagem |
| `subscribeToMensagens(userId, parceiroId, cb)` | Realtime p/ conversa |
| `marcarComoLidas(parceiroId)` | Marca não-lidas como lidas |
| `getUltimasConversas()` | Lista de conversas recentes 

### whatsappService.ts
- `sendWhatsAppMessage(phone, message)`: POST Evolution API com retry (3x exponential backoff)
- `notifyPrayerPartners()`: busca pares e envia template
- **Depende de**: `VITE_EVOLUTION_API_URL`, `VITE_EVOLUTION_API_KEY`, `VITE_EVOLUTION_INSTANCE`

### ebdEditorialService.ts
| Função | Descrição |
|---|---|
| `getEditorialLessons()` | Lista rascunhos/editoriais do Estúdio |
| `getPublishedEditorialLesson()` | Busca a lição editorial publicada mais recente |
| `createEditorialLesson()` | Cria rascunho vazio |
| `saveEditorialLesson()` | Salva o documento editorial |
| `changeEditorialLessonStatus()` | Altera status entre rascunho/revisão |
| `publishEditorialLesson()` | Publica via RPC e gera snapshot versionado |
| `getEditorialVersions()` | Lista versões publicadas |
| `subscribeToEditorialLesson()` | Realtime para atualização da aba EBD |

## Estado de Qualidade
✅ TypeScript strict — ✅ Lint 0 errors — ✅ 29/29 testes (7 suites) — ✅ Build + PWA — ✅ CI/CD

## Convenções
- **Idioma**: Português (BD, variáveis, UI, comentários)
- **Tom da UI**: Acolhedor "da igreja" ("Amém", "Levantar a Mão")
- **Tema**: Dark default, Light toggle (persiste localStorage)
- **Serviços**: Componentes nunca acessam Supabase diretamente
- **Tipos**: Centralizados em `src/types/index.ts`
- **Constantes**: Tudo em `src/services/constants.ts` (sem magic strings)
- **Estados**: Toda tela de dados trata loading/error/empty

## Banco de Dados (Supabase)

### Tabela: usuarios
id (PK UUID), auth_user_id (FK→auth.users), nome, telefone (UNIQUE), foto_url, status_anel ('offline'|'disponivel'|'orando'), papel ('membro'|'admin'), pontos_comunhao, xp (INTEGER DEFAULT 0), streak_dias, orando_por_id (FK), sendo_orado_por_id (FK), codigo_indicacao (UNIQUE text), indicado_por_id (FK→usuarios), ultima_verificacao (timestamptz), last_login, device_id, criado_em

### Tabela: pedidos
id (PK), autor_id (FK), texto, tipo ('em_clamor'|'testemunho'), criado_em, finalizado_em

### Tabela: intercessoes
pedido_id (FK), usuario_id (FK), criado_em

### Tabela: historico_oracoes
id (PK), usuario_1_id (FK), usuario_2_id (FK), duracao_segundos, pontos_gerados, finalizado_em

### Tabela: kesef_ledger
id (PK UUID), usuario_id (FK), quantidade (integer), tipo (text: oracao|licao|quiz_acerto|streak_bonus_7|streak_bonus_30|indicacao|resgate|estorno), referencia (text), criado_em (timestamptz)

### View: kesef_saldo
usuario_id, saldo_total (SUM)

### Tabela: loja_itens
id (PK), nome, descricao, preco_kesef, imagem_url, estoque, ativo

### Tabela: loja_pedidos
id (PK), usuario_id (FK), item_id (FK), quantity, criado_em, status

### Tabela: licoes
id (PK), titulo, texto_base, criado_em

### Tabela: licoes_perguntas
id (PK), licao_id (FK), pergunta, alternativas (JSONB), resposta_correta (integer)

### Tabela: salas_oracao
id (PK UUID), tipo_sala (text), status_sala ('aguardando'|'ativa'|'encerrada'), host_usuario_id (FK), livekit_room_name (UNIQUE), iniciada_em, encerrada_em, criado_em

### Tabela: salas_oracao_participantes
id (PK UUID), sala_id (FK), usuario_id (FK), conectado_em, desconectado_em, kesef_creditado (bool), UNIQUE(sala_id, usuario_id)

### RPCs (SECURITY DEFINER)
- `creditar_kesef(uid, tipo, qtd, ref)` — Cap diário 60, tipos validados
- `debitar_kesef(uid, tipo, qtd, ref)` — Verifica saldo suficiente
- `estornar_kesef(ledger_id)` — Admin
- `creditar_xp(uid, qtd, motivo?)` — Adiciona XP ao usuário
- `criar_sala_oracao(tipo_sala)` — Sempre disponível
- `entrar_sala_oracao(sala_id)` — Se 2+ participantes, ativa
- `finalizar_sala_oracao(sala_id)` — Idempotente, 60s mín, credita só fora da dupla
- `gerar_codigo_indicacao()` — Código 8 caracteres único
- `registrar_indicacao(codigo)` — Vincula indicado_por_id
- `creditar_bonus_indicacao()` — +20 ao indicador na 1ª oração (idempotente)

### Regras de crédito Kesef
| Situação | Kesef |
|---|---|
| Orar com dupla da semana | 0 (compromisso do círculo) |
| Orar com alguém fora da dupla | +10 |
| Indicar novo membro (1ª oração) | +20 ao indicador |
| Interceder no Mural | +1 |
| Completar lição EBD | +5 |
| Acertar quiz | +3 |
| Streak 7 dias | +15 |
| Streak 30 dias | +50 |
| Resgatar item na loja | -preço |

### Regras de crédito XP (experiência, sem cap diário)
| Situação | XP |
|---|---|
| Orar com alguém | +5 |
| Interceder no Mural | +1 |
| Completar lição EBD | +10 |
| Acertar quiz | +3 |
| Streak 7 dias | +12 |
| Streak 30 dias | +50 |
| Indicar novo membro | +15 |

### Regras de segurança
- RPCs de Kesef são SECURITY DEFINER (nunca chamar tabela direto)
- Edge Function `gerar-token-livekit` valida participação na sala
- `LIVEKIT_API_SECRET` nunca sai do servidor (Edge Function)
- RLS em todas as tabelas (usuários veem próprios dados, salas visíveis por participação)

### Status RLS
- `setup_db_migration_v2.sql` (RLS inicial) — ⚠️ AINDA NÃO APLICADA
- Demais migrations já aplicadas com RLS próprio
- `20260726130000_avatar_storage_policies.sql` — ✅ APLICADA; bucket
  `avatars` com leitura pública e escrita restrita à pasta de `auth.uid()`
- `20260722000000_sessoes_oracao_grupo.sql` — ✅ histórico remoto reconciliado
- `20260726120000_correcao_identidade_e_rls.sql` — ✅ APLICADA
- `20260726180000_username_auth_e_privacidade.sql` — ✅ APLICADA
- Chaves Supabase no .env: ⚠️ ROTACIONAR (estão expostas)

## Histórico de Commits
```
ceb4e94 feat: login com senha + verificação periódica via WhatsApp
b33066f fix: formato E.164 para telefone + mensagem clara se Phone provider desativado
5b81fc2 feat: OTP via WhatsApp (Evolution API) sem custo de SMS
8979076 docs: session log S1-S7 + atualização completa do AGENTS.md
61efe8d sistema de indicação + bónus por orar fora da dupla
4c88155 anti-spam salas de oração (1 sala ativa + cooldown 30s)
a63d417 Salas de Oração com WebRTC (LiveKit) + fluxo completo
bb3c7c1 Carteira holográfica + botão Orar Agora com Kesef
5b5fe6f Kesef Ledger v2 — cap diário + tipos semânticos + security definer
96f222f S7 - Qualidade (toast, loading states, testes)
fd03507 S6 - Métricas Pastorais Admin (Semáforo Engajamento)
f6721d2 S4 - Sistema Kesef (moeda + ledger + streaks)
e6137da S5 - Lojinha de Resgate
3ac2eae S3 - Módulo EBD (lições + quiz)
22e8a66 S2 - WhatsApp Evolution API real + feedback Admin
1d18a23 S1 - Capacitor mobile packaging setup
03166da AGENTS.md com contexto do projeto
3c32d4f Genesis restaurado como timeline + entrada Sprint S0
cfc99f4 docs: session log
8837515 fix: Sprint S0 - Supabase Auth + RLS + admin role
e2eeeac feat: initial commit
84d984a chore: .gitignore + .env.example
cc93ccd feat: botão pular verificação de dispositivo
7ba8a27 feat: auto disponivel no login + anel pulsando
cb4baf6 fix: mocidade grid inclui usuario logado
f28a0c4 feat: sistema de patentes (Hierarquia Angelical) + guia no app
63930d1 feat: sistema XP separado do Kesef + coluna xp + creditar_xp RPC
e4789a6 feat: mockup patentes no grid mocidade (toggle via FEATURES.MOCKUP_PATENTES)
478d917 docs: atualizacao AGENTS.md com sistema XP e patentes
2e141be feat: ranking substituido por Hierarquia Angelical + nomes EBD/Tesouro
```

## Próximos Passos (Prioridade)
1. 🔴 Popular e publicar a Lição 5 no Estúdio EBD
2. 🔴 Gerar o primeiro `app-release.apk` assinado com chave permanente
3. 🔴 Rotacionar chaves Supabase (dashboard)
4. 🟡 Publicar `version.json` real e testar atualização OTA do APK em Android
5. 🟡 Implementar importador JSON para o Estúdio
6. 🟡 Implementar persistência remota de progresso e respostas privadas da EBD
7. 🟡 Implementar acesso programado com antecipação solidária via Kesef e RPC atômica
8. 🟡 Configurar `PUBLIC_SITE_URL` nas Edge Functions
9. 🟡 Testar fluxo completo: convite → aceitar → voz/vídeo/timer
10. 🟡 Configurar Evolution API
11. 🟢 S8+: Onboarding, notificações push e auto-match professor

## Usuários de Teste
- `Jovem Teste 1` a `Jovem Teste 5` — ✅ removidos de `auth.users`,
  `usuarios` e dados relacionados em 26/07/2026.
- Charles Aquino foi preservado como professor e administrador.

## Documentação de Sessões
- `docs/sessao-2026-07-26-ebd-editorial.md` — memória operacional da EBD,
  Estúdio implementado, conteúdo remoto e pendências de retomada
- `docs/sessao-2026-07-26-design-system-perfis.md` — Design System Santuário
  Contemporâneo, patentes próprias, perfis sociais e correção do Storage de
  avatares
- `docs/sessao-2026-07-22-auditoria.md` — Auditoria completa + correção de 20+ bugs críticos/altos
- `docs/sessao-2026-07-22-ui-home.md` — Refino visual completo (glass, 3D, noise, theme-aware, comic B&W)
- `docs/sessao-2026-07-19-auth.md` — Login com senha + verificação periódica via WhatsApp
- `docs/sessao-2026-07-19-sprint-s1-s7.md` — Log completo desta sessão (S1–S7 + LiveKit + Indicação)
- `docs/sessao-2026-07-19-sprint-s0.md` — Log da sessão S0 anterior
- `docs/plano-de-acao-v2.md` — Plano estruturado com 8 fases (parcialmente desatualizado)
- `docs/plano-de-acao.md` — Plano legado (desatualizado)
- `src/documentação/Genesis` — Linha do tempo completa do projeto

## Documentação de Referência
- `docs/CODEX_AGENT_TOOLCHAIN.md` — precedência e limites da toolchain de
  engenharia, UI, Creative Development, qualidade e browser runtime
- `docs/CODEX_AGENT_SKILLS_LOCK.json` — snapshot de integridade das Skills
- `docs/android-release-updates.md` — assinatura release, versionamento,
  version.json, plugin Android de atualização e fluxo operacional
- `docs/estudio-editorial-ebd-operacao.md` — implementação, operação,
  migrations, publicação remota, APK e pendências do Estúdio EBD
- `docs/ebd-sistema-editorial-v1.md` — contrato editorial, progresso, acesso
  programado, fundo social, segurança e plano de implementação
- `docs/ebd-licao-05-piloto.md` — conteúdo piloto de segunda a domingo
- `docs/design-system-interacoes-2026-07-26.md` — Norma atual de botões,
  navegação, abas, temas e profundidade 3D glass
- `docs/identidade-visual.md` — Paleta Menta Pastel, glassmorfismo, tipografia
- `docs/whatsapp-evolution.md` — Configuração Evolution API
- `docs/levantamento.md` — Problemas críticos e oportunidades
- `docs/sistema-patentes.md` — Jornada de Serviço e insígnias heráldicas

## Adenda operacional — 10/08/2026

> Esta adenda é mais recente que os snapshots de estado acima. Ela os preserva
> como histórico, mas prevalece para retomadas posteriores.

### Release e validação vigentes

- release development publicada: `1.4.0-dev.20`, `versionCode 14020`;
- applicationId: `br.com.igreja.oracao.dev`;
- atualização direta: `app-updates/development/version.json`;
- SHA-256 do APK: `550c7810138397f6fe3f578bdc1928c19052de2ad072296525915f89281a3b6e`;
- validação: 34 arquivos / 158 testes; build Vite/PWA e Android aprovados;
- migrations locais e remotas alinhadas até `20260810233000`.

### Decisões que não podem regredir

- o Editorial EBD produz com IA de segunda a sábado; domingo permanece reservado
  para atividade especial ainda não definida;
- o gestor seleciona qualquer combinação dos dez tipos de bloco antes de gerar;
- a geração usa somente fontes RAG explicitamente vinculadas à lição e deve
  respeitar o roteiro semanal já produzido;
- título e subtítulo do dia são gerados; título, subtítulo e resumo gerais da
  lição alimentam o contexto; ausência é informada, não bloqueada;
- salvar, revisar, publicar o dia e publicar a semana são ações distintas;
- um dia futuro ainda bloqueado pode continuar sendo editado depois da publicação
  de outro dia; um dia já liberado é imutável nesse fluxo incremental;
- imagens da EBD usam composição preservada (`object-contain`), sem corte;
- os controles inoperantes de tamanho da fonte foram removidos;
- a Mocidade é ordenada por `last_login`; acesso manual ou sessão restaurada
  registra uma vez na entrada autenticada;
- **não existe heartbeat nem rastreamento contínuo de presença**. A migration
  `20260810220000` foi substituída por `20260810223000` e `20260810224500`;
- todos os usuários, inclusive testadores e administradores existentes, passam
  pelo aceite versionado quando houver documento vigente pendente;
- Termos e Diretrizes usam aceite; Aviso de Privacidade usa ciência;
- evidência legal pertence à conta e versão/hash do documento, sem IP,
  fingerprint, credo declarado ou identificador extra de aparelho;
- mudança material em documento legal exige nova versão, nunca edição silenciosa
  da versão já aceita.

### Identidade e privacidade

- produto: **Comunhão**; apresentação: **Comunhão | Oração Constante**;
- identidade: iniciativa cristã, protestante e evangélica;
- controlador informado: Charles Thadeu Pereira de Aquino;
- canal de privacidade: `charlesaquino33@gmail.com`;
- a identidade confessional orienta conteúdo e conduta, mas nunca autoriza
  discriminação de pessoas por religião real ou presumida;
- o aceite geral não substitui consentimento granular para dado sensível quando
  essa for a base legal aplicável.

### Pendências prioritárias

1. vigência semanal canônica da EBD e bloqueio de sobreposição;
2. estado/publicação verdadeiramente separado por dia;
3. progresso EBD remoto privado, validação forte e E2E autenticado;
4. consentimentos granulares, menores, retenção, direitos do titular e plano de
   incidente;
5. QA visual real em desktop/mobile;
6. reconciliar a Edge Function remota `buscar-memoria-rag` com o workspace ativo.

### Registro completo desta data

`docs/SESSAO_2026-08-10_REGISTRO_COMPLETO.md` é a fonte cronológica detalhada
da auditoria, correções, migrations, releases, evidências e riscos residuais.
