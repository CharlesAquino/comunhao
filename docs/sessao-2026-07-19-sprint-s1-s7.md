# Sessão — 2026-07-19 — Sprint S1 a S7 + Salas de Oração + Indicação

## O que foi feito

Esta sessão implementou do Sprint S1 ao S7, refatorou o sistema Kesef com
ledger server-enforced (v2), construiu o sistema de Salas de Oração com
LiveKit WebRTC, e adicionou o mecanismo de Indicação com bônus por
expansão da rede.

---

## S1 — Capacitor (Mobile Packaging)

### Arquivos criados/modificados
- `capacitor.config.json` — Configuração do Capacitor (appId, appName, server.url)
- Android platform adicionada, plugins configurados (nativa)
- `StatusBar` integrado com `ThemeContext` (dark/light)

### Estado atual
- ✅ Config criada, Android platform added
- 🟡 Build mobile não testado (falta `npx cap sync` + `npx cap open android`)
- 🟡 iOS não configurado (mas Capacitor cross-platform)

---

## S2 — WhatsApp Evolution API

### Arquivos
- `src/services/whatsappService.ts` — Funções reais com HTTP (não mais stub)

### Funcionalidades
- `sendWhatsAppMessage(phone, message)` — POST com exponential‑backoff retry (3 tentativas)
- `notifyPrayerPartners()` — Busca pares da semana e envia template de oração
- Admin exibe toast com sumário de delivery (sucessos/falhas)

### ⚠️ Dependência externa
- Requer Evolution API self‑hosted rodando
- Envs: `VITE_EVOLUTION_API_URL`, `VITE_EVOLUTION_API_KEY`, `VITE_EVOLUTION_INSTANCE`
- Atualmente vazias no `.env`

---

## S3 — EBD (Escola Bíblica Dominical)

### SQL
- `licoes` (id, titulo, texto_base, criado_em)
- `licoes_perguntas` (id, licao_id FK, pergunta, alternativas JSONB, resposta_correta)

### Serviço (dataService.ts)
- `getLicoes()` — Lista lições
- `getLicaoCompleta(id)` — Lição com perguntas
- `verificarRespostaQuiz(perguntaId, alternativaIndex)` — Boolean

### Página (`src/pages/EBD.tsx`)
- Timeline de lições
- Quiz com progresso, resultado parcial, contagem de acertos
- Botão "Ver Resposta" + destaque visual

### Rota
- `/ebd` (dentro do BaseLayout)

---

## S4 — Kesef (Moeda da Comunidade)

### Arquitetura (v2 — refatorada nesta sessão)

Duas migrations aplicadas na ordem:

1. `setup_db_migration_kesef_v2.sql` — Tabela `kesef_ledger`, view `kesef_saldo`,
   RPCs `creditar_kesef` / `debitar_kesef` / `estornar_kesef`
2. `setup_db_migration_indicacao.sql` — (ver seção Indicação abaixo)

### Tabela: kesef_ledger
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | |
| usuario_id | UUID FK→usuarios | Dono do movimento |
| quantidade | integer | Positivo = crédito, Negativo = débito |
| tipo | text | `oracao`, `licao`, `quiz_acerto`, `streak_bonus_7`, `streak_bonus_30`, `indicacao`, `resgate`, `estorno` |
| referencia | text | ID da sala, lição, pedido etc. |
| criado_em | timestamptz | |

### RPCs (SECURITY DEFINER — NUNCA chamar tabela direto)
- `creditar_kesef(p_usuario_id, p_tipo, p_quantidade, p_referencia)`
  - Aplica **cap diário de 60 Kesef**
  - Tipos válidos com valor fixo: `oracao` (10), `licao` (5), `quiz_acerto` (3),
    `streak_bonus_7` (15), `streak_bonus_30` (50), `indicacao` (20)
  - Lança exceção `SALDO_INSUFICIENTE` ou `CAP_DIARIO_ATINGIDO`
- `debitar_kesef(p_usuario_id, p_tipo, p_quantidade, p_referencia)`
  - Usado para resgate na loja
- `estornar_kesef(p_ledger_id)`
  - Admin apenas (inverte movimento)

### View: kesef_saldo
- `usuario_id`, `saldo_total` (aggregate SUM)

