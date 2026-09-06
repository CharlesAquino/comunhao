# Baseline de qualidade e segurança

**Status:** em implementação  
**Data:** 03/09/2026

## Escopo inicial de evidência

| Fluxo | Navegador | Evidência mínima | Dados proibidos em logs |
| --- | --- | --- | --- |
| Acesso público | celular, tablet, desktop | login, cadastro e recuperação navegáveis; Axe sem violações críticas | senha, token, telefone, e-mail de recuperação |
| EBD editorial | celular, tablet, desktop | geração com sucesso/erro seguro, RAG, prévia e publicação bloqueada por permissão | prompt completo, conteúdo RAG, texto privado |
| Estudos | celular, tablet, desktop | catálogo, curso, aula e bloqueio pedagógico | progresso individual identificável |
| Carteira/Kesef | celular, tablet | leitura nos dois temas, fallback 2D e movimento reduzido | saldo e identificadores financeiros |
| Oração e Admin | celular, tablet, desktop | rolagem, permissão e ações críticas acessíveis | pedidos, intenções e dados assistenciais |

## Ambiente e privacidade

- Development executa testes localmente e não envia telemetria externa.
- Pre-release e produção poderão enviar somente versão, rota, código público de erro e `correlationId` para observabilidade aprovada.
- Capturas de falha devem ser tratadas como material restrito e nunca incluem conteúdo de oração, RAG ou credenciais.
- Alterações de segurança e banco exigem teste positivo e negativo com contas sintéticas.

## Primeira automação

`npm run test:e2e` executa o fluxo de entrada em celular, tablet e desktop. Ele verifica rótulos, navegação e acessibilidade estrutural; contraste será validado pela suíte de tokens e revisão visual em dispositivo.

## Próximas entregas desta fase

1. Instalar Chromium do Playwright e validar a primeira suíte.
2. Acrescentar fixtures autenticadas sintéticas para EBD, Estudos, Carteira e Admin.
3. Definir conta, retenção e sanitização antes de instalar Sentry.
4. Criar matriz RLS negativa e executar a auditoria de dependências sem correção automática.

## Evidência inicial — 03/09/2026

- Playwright + Axe instalados; `npm run test:e2e` passou com seis cenários
  (entrada, cadastro e recuperação em celular, tablet e desktop).
- A primeira auditoria encontrou e corrigiu a ausência do landmark `<main>` na
  tela de login.
- `npm run lint` passou sem avisos no código do app; `npm test` passou com 44
  arquivos e 206 testes. Os artefatos visuais e vídeos de falha do Playwright
  ficam fora do versionamento.
- `npm audit --omit=dev` identificou uma vulnerabilidade alta transitiva em
  `fast-uri@3.1.5`, trazida por `vite-plugin-pwa → workbox-build → ajv`.
  A correção será uma atualização controlada da cadeia PWA, após validar impacto
  no service worker; nenhum `npm audit fix` automático foi executado.
