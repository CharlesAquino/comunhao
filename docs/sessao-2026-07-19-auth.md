# Sessão — 2026-07-19 — Login com Senha + Verificação Periódica via WhatsApp

## Problema
Supabase Phone Auth exige Twilio/MessageBird (SMS pago). A Evolution API
(WhatsApp) já está no projeto mas o app continuava dependendo do provedor
SMS para enviar OTPs.

## Solução Implementada

### Novo fluxo de autenticação

| Etapa | Como funciona |
|---|---|
| **Cadastro** | Nome + telefone + **senha escolhida** → OTP via WhatsApp (1x) → `verificar-otp` cria auth user com `phone` + `password` via Admin API → session |
| **Login diário** | Telefone + senha → `supabase.auth.signInWithPassword({ phone, password })` → **zero custo, sem OTP, sem provedor SMS** |
| **Verificação periódica** | A cada 30 dias, ao logar, app redireciona para `/verificar-dispositivo` → Edge Function envia código via WhatsApp → usuário digita → `ultima_verificacao` é atualizada |
| **Esqueceu a senha** | Botão no login → envia OTP via WhatsApp → `VerifyOtp` com `resetSenha=true` → Edge Function atualiza senha + retorna session |

### Por que `signInWithPassword` funciona sem SMS
O Supabase Auth suporta `grant_type=password` para `phone` + `password`
independente do provedor SMS. O provedor SMS só é necessário para o
`grant_type=otp`. Como criamos o usuário via Admin API com `password` +
`phone_confirmed_at`, o login por senha funciona sem qualquer configuração
de Twilio/MessageBird.

### Arquivos criados/modificados

| Arquivo | Tipo | Descrição |
|---|---|---|
| `setup_db_migration_verificacao.sql` | SQL | `ultima_verificacao timestamptz` em `usuarios` |
| `supabase/functions/verificar-otp/index.ts` | Edge Function | v2: aceita `password` (senha escolhida), não mais random. Seta `ultima_verificacao` |
| `supabase/functions/verificar-dispositivo/index.ts` | Edge Function | Envia código via WhatsApp, valida, atualiza `ultima_verificacao` |
| `src/pages/Register.tsx` | Frontend | Campo senha com toggle visibilidade. Envia `senha` nos params |
| `src/pages/Login.tsx` | Frontend | Phone + password. `signInWithPassword`. Botão "Esqueceu a senha?" |
| `src/pages/VerifyOtp.tsx` | Frontend | Suporta `resetSenha=true` e `senha` para redefinição |
| `src/pages/VerifyDispositivo.tsx` | Frontend | Página dedicada para verificação periódica (30 dias) |
| `src/App.tsx` | Frontend | Rota `/verificar-dispositivo` (fora do BaseLayout) |
| `src/services/dataService.ts` | Frontend | `verifyOtp` aceita `senha` e `codigoIndicacao` |

### Edge Functions deployadas
- `gerar-token-livekit` → LiveKit JWT
- `enviar-otp` → Envia código via WhatsApp
- `verificar-otp` → Valida código, cria/auth user, retorna session
- `verificar-dispositivo` → Verificação periódica (enviar + validar)

### Pendências
- Evolution API precisa ser configurada (instância + envs) para WhatsApp funcionar
- Sem Evolution, os OTPs ficam salvos em `otp_codes` — dá pra consultar
  manualmente no SQL Editor para testes