### Constantes (src/services/kesefConstants.ts)
```typescript
KESEF_VALORES = { oracao: 10, licao: 5, quiz_acerto: 3, streak_bonus_7: 15, streak_bonus_30: 50, indicacao: 20 }
KESEF_CAP_DIARIO = 60
KESEF_PRECOS_LOJA = { marcador_biblia: 30, devocional: 15, camisa: 80, cafe: 20, livro: 50 }
```

### Serviço (src/services/kesefService.ts)
- `getSaldoKesef()`, `getHistoricoKesef()`, `creditarKesef()`, `debitarKesef()`, `estornarKesef()`
- `subscribeToKesefChanges(usuarioId, callback)` — Realtime

### Página Carteira (src/pages/Carteira.tsx)
- Moeda holográfica com `כ` (kaf) em bronze, anel rotativo com scanner
- Grid de fundo, exibe saldo + histórico
- **Código de indicação** com botão copiar (ver Indicação abaixo)

---

## S5 — Loja (Resgate de Kesef)

### SQL
- `loja_itens` (id, nome, descricao, preco_kesef, imagem_url, estoque, ativo)
- `loja_pedidos` (id, usuario_id FK, item_id FK, quantity, criado_em, status)
- Seed de 5 itens inseridos na migration
- RPCs: `debitar_kesef` + `decrementar_estoque`

### Página (src/pages/Loja.tsx)
- Grid de itens com preço, estoque
- Modal de confirmação com saldo atual
- Aba "Meus Pedidos" com histórico de resgates
- Botão "Entrar em Contato" (WhatsApp Admin)

---

## S6 — Métricas Pastorais (Admin)

### Tipo (src/types/index.ts)
```typescript
EngajamentoJovem {
  id, nome, telefone, foto_url, status_anel,
  dias_sem_login, ultima_intercessao, pontos_comunhao, streak_dias, papel, semafaro
}
```

### Serviço (dataService.ts)
- `getMetricasEngajamento()` — Busca todos usuários com dias desde último login,
  data da última intercessão, calcula semáforo (≤3d=verde, 4‑14d=amarelo, ≥15d=vermelho)

### Componente (src/components/EngajamentoCard.tsx)
- Card com status_anel + semáforo + pontos
- Botão "WhatsApp" que abre link `https://wa.me/55...`

### Admin.tsx
- Aba "Métricas Pastorais" com filtros (status_anel, semáforo)
- Grid de EngajamentoCard, resumo no topo (total, verde, amarelo, vermelho)

---

## S7 — Qualidade (Testes + UX)

### Toast (src/contexts/ToastContext.tsx)
- `ToastProvider` + `useToast()` com `success()`, `error()`, `info()`
- Auto‑dismiss 4s, animação slide‑in
- Substituiu todos `console.error` e `alert` nas páginas

### Loading states
- Todas páginas com `loading` + `error` + `empty` states
- Admin usa `operatingId` para desabilitar botões durante ação (ex.: excluir pedido)

### Testes
```
 Test Files  6 passed (6)
      Tests  24 passed (24)
```
- `src/utils/sorteio.test.ts` — Algoritmo de sorteio do círculo (função pura extraída)
- `src/contexts/ToastContext.test.tsx` — ToastContext (render, add, dismiss)

---

## Salas de Oração (LiveKit WebRTC)

### SQL (setup_db_migration_salas_oracao.sql)

**Tabelas:**
- `salas_oracao` (id, tipo_sala, status_sala, host_usuario_id, livekit_room_name, iniciada_em, encerrada_em, criado_em)
- `salas_oracao_participantes` (id, sala_id FK, usuario_id FK, conectado_em, desconectado_em, kesef_creditado)
  - UNIQUE(sala_id, usuario_id)

**RPCs (SECURITY DEFINER):**
- `criar_sala_oracao(p_tipo_sala)` → Cria sala + insere host como participante
  - SEMPRE disponível, sem cooldown, sem trava de 1 sala ativa
- `entrar_sala_oracao(p_sala_id)` → Insere participante, se 2+ ativa a sala
- `finalizar_sala_oracao(p_sala_id)` →
  - Idempotente (se já encerrada, retorna vazio)
  - Duração mínima 60s
  - **Credita 10 Kesef APENAS se NÃO for a dupla da semana**
    (verifica `usuarios.orando_por_id`)
  - Se for dupla, retorna `DUPLA_DA_SEMANA` sem crédito
  - Na primeira oração do indicado, chama `creditar_bonus_indicacao` (+20 ao indicador)

