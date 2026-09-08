# Home do Comunhão — avaliação e direção visual

Data: 08/09/2026. Estado: diagnóstico e três propostas visuais; nenhuma alteração de produção nesta auditoria.

## Brief confirmado com Charles

- A Home deve transmitir uma experiência de 2050, com personalidade e coerência.
- Não deve parecer um amontoado de banners e cards desconexos.
- A Missão da Semana agrada e deve ter sua aparência preservada.
- O card Comunhão Estudos é percebido como uma cópia visual mal executada da Missão.
- Avaliação abrange interface, layout, arquitetura, regras de negócio e experiência.

## Método e limites

Chrome DevTools, capturas atuais, DOM, medidas de layout, inspeção de código e CSS. A aplicação real redirecionou a /login no navegador isolado. A auditoria visual usa Home.tsx, BaseLayout.tsx e os componentes reais, com respostas de serviço substituídas por fixtures locais no Vite exclusivo da auditoria. Não é um teste autenticado de Supabase, RLS, envio de convites ou entrega de chamadas. Não houve escrita remota nem envio de mensagem.

A configuração de fixtures existe apenas em audit/home-2026-09-08/vite.config.mjs; não altera vite.config.js, autenticação ou serviços de produção. CSP da página limita conexões a localhost; tipografia usa o mesmo stylesheet Inter/Fraunces do index.html original. As capturas 01–04 e a referência de Missão foram refeitas após confirmar essas fontes carregadas. As capturas 05–08 registram a passagem inicial com fontes de fallback; comprovam estados e comportamento, não servem de referência tipográfica final.

Viewport mobile 390×844; tablet 768×1024. Não houve teste físico Android, tablet em paisagem, leitor de tela nem zoom de texto de 200%. Lighthouse snapshot retornou 100 em acessibilidade, mas alterou o estado de tema durante sua execução: não é evidência de aprovação do tema claro. A captura clara e o CSS confirmam um problema que essa nota não representa.

## Fluxo observado

1. **Entrada / saudação / Missão — identidade forte, hierarquia sobrecarregada.** Saudação ocupa 156px; Missão tem 350×420px. Há acesso ao perfil, disponibilidade e convite. [Captura 01](evidencias/home-audit-01-dark-top.png).
2. **Área de formação — prioridade invertida.** Cursos em preparação recebem 420px; EBD disponível aparece só em y≈1160px da página, com 102px. [Captura 02](evidencias/home-audit-02-dark-studies.png).
3. **Tema Amanhecer — falha de legibilidade.** Título EBD conserva cor clara sobre superfície clara. [Captura 03](evidencias/home-audit-03-light-studies.png).
4. **Tablet — aproveitamento insuficiente.** Cards ampliados e centralizados, mantendo a mesma pilha vertical. [Captura 04](evidencias/home-audit-04-tablet.png).
5. **Sem dupla — estado incorreto.** Aparece “Orar com Aguardando” ativo e “Aguardando sorteio está orando por você nesta semana”. [Captura 05](evidencias/home-audit-05-empty.png).
6. **Conhecer estudos, perfil membro — caminho sem conteúdo de estudo.** Destino é aviso de preparação com retorno ao início. [Captura 06](evidencias/home-audit-06-studies-access.png).
7. **Comunidade — repetição e contagem enganosa.** Comunidade → Pessoas disponíveis agora → Saguão de oração → A Mocidade. A fixture inclui um offline, ainda contado entre 5 disponíveis. [Captura 07](evidencias/home-audit-07-community.png).
8. **Convidar dupla — ação reconhecível, diálogo incompleto.** Escape não fecha; foco permanece em “Orar com Sophia” atrás do diálogo. O teste não enviou convite. [Captura 08](evidencias/home-audit-08-prayer-confirm.png).

## Diagnóstico específico

### P1 — Estudos herdou a forma de outro domínio

`src/components/home/ComunhaoEstudosCard.tsx` usa `mission-week-card`, `mission-week-card__avatar`, `mission-week-card__identity`, `mission-week-card__message` e `PrayerActionButton`. O resultado repete o espaço de retrato, selo, papel da pessoa, quadro de mensagem e símbolo de oração sem representar uma pessoa ou uma oração. O título é repetido pelo masthead, nome e heading oculto. O ponto verde em “Cursos e trilhas formativas” sugere estado positivo sem representar disponibilidade real.

