# Plano de Ação Estruturado — oracao-app (v2.0)

> Documento histórico. As tarefas de WhatsApp administrativo foram canceladas.
> O canal ficou reservado apenas à futura recuperação de senha, ainda desabilitada.

> **Base:** Estado real do código (Genesis 19/07/2026) + `docs/plano-de-acao.md` legado + roadmap Fase 7-13  
> **Formato:** Cada fase tem **Análise de Requisitos** → **Tarefas** → **Critérios de Aceitação/Verificação** → **Definition of Done**

---

## Visão Geral das Fases

| Fase | Nome | Status | Prioridade | Estimativa |
|---|---|---|---|---|
| **S0** | **Segurança Crítica (Hotfix)** | 🔴 Bloqueante | P0 | 2-3 dias |
| **S1** | **Capacitor Mobile Packaging** | ⏳ Planejado | P1 | 3-4 dias |
| **S2** | **WhatsApp Evolution API Integration** | 🔄 Parcial (stub) | P1 | 2-3 dias |
| **S3** | **Módulo EBD (Lições + Quiz)** | ⏳ Planejado | P2 | 5-7 dias |
| **S4** | **Sistema Kesef (Moeda + Ledger + Streaks)** | ⏳ Planejado | P2 | 5-7 dias |
| **S5** | **Lojinha de Resgate** | ⏳ Planejado | P2 | 3-4 dias |
| **S6** | **Métricas Pastorais Admin (Semáforo Engajamento)** | ⏳ Planejado | P1 | 2-3 dias |
| **S7** | **Qualidade + Testes + Docs (Legado Pendente)** | 🟡 Parcial | P3 | 3-4 dias |

---

## S0 — Segurança Crítica (Hotfix) — **INICIAR AGORA**

### Análise de Requisitos
| Requisito | Fonte | Detalhamento |
|---|---|---|
| **R-S0-1** | Genesis §11, C1 | `.env` com chaves Supabase reais commitado no histórico git — **vazamento ativo** |
| **R-S0-2** | Genesis §11, C4 | RLS policies permissivas: `DELETE`, `UPDATE` públicos em todas as tabelas |
| **R-S0-3** | Genesis §11, C2 | `dataService.getCurrentUserId()` lê `localStorage` — ignora Supabase Auth session; permite impersonação |
| **R-S0-4** | Genesis §11, C3 | `/admin` protegido apenas por senha localStorage hash — sem vínculo com `auth.uid()` ou role `admin` |
| **R-S0-5** | Boas práticas | Rotacionar chaves Supabase após limpeza do histórico |

### Tarefas
| ID | Tarefa | Esforço | Responsável | Dependências |
|---|---|---|---|---|
| S0.1 | **Limpar histórico git**: `git filter-repo --path .env --invert-paths` (ou BFG) + force push | 30 min | Dev | — |
| S0.2 | **Rotacionar chaves Supabase**: Project Settings → API → Regenerate `anon` e `service_role` keys | 10 min | Dev | S0.1 |
| S0.3 | **Criar `.env.example`** documentado com todas as `VITE_*` necessárias | 10 min | Dev | S0.1 |
| S0.4 | **Adicionar `.env` ao `.gitignore`** (confirmar) | 2 min | Dev | S0.1 |
| S0.5 | **Migrar `dataService.getCurrentUserId()`** para `supabase.auth.getUser()` + fallback localStorage apenas para device_id | 2h | Dev | S0.2 |
| S0.6 | **Criar migração RLS** (`setup_db_migration_v2.sql`) com policies baseadas em `auth.uid()` | 2h | Dev | S0.2 |
| S0.7 | **Aplicar migração no Supabase Dashboard** (SQL Editor) + testar | 30 min | Dev | S0.6 |
| S0.8 | **Vincular `/admin` a role `admin`**: adicionar coluna `papel` em `usuarios` + policy RLS + check no Admin.tsx | 1h | Dev | S0.6 |
| S0.9 | **Testes de segurança**: tentar acessar dados de outro usuário, tentar DELETE/UPDATE sem auth, acessar /admin sem role | 1h | Dev | S0.5, S0.7, S0.8 |

