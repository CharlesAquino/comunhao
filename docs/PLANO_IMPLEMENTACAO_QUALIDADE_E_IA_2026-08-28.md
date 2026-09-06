# Plano de implementação — Qualidade, observabilidade e roteamento de IA

**Status:** aprovado para a próxima janela de implementação  
**Data:** 28/08/2026  
**Escopo:** `app/`, Supabase development e processo de release Android  
**Princípio:** introduzir uma capacidade por vez, com evidência real antes de
expandir para todo o produto.

## 1. Contexto e decisão

O Comunhão já possui React 19, Vite, Vitest, Testing Library, Capacitor,
Supabase, PWA e Three.js. A próxima evolução não é adicionar bibliotecas por
novidade: é tornar as entregas verificáveis em navegador/dispositivo,
observáveis em produção e mais resilientes diante de respostas remotas.

As prioridades foram definidas a partir de problemas reais já observados:

- layout responsivo e rolagem que precisam ser validados em viewports reais;
- falhas remotas de IA que hoje dependem de captura manual do console;
- contratos de payload e dados não confiáveis em integrações Supabase/IA;
- crescimento de serviços, telas e dependências entre EBD, Estudos, Kesef e
  comunidade.

## 2. Ordem de execução

| Fase | Capacidade | Status | Resultado verificável |
| --- | --- | --- | --- |
| 0 | Baseline e escolhas de privacidade | PENDENTE | escopo, ambientes, dados permitidos e rollback aprovados |
| 1 | Playwright + acessibilidade automatizada | PENDENTE | fluxos críticos exercitados em celular, tablet e desktop |
| 2 | Observabilidade com Sentry | PENDENTE | erro real agrupado por versão, rota e correlação, sem dados pessoais indevidos |
| 3 | Zod e MSW | PENDENTE | contratos de fronteira validados e cenários de erro reproduzíveis localmente |
| 4 | Qualidade contínua e higiene | PENDENTE | Knip, auditoria de dependências e gates de CI definidos |
| 5 | Dados, experiência e mobile | PENDENTE | pilotos seletivos de TanStack Query e plugins Capacitor |
| 6 | Creative 3D/motion | PENDENTE | GSAP/R3F somente em experiências justificadas e medidas |
| 7 | Roteamento multi-IA (OmniRoute ou interno) | DECISÃO ADIADA | avaliação baseada em telemetria de custo, disponibilidade e qualidade |

Nenhuma fase exige APK antes de sua conclusão, exceto quando o teste envolver
um plugin Capacitor nativo ou a validação final do release.

## 3. Fase 0 — Baseline e privacidade

### Ações

1. Criar uma matriz de fluxos prioritários: login, Home, EBD, Estudos,
   Carteira/Kesef, Sala de Oração e permissões administrativas.
2. Fixar os viewports de referência: celular compacto, celular grande,
   tablet em retrato e desktop.
3. Definir os ambientes que receberão telemetria: development, pre-release e
   produção.
4. Classificar dados proibidos em logs: token, JWT, senha, prompt completo,
   textos privados, orações privadas, identificadores pessoais e material RAG
   integral.

### Critério de saída

Existe uma lista curta de fluxos e telas que toda mudança crítica deve testar,
mais uma política de dados para monitoramento.

## 4. Fase 1 — Teste de navegador e acessibilidade

### Instalação proposta

- `@playwright/test`
- `@axe-core/playwright`

### Primeiro conjunto de testes

1. EBD: abrir o Estúdio, selecionar blocos, simular falha de geração e
   verificar feedback acionável.
2. Estudos: abrir a Home, acessar o curso, navegar entre módulo e aula e
   verificar bloqueio da ordem pedagógica.
3. Carteira/Kesef: abrir em tema claro e escuro, confirmar que o objeto 3D
   possui fallback e não bloqueia a leitura.
4. Navegação: verificar que todo conteúdo longo rola, sem barra visual
   persistente e sem controles inacessíveis.
5. Acessibilidade: executar Axe nas telas públicas e snapshots da árvore
   ARIA para botões e navegação essenciais.

### Critério de saída

Os fluxos rodam em CI/local com capturas de falha e conseguem detectar uma
regressão de scroll, hierarquia, rótulo de botão ou contraste automatizável.

## 5. Fase 2 — Observabilidade de erros

### Decisão técnica

Introduzir Sentry no cliente web/Capacitor primeiro. A instrumentação de
Edge Functions será avaliada separadamente, porque exige tratamento de CORS,
amostragem e segredos próprios.

### Regras obrigatórias

- habilitar somente em pre-release e produção; development local permanece
  silencioso por padrão;
- usar `release`/`environment` coerentes com o manifesto do app;
- enviar correlação de operações, código de erro e rota, nunca credenciais ou
  payload integral;
- mascarar dados pessoais e desabilitar gravação de sessão inicialmente;
- criar uma tela/procedimento de triagem antes de qualquer alerta externo.

### Critério de saída

Uma falha EBD, de rede ou de interface é agrupada, reproduzível pela versão e
vinculada ao `correlationId`, sem expor dados privados.

## 6. Fase 3 — Contratos e testes sem dependência remota

### Zod

Adotar Zod gradualmente nas fronteiras que recebem dados não confiáveis:

- formulários do cliente;
- respostas de serviços Supabase no cliente;
- payloads de Edge Functions;
- estruturas editoriais retornadas pela IA.

Zod complementa, mas não substitui, RLS, validação de permissão,
idempotência, allowlist de campos ou sanitização server-side.

### MSW

Criar handlers para estados que não devem consumir recursos remotos durante
o teste: sessão expirada, 429/503 do provedor de IA, RAG ausente, erro de rede
e respostas de sucesso mínimas.

