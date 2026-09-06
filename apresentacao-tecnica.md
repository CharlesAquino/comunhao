# oracao-app — Apresentação Técnica do Projeto

> Registro histórico. A integração administrativa com WhatsApp foi removida;
> o canal está reservado somente à futura recuperação de senha.

> "Comunhão | Oração Constante" — Plataforma de intercessão e comunhão para mocidade (Assembleia de Deus)

---

## 1. Visão Geral

Aplicação mobile-first PWA para gerenciar um **círculo de oração** de jovens da EBD. Combina gamificação (patentes, moeda, streaks) com dinâmica espiritual (duplas de oração, mural de clamores, salas de voz via WebRTC).

**Público-alvo:** Jovens de 12–25 anos da Assembleia de Deus  
**Stakeholder principal:** Charles (professor da EBD, idealizador da dinâmica presencial)

---

## 2. Stack Tecnológica

### Frontend
| Tecnologia | Versão | Propósito |
|---|---|---|
| React | 19.2.7 | Framework SPA |
| TypeScript | 7.0.2+ | Tipagem estrita (strict mode) |
| Vite | 8.1.1 | Build/Dev server |
| Tailwind CSS | 4.3.2 | Estilização utility-first (via `@theme`, sem config file) |
| React Router DOM | 7.18.1 | Roteamento SPA |
| Lucide React | 1.24.0 | Sistema de ícones |
| Vitest + Testing Library | 4.1.10 / 16.3.2 | Testes unitários e de componentes |

### Backend (Supabase)
| Serviço | Função |
|---|---|
| **Auth** | Autenticação via phone + password (signInWithPassword) |
| **Postgres** | Banco relacional (tabelas, views, RPCs, RLS) |
| **Realtime** | Subscrições para dados ao vivo (mural, kesef) |
| **Storage** | Upload de avatares |
| **Edge Functions** | Deno runtime para OTP, verificação de dispositivo, tokens LiveKit |

### Serviços Externos
| Serviço | Função | Status |
|---|---|---|
| **LiveKit** | WebRTC para salas de oração em áudio | Configurado |
| **Evolution API** | Envio de códigos OTP via WhatsApp | Configurado (não deployado) |

### Mobile
| Ferramenta | Função |
|---|---|
| **Capacitor** | Empacotamento para Android APK (configurado) |
| **Vite PWA Plugin** | Service Worker + manifest para instalação |

### CI/CD
| Plataforma | Pipeline |
|---|---|
| **GitHub Actions** | Lint → Test → Build |

---

## 3. Arquitetura

```
src/
├── components/       # Componentes reutilizáveis (UI + lógica)
│   ├── layout/       # BaseLayout (bottom nav, tema, aurora)
│   └── ...
├── contexts/         # Contextos React (Theme, Toast)
├── pages/            # Páginas da aplicação (cada rota)
├── services/         # Camada de serviços (NUNCA chama Supabase direto nos componentes)
│   ├── supabaseClient.ts   # Instância do Supabase
│   ├── dataService.ts      # CRUD principal
│   ├── kesefService.ts     # Moeda Kesef
│   ├── kesefConstants.ts   # Constantes de valores
│   ├── patente.ts          # Sistema de patentes/XP
│   ├── prayerRoomService.ts # Salas de oração WebRTC
│   ├── adminAuth.ts        # Autenticação admin
│   ├── whatsappService.ts  # Integração WhatsApp
│   └── constants.ts        # Constantes globais
├── types/             # Tipos TypeScript centralizados
└── test/              # Testes Vitest
```

### Princípios de Arquitetura
1. **Separação de responsabilidades**: Componentes nunca acessam Supabase diretamente — sempre via serviços
2. **Tipagem estrita**: TypeScript strict mode, tipos centralizados em `types/index.ts`
3. **Estados**: Toda página de dados trata loading / vazio / erro
4. **Tema**: Dark por padrão, Light alternável (persiste localStorage)
5. **Idioma**: 100% português (BD, código, UI)

---

## 4. Rotas e Telas