### Critérios de Aceitação (Verification Checklist)
- [ ] `.env` **não existe** em nenhum commit do histórico (`git log --all --full-history -- .env` retorna vazio)
- [ ] Chaves Supabase **rotacionadas** (antigas inválidas)
- [ ] `.env.example` existe com: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_EVOLUTION_API_URL`, `VITE_EVOLUTION_API_KEY`, `VITE_EVOLUTION_INSTANCE`
- [ ] `dataService.getCurrentUserId()` usa `supabase.auth.getUser()` → lança erro se não autenticado
- [ ] RLS policies: `SELECT` próprio usuário, `INSERT` próprio usuário, `UPDATE` próprio usuário, **sem DELETE público**
- [ ] Tabela `usuarios` tem coluna `papel` enum `('membro','admin')` com default `'membro'`
- [ ] `/admin` redireciona para `/` se `papel !== 'admin'` (verificado via `supabase.auth.getUser()` + profile)
- [ ] Tentativa de acessar dados de outro usuário retorna 403/RLS violation
- [ ] `npm run build` passa sem erros

### Definition of Done
> **Branch**: `hotfix/security-s0` → PR → `main` após aprovação + testes manuais em staging

---

## S1 — Capacitor Mobile Packaging

### Análise de Requisitos
| Requisito | Fonte | Detalhamento |
|---|---|---|
| **R-S1-1** | Genesis §2, §10 | Empacotar a base web existente (React + Vite) como app nativo iOS/Android via Capacitor |
| **R-S1-2** | Genesis §2 | Charles teve problemas com Expo — Capacitor é decisão confirmada |
| **R-S1-3** | Técnico | Manter PWA funcional em paralelo (já configurado) |
| **R-S1-4** | Técnico | Configurar plugins necessários: Splash Screen, Status Bar, Keyboard, Push Notifications (futuro), Camera (avatar), Filesystem (backup) |
| **R-S1-5** | Técnico | Build scripts para `android` e `ios` no CI/CD |

### Tarefas
| ID | Tarefa | Esforço | Dependências |
|---|---|---|---|
| S1.1 | `npm i -D @capacitor/cli @capacitor/core @capacitor/android @capacitor/ios` | 10 min | S0 (main limpo) |
| S1.2 | `npx cap init oracao-app br.com.igreja.oracao --web-dir=dist` | 5 min | S1.1 |
| S1.3 | Instalar plugins core: `@capacitor/splash-screen`, `@capacitor/status-bar`, `@capacitor/keyboard`, `@capacitor/camera`, `@capacitor/filesystem`, `@capacitor/push-notifications` | 15 min | S1.2 |
| S1.4 | Configurar `capacitor.config.ts`: `appId`, `appName`, `webDir: 'dist'`, `server: { androidScheme: 'https' }`, plugins config | 30 min | S1.3 |
| S1.5 | Adicionar scripts no `package.json`: `cap:add:android`, `cap:add:ios`, `cap:sync`, `cap:open:android`, `cap:open:ios`, `build:mobile` | 10 min | S1.4 |
| S1.6 | `npm run build && npx cap sync` — verificar se sincroniza sem erros | 10 min | S1.5 |
| S1.7 | `npx cap add android` — abrir no Android Studio, build debug APK, testar em device/emulador | 1h | S1.6 |
| S1.8 | `npx cap add ios` — abrir no Xcode (requer macOS), build, testar no Simulator | 1h | S1.6 |
| S1.9 | Configurar **Splash Screen** nativo (imagens em `android/app/src/main/res`, `ios/App/App/Assets.xcassets`) | 30 min | S1.7, S1.8 |
| S1.10 | Configurar **Status Bar** style (dark content para light theme, light content para dark theme) via `StatusBar.setStyle()` no `ThemeContext` | 30 min | S1.4 |
| S1.11 | Testar **Camera plugin** no `AvatarPicker` (fallback para input file web) | 30 min | S1.3 |
| S1.12 | Documentar processo de build/release no README (seção Mobile) | 30 min | S1.7, S1.8 |

### Critérios de Aceitação
- [ ] `npm run build:mobile` gera APK debug instalável + IPA (macOS)
- [ ] App abre em device Android/iOS sem erros de console
- [ ] Splash screen nativo aparece antes do React hidratar
- [ ] Status bar adapta ao tema (dark/light)
- [ ] `AvatarPicker` usa `Camera.getPhoto()` no mobile, `input[type=file]` no web
- [ ] PWA continua funcionando no navegador (não regressão)
- [ ] `npx cap sync` roda limpo no CI (GitHub Actions)

### Definition of Done
> Branch `feat/capacitor-setup` → PR → `main` com APK/IPA de teste anexados

---

## S2 — WhatsApp Evolution API Integration

### Análise de Requisitos
| Requisito | Fonte | Detalhamento |
|---|---|---|
| **R-S2-1** | Genesis §9, `docs/whatsapp-evolution.md` | Enviar mensagem automática pós-sorteio: "🙏 Olá [nome]! Sua missão da semana é orar por [parceiro]..." |
| **R-S2-2** | `whatsappService.ts` (stub) | `notifyPrayerPartners()` já busca pares e chama `sendWhatsAppMessage()` — falta implementar HTTP real |
| **R-S2-3** | `docs/whatsapp-evolution.md` | Evolution API roda em Docker (self-hosted) — variáveis: `VITE_EVOLUTION_API_URL`, `VITE_EVOLUTION_API_KEY`, `VITE_EVOLUTION_INSTANCE` |
| **R-S2-4** | `docs/whatsapp-evolution.md` | Fluxo: Admin clica "Sorteio da Semana" → `executarSorteio()` → `notifyPrayerPartners()` → Evolution API → WhatsApp |
| **R-S2-5** | Robustez | Se variáveis `.env` vazias → log warning, **não falhar** o sorteio (já implementado no stub) |
| **R-S2-6** | UX | Mostrar toast/sucesso "Mensagens enviadas para X jovens" ou erro parcial |

### Tarefas
| ID | Tarefa | Esforço | Dependências |
|---|---|---|---|
| S2.1 | Implementar `sendWhatsAppMessage(phone, message)` em `whatsappService.ts` com `fetch` para Evolution API `/message/sendText` | 1h | S0 (env vars válidas) |
| S2.2 | Implementar `notifyPrayerPartners()` completo: buscar usuários com `orando_por_id`, montar template, enviar em lote com `Promise.allSettled` | 1h | S2.1 |
| S2.3 | Tratar respostas: contar sucessos/falhas, retornar resumo, logar erros individuais | 30 min | S2.2 |
| S2.4 | Integrar no `Admin.tsx:executarSorteio()` — aguardar `notifyPrayerPartners()` e exibir toast com resultado | 30 min | S2.3 |
| S2.5 | Adicionar **retry com backoff** (3 tentativas) para falhas de rede | 30 min | S2.2 |
| S2.6 | Testar com Evolution API local (Docker) — subir instância, conectar WhatsApp, executar sorteio real | 1h | S2.4 |
| S2.7 | Documentar no README: como subir Evolution API, configurar `.env`, testar | 30 min | S2.6 |

### Critérios de Aceitação
- [ ] `sendWhatsAppMessage` retorna `{ success: boolean, messageId?: string, error?: string }`
- [ ] `notifyPrayerPartners` envia para **todos** pares do círculo ativo
- [ ] Toast no Admin mostra: "✅ 12/12 mensagens enviadas" ou "⚠️ 10/12 enviadas (2 falharam)"
- [ ] Sorteio **não falha** se WhatsApp falhar (warning apenas)
- [ ] Retry funciona: falha transitória de rede → sucesso na 2ª tentativa
- [ ] Testado end-to-end com Evolution API Docker + WhatsApp real

### Definition of Done
> Branch `feat/whatsapp-integration` → PR → `main` após teste manual com instância Evolution API

---

## S3 — Módulo EBD (Lições Diárias + Quiz)

### Análise de Requisitos
| Requisito | Fonte | Detalhamento |
|---|---|---|
| **R-S3-1** | Genesis §10, Fase 9 | Módulo de estudo bíblico diário com lições + quiz |
| **R-S3-2** | `nehemiah-requisitos-gamificacao-loja.md` | Integração com Kesef: completar lição + quiz = Kesef |
| **R-S3-3** | UX | Acesso via nova aba no `BaseLayout` (bottom nav: Home, Mural, **EBD**, Ranking, Perfil) |
| **R-S3-4** | Dados | Tabelas: `licoes_ebd`, `perguntas_quiz`, `respostas_usuario`, `progresso_ebd` |
| **R-S3-5** | Gamificação | Streak de dias consecutivos estudando → bônus Kesef |

### Modelagem de Dados (Nova)
```sql
-- Tabela: licoes_ebd
id, titulo, referencia_biblica, conteudo_html, ordem, ativa, criado_em

