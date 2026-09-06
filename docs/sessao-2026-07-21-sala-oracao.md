# Sessão 21/07 — Sala de Oração + Convite + Patentes

## Contexto
App de intercessão (Comunhão | Oração Constante). Jovens de EBD da Assembleia de Deus.

## O que foi feito

### 1. Patentes substituídas (base bíblica direta)
- **Virtude** ✨ → **Mensageiro** 📨 (Hb 1:14 — *mal'akh* = mensageiro)
- **Dominação** ⭐ → **Ofanim** 🔄 (Ez 1 — rodas de fogo)
- **Trono** 🎯 → **Hayot** 💫 (Ez 1 / Ap 4 — seres viventes)

Arquivos alterados:
- `src/services/patente.ts` — `PatenteId`, entries, `COR_GLOW`, ícones
- `src/components/AvatarComEmblema.tsx` — `RING_GRADIENTE`

### 2. Sorteio executado
- **Usuários**: Charles (admin), Jovem Teste 2-5 (teste)
- **Círculo**: Charles → Teste 5 → Teste 3 → Teste 2 → Teste 4 → Charles
- Login Charles: `[TELEFONE REDIGIDO]` / `[CREDENCIAL REDIGIDA]`
- Login Teste 5: `[TELEFONE REDIGIDO]` / `[SENHA REDIGIDA E ROTACIONADA]`

### 3. Migration aplicada (parcial)
- `setup_db_migration_convitepray.sql` aplicado
- Tabelas criadas: `convites_oracao`, `sessoes_oracao_timer`
- ❌ Tabela `mensagens` estava faltando → criada via SQL Editor
- Arquivo auxiliar: `criar_tabela_mensagens.sql`

### 4. RPC `responder_convite_oracao` corrigido
- `gen_random_uuid()::text` substituído por `'sala_' || substr(md5(random()::text || clock_timestamp()::text), 1, 20)`
- Arquivo: `fix_responder_convite_rpc.sql`
- `setup_db_migration_convitepray.sql` atualizado localmente

### 5. SalaOracao.tsx — redesign estilo Google Meet
- Grid de vídeo com tiles 16:9 + fallback avatar
- Self-view (canto inferior direito, pequeno)
- Indicador de fala (borda verde + glow)
- Nome do parceiro no topo + "orando com você"
- Timer monospace com glow
- Barra de controle glass: microfone, câmera, Amém (encerrar)
- Animações: scale-fade, fade-in, pulsos
- Fundo radial-gradient escuro + glows sutis

### 6. Fluxo de convite testado
- ✅ Charles → Teste 5 envia convite (RPC)
- ✅ Teste 5 aceita como "aceite" → timer sincronizado
- ✅ Teste 5 aceita como "voz" → sala LiveKit criada (após corrigir RPC)

## Pendências (PRÓXIMA SESSÃO — prioridade)

### 🔴 Edge Function `gerar-token-livekit`
**Arquivo:** `supabase/functions/gerar-token-livekit/index.ts`

**Bug:** linha 65 usa `.eq("id", user.id)` — deveria ser `.eq("auth_user_id", user.id)`.  
Já corrigido LOCALMENTE. Precisa fazer deploy:

```bash
npx supabase login
# Colar Supabase Access Token (criar em https://supabase.com/dashboard/account/tokens)
npx supabase functions deploy gerar-token-livekit --project-ref csxrhvgfnkqmkehgmnkp
```

**Secrets necessários (LiveKit Cloud):**
```bash
npx supabase secrets set --project-ref csxrhvgfnkqmkehgmnkp \
  LIVEKIT_API_KEY=sua_chave \
  LIVEKIT_API_SECRET=seu_secret
```
Ou configurar em: https://supabase.com/dashboard/project/csxrhvgfnkqmkehgmnkp/settings/functions

### 🟡 Flow completo voz/vídeo
Após deploy + secrets, testar:
1. Charles clica "Orar Agora" → Teste 5 vê card amarelo
2. Teste 5 clica "Voz" → ambos redirecionados para `/sala/:salaId`
3. Verificar grid de vídeo, mute, toggle câmera, Amém

### 🟡 Flow chat 1:1
- `mensagens` tabela criada ✅
- `Chat.tsx` tem erro TS (importa `{ supabase }` do `dataService` que não exporta) — erro pré-existente
- Testar: botão "Mensagem" → "Mensagem de Texto" → `/chat/:userId`

### 🟡 Definir admin pelo banco
```sql
UPDATE usuarios SET papel='admin' WHERE telefone='[TELEFONE DO ADMIN]';
```
(Charles já está como admin)

## Arquivos importantes
| Arquivo | Função |
|---|---|
| `src/pages/SalaOracao.tsx` | Sala LiveKit estilo Meet (redesign feito) |
| `src/pages/TimerOracao.tsx` | Timer de oração silenciosa |
| `src/pages/Home.tsx` | Dashboard com convite + missão |
| `src/services/conviteService.ts` | RPCs de convite |
| `src/services/mensagemService.ts` | Chat 1:1 |
| `src/services/patente.ts` | Sistema de patentes (9 níveis) |
| `fix_responder_convite_rpc.sql` | Correção do RPC (aplicada) |
| `criar_tabela_mensagens.sql` | Tabela mensagens (aplicada) |
| `deploy-correcao-livekit.md` | Instruções deploy Edge Function |
| `setup_db_migration_convitepray.sql` | Migration completa (atualizada) |

## Credenciais de teste
| Usuário | Telefone | Senha | Papel |
|---|---|---|---|
| Charles Aquino | [TELEFONE REDIGIDO] | [CREDENCIAL REDIGIDA] | admin |
| Jovem Teste 2 | `[TELEFONE REDIGIDO]` | `[SENHA REDIGIDA]` | membro |
| Jovem Teste 3 | `[TELEFONE REDIGIDO]` | `[SENHA REDIGIDA]` | membro |
| Jovem Teste 4 | `[TELEFONE REDIGIDO]` | `[SENHA REDIGIDA]` | membro |
| Jovem Teste 5 | `[TELEFONE REDIGIDO]` | `[SENHA REDIGIDA]` | membro |

## Links úteis
- Supabase Dashboard: https://supabase.com/dashboard/project/csxrhvgfnkqmkehgmnkp
- SQL Editor: https://supabase.com/dashboard/project/csxrhvgfnkqmkehgmnkp/sql/new
- Edge Functions: https://supabase.com/dashboard/project/csxrhvgfnkqmkehgmnkp/settings/functions
- LiveKit Cloud: https://cloud.livekit.io
