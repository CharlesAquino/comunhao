# Regras de ouro de segurança

Estas regras são obrigatórias para qualquer nova implementação do Comunhão.
Uma funcionalidade não está pronta quando falha em qualquer uma delas.

1. **Nunca versionar segredos.** Chaves, senhas, tokens, dumps e credenciais devem existir somente em secret manager ou variáveis locais ignoradas pelo Git.
2. **Toda credencial exposta deve ser rotacionada.** Redigir o arquivo não basta; atualizar Edge Functions, CI, hosts e integrações no mesmo procedimento.
3. **O cliente nunca é autoridade.** Saldo, permissão, titularidade, estoque, resgate e exclusão devem ser validados no servidor.
4. **Toda tabela sensível nasce com RLS.** Criar tabela sem policies negativas e testes com usuário A tentando acessar dados de B é bloqueador.
5. **Edge Functions exigem autenticação e allowlist.** Validar JWT, método, origem, corpo, tamanho, idempotência e rate limit antes da regra de negócio.
6. **Respostas mínimas por padrão.** Não retornar telefones, e-mails, tokens, dados de terceiros ou campos que a tela não precisa.
7. **HTTPS é obrigatório fora do desenvolvimento local.** Câmera, microfone, sessão e tokens de chamada nunca devem usar HTTP público.
8. **Uploads são dados não confiáveis.** Validar MIME real, extensão, tamanho, dimensões, bucket, pasta do titular e política de leitura.
9. **Entrada de usuário nunca vira HTML ou SQL.** Usar escape do React, queries parametrizadas e validação de schema; não introduzir `dangerouslySetInnerHTML` sem revisão.
10. **Login, OTP e recuperação precisam de limite e antiabuso.** Toda rota de autenticação deve ter rate limit, auditoria e resposta que não revele se a conta existe.
11. **Dependências são parte da superfície de ataque.** Rodar auditoria antes de release, corrigir vulnerabilidades do runtime e registrar exceções transitivas com prazo.
12. **Testes de segurança acompanham a feature.** Toda mutação crítica precisa de teste autenticado, negativo e de concorrência/idempotência.
13. **Dados sensíveis têm ciclo de vida.** Definir retenção, expurgo, backup, incidente, acesso administrativo e direitos do titular.
14. **Nenhuma publicação sem evidência.** Lint, testes, build, auditoria de dependências, matriz RLS e checklist de release devem estar registrados.

## Barreira de release

Antes de publicar web, APK, migration ou Edge Function, o responsável deve anexar:

- resultado de `npm run lint`, testes e build;
- resultado de `npm audit` e justificativa das pendências transitivas;
- teste RLS positivo e negativo com contas sintéticas;
- confirmação de que nenhum segredo foi incluído no bundle ou no Git;
- confirmação de HTTPS, headers, rate limit e logs sem dados sensíveis;
- plano de rollback e indicação das migrations aplicadas.

Qualquer falha nos itens 1 a 6 bloqueia a publicação até correção ou aprovação formal de risco.
