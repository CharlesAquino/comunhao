# Checklist de segurança

## Estado em 16/08/2026

| Controle | Estado | Evidência / próximo passo |
| --- | --- | --- |
| Segredos fora do bundle | Aplicado | Somente `VITE_*` públicas no cliente; `service_role` fica em ambiente server-side. |
| Segredos fora do histórico documental | Aplicado | Credenciais históricas foram redigidas; testes autenticados usam variáveis de ambiente. |
| RLS | Em auditoria | Migrações habilitam RLS em domínios principais; executar matriz negativa contra o projeto remoto. |
| Criptografia em trânsito | Reforçado | HSTS adicionado ao Netlify; validar também o host/proxy de produção. |
| Criptografia em repouso | Dependente da plataforma | Confirmar configuração Supabase e política de dados sensíveis. |
| Autenticação server-side | Aplicado nas funções críticas | Edge Functions validam token e usam `service_role` somente no servidor. |
| Restrição de registros | Em auditoria | Confirmar cada `SELECT`, `INSERT`, `UPDATE` e `DELETE` por papel. |
| Integridade de campos | Aplicado parcialmente | RPCs e validações de entrada existentes; completar matriz de mutações. |
| Cookies e sessão | Em auditoria | Supabase Auth gerencia a sessão; revisar armazenamento e expiração no host final. |
| Senhas com hash | Aplicado | Senhas são processadas pelo Supabase Auth; nunca armazenadas pelo app. |
| Limite de login | Aplicado parcialmente | Rate limit existe para fluxos protegidos; validar login, OTP e recuperação remotamente. |
| Proteção contra bots | Pendente | Definir mecanismo no proxy/edge para login e cadastro. |
| Consultas parametrizadas | Aplicado | Cliente usa SDK/RPC; revisar SQL dinâmico administrativo. |
| Validação de entrada | Aplicado parcialmente | Edge Functions usam allowlist; completar uploads e formulários administrativos. |
| Escape de conteúdo | Aplicado | React escapa texto; manter proibição de HTML arbitrário. |
| Uploads restritos | Aplicado parcialmente | Policies de storage existem; validar tipo, tamanho e propriedade por bucket. |
| Respostas mínimas | Aplicado parcialmente | Funções críticas retornam payloads controlados; revisar RPCs legadas. |
| Headers de segurança | Reforçado | `nosniff`, referrer, permissions e HSTS configurados. CSP exige validação antes de ativar. |
| HTTPS | Reforçado | HSTS no deploy web; ambiente local continua HTTP por necessidade de desenvolvimento. |
| Dependências | Pendente | Rodar auditoria de dependências e corrigir vulnerabilidades com impacto real. |

## Operações controladas ainda necessárias

1. Rotacionar qualquer credencial que tenha sido válida e atualizar Edge Functions, CI e hosts no mesmo procedimento.
2. Executar testes RLS autenticados com contas sintéticas, sem usar dados de titulares reais.
3. Configurar rate limiting/bot protection no provedor de borda para login, cadastro e OTP.
4. Validar headers no domínio final e executar auditoria de dependências antes de publicar.