**RLS:**
- Usuários veem salas que participam + salas em aguardando
- Participantes veem próprias participações
- RPCs são SECURITY DEFINER (ignoram RLS)

### Edge Function (supabase/functions/gerar-token-livekit/index.ts)

```typescript
// Valida:
//   1. Usuário autenticado via Authorization header
//   2. Sala existe e não está encerrada
//   3. Usuário é participante da sala
// Gera token LiveKit JWT com:
//   - identity = usuario.id
//   - name = usuario.nome
//   - room = sala.livekit_room_name
//   - metadata = { sala_id }
//   - videoGrant (roomJoin, canPublish, canSubscribe)
```

**Secrets necessários (setados via Supabase CLI):**
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`

**URL configurada:** `wss://sala-de-oracao-d0004s25.livekit.cloud`

### Serviço Client (src/services/prayerRoomService.ts)
- `criarSalaOracao(tipoSala)` → RPC `criar_sala_oracao`
- `entrarSalaOracao(salaId)` → RPC `entrar_sala_oracao`
- `finalizarSalaOracao(salaId)` → RPC `finalizar_sala_oracao`
- `obterTokenLiveKit(salaId)` → Invoca Edge Function `gerar-token-livekit`
- `listarSalasAguardando()` → SELECT salas aguardando
- `subscribeToSalasChanges(callback)` → Realtime channel

### Componente Sala de Oração (src/pages/SalaOracao.tsx)
- Conecta ao LiveKit Room usando `Room` do `livekit-client`
- **Características:**
  - Cronômetro estilo `MM:SS` com label "de clamor"
  - Avatares dos participantes (iniciais + indicador de fala com glow verde)
  - Toggle de microfone (mutado/ativado)
  - Botão "Amém" que chama `finalizarSalaOracao`
  - Background aurora sutil
  - Tela cheia (`100dvh`), sem bottom nav
  - Tratamento de estados: conectando (spinner), erro (mensagem + voltar)
  - Desconexão automática redireciona pra Home

### Rota
- `/sala/:salaId` → `SalaOracao` (fora do BaseLayout)

### Instalação
- `livekit-client` adicionado ao package.json

### ⚠️ Configuração necessária
- LiveKit Cloud criado em `sala-de-oracao-d0004s25.livekit.cloud`
- `.env` precisa de `VITE_LIVEKIT_URL=wss://sala-de-oracao-d0004s25.livekit.cloud`
- A Edge Function precisa do secret `LIVEKIT_API_KEY` + `LIVEKIT_API_SECRET`
  (já setados via CLI)

---

## Sistema de Indicação

### SQL (setup_db_migration_indicacao.sql)

**Colunas novas em `usuarios`:**
- `codigo_indicacao text UNIQUE` — Código de 8 caracteres (ex: `A1B2C3D4`)
- `indicado_por_id uuid FK→usuarios(id)` — Quem indicou este usuário

**Novos RPCs:**
- `gerar_codigo_indicacao()` — Gera/retorna código único para o usuário logado
- `registrar_indicacao(p_codigo_indicacao)` — Vincula `indicado_por_id`
  (valida: código existe, não é auto‑indicação)
- `creditar_bonus_indicacao()` — Chama `creditar_kesef` com tipo `indicacao` (+20)
  para o indicador, executado na 1ª oração do indicado (idempotente)

### Regras de crédito (lógica central)

| Situação | Kesef |
|---|---|
| Orar com a **dupla da semana** (`orando_por_id`) | 0 (compromisso do círculo) |
| Orar com **alguém fora da dupla** | +10 (expansão da rede) |
| **Indicar novo membro** (1ª oração do indicado) | +20 ao indicador |
| Comprar na lojinha | -preço (via débito) |

### Frontend

**Register.tsx**
- Campo opcional "Código de Indicação" com ícone `Gift`
- Passado via URL para VerifyOtp

**VerifyOtp.tsx**
- Lê `codigo` dos searchParams
- Passa para `registerUser(nome, phone, codigo)`

**dataService.ts**
- `gerarCodigoIndicacao()` → RPC
- `registrarIndicacao(codigo)` → RPC
- `registerUser` aceita `codigoIndicacao?` e chama `registrar_indicacao`