| Rota | Página | Nome de Exibição | Funcionalidade |
|---|---|---|---|
| `/login` | Login.tsx | — | Login phone + senha |
| `/register` | Register.tsx | — | Cadastro com OTP WhatsApp |
| `/verify-otp` | VerifyOtp.tsx | — | Validação de código OTP (6 dígitos) |
| `/verificar-dispositivo` | VerifyDispositivo.tsx | — | Verificação periódica (30 dias) |
| `/` | Home.tsx | **Comunhão** | Dashboard: missão, sustentador, grid mocidade, Orar Agora, toggle disponibilidade |
| `/mural` | Mural.tsx | **Mural de Clamores** | Feed de pedidos/testemunhos, intercessão |
| `/ranking` | Ranking.tsx | **Hierarquia Angelical** | Tiers das patentes + progresso pessoal |
| `/guia` | GuiaPatentes.tsx | **Guia** | Explicação do sistema de patentes |
| `/ebd` | EBD.tsx | **Escola Bíblica Digital** | Lições + quiz |
| `/loja` | Loja.tsx | **Tesouro** | Resgate de itens com Kesef |
| `/carteira` | Carteira.tsx | **Carteira** | Saldo, histórico, código de indicação |
| `/admin` | Admin.tsx | **Admin** | Sorteio de círculo, moderação, métricas |
| `/sala/:salaId` | SalaOracao.tsx | — | Sala de oração WebRTC (sem bottom nav) |

### Layout
- Rotas autenticadas envolvidas por `BaseLayout`: bottom nav com 5 ícones, aurora pulsante ao fundo, theme toggle + saldo Kesef no topo
- SalaOracao fica FORA do BaseLayout (tela cheia, sem navegação)

---

## 5. Banco de Dados (Supabase Postgres)

### Tabelas

**usuarios** — Perfil principal
| Coluna | Tipo | Descrição |
|---|---|---|
| id | UUID PK | Identificador único |
| auth_user_id | UUID FK→auth.users | Vínculo com autenticação |
| nome | TEXT | Nome do usuário |
| telefone | TEXT UNIQUE | WhatsApp E.164 (+5528999999999) |
| foto_url | TEXT? | Avatar no Storage |
| status_anel | ENUM('offline','disponivel','orando') | Status de disponibilidade |
| papel | ENUM('membro','admin') | Papel no sistema |
| pontos_comunhao | INTEGER | Kesef (moeda) |
| xp | INTEGER DEFAULT 0 | Experiência (patentes) |
| streak_dias | INTEGER | Sequência de dias consecutivos |
| orando_por_id | UUID FK | Dupla da semana (missão) |
| sendo_orado_por_id | UUID FK | Sustentador |
| codigo_indicacao | TEXT UNIQUE | Código para convidar |
| indicado_por_id | UUID FK | Quem o indicou |
| ultima_verificacao | TIMESTAMPTZ | Última verificação de dispositivo |
| last_login | TIMESTAMPTZ | Último login |
| device_id | TEXT | Identificador do dispositivo |
| criado_em | TIMESTAMPTZ | Data de criação |

**pedidos** — Mural de oração
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| autor_id | UUID FK→usuarios |
| texto | TEXT |
| tipo | ENUM('em_clamor','testemunho') |
| criado_em | TIMESTAMPTZ |
| finalizado_em | TIMESTAMPTZ? |

**intercessoes** — Quem intercedeu em cada pedido
| Coluna | Tipo |
|---|---|
| pedido_id | UUID FK→pedidos |
| usuario_id | UUID FK→usuarios |
| criado_em | TIMESTAMPTZ |

**kesef_ledger** — Livro-razão da moeda (imutável)
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| usuario_id | UUID FK→usuarios |
| tipo | ENUM('oracao','licao','quiz_acerto','streak_bonus_7','streak_bonus_30','indicacao','resgate','estorno') |
| quantidade | INTEGER |
| referencia_id | UUID? |
| criado_em | TIMESTAMPTZ |

**salas_oracao** — Salas WebRTC
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| tipo_sala | TEXT |
| status_sala | ENUM('aguardando','ativa','encerrada') |
| host_usuario_id | UUID FK |
| livekit_room_name | TEXT UNIQUE |
| iniciada_em | TIMESTAMPTZ |
| encerrada_em | TIMESTAMPTZ? |
| criado_em | TIMESTAMPTZ |

**salas_oracao_participantes** — Participantes das salas
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| sala_id | UUID FK |
| usuario_id | UUID FK |
| conectado_em | TIMESTAMPTZ |
| desconectado_em | TIMESTAMPTZ? |
| kesef_creditado | BOOL |

**histórico_oracoes** — Registro de orações em par
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| usuario_1_id | UUID FK |
| usuario_2_id | UUID FK |
| duracao_segundos | INTEGER |
| pontos_gerados | INTEGER |
| finalizado_em | TIMESTAMPTZ |

