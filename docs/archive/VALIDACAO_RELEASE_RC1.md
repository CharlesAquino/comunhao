# Validação — Comunhão 1.2.0-rc.1

Data: 30/07/2026

## Resultado

- TypeScript (`tsc --noEmit`): aprovado, 0 erros.
- Testes Vitest: 19 arquivos aprovados, 95 testes aprovados.
- Build Vite/PWA: aprovado.
- Oxlint: 0 erros, 25 alertas não bloqueantes.
- Comunhão System Doctor: 50 aprovações, 6 alertas, 0 falhas com as variáveis públicas presentes.
- Sentinela Fase 1: verificação concluída sem achados bloqueantes.

## Alertas conhecidos

- O bundle principal do Vite ainda supera 500 kB e deve receber code splitting em uma fase de desempenho.
- O PWA informa que `inlineDynamicImports` foi descontinuado.
- Comentários e curtidas no Mural permanecem apenas na taxonomia futura; ainda não há fluxo de gravação dessas ações.
- O teste Doctor `--live` depende de credenciais locais e não foi executado no pacote sanitizado.
- Migrations e Edge Functions novas devem ser validadas em staging antes da produção.

## Banco e funções novas

- `20260730130000_security_sentinel_phase1.sql`
- `gerar-dia-ebd`
- `buscar-memoria-rag`
- `indexar-memoria-rag`

Configurar no ambiente server-side:

- `SECURITY_HASH_PEPPER`
- `ALLOWED_ORIGINS`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GROQ_API_KEY`
- `GROQ_MODEL`