-- Tabela: perguntas_quiz
id, licao_id, pergunta, opcoes_jsonb, resposta_correta_idx, explicacao, ordem

-- Tabela: progresso_ebd
usuario_id, licao_id, concluida_em, streak_dias, ult_atividade_em, UNIQUE(usuario_id, licao_id)

-- Tabela: respostas_usuario
id, usuario_id, pergunta_id, resposta_idx, correta, respondida_em
```

### Tarefas
| ID | Tarefa | Esforço | Dependências |
|---|---|---|---|
| S3.1 | Criar migração SQL (`setup_db_migration_ebd.sql`) com tabelas + RLS + índices | 1h | S0 (RLS base) |
| S3.2 | Aplicar migração no Supabase + seed inicial (3-5 lições de exemplo) | 30 min | S3.1 |
| S3.3 | Criar tipos TypeScript em `types/index.ts`: `LicaoEBD`, `PerguntaQuiz`, `ProgressoEBD` | 15 min | S3.1 |
| S3.4 | Adicionar funções no `dataService.ts`: `getLicoesEBD()`, `getQuizByLicao()`, `submitQuizAnswer()`, `getProgressoEBD()`, `concluirLicao()` | 2h | S3.3 |
| S3.5 | Criar página `EBD.tsx` + rota `/ebd` no `App.tsx` + link no `BaseLayout` bottom nav | 2h | S3.4 |
| S3.6 | Componente `LicaoCard.tsx` — card com título, referência, progresso, botão "Continuar"/"Iniciar" | 1h | S3.5 |
| S3.7 | Componente `QuizPlayer.tsx` — fluxo: pergunta → opções → feedback imediato → próxima → resultado final | 2h | S3.5 |
| S3.8 | Integrar **streak diário**: ao concluir lição, atualizar `streak_dias` em `progresso_ebd` + conceder Kesef (gancho para S4) | 1h | S3.4, S4 (interface) |
| S3.9 | Estados: loading, erro, vazio, conclusão com confetti/animação | 1h | S3.7 |
| S3.10 | Testes Vitest: `dataService` EBD functions, `QuizPlayer` logic | 1h | S3.4, S3.7 |

### Critérios de Aceitação
- [ ] `/ebd` acessível no bottom nav (ícone BookOpen)
- [ ] Lista lições ordenadas; lição atual destaca; concluídas com check
- [ ] Quiz: uma pergunta por vez, feedback imediato (verde/vermelho + explicação)
- [ ] Ao finalizar: mostra pontuação, salva `progresso_ebd`, atualiza streak
- [ ] Streak incrementa se lição concluída em dia consecutivo; zera se pular dia
- [ ] RLS: usuário só vê próprio progresso; admin vê todos
- [ ] `npm run test` passa (cobertura ≥ 60% nas novas functions)

### Definition of Done
> Branch `feat/ebd-module` → PR → `main` com seed de lições funcionando

---

## S4 — Sistema Kesef (Moeda + Ledger + Streaks)

### Análise de Requisitos
| Requisito | Fonte | Detalhamento |
|---|---|---|
| **R-S4-1** | `nehemiah-requisitos-gamificacao-loja.md` | Moeda **Kesef** (כֶּסֶף) — identidade visual: moeda antiga, bronze envelhecido, letra כ |
| **R-S4-2** | Ibid | **Sem dinheiro real** — itens custeados pela igreja/patrocínio |
| **R-S4-3** | Ibid | Tabela de pontuação definida: oração (10/dia), lição EBD (15), streak 7 dias (50), streak 30 dias (200), testemunho (30), intercessão (5) |
| **R-S4-4** | Ibid | Ledger imutável: toda transação registrada (entrada/saída, motivo, referência) |
| **R-S4-5** | Ibid | Consentimento pais dos 3 menores já obtido |
| **R-S4-6** | Integração | Fontes de Kesef: `Home` (orar), `Mural` (interceder/testemunho), `EBD` (lição+quiz+streak), `Admin` (ajuste manual) |

### Modelagem de Dados (Nova)
```sql
-- Tabela: kesef_ledger
id, usuario_id, tipo ('credito'|'debito'), quantidade, motivo, referencia_id, referencia_tipo, criado_em