**licoes** — Conteúdo EBD
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| titulo | TEXT |
| texto_base | TEXT |
| criado_em | TIMESTAMPTZ |

**licoes_perguntas** — Quiz
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| licao_id | UUID FK |
| pergunta | TEXT |
| alternativas | JSONB |
| resposta_correta | INTEGER |

**loja_itens** — Catálogo do Tesouro
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| nome | TEXT |
| descricao | TEXT |
| preco_kesef | INTEGER |
| imagem_url | TEXT |
| estoque | INTEGER |
| ativo | BOOL |

**loja_pedidos** — Resgates
| Coluna | Tipo |
|---|---|
| id | UUID PK |
| usuario_id | UUID FK |
| item_id | UUID FK |
| quantidade | INTEGER |
| kesef_debitado | INTEGER |
| status | ENUM('pendente','aprovado','rejeitado','entregue') |
| solicitado_em | TIMESTAMPTZ |

### Views
**kesef_saldo** — Saldo agregado do ledger
```sql
CREATE VIEW kesef_saldo AS
SELECT usuario_id, COALESCE(SUM(quantidade), 0)::integer AS saldo
FROM kesef_ledger GROUP BY usuario_id;
```

### RPCs (SECURITY DEFINER)
| Nome | Função |
|---|---|
| `creditar_kesef(uid, tipo, qtd, ref?)` | Credita moeda com cap diário de 60 |
| `debitar_kesef(uid, qtd, ref?)` | Debita moeda (resgate) |
| `estornar_kesef(ledger_id)` | Estorno admin |
| `creditar_xp(uid, qtd, motivo?)` | Adiciona XP (sem cap) |
| `criar_sala_oracao(tipo_sala)` | Cria sala sempre disponível |
| `entrar_sala_oracao(sala_id)` | Entra e ativa se 2+ participantes |
| `finalizar_sala_oracao(sala_id)` | Encerra + credita (60s mín) |
| `gerar_codigo_indicacao()` | Gera código 8 caracteres |
| `registrar_indicacao(codigo)` | Vincula indicação |
| `creditar_bonus_indicacao()` | +20 ao indicador na 1ª oração |

### Row Level Security (RLS)
- `usuarios`: RLS desabilitado (não aplicado)
- `kesef_ledger`: RLS habilitado — cada um vê seu próprio ledger
- `pedidos`, `intercessoes`: Sem RLS (público interno)
- `salas_oracao`, `salas_oracao_participantes`: RLS por participação

---

## 6. Sistemas de Progressão

### XP (Experiência) — Patentes
XP é acumulativo e **nunca é gasto**. Determina a patente visual do usuário.

| Ação | XP |
|---|---|
| Orar com alguém | 5 |
| Completar lição EBD | 10 |
| Acertar quiz | 3 |
| Streak 7 dias | 12 |
| Streak 30 dias | 50 |
| Indicar membro | 15 |

**Patentes (Hierarquia Angelical)**

| Patente | XP mínimo | Ícone | Moldura Visual |
|---|---|---|---|
| 🕊️ Anjo | 0 | Pena | Círculo prata suave |
| ⚔️ Arcanjo | 300 | Espada | Gradiente dourado + glow |
| 👁️ Querubim | 1.500 | Olho | Gradiente azul + borda |
| 🔥 Serafim | 8.000 | Chama | Dupla borda rubi + glow intenso |

O cálculo é feito no frontend (`src/services/patente.ts`). Cada patente renderiza um ornamento diferente em volta do avatar.

### Kesef (Moeda)
Kesef (prata em hebraico) é a moeda do Tesouro. Tem **cap diário de 60** e é **gasto em resgates**.

| Ação | Kesef |
|---|---|
| Orar com dupla da semana | 0 (compromisso) |
| Orar com alguém fora da dupla | 10 |
| Indicar novo membro (1ª oração) | 20 |
| Completar lição EBD | 5 |
| Acertar quiz | 3 |
| Streak 7 dias | 15 |
| Streak 30 dias | 50 |
| Resgatar item | -preço |

---

## 7. Autenticação e Segurança

