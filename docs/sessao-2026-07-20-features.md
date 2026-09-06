# Sessão 2026-07-20 — Design System + Admin Roles + Convite + Chat

## S8 — Design System "Relíquia Viva"

### Paleta
- Dark: `#14120f` → `#1a1610` (neutro sépia escuro), cards `#262218`
- Light: `#faf7f0` (pergaminho), cards `#ffffff`
- Acento único: verdete `#4a7c6a` (substituiu multicor)
- Amber/rosa mantidos como funcionais (sorteio, oração)

### Tipografia
- **Fraunces** (display) — títulos de seção, numerais de destaque
- **Inter** (UI) — corpo e botões
- Lucide `stroke-width: 1.5` global (`index.css`)

### Utilitários CSS (`index.css`)
- `card-surface` — `background: var(--bg-elevated)`, `border-radius: 20px`
- `acento-lateral` — barra lateral colorida via `--cor-acento`
- `elevation-1/2/3` — sombras
- `numero-destaque` — Fraunces display para valores grandes
- `font-display` — Fraunces
- `card-enter` — animação slide-up com delay escalonado
- Light theme: sem backdrop-filter (design limpo, sem vidro)

### Avatar colors
- `src/utils/avatarColor.ts` — paleta determinística de 8 tons
- Aplicado em `AvatarComEmblema.tsx`

---

## S9 — Sistema de Papéis (Admin / Guardião / Membro)

### Roles
- `membro` — padrão
- `mod` — Guardiã(o): modera Mural, executa Sorteio, processa pedidos da Loja
- `admin` — Professor: tudo + gerenciar guardiões

### Componentes criados
- `src/contexts/AdminContext.tsx` — contexto global expõe `role`, `isAdmin`, `isMod`, `isGuardiao`, `refreshRole`
- `src/services/adminAuth.ts` — `checkUserRole()` retorna `'membro' | 'mod' | 'admin'`, `checkAdminAuth()` corrigido

### Bugfix crítico
- `checkAdminAuth()` linha 10: `.eq('id', user.id)` → `.eq('auth_user_id', user.id)`

### Admin.tsx
- Login inline com phone + senha
- Seções escondidas por papel:
  - **Sorteio do Círculo** — admin e mod
  - **Gestão Pastoral** (semáforo) — admin only
  - **Gerenciar Guardiões** — admin only (busca + toggle papel)
  - **Moderar Mural** — admin e mod (editar inline, alternar tipo, excluir com 2-passos)

### Guardião no app
- `BaseLayout`: badge shield no header + item Admin no bottom nav visível para guardião e admin
- `PedidoCard.tsx`: botões edit/delete quando `isAdmin || isMod`

---

## S10 — Admin CRUDs

### EBD
- CRUD completo de lições (criar/editar/deletar) com modal
- CRUD de perguntas do quiz (adicionar/editar/deletar) com modal
- Visível apenas para admin

### Loja
- Aba "Admin" (admin e mod):
  - Processar pedidos: aprovar, rejeitar, entregar
  - Criar/editar itens da loja com modal

### Card refactoring
- Todas as seções do `Admin.tsx` migradas de `glass` para `card-surface` + `acento-lateral`
- Touch targets otimizados (`min-h-[44px]`)

---

## S11 — Botão Interceder (Kesef + XP)

### Mudanças
- `KESEF_VALORES.INTERCEDER: 1` (em vez de `ORACAO_CONFIRMADA: 10`)
- `XP_ACOES.INTERCEDER: 1`
- `creditarXp()` adicionado a `kesefService.ts` (RPC `creditar_xp`)
- `Mural.tsx`: chama `creditarKesef('oracao', 1)` + `creditarXp(1)` ao interceder

---

## S12 — Fluxo de Convite + Timer + Chat

### Migração: `setup_db_migration_convitepray.sql`

#### Tabelas novas
| Tabela | Função |
|---|---|
| `convites_oracao` | remetente → destinatário, status, tipo de conexão (aceite/voz/video) |
| `sessoes_oracao_timer` | presença síncrona para oração silenciosa |
| `mensagens` | chat de texto 1:1 com RLS |

#### RPCs novas
| RPC | Descrição |
|---|---|
| `enviar_convite_oracao` | Cria convite, valida duplicata e sala ativa |
| `responder_convite_oracao` | Aceita/recusa, cria LiveKit se ambos escolherem voz/vídeo |
| `finalizar_sessao_timer` | Encerra oração silenciosa quando ambos clicam "Amém" |

### `src/services/conviteService.ts`
- `enviarConviteOracao()`, `responderConviteOracao()`, `finalizarSessaoTimer()`
- `getConvitesPendentes()`, `getConviteEnviadoPendente()`
- `subscribeToConvites()` — Realtime por usuário

### `src/services/mensagemService.ts`
- `getConversa()`, `enviarMensagem()`, `marcarComoLidas()`, `getUltimasConversas()`
- `subscribeToMensagens()` — Realtime por par

### `src/pages/TimerOracao.tsx`
- Tela de oração silenciosa com timer
- Sincronização via Realtime (ambos "Amém" para finalizar)
- Crédito: 1 Kesef + 1 XP (mín 60s)

### `src/pages/Chat.tsx`
- Bubbles de mensagem com timestamp e indicador de lida (✓ / ✓✓)
- Input com Enter para enviar
- Realtime — mensagens novas aparecem instantaneamente

### Home.tsx — novo fluxo
- **"Orar Agora"** → envia convite (não cria sala direto)
- Banner de convite recebido com 3 botões: 🕯️ Aceitar / 🎙️ Voz / 📹 Vídeo
- Card "Convite Enviado" enquanto parceiro não responde
- Botão **"Mensagem"** abre modal com 3 opções: Voz / Vídeo / Texto
- Realtime escuta convites novos

### Rotas novas (`App.tsx`)
- `/timer/:conviteId` → `TimerOracao`
- `/chat/:userId` → `Chat`

---

## Bugfixes

| Problema | Causa | Fix |
|---|---|---|
| Admin login falhava | `eq('id', user.id)` em vez de `eq('auth_user_id', user.id)` | Corrigido em `adminAuth.ts:10` |
| 406 no console (ProvaBanner) | `.single()` em query sem resultados | `.maybeSingle()` em `dataService.ts:696` |
| Modal Mensagem translúcido | `var(--card-bg)` não existia | `var(--bg-elevated)` |
| Toast translúcido | `backdrop-blur-md` + `bg-emerald-900/80` | `bg-emerald-950` sem blur |
| Cards translúcidos no dark mode | `--bg-elevated: rgba(38,34,24,0.8)` e `--glass-bg: rgba(28,25,22,0.55)` | Todos sólidos: `#262218` / `#1d1a14` |
| Fallback inline desatualizado | `index.html` tinha valores RGBA antigos | Sincronizado com ThemeContext |
| Modal atrás do bottom nav | `items-end` sem margem | `mb-28` no conteúdo do modal |

---

## Testes
- 29/29 testes passando (4 novos: `checkUserRole` para membro/mod/admin + edge case)
- Build: 0 erros

## Documentação gerada
- `docs/auto-match-professor.md` — rascunho futuro: auto-conexão do professor com convites pendentes > 5 min
