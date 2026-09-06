---
name: creative-development
description: Orquestrar Creative Development para interfaces premium, motion UI, GSAP, ScrollTrigger, Three.js, React Three Fiber, Drei, WebGL, shaders, reconstrução img2threejs, direção de movimento, Remotion, trailers, banners, heroes e direção de arte do Comunhão. Usar ao projetar, implementar ou revisar experiências visuais interativas ou audiovisuais. Acionar também em trabalhos visuais que exijam performance, responsividade, tema claro/escuro, acessibilidade ou prefers-reduced-motion. Não usar para alterações comuns sem componente criativo relevante.
---

# Creative Development

Atuar como creative developer sênior. Coordenar intenção visual, implementação,
qualidade e manutenção sem tratar espetáculo como objetivo autônomo.

## Posição na toolchain

Usar esta skill como especialização, não como workflow geral de engenharia.
Deixar `../using-agent-skills/SKILL.md` selecionar spec, plano, implementação,
testes, revisão e entrega. Em UI de produto, combinar com
`../interface-design/SKILL.md`; em React, aplicar
`../vercel-react-best-practices/SKILL.md` e, quando houver arquitetura de
componentes reutilizáveis, `../vercel-composition-patterns/SKILL.md`.

Depois de implementar motion ou 3D, usar
`../optimize-web-animations/SKILL.md`. Para auditoria ampla, usar
`../web-quality-audit/SKILL.md` e suas especializações. Não declarar medição de
runtime quando a ferramenta de browser exigida não estiver disponível.

## Começar pelo contrato

1. Ler `../../../docs/DESIGN-SYSTEM-CONTRATO-IMPLEMENTACAO.md` antes de alterar
   interface do Comunhão.
2. Ler `../../../.interface-design/system.md` como memória derivada do Design
   System; em divergência, prevalecem os documentos normativos do projeto.
3. Inspecionar a tela de referência, os componentes em `src/components/ui/`,
   os tokens em `src/index.css` e as dependências em `package.json`.
4. Separar o que é conteúdo, interação, decoração, movimento e mídia.
5. Definir a ordem de atenção, a sensação pretendida e o comportamento sem
   animação antes de escolher biblioteca.
6. Ler [sistema de decisão](references/decision-system.md) e
   [performance e acessibilidade](references/performance-accessibility.md) em
   toda tarefa desta skill.

Não presumir que uma skill instalada equivale a uma dependência instalada no
aplicativo. Verificar pacote e versão antes de escrever imports. Não adicionar
dependências, plugins, fontes ou assets pesados sem necessidade comprovada.

## Carregar somente a competência necessária

### Motion de interface

- Ler `../gsap-core/SKILL.md` para tweens, easing, stagger, responsividade e
  movimento reduzido.
- Ler também `../gsap-react/SKILL.md` em React.
- Acrescentar `../gsap-timeline/SKILL.md` para sequências coordenadas.
- Acrescentar `../gsap-scrolltrigger/SKILL.md` para narrativa vinculada ao
  scroll.
- Acrescentar `../gsap-plugins/SKILL.md` para Flip, Draggable, Observer,
  MotionPath, SplitText, MorphSVG e demais plugins.
- Acrescentar `../gsap-utils/SKILL.md` para utilitários e
  `../gsap-performance/SKILL.md` para trabalho não trivial.
- Usar `../gsap-frameworks/SKILL.md` apenas fora de React.

### 3D e reconstrução por imagem

- Ler [Three.js e R3F](references/threejs-r3f.md).
- Preferir React Three Fiber em uma interface React quando a cena fizer parte
  da árvore de componentes; justificar Three.js puro quando escolhido.
- Para reconstruir uma referência visual como modelo procedural, usar a skill
  canônica `../img2threejs/SKILL.md` integralmente e obedecer seus gates. Não
  substituir o pipeline por geração improvisada de uma única malha.
- Integrar GSAP ao 3D somente quando controle temporal, scroll ou sequência
  produzirem benefício real. Manter um único proprietário para cada valor
  animado.

### Vídeo e motion design

- Ler [direção de movimento](references/motion-direction.md) antes de escrever
  uma composição.
- Usar `../remotion-best-practices/SKILL.md` como roteador canônico e carregar
  as skills Remotion específicas indicadas por ele.
- Definir briefing, cenas, duração, ritmo, tipografia, áudio, transições e CTA
  antes da implementação.

### Direção de arte

- Ler [direção de arte do Comunhão](references/ui-art-direction-comunhao.md)
  para heroes, cards, banners, vitrines, temas e linguagem editorial.
- Tratar o Design System como contrato de interação. Permitir identidade
  editorial própria sem criar botões, navegação ou estados paralelos.

## Descobrir capacidade antes de implementar

1. Identificar todas as capacidades aplicáveis nas skills instaladas.
2. Conferir a versão realmente instalada da biblioteca no projeto.
3. Consultar documentação oficial atual quando uma API especializada puder
   melhorar o resultado ou quando houver dúvida de versão.
4. Selecionar a solução menos complexa que satisfaça a experiência.
5. Usar API avançada quando ela resolver melhor o problema; não restringir a
   solução aos exemplos básicos da skill.
6. Não inventar imports, props, plugins, licenças ou suporte de plataforma.

Consultar [fontes e módulos instalados](references/upstream-skills.md) ao
auditar cobertura ou atualizar o pacote.

## Implementar em camadas

1. Entregar estrutura, conteúdo e estados sem motion.
2. Acrescentar direção visual e responsividade com primitives oficiais.
3. Acrescentar movimento ou 3D por enhancement progressivo.
4. Implementar fallback para movimento reduzido, WebGL indisponível, conexão
   lenta e dispositivo fraco conforme o caso.
5. Fazer cleanup de timelines, observers, listeners, render loops, materiais,
   geometrias e recursos.
6. Validar mobile, tablet retrato/paisagem, temas, teclado, touch e rolagem.
7. Medir custo antes e depois e executar lint, testes e build proporcionais ao
   risco.

## Critérios de saída

Entregar uma experiência cuja hierarquia continue clara sem animação; cujo
motion explique estado, foco ou continuidade; cujo 3D tenha função definida; e
cujo vídeo possua mensagem e ritmo antes de efeitos. Registrar dependências
adicionadas, fallbacks, validações executadas e qualquer QA visual pendente.
