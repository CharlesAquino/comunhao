# Comunhão — versão web provisória

## Objetivo

Disponibilizar temporariamente o mesmo aplicativo React/Supabase usado no
localhost por uma URL HTTPS instalável no iPhone e no Android, sem criar uma
segunda base de código.

## Build

1. Copie `.env.provisional.example` para `.env.provisional.local`.
2. Preencha apenas `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` públicas.
3. Execute `npm run build:web:provisional`.

O resultado fica em `dist/` e também em `release/web-provisional/` como arquivo
compactado com SHA-256. Nunca coloque uma chave `service_role` no frontend.

## Publicação provisória recomendada

O repositório contém `netlify.toml` com build, fallback SPA, cache correto do
Service Worker e cabeçalhos básicos. No provedor, configure as duas variáveis
públicas do Supabase e publique a branch ou envie o conteúdo de `dist/`.

Depois de receber a URL HTTPS definitiva:

1. inclua a URL em Supabase Authentication → URL Configuration;
2. configure Site URL e Redirect URLs para o domínio publicado;
3. inclua a origem em `PUBLIC_SITE_URL` ou `ALLOWED_ORIGINS` das Edge Functions
   utilizadas pelo login, WhatsApp e sala de oração;
4. valide login, upload, mural, Tesouro, EBD e sessão em um iPhone real.

## Instalação no iPhone

Abra a URL no Safari, toque em Compartilhar → Adicionar à Tela de Início, ative
“Abrir como App” e confirme. A versão web é identificada como provisória no
manifesto instalado.

## Limite do canal

Atualizações web entram pela nova publicação HTTPS. Mudanças em plugins,
permissões ou código nativo continuam exigindo APK no Android e, futuramente,
um novo build via TestFlight no iOS.