**Carteira.tsx**
- Exibe código de 8 caracteres em monospace
- Botão copiar (clipboard + ícone `Check` por 2s)
- Label: "Compartilhe e ganhe +20 Kesef por novo membro!"

---

## Estado atual do projeto

### Qualidade
```
 TypeScript strict  → ✅ 0 errors
 Lint               → ✅ 0 errors
 Testes             → ✅ 24 passed (6 suites)
 Build (vite)       → ✅ (PWA incluso)
 CI/CD              → ✅ (GitHub Actions: lint → test → build)
```

### Migrations aplicadas no Supabase
| Migration | Status |
|---|---|
| `setup_db_migration_v2.sql` (RLS inicial) | ❌ AINDA NÃO APLICADA |
| `setup_db_migration_kesef_v2.sql` (Kesef ledger) | ✅ Aplicada |
| `setup_db_migration_salas_oracao.sql` | ✅ Aplicada |
| `setup_db_migration_indicacao.sql` | ✅ Aplicada |

### ⚠️ Pendências críticas
1. **Aplicar `setup_db_migration_v2.sql`** no SQL Editor
2. **Rotacionar chaves Supabase** (estão expostas no `.env`, trocar no dashboard)
3. **Definir admin:** `UPDATE usuarios SET papel='admin' WHERE telefone='...'`
4. **LiveKit Cloud:** Verificar se `gerar-token-livekit` está respondendo
5. **Evolution API:** Hospedar instância e preencher `.env`

### Rotas atuais
```
/login          → Login.tsx
/register       → Register.tsx
/verify-otp     → VerifyOtp.tsx
/               → Home.tsx
/mural          → Mural.tsx (BaseLayout)
/ranking        → Ranking.tsx (BaseLayout)
/ebd            → EBD.tsx (BaseLayout)
/loja           → Loja.tsx (BaseLayout)
/carteira       → Carteira.tsx (BaseLayout)
/admin          → Admin.tsx (BaseLayout)
/sala/:salaId   → SalaOracao.tsx (fora do BaseLayout)
```

### Serviços disponíveis (src/services/)
| Arquivo | Função |
|---|---|
| `dataService.ts` | CRUD principal + EBD + métricas + indicação |
| `kesefService.ts` | Saldo/histórico/operações Kesef |
| `kesefConstants.ts` | Valores, tipos, preços |
| `prayerRoomService.ts` | Salas de oração + LiveKit |
| `whatsappService.ts` | WhatsApp Evolution API |
| `adminAuth.ts` | Verificação de admin |
| `supabaseClient.ts` | Cliente Supabase singleton |
| `constants.ts` | Constantes, rotas, mensagens |

### Commits nesta sessão (do mais recente ao mais antigo)
```
61efe8d sistema de indicação + bónus por orar fora da dupla
4c88155 anti-spam salas de oração (removido depois)
a63d417 Salas de Oração com WebRTC (LiveKit)
bb3c7c1 Carteira holográfica + botão Orar Agora com Kesef
5b5fe6f Kesef Ledger v2 — cap diário + tipos semânticos
96f222f S7 - Qualidade (toast, loading states, testes)
fd03507 S6 - Métricas Pastorais Admin
f6721d2 S4 - Sistema Kesef (moeda + ledger + streaks)
e6137da S5 - Lojinha de Resgate
3ac2eae S3 - Módulo EBD (lições + quiz)
22e8a66 S2 - WhatsApp Evolution API real
1d18a23 S1 - Capacitor mobile packaging
03166da AGENTS.md com contexto do projeto
```

### Próximos passos sugeridos
1. Aplicar `setup_db_migration_v2.sql` no SQL Editor do Supabase
2. Rotacionar `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_URL` no dashboard
3. Definir usuário admin manualmente
4. Testar fluxo completo de Salas de Oração:
   - Abrir app → "Orar Agora" → Sala → Amém → +10 Kesef (se não for dupla)
5. Verificar se Edge Function `gerar-token-livekit` está funcional
6. Configurar instância Evolution API (WhatsApp)
7. Gerar APK: `npx cap sync && npx cap open android`
8. Próximos sprints: Capacitor (build final), EBD + Kesef + Loja (polimento),
   WhatsApp real, onboarding, notificações push
