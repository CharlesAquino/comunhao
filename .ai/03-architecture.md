# Arquitetura

Estado observado no repositório:

- SPA em React e TypeScript, construída com Vite;
- estilos com Tailwind CSS;
- rotas com React Router;
- backend no Supabase: Auth, Postgres, RLS, RPC, Realtime, Storage e Edge
  Functions;
- LiveKit para mídia em tempo real;
- PWA e Capacitor Android;
- serviços de frontend concentrados em `src/services/`;
- tipos compartilhados em `src/types/`;
- testes com Vitest e Testing Library;
- CI em GitHub Actions.

O banco não é atualmente reproduzível com confiança apenas pelos SQLs locais.
O estado remoto deve ser reconciliado antes de uma baseline ou migration de
segurança.

Decisões duradouras pertencem a [`adr/`](../adr/). Propostas não devem ser
tratadas como arquitetura vigente.