O CSS em index.css a partir de `.comunhao-estudos-card` utiliza coordenadas percentuais absolutas, molduras e gradientes locais, sobrepostas às regras da Missão, com variantes claras de maior especificidade. Alterar Missão pode deslocar Estudos. Isso é acoplamento entre dois domínios, não reutilização de uma primitive neutra.

**Correção proposta:** Estudos adquire layout em fluxo, título editorial, estado e ação próprios; reutiliza tokens, tipografia e primitives de navegação. A arte será um apoio à leitura, nunca uma imagem da interface inteira. Preservar a arte e composição do card de Missão.

### P1 — Destaque desproporcional à ação disponível

Em Home.tsx, `hasEstudosAccess` depende de acesso administrativo; /estudos usa EstudosRouteGuard, com os mesmos critérios. O membro comum vê “Conhecer estudos / Em breve” e abre apenas um aviso. O acesso restrito não é por si só bug: é a regra atual. A falha de experiência é dar a esse caminho mais espaço que ao conteúdo disponível.

**Correção proposta:** um território de formação, com a EBD utilizável como conteúdo principal e cursos como item secundário explicitamente em preparação. Preservar as permissões. Equipe autorizada mantém acesso real ao catálogo. Não inventar progresso, recomendação individual ou curso publicado.

### P1 — Progresso EBD inventado e dia sem validação suficiente

DailyEbdCard.tsx desenha `w-1/3` fixo. Não lê progresso. Escolhe o dia com `new Date().getDay()` e retorna duração arbitrária de 9 minutos se não informada. Não verifica `unlocksAt` no card. `getPublishedEditorialLesson()` retorna o maior número publicado, não uma vigência semanal canônica. Isso exige cuidado com a promessa “Hoje”, inclusive domingo ou dias futuros.

**Correção proposta:** remover a barra até haver progresso real. Derivar título, disponibilidade e duração por uma função de apresentação testável, compartilhando a regra editorial de acesso. Sem dia disponível, indicar a semana ou convidar a abrir a EBD sem afirmar disponibilidade de um dia específico. Não alterar o calendário de publicação no backend como efeito colateral de redesign.

### P1 — Tema claro quebrado na EBD

Título tem `text-[#f5ebd7]`, cor computada rgb(245,235,215), sobre superfície próxima de rgb(252,249,242), alfa 0.92. A leitura fica quase invisível na captura clara. O componente define suas próprias cores escuras, contornando os tokens de tema.

**Correção proposta:** tokens semânticos de texto/superfície, medir contraste nos dois temas. Referência: [W3C — contraste mínimo](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum), 4.5:1 para texto normal, com as exceções descritas na norma. Não alegar conformidade integral a partir de screenshot ou nota automática.

### P1 — Ausência de dupla tratada como pessoa

`getDashboardData()` sempre retorna objetos missaoAtual/parceiroSustentador com nome fallback “Aguardando sorteio”. Home testa apenas a existência do objeto; PrayerPartnerCard trata sustentador truthy como pessoa real. `handleOrarAgora` retorna sem ação quando id falta, mas o botão inicial e confirmação continuam acessíveis.

**Correção proposta:** ausência representada por estado explícito ou condição por id. Texto de espera real; nenhuma pessoa fictícia, nenhuma ação de envio sem destinatário. Corrigir comportamento mantendo a aparência do card aprovado.

### P1 — “Disponíveis” não corresponde à lista

`listar_mocidade_por_ultimo_login()` no SQL local ordena todos por last_login sem filtro por status. `getDashboardData()` não filtra; MocidadeGrid usa `jovens.length` no rótulo de disponíveis. O cenário sintético com offline reproduziu a inconsistência no frontend. Estado remoto da função não foi inspecionado.

**Correção proposta:** chamar a lista de “Nossa comunidade” e informar disponibilidade apenas para status explícitos, ou filtrar se a seção realmente promete somente disponíveis. Manter last_login como critério de ordenação; não implementar heartbeat nem inferir presença online de acessos passados.

### P2 — Hierarquia global e responsividade

Duas peças retrato de 420px cada monopolizam a Home mobile. A moldura do fundo, molduras dos cards, molduras internas, selos e botões com bisel repetem pontos de atenção. A largura extra no tablet aumenta a escala da mesma composição, não aproxima formação/comunidade da Missão.

**Correção proposta:** Missão como único objeto ornamental, entorno mais silencioso e contínuo. No tablet/desktop, estudar grade com Missão preservada de um lado e formação/comunidade do outro, respeitando leitura e prioridade. Não esticar a arte nem reduzir fontes para caber em coordenadas fixas.

