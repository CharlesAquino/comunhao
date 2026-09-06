# Pacote de Skills de Creative Development

**Status:** ativo no escopo do aplicativo  
**Instalado em:** 23/08/2026  
**Local:** `app/.agents/skills/`

## Objetivo

Transformar Creative Development em uma especialização modular do Codex para o
Comunhão: direção visual, motion UI, 3D procedural/interativo e vídeo
programático, sempre subordinados ao Design System, à performance e à
acessibilidade.

O pacote não promete “usar toda API em toda tarefa”. Ele permite descobrir o
arsenal disponível, carregar a competência exata e escolher recursos avançados
quando produzirem benefício real.

## Arquitetura

```text
using-agent-skills (workflow geral de engenharia)
└── creative-development (especialização visual do Comunhão)
    ├── GSAP oficial
    │   ├── core / timeline / ScrollTrigger / plugins / utils
    │   └── React / frameworks / performance
    ├── img2threejs canônico
    │   └── pipeline procedural, scripts, estado e gates visuais
    ├── Remotion oficial
    │   ├── best-practices (roteador)
    │   └── create / markup / studio / render / mídia / captions / outros
    └── referências próprias
        ├── sistema de decisão
        ├── Three.js e React Three Fiber
        ├── direção de movimento
        ├── direção de arte do Comunhão
        └── performance e acessibilidade
```

## Por que existe uma skill roteadora especializada

Um `SKILL.md` visual monolítico ocuparia contexto, congelaria APIs e misturaria
responsabilidades. `creative-development` decide o caminho e manda carregar
somente os módulos relevantes. As skills oficiais continuam atualizáveis sem
edições locais; as regras específicas do produto permanecem numa camada nossa.

O workflow geral pertence a `using-agent-skills`, conforme
`CODEX_AGENT_TOOLCHAIN.md`. Creative Development não substitui spec, plano,
testes, revisão, segurança ou entrega.

## Cobertura instalada

- GSAP: oito skills oficiais da GreenSock.
- img2threejs: pipeline 1.5.1 completo.
- Remotion: doze skills oficiais, versão 4.0.515.
- Three.js/R3F: competência arquitetural própria com consulta obrigatória à
  documentação da versão usada no projeto.
- Comunhão: integração com o contrato de Design System, Amanhecer/Santuário,
  mobile/tablet e assets editoriais.

Hashes do snapshot e fontes ficam em
`.agents/skills/creative-development/references/upstream-lock.json`.

## Skills não são dependências de runtime

Instalar uma skill ensina o Codex; não adiciona automaticamente `gsap`,
`three`, `@react-three/fiber`, `@react-three/drei` ou `remotion` ao bundle do
aplicativo. Cada implementação deve verificar o `package.json`, justificar a
dependência e preferir carregamento sob demanda. Isso evita peso permanente por
uma capacidade usada apenas em páginas promocionais ou ferramentas editoriais.

## Exemplos de acionamento

- “Use `$creative-development` para animar o hero com GSAP sem alterar a
  hierarquia do Design System.”
- “Use `$creative-development` e `$img2threejs` para reconstruir esta moeda
  Kesef e integrá-la como enhancement progressivo.”
- “Use `$creative-development` e `$remotion-best-practices` para planejar e
  produzir um teaser da EBD.”
- “Use `$creative-development` para revisar performance, tablet e movimento
  reduzido desta experiência 3D.”

## Atualização segura

Não sobrescrever módulos canônicos diretamente. Baixar atualizações para uma
pasta temporária, comparar fonte/licença/scripts, validar, recalcular hashes e
só então substituir o snapshot numa mudança revisável. Adaptações específicas
do produto devem ser feitas em `creative-development`.

## Próxima prova recomendada

Aplicar o pacote num microprojeto isolado ou numa página promocional do
Comunhão, com hero GSAP, um objeto 3D carregado sob demanda, cards com
microinterações e fallback estático. Não introduzir essa stack na Home do app
antes de medir custo e comportamento nos dispositivos reais.