-- View: kesef_saldo (materialized ou computed)
usuario_id, saldo_atual, total_ganho, total_gasto

-- Tabela: kesef_streaks (opcional, pode estar em progresso_ebd/usuarios)
usuario_id, tipo_streak ('oracao'|'ebd'), dias_atuais, maior_streak, ult_atualizacao
```

### Tarefas
| ID | Tarefa | Esforço | Dependências |
|---|---|---|---|
| S4.1 | Criar migração SQL (`setup_db_migration_kesef.sql`) com ledger + view saldo + RLS | 1h | S0 |
| S4.2 | Aplicar migração + criar função RPC `ajustar_kesef(usuario_id, qtd, motivo, ref_id, ref_tipo)` | 30 min | S4.1 |
| S4.3 | Tipos TypeScript: `KesefTransacao`, `KesefSaldo`, `KesefMotivo` enum | 15 min | S4.1 |
| S4.4 | `dataService.ts`: `getKesefSaldo()`, `getKesefExtrato(limit, offset)`, `creditarKesef()`, `debitarKesef()` | 1h | S4.3 |
| S4.5 | **Ganchos de integração** (chamar após ações existentes):<br>• `Home.toggleUserAvailability()` → +10/dia (se disponível)<br>• `Mural.intercederPorPedido()` → +5<br>• `Mural.criarPedidoOracao(tipo='testemunho')` → +30<br>• `EBD.concluirLicao()` → +15 + streak bonus<br>• `Admin` → ajuste manual | 2h | S4.4, S3.8 |
| S4.6 | Componente `KesefDisplay.tsx` — saldo animado (contador), ícone moeda כ, tooltip com breakdown | 1h | S4.4 |
| S4.7 | Página `Carteira.tsx` (`/carteira`) — extrato paginado, filtros por tipo/motivo, gráfico simples (últimos 30 dias) | 2h | S4.4 |
| S4.8 | Adicionar `KesefDisplay` no `BaseLayout` header (próximo ao ThemeToggle) | 30 min | S4.6 |
| S4.9 | Link "Carteira" no bottom nav ou menu perfil | 15 min | S4.7 |
| S4.10 | Testes: ledger imutável (não permite delete/update), saldo = soma(creditos) - soma(debitos), integrações disparam crédito | 1h | S4.4, S4.5 |

### Critérios de Aceitação
- [ ] Saldo Kesef visível no header (ícone כ + número animado)
- [ ] `/carteira` mostra extrato completo com paginação
- [ ] Cada ação fonte gera entrada no ledger com `motivo` legível ("Oração diária", "Lições EBD - Streak 7 dias", etc.)
- [ ] Ledger **imutável**: RLS bloqueia `DELETE`/`UPDATE`; apenas `INSERT` via RPC
- [ ] Saldo = `SUM(CASE WHEN tipo='credito' THEN qtd ELSE -qtd END)` confere com view
- [ ] Integrações S3/S5 disparam créditos corretos (testado manual + unit test)
- [ ] Identidade visual: moeda bronze, letra כ, tooltip explicativo

### Definition of Done
> Branch `feat/kesef-system` → PR → `main` após validação de ledger imutável e integrações

---

## S5 — Lojinha de Resgate

### Análise de Requisitos
| Requisito | Fonte | Detalhamento |
|---|---|---|
| **R-S5-1** | `nehemiah-requisitos-gamificacao-loja.md` | Itens: Bíblias, camisetas, cupons cantina, devocionais, acessórios — **custeados pela igreja** |
| **R-S5-2** | Ibid | Tabela de preços definida (ex: Bíblia = 500 Kesef, Camiseta = 300, Cupom cantina = 50) |
| **R-S5-3** | Ibid | Controle de estoque por item |
| **R-S5-4** | Ibid | Fluxo: jovem solicita resgate → admin aprova/rejeita → item entregue → débito no ledger |
| **R-S5-5** | UX | Página `/loja` acessível via Carteira ou bottom nav |

### Modelagem de Dados (Nova)
```sql
-- Tabela: loja_itens
id, nome, descricao, preco_kesef, estoque, imagem_url, ativo, categoria, criado_em