### P2 — Acessibilidade interativa

Medidas mobile: disponibilidade 179×40; Ver todos 55×16; guia 260×32; carteira 59×28; mensagens, atividades e tema 36×36. A norma local pede 44×44. Esses tamanhos, isoladamente, não permitem alegar violação universal de WCAG AA (há critérios e exceções de espaçamento diferentes). O diálogo customizado de convite não gerencia Escape/foco no cenário observado.

**Correção proposta:** ampliar áreas de toque sem ampliar ícones; usar primitive de diálogo existente com foco inicial, trap, retorno e Escape. Testar teclado e toque. O frontend possui semântica útil (section, headings, botões, links, rótulos, alt vazio em arte decorativa); preservar essa base.

### P2 — Estados de dados e custo de manutenção

Home reúne dashboard, permissões, editorial, convites, sessões de oração, retomada, disponibilidade e modais. Existem assinaturas Realtime e polling a cada 4s para convites e 3s para sessões. Falhas em algumas consultas são convertidas em arrays vazios/nulos, sem distinguir indisponibilidade de ausência de dados. Erro geral manda recarregar a página sem ação local de tentar novamente. Cache editorial é atualizado quando há lição, mas não é limpo nessa rotina quando a consulta retorna null.

**Correção proposta:** separar apresentação e dados por responsabilidade, preservando regras de roteamento e origem da oração. Priorizar funções puras de estado para os cards, não um framework genérico de dashboard. Antes de reduzir polling, validar reconexão e fallback de entrega; não remover mecanismos de chamada apenas por estética.

### P2 — Peso visual também custa bytes

Os quatro PNGs montados de Missão e Estudos somam cerca de 7.8MiB no disco. Ambos os temas estão em tags img, sem loading lazy nos cards. O navegador registra os quatro recursos, mesmo ocultando um por CSS. Recursos podem vir do cache; não alegar tempo de download ou impacto LCP sem trace de produção. Os fundos adicionais não estão incluídos nesse subtotal.

**Correção proposta:** eliminar a cópia de fundo de Estudos, escolher apenas o asset do tema ativo e avaliar formatos modernos mantendo a qualidade da Missão. Reservar dimensões, carregar apoios fora da dobra de modo apropriado. A identidade 2050 deve funcionar em aparelho modesto e movimento reduzido.

## Direção de implementação após escolha visual

1. Preservar o card Missão (arte, proporção e caráter); corrigir seus estados sem dupla e diálogo.
2. Substituir a estrutura copiada de Estudos por área de formação com EBD e cursos claramente diferenciados.
3. Definir hierarquia da Home e disposição tablet sem alterar rotas/permissões.
4. Fazer tokens e CSS de formação independentes da Missão; evitar outra camada de overrides.
5. Testar casos relevantes: membro/equipe, lição ausente/dia futuro, dupla ausente, disponibilidade e falha de dados. Não criar testes que apenas afirmam classes CSS.
6. Verificar capturas 390×844, 360px, tablet retrato/paisagem, ambos os temas, zoom de texto, foco e movimento reduzido. Rodar lint, testes relevantes, typecheck/build conforme contrato do projeto.

## Três estudos visuais

Gerados pelo Image Gen integrado, com as capturas desta sessão anexadas. Ordem corresponde à ordem exibida na conversa: propostas/01.png, propostas/02.png, propostas/03.png. São explorações, não implementação final, e podem conter texto/ornamentação adicional gerados; nenhum desses detalhes autoriza novas regras de negócio. A Missão real seguirá usando o componente existente, não uma cópia rasterizada da proposta.

Não foi escolhida uma direção nem editado src/ nesta auditoria. Próxima decisão: selecionar ou refinar a composição visual; depois implementar e validar.

## Ferramentas e skills aplicadas

Product Design index/audit/get-context/ideate, user-context preflight, ImageGen, using-agent-skills, interface-design, design-review local, browser-testing-with-devtools, orientação de acessibilidade local; Chrome DevTools, medições DOM/CSS, revisão React/TypeScript/serviços/SQL, referência primária W3C. Bibliotecas existentes relevantes: React, Router, Tailwind, Lucide, primitives do produto, Vitest/Testing Library. Nenhuma dependência nova adicionada. Não foi necessário Figma, Drive, vídeo, 3D ou agentes paralelos para confirmar este diagnóstico.