### Fluxo de Autenticação
1. **Cadastro**: Phone + nome + senha → Edge Function `enviar-otp` (WhatsApp) → Edge Function `verificar-otp` (cria auth user + profile)
2. **Login**: Phone + senha → `supabase.auth.signInWithPassword()` → verifica `ultima_verificacao` (30 dias) → redireciona
3. **Redefinição de senha**: Phone → `enviar-otp` → `verify-otp?resetSenha=true`
4. **Auto disponível**: Ao logar, `status_anel = 'disponivel'` automaticamente

### Edge Functions (Deno)
| Função | Endpoint | Propósito |
|---|---|---|
| `enviar-otp` | POST | Gera código 6 dígitos, hasheia SHA-256, envia via WhatsApp |
| `verificar-otp` | POST | Valida hash, cria auth user com senha escolhida, retorna session |
| `verificar-dispositivo` | POST | Verificação periódica (envia/valida código) |
| `gerar-token-livekit` | POST | Gera token JWT para sala WebRTC |

### Segurança
- RPCs de moeda são SECURITY DEFINER (nunca acessar tabelas direto)
- Edge Functions usam `SUPABASE_SERVICE_ROLE_KEY` (admin)
- Token LiveKit gerado por Edge Function — `LIVEKIT_API_SECRET` nunca sai do servidor
- CORS configurado nas Edge Functions
- **⚠️ Chaves Supabase expostas no .env — rotacionar antes de produção**

---

## 8. Visual e Identidade