-- Tabela: loja_pedidos
id, usuario_id, item_id, quantidade, status ('pendente'|'aprovado'|'rejeitado'|'entregue'),
kesef_debitado, solicitado_em, processado_em, processado_por_admin_id, observacoes
```

### Tarefas
| ID | Tarefa | Esforço | Dependências |
|---|---|---|---|
| S5.1 | Migração SQL (`setup_db_migration_loja.sql`) + seed itens iniciais | 45 min | S4 (ledger) |
| S5.2 | Tipos TypeScript: `LojaItem`, `LojaPedido`, `LojaStatus` | 15 min | S5.1 |
| S5.3 | `dataService`: `getLojaItens()`, `solicitarResgate(itemId, qtd)`, `getMeusPedidos()`, `adminGetPedidos()`, `adminProcessarPedido(pedidoId, status, obs)` | 1.5h | S5.2 |
| S5.4 | Página `Loja.tsx` (`/loja`) — grid de cards: imagem, nome, preço Kesef, estoque, botão "Resgatar" (disabled se saldo insuficiente ou estoque 0) | 2h | S5.3 |
| S5.5 | Modal de confirmação: "Confirmar resgate de [Item] por X Kesef? Saldo atual: Y" | 45 min | S5.4 |
| S5.6 | Página `MeusPedidos.tsx` — lista com status badges, timeline | 1h | S5.3 |
| S5.7 | Admin: aba "Loja" no `Admin.tsx` — tabela pedidos pendentes, ações Aprovar/Rejeitar/Entregar, observações | 1.5h | S5.3 |
| S5.8 | Ao **aprovar**: `debitarKesef()` + `loja_pedidos.status='aprovado'` (transação atômica via RPC) | 1h | S5.3, S4.4 |
| S5.9 | Ao **entregar**: `status='entregue'`, `processado_em=now()` | 30 min | S5.7 |
| S5.10 | Testes: saldo insuficiente bloqueia, estoque decrementa, ledger débito corresponde, admin fluxo completo | 1h | S5.8 |

### Critérios de Aceitação
- [ ] `/loja` mostra itens com preço Kesef, estoque, imagem
- [ ] Botão "Resgatar" disabled se `saldo < preco` ou `estoque == 0`
- [ ] Confirmação modal antes de enviar solicitação
- [ ] `/meus-pedidos` mostra status com cores: amarelo(pendente), verde(aprovado/entregue), vermelho(rejeitado)
- [ ] Admin vê apenas pedidos `pendente`; ao aprovar → débito no ledger + status `aprovado`
- [ ] Estoque decrementa na aprovação (não na solicitação)
- [ ] Rejeição: sem débito, status `rejeitado`, observação visível ao jovem
- [ ] RLS: jovem vê só seus pedidos; admin vê todos

### Definition of Done
> Branch `feat/loja-resgate` → PR → `main` com seed de itens e fluxo E2E testado

---

## S6 — Métricas Pastorais Admin (Semáforo Engajamento)

### Análise de Requisitos
| Requisito | Fonte | Detalhamento |
|---|---|---|
| **R-S6-1** | Genesis §6, Fase 12 | Painel Admin já tem seção "Gestão Pastoral" placeholder — implementar métricas reais |
| **R-S6-2** | Genesis §3.6 | Identificar jovens afastados (sem interagir há X dias) para visitas/mensagens de apoio |
| **R-S6-3** | UX | Semáforo: 🟢 Ativo (≤3 dias), 🟡 Atenção (4-14 dias), 🔴 Afastado (≥15 dias) |
| **R-S6-4** | Dados | Base: `usuarios.last_login`, `historico_oracoes`, `intercessoes`, `progresso_ebd` |
| **R-S6-5** | Ação | Botão "Enviar WhatsApp" para jovens 🔴 (integra com S2) |

### Tarefas
| ID | Tarefa | Esforço | Dependências |
|---|---|---|---|
| S6.1 | `dataService`: `getMetricasEngajamento()` — retorna array `{ usuario, diasSemLogin, status, ultOracao, ultIntercessao, ultEBD, streakOracao, streakEBD, pontosComunhao, saldoKesef }` | 1.5h | S0, S3, S4 |
| S6.2 | Componente `EngajamentoCard.tsx` — card por jovem: avatar, nome, badge semáforo, métricas-chave, botão "Contatar" | 1.5h | S6.1 |
| S6.3 | Página/Admin: substituir placeholder "Gestão Pastoral" por grid `EngajamentoCard` com filtros (status, busca nome) | 1h | S6.2 |
| S6.4 | Botão "Contatar" → abre modal com template mensagem WhatsApp pré-preenchida → chama `sendWhatsAppMessage()` (S2) | 1h | S6.3, S2 |
| S6.5 | Resumo estatístico no topo: total ativos, atenção, afastados, % engajamento semanal | 45 min | S6.1 |
| S6.6 | Testes: classificação semáforo correta, dados batem com tabelas fonte | 45 min | S6.1 |

### Critérios de Aceitação
- [ ] Admin vê grid de todos os jovens com semáforo colorido
- [ ] Filtro por status (Ativo/Atenção/Afastado) e busca por nome funcionam
- [ ] Card mostra: dias sem login, última oração, última intercessão, última EBD, streaks, pontos, Kesef
- [ ] Botão "Contatar" envia WhatsApp via Evolution API (se configurado) ou copia link `wa.me/...`
- [ ] Resumo: "12 🟢 | 5 🟡 | 3 🔴 — 60% engajados semana"
- [ ] Dados atualizam em tempo real (Realtime em `usuarios.last_login`)

### Definition of Done
> Branch `feat/pastoral-metrics` → PR → `main` validado com Charles (professor)

---

## S7 — Qualidade + Testes + Docs (Legado Pendente)

### Análise de Requisitos
| Requisito | Fonte | Status Atual |
|---|---|---|
| **R-S7-1** | `plano-de-acao.md` 2.3 | Loading states parciais — completar em todos botões de mutação |
| **R-S7-2** | `plano-de-acao.md` 2.5 | `console.error` → sistema de notificação (toast) |
| **R-S7-3** | `plano-de-acao.md` 3.2-3.4 | Testes `dataService`, algoritmo sorteio, fluxo auth — **pendentes** |
| **R-S7-4** | `plano-de-acao.md` 4.1-4.2 | README customizado + docs setup/deploy — **pendentes** |

### Tarefas
| ID | Tarefa | Esforço | Dependências |
|---|---|---|---|
| S7.1 | Auditar todos botões `onClick` assíncronos → adicionar `loading` state + `disabled` + spinner | 2h | — |
| S7.2 | Criar `useToast()` hook + `ToastProvider` (ou usar `sonner`/`react-hot-toast`) + substituir `console.error` | 2h | — |
| S7.3 | Testes `dataService`: mock Supabase client (`@supabase/supabase-js` → `vi.mock`), cobrir: `getDashboardData`, `toggleUserAvailability`, `intercederPorPedido`, `criarPedidoOracao`, `executarSorteio` logic | 3h | S0 (RLS estável) |
| S7.4 | Testes algoritmo sorteio: casos borda (2 users, 3 users, ímpar, inativos filtrados, duplicate IDs) | 1h | S7.3 |
| S7.5 | Testes fluxo auth: `sendOtp`, `verifyOtpAndLogin`, `registerUser`, `loginByPhone` | 1.5h | S7.3 |
| S7.6 | Customizar `README.md`: badges, setup, arquitetura, scripts, deploy (Vercel/Netlify + Capacitor), contribuição | 1.5h | — |
| S7.7 | Criar `docs/SETUP.md` (variáveis, Supabase, Evolution API, Capacitor, Docker) + `docs/DEPLOY.md` | 1h | S7.6 |
| S7.8 | Garantir `npm run lint` + `npm run test` + `npm run build` passam no CI (já configurado) | 30 min | S7.3-7.5 |

### Critérios de Aceitação
- [ ] Zero botões de mutação sem loading state
- [ ] Zero `console.error` em produção (apenas `console.warn`/`log` em dev)
- [ ] Toasts aparecem para erros/sucessos (ex: "Pedido criado", "Falha ao conectar")
- [ ] Cobertura `dataService` ≥ 60% (`npm run test -- --coverage`)
- [ ] Testes algoritmo sorteio: 100% branches cobertos
- [ ] Testes auth: fluxo feliz + erro (OTP inválido, usuário inexistente)
- [ ] `README.md` profissional com instruções completas
- [ ] CI verde: `oxlint` + `vitest run` + `vite build`

### Definition of Done
> Branch `chore/quality-tests-docs` → PR → `main` com coverage report anexado

---

## Cronograma Sugerido (Sprints de 1 Semana)

| Semana | Foco | Entregáveis |
|---|---|---|
| **1** | **S0** (Segurança) | `.env` limpo, chaves rotacionadas, RLS apertadas, auth via `getUser()`, admin por role |
| **2** | **S1** (Capacitor) | APK/IPA debug, splash, status bar, camera, PWA OK |
| **3** | **S2** (WhatsApp) | Evolution API integrado, sorteio envia msgs reais |
| **4** | **S3** (EBD) | Lições + quiz + streak funcionando |
| **5** | **S4** (Kesef) | Ledger imutável + integrações + carteira UI |
| **6** | **S5** (Loja) | Resgate itens + admin aprovação + estoque |
| **7** | **S6** (Métricas) | Semáforo engajamento + WhatsApp contatar |
| **8** | **S7** (Qualidade) | Loading states, toasts, testes ≥60%, README/docs |

---

## Rastreabilidade Requisitos → Tarefas → Testes

| Requisito | Fase | Tarefas-Chave | Teste de Validação |
|---|---|---|---|
| R-S0-1 a R-S0-5 | S0 | S0.1-S0.9 | Git history clean, RLS blocks cross-user access, admin role enforced |
| R-S1-1 a R-S1-5 | S1 | S1.1-S1.12 | APK/IPA installs, splash works, camera works, PWA unaffected |
| R-S2-1 a R-S2-6 | S2 | S2.1-S2.7 | Sortieio → WhatsApp delivered to all pairs, toast shows count |
| R-S3-1 a R-S3-5 | S3 | S3.1-S3.10 | `/ebd` flows: lesson → quiz → streak → Kesef credit |
| R-S4-1 a R-S4-6 | S4 | S4.1-S4.10 | Ledger immutable, saldo = sum(credits)-sum(debits), hooks fire |
| R-S5-1 a R-S5-5 | S5 | S5.1-S5.10 | Request → approve → debit → deliver, stock decrements |
| R-S6-1 a R-S6-5 | S6 | S6.1-S6.6 | Traffic light accurate, contact → WhatsApp, realtime updates |
| R-S7-1 a R-S7-4 | S7 | S7.1-S7.8 | Coverage ≥60%, zero console.error, README complete, CI green |

---

## Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|---|---|---|---|
| Evolution API instável / WhatsApp ban | Média | Alto (S2) | Retry + fallback "copiar link wa.me", monitorar status instância |
| Migração RLS quebra app existente | Alta | Crítico (S0) | Testar em staging Supabase branch antes de produção; feature flag temporária |
| Capacitor plugins incompatíveis React 19 | Baixa | Médio (S1) | Testar plugins core primeiro; `@capacitor/camera` v6+ suporta React 19 |
| Scope creep Kesef/Loja | Média | Médio (S4,S5) | Congelar regras em `nehemiah-requisitos-gamificacao-loja.md` antes de codar |
| Charles indisponível para validação pastoral | Baixa | Alto (S6) | Mock data realista; validar UX com checklist antes de reunião |

---

## Próximos Passos Imediatos

1. **Criar branch `hotfix/security-s0`** e iniciar **S0.1** (limpar histórico git)
2. **Rotacionar chaves Supabase** assim que histórico limpo (S0.2)
3. **Paralelamente**: preparar `.env.example` (S0.3) e revisar `.gitignore` (S0.4)
4. **Agendar** sessão com Charles para validar regras Kesef/Loja (travar scope S4/S5)

---

*Documento vivo — atualizar a cada fase concluída.  
Próxima revisão: após S0 (Segurança) concluído.*
