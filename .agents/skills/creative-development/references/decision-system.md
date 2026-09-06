# Sistema de decisão

## Perguntas obrigatórias

Responder antes de escolher tecnologia:

1. Qual resultado o usuário precisa alcançar?
2. O que deve ser percebido primeiro, segundo e terceiro?
3. O movimento comunica entrada, relação espacial, progresso, feedback ou
   narrativa?
4. O 3D acrescenta compreensão, identidade ou interação impossível de obter
   com custo menor?
5. A experiência precisa existir em runtime ou o resultado é um vídeo?
6. Qual é a experiência equivalente sem motion, sem WebGL e em conexão lenta?

## Matriz de roteamento

| Necessidade | Escolha inicial | Acrescentar quando necessário |
|---|---|---|
| Transição simples de estado | CSS/transição vigente do DS | GSAP se exigir controle, interrupção ou sequência |
| Entrada e microinteração coordenadas | GSAP Core + React | Timeline para múltiplas etapas |
| Narrativa vinculada ao scroll | ScrollTrigger | matchMedia, timeline e refresh controlado |
| Mudança entre layouts | GSAP Flip | absolute/nested somente após medir o caso |
| Arrastar, gesto ou direção de input | Draggable ou Observer | Inertia apenas quando contribuir para o controle |
| Objeto 3D numa UI React | R3F + Three.js | Drei para helpers maduros; GSAP para controle temporal externo |
| Cena 3D isolada ou integração não React | Three.js puro | justificar ciclo de vida e ownership do canvas |
| Imagem para modelo procedural | img2threejs | integrar o `THREE.Group` validado em R3F/Three |
| Vídeo programático | Remotion | separar direção de movimento da implementação React |
| Banner, hero ou card | Design System + direção de arte | imagem gerada somente quando a composição pedir bitmap |

## Regra de complexidade

Não combinar tecnologias por demonstração. Uma solução pode usar GSAP, R3F e
Remotion juntas somente quando cada camada tiver responsabilidade distinta e
verificável. Definir ownership explícito:

- React controla estrutura, conteúdo, estados e acessibilidade;
- GSAP controla tempo e interpolação de UI/objetos escolhidos;
- R3F controla a cena e o ciclo de render 3D;
- Remotion controla tempo determinístico de vídeo;
- o Design System controla linguagem de interação e tokens.

## Gate de dependências

Antes de instalar qualquer pacote:

1. inspecionar `package.json` e lockfile;
2. confirmar compatibilidade com React, Vite/Next e runtime alvo;
3. distinguir dependência de produção, desenvolvimento e ferramenta externa;
4. estimar impacto de bundle e carregamento;
5. preferir lazy loading e code splitting para 3D/vídeo;
6. registrar por que CSS, Canvas 2D ou solução existente não atendem;
7. instalar somente o subconjunto necessário.