### Paleta (Menta Pastel)
| Cor | Uso |
|---|---|
| Verde menta (emerald-200/300) | Primary, gradientes, destaques |
| Roxo escuro (#0f0d1a) | Background dark |
| Vidro (glass) | Cards, navegação (backdrop-filter blur) |
| Dourado (amber-400) | Destaques, patentes |
| Rosa/vermelho (rose-400/500) | Status "orando", alertas |

### Efeitos Visuais
- **Aurora pulsante**: Gradientes animados em blur (CSS keyframes)
- **Glassmorfismo**: Cards e nav com backdrop-filter + bordas translúcidas
- **Glow**: Sombras coloridas em elementos destacados
- **Anel verde pulsante**: `animate-pulse` quando disponível
- **Moldura de patente**: Gradientes + box-shadows diferentes por nível
- **Overlay de ícone**: Símbolo da patente no canto inferior direito do avatar

### Tema
- Dark mode como padrão
- Light mode alternável (persiste em localStorage)
- Variáveis CSS customizadas no `index.css`

---

## 9. Funcionalidades Detalhadas

### Home (Comunhão)
- Missão da semana (dupla de oração)
- Sustentador (quem ora por você)
- Grid da mocidade com avatares + status + patente
- Botão "Orar Agora" (entra em sala disponível)
- Toggle "Levantar a Mão" (disponibilidade)

### Mural de Clamores
- Feed de pedidos e testemunhos
- Contagem de intercessores
- Botão "Interceder" (toggle)
- Criar novo pedido

### Hierarquia Angelical
- Meu progresso (barra XP atual)
- 4 tiers expansíveis com membros
- Contagem por patente
- Link para o Guia

### Salas de Oração (WebRTC)
- Criar/entrar em salas de áudio
- LiveKit para WebRTC
- Crédito de Kesef ao finalizar (60s mín)
- Anti-spam: 1 sala ativa + cooldown 30s

### EBD (Escola Bíblica Digital)
- Lista de lições
- Conteúdo + quiz por lição
- Feedback de acerto/erro
- XP e Kesef por conclusão

### Tesouro
- Catálogo de itens com preços
- Resgate com Kesef
- Histórico de pedidos

### Admin
- Sorteio do círculo (duplas)
- Moderação do mural
- Métricas pastorais (semáforo de engajamento)

---

## 10. Qualidade e Testes

### Status Atual
- ✅ TypeScript strict mode — 0 erros
- ✅ Lint (Oxlint) — 0 erros
- ✅ 24 testes — 6 suites — 100% passando
- ✅ Build production — PWA gerado
- ✅ CI/CD — GitHub Actions

### Cobertura de Testes
- Componentes: `MocidadeGrid`, `ErrorBoundary`
- Serviços: `adminAuth`, `constants`
- Contextos: `ToastContext`
- Lógica: `sorteio` (algoritmo de pares)

---

## 11. Próximos Passos (Prioridade)

1. 🔴 Aplicar RLS (`setup_db_migration_v2.sql`)
2. 🔴 Rotacionar chaves Supabase
3. 🔴 Definir admin no banco
4. 🟡 Testar fluxo Salas de Oração (LiveKit → Kesef)
5. 🟡 Deploy Evolution API
6. 🟡 Gerar APK (Capacitor)
7. 🟢 Onboarding, notificações push, polimento

---

## 12. Estrutura de Arquivos

```
oracao-app/
├── public/
│   └── icons/              # Favicons e PWA icons
├── supabase/
│   └── functions/          # Edge Functions Deno
│       ├── enviar-otp/
│       ├── verificar-otp/
│       ├── verificar-dispositivo/
│       └── gerar-token-livekit/
├── src/
│   ├── components/
│   │   ├── layout/
│   │   │   └── BaseLayout.tsx
│   │   ├── AvatarComEmblema.tsx
│   │   ├── MocidadeGrid.tsx
│   │   ├── KesefDisplay.tsx
│   │   ├── ThemeToggle.tsx
│   │   └── ErrorBoundary.tsx
│   ├── contexts/
│   │   ├── ThemeContext.tsx
│   │   └── ToastContext.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── VerifyOtp.tsx
│   │   ├── VerifyDispositivo.tsx
│   │   ├── Mural.tsx
│   │   ├── Ranking.tsx
│   │   ├── GuiaPatentes.tsx
│   │   ├── EBD.tsx
│   │   ├── Loja.tsx
│   │   ├── Carteira.tsx
│   │   ├── Admin.tsx
│   │   └── SalaOracao.tsx
│   ├── services/
│   │   ├── supabaseClient.ts
│   │   ├── dataService.ts
│   │   ├── kesefService.ts
│   │   ├── kesefConstants.ts
│   │   ├── patente.ts
│   │   ├── prayerRoomService.ts
│   │   ├── adminAuth.ts
│   │   ├── whatsappService.ts
│   │   └── constants.ts
│   ├── types/
│   │   └── index.ts
│   ├── test/
│   │   ├── MocidadeGrid.test.tsx
│   │   ├── ErrorBoundary.test.tsx
│   │   ├── ToastContext.test.tsx
│   │   ├── adminAuth.test.ts
│   │   ├── constants.test.ts
│   │   └── sorteio.test.ts
│   ├── index.css
│   ├── App.tsx
│   └── main.tsx
├── docs/
│   ├── apresentacao-tecnica.md
│   ├── sistema-patentes.md
│   ├── identidade-visual.md
│   ├── whatsapp-evolution.md
│   └── levantamento.md
├── setup_db_migration_*.sql
├── AGENTS.md
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 13. Pontos de Atenção para Auditoria

### ✅ Pontos Fortes
- Separação clara de camadas (componentes vs serviços)
- Tipagem estrita (TypeScript strict)
- RPCs SECURITY DEFINER para operações financeiras
- Realtime para dados ao vivo
- PWA (instalável em mobile)
- CI/CD automatizado

### ⚠️ Riscos Identificados
1. **Chaves expostas**: `VITE_SUPABASE_ANON_KEY` e `VITE_SUPABASE_SERVICE_ROLE_KEY` no `.env` — rotacionar urgente
2. **RLS não aplicado**: `setup_db_migration_v2.sql` com políticas não executado
3. **Sem rate limiting**: Edge Functions sem proteção contra abuso
4. **Sem logs**: Ausência de logging estruturado (console.error apenas)
5. **Testes insuficientes**: Cobertura baixa (24 testes para 14 telas)
6. **Senha em texto plano**: valor histórico removido da documentação; credencial deve ser rotacionada
7. **Sem validação de entrada**: Edge Functions com pouca sanitização
8. **Evolution API não deployada**: WhatsApp não funcional em produção

### 📊 Métricas
- 14 páginas/rotas
- 24 testes automatizados
- ~10.000 linhas de código
- 2 contextos React
- 8 Edge Functions (4 deployadas)
- 12 tabelas no banco
- 10 RPCs
- 1 view calculada

---

*Documento gerado em 19/07/2026 para auditoria técnica por assistente AI especializado.*

> **Adenda de estado (10/08/2026):** para arquitetura e operação posteriores a
> esta apresentação histórica, consulte `AGENTS.md` e
> `docs/SESSAO_2026-08-10_REGISTRO_COMPLETO.md`. A release development vigente é
> `1.4.0-dev.20`, com Editorial EBD/RAG atualizado, Mocidade por último acesso sem
> heartbeat e aceite legal versionado. Um valor de senha que constava no achado
> histórico foi redigido; a constatação de exposição foi preservada.