### Critério de saída

Os estados críticos de EBD e Estudos são testados sem chamar Supabase ou um
provedor de IA real.

## 7. Fase 4 — Higiene e segurança contínua

### Ações

1. Executar Knip em modo informativo; revisar manualmente seus achados antes
   de qualquer remoção.
2. Criar gate de dependências (`npm audit` com exceções documentadas).
3. Quando o repositório estiver no GitHub, habilitar Dependabot, CodeQL e
   OpenSSF Scorecard com permissões mínimas.
4. Registrar falhas conhecidas em vez de ignorá-las silenciosamente.

### Critério de saída

Dependências não utilizadas, vulnerabilidades e permissões de CI passam a ter
um fluxo de triagem e decisão.

## 8. Fase 5 — Dados, listas e resiliência mobile

### Pilotos seletivos

- TanStack Query: iniciar em uma leitura de lista com alta repetição, como
  cursos/Estudos ou Mural. Definir `queryKey`, invalidação e integração com
  Realtime antes de migrar outra área.
- `@capacitor/network`: adaptar feedback de indisponibilidade e retomada de
  conexão.
- `@capacitor/app`: tratar retorno ao app e links profundos, se o fluxo de
  convite/publicação exigir.
- `@capacitor/preferences`: apenas para preferências não sensíveis e pequenos
  estados de experiência. Nunca para tokens de sessão ou dados privados.
- `@tanstack/react-virtual`: somente se uma lista real apresentar problema de
  desempenho com grande volume.

### Critério de saída

Cada piloto demonstra redução de carregamentos ou melhoria de resiliência sem
regressão de RLS, cache obsoleto ou experiência offline enganosa.

## 9. Fase 6 — Motion e 3D

- GSAP + `@gsap/react`: entradas, transições e microinterações com cleanup e
  `prefers-reduced-motion`.
- React Three Fiber + Drei: somente para o Kesef e cenas que realmente se
  beneficiem de 3D declarativo; manter fallback estático e limitar DPR,
  animação e consumo de GPU.

Essas bibliotecas não entram em telas comuns apenas por estética. Todo uso
deve passar pelo Design System e pela auditoria de performance/acessibilidade.

## 10. OmniRoute / "OmniRouter"

O termo é usado por produtos diferentes. Nesta decisão, **OmniRoute** refere-se
ao gateway open-source auto-hospedável que expõe uma API compatível com OpenAI
e pode administrar múltiplos provedores, cotas, prioridades, fallbacks,
circuit breakers e cooldowns.

### Onde ele ajudaria

```text
Edge Function EBD
       ↓
OmniRoute remoto e privado
       ↓
Gemini 2.5 Flash → Cloudflare Workers AI → Groq 120B → Groq 20B → demais provedores aprovados
```

Ele centralizaria credenciais e disponibilidade de muitos provedores atrás de
uma única interface. Isso se aproxima do carrossel de IA pretendido para a
EBD, com telemetria de custo e regras de fallback centralizadas.

### Por que não entra agora

1. O Comunhão gera normalmente uma lição por dia, com antecedência; o atual
   orquestrador interno Gemini → Cloudflare → Groq resolve o volume presente.
2. O usuário definiu que a produção não roda localmente. OmniRoute precisaria
   de hospedagem remota administrada, banco/volume, atualizações, backup,
   autenticação e observabilidade próprios.
3. Ele adiciona um novo ponto que recebe prompt, contexto RAG e chaves de
   provedores. Não pode ser usado como atalho para credenciais de conta,
   cookies, automação de interfaces web ou chaves fora dos termos de uso.
4. Uma abstração externa não elimina as regras do produto: validação de JSON,
   profundidade editorial, RAG, autorização e auditoria continuam no backend
   do Comunhão.

### Gate para reavaliar

Reabrir esta decisão quando ocorrer pelo menos um dos seguintes cenários:

- cinco ou mais provedores aprovados no fluxo de geração;
- falhas de cota/disponibilidade recorrentes em três janelas editoriais de 30
  dias;
- necessidade demonstrada de consolidar custo/uso entre mais de um produto;
- infraestrutura remota aprovada para hospedar o gateway com segredos
  centralizados e acesso restrito.

Antes de integrar, fazer um piloto isolado em development com uma chave de
gateway exclusiva, allowlist de modelos, logs sanitizados, rate limiting,
rota de rollback para o orquestrador atual e validação de termos de cada
provedor. O app móvel nunca recebe chaves de provedor ou do gateway.

## 11. Sequência da próxima implementação

1. Aprovar a Fase 0 e instalar Playwright/Axe.
2. Criar os quatro testes E2E mais críticos com evidência visual.
3. Definir conta, retenção e privacidade do Sentry; instalar somente depois
   dessa aprovação.
4. Adotar Zod e MSW no fluxo EBD como primeiro piloto.
5. Rodar Knip em modo de relatório e abrir backlog de limpeza, sem exclusões
   automáticas.
6. Reavaliar TanStack Query, plugins Capacitor, GSAP/R3F e OmniRoute apenas
   com uma necessidade mensurada.

## 12. Referências

- Playwright e integração Axe: <https://playwright.dev/docs/accessibility-testing>
- Zod: <https://zod.dev/>
- TanStack Query: <https://tanstack.com/query/latest/docs/reference/QueryClient>
- Drei: <https://drei.docs.pmnd.rs/>
- Knip: <https://github.com/webpro-nl/knip>
- OpenSSF Scorecard: <https://github.com/ossf/scorecard>
- OmniRoute: <https://github.com/Revmagi/omniroute>
- OmniRouter hospedado: <https://omnirouter.li/docs>
