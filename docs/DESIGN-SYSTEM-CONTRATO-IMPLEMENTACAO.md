# Contrato de Implementação do Design System do Comunhão

**Status:** normativo e obrigatório  
**Vigência:** 21/08/2026  
**Escopo:** toda criação ou alteração de tela, card, banner, botão, navegação,
controle, diálogo e estado visual.

## Finalidade

Este documento é o ponto de entrada obrigatório antes de implementar qualquer
interface. Ele não substitui as normas especializadas; define a ordem de
consulta, o processo de decisão e os critérios que impedem componentes novos de
parecerem produtos isolados.

O Design System é um contrato do produto. Uma feature pode ter identidade
editorial própria, mas não pode criar outra linguagem de interação.

## Fontes normativas

Consultar nesta ordem:

1. este contrato de implementação;
2. `DESIGN-SYSTEM-ACOES.md`, para hierarquia de CTAs;
3. `design-system-interacoes-2026-07-26.md`, para primitivas e controles;
4. `identidade-visual.md`, para tipografia, cores e movimento;
5. documento especializado da área, quando existir;
6. componentes e tokens vigentes em `src/components/ui/` e `src/index.css`;
7. auditorias e documentos de sessão apenas como evidência histórica.

Quando documentação e componente vigente divergirem, a divergência deve ser
registrada e resolvida antes da criação. Não se cria CSS local para contornar o
conflito.

## Gate obrigatório antes de implementar

Nenhuma interface começa pela escrita de JSX ou CSS. Antes, registrar
mentalmente ou na tarefa as respostas:

1. Qual tela existente é a referência mais próxima?
2. Qual é a hierarquia da ação: institucional, operacional, destrutiva,
   navegação, seleção ou controle especializado?
3. Qual primitive oficial já atende ao caso?
4. Quais tokens, medidas e estados essa família usa?
5. O componente funciona em Amanhecer e Santuário?
6. O texto e a arte permanecem legíveis em 390 × 844?
7. A composição foi validada em 768 × 1024 e 1024 × 768 sem apenas esticar?
8. Existe justificativa funcional para qualquer estilo novo?

Se as três primeiras respostas não estiverem claras, a implementação visual
deve pausar para inspeção do projeto.

## Regra de precedência visual

Sempre reutilizar nesta ordem:

1. componente oficial existente;
2. variante oficial existente;
3. composição aprovada de componentes oficiais;
4. classe semântica vigente para controle especializado;
5. extensão do Design System, documentada e reutilizável.

CSS local para uma única feature é o último recurso. Ele exige justificativa,
paridade entre temas, estados completos e registro neste contrato ou no
documento especializado.

## Ações e botões

| Necessidade | Componente obrigatório |
|---|---|
| Único CTA principal de tela ou card editorial | `InstitutionalAction` |
| Ação local com rótulo | `Button` |
| Ação somente com ícone | `IconButton` com rótulo acessível |
| Ação destrutiva | `Button` com variante `danger` |
| Ação própria de oração/chamada | `PrayerActionButton` |
| Aba, escolha, switch ou disclosure | classe semântica aprovada |

Regras:

- não usar `Button` com largura e aparência locais para imitar
  `InstitutionalAction`;
- não criar gradiente, borda, sombra ou raio exclusivo para uma ação comum;
- um card editorial possui no máximo uma ação institucional;
- ações secundárias usam `Button` e não concorrem visualmente com o CTA;
- rótulos começam com verbo, são curtos e descrevem o resultado;
- toda ação preserva foco, pressionado, desabilitado e carregamento;
- área de toque mínima: 44 × 44 px.

## Cards editoriais e banners

Cards da mesma família compartilham largura, raio, profundidade, ritmo,
responsividade e comportamento. A arte pode variar, mas a estrutura não.

Para cards editoriais da Home:

- usar a família `editorial-journey-card` quando a referência for Missão da
  Semana;
- integrar a arte ao card, sem uma segunda moldura interna;
- manter CTA e ações com primitives oficiais;
- não incorporar botões ou estados interativos à imagem;
- quando a grafia fizer parte da arte aprovada, dimensioná-la para leitura em
  mobile e manter cópia acessível no HTML;
- não usar letras pequenas em banners exibidos na largura de um celular;
- validar corte, contraste e leitura nos dois temas.

O banner institucional identifica a entrada de um produto e não deve ser
repetido como capa genérica de todos os conteúdos internos. Cursos, jornadas,
cards editoriais e avatares podem receber arte própria, inclusive criada para a
feature, desde que:

- permaneçam reconhecíveis como parte do Comunhão nos dois temas;
- usem proporção, raio, tipografia, contraste e tokens da família hospedeira;
- não criem linguagem paralela de botão, navegação ou estado;
- possuam fallback temático quando a arte remota ainda não existir;
- preservem título e significado no HTML, mesmo quando houver grafia na arte.

Assets editoriais de Estudos ficam agrupados por curso, nunca espalhados entre
pastas genéricas:

`public/studies/courses/<slug-do-curso>/`

Cada diretório pode conter `card-light`, `card-dark`, `banner-light`,
`banner-dark` e `hero`, sempre com versão no nome do arquivo. O card usa 16:9,
o banner interno prioriza composição panorâmica e o Hero reserva área segura
para título, descrição e CTA renderizados no HTML.

## Tipografia, ícones e conteúdo

- `Inter` é usada em interface, controles e corpo;
- `Fraunces` é usada em títulos de significado;
- ícones funcionais vêm do conjunto aprovado e descrevem a ação;
- bronze é detalhe e celebração, não cor universal de controle;
- menta/verde comunica ação, presença e seleção;
- imagens não substituem rótulos acessíveis;
- texto visível não deve depender de ampliação do usuário para ser entendido.

## Viewport, navegação e rolagem

- toda tela com conteúdo variável deve possuir uma superfície vertical de
  rolagem explícita;
- rotas dentro do shell usam `app-shell__main` como único scroll container;
- rotas protegidas fora do shell usam `standalone-scroll-page`, pois
  `body/#root` permanecem bloqueados no runtime móvel;
- não aplicar apenas `min-height: 100dvh` a uma rota standalone: isso não cria
  rolagem quando o body está com `overflow: hidden`;
- respeitar safe areas, navegação inferior e rolagem inercial no mobile;
- manter a barra visual oculta, sem desativar rolagem por toque, roda ou
  teclado;
- listas horizontais devem preservar `overflow-x: auto` sem bloquear a rolagem
  vertical da página.

### Regra de composição para tablet

- validar pelo menos 768 × 1024 em retrato e 1024 × 768 em paisagem;
- o ambiente visual pode ocupar o viewport, mas conteúdo comum usa a coluna
  central definida por `--app-content-max-width`;
- a navegação inferior permanece compacta e centralizada, sem distribuir cinco
  itens por toda a largura física do tablet;
- largura adicional deve provocar reorganização intencional: nova coluna,
  painel auxiliar, grade mais densa ou maior respiro lateral;
- cards, imagens, avatares, campos e tipografia não devem apenas crescer na
  mesma proporção do viewport;
- texto corrido mantém medida de leitura próxima de 65–75 caracteres;
- somente páginas marcadas como `app-content-wide` podem ultrapassar a coluna
  comum, e precisam declarar sua composição própria para tablet;
- barras de rolagem continuam visualmente ocultas em todos os tamanhos.

## Critérios obrigatórios de conclusão

Antes de declarar uma interface pronta:

- comparar com a tela de referência escolhida;
- confirmar uso das primitives oficiais;
- verificar temas Amanhecer e Santuário;
- verificar mobile em 390 × 844;
- verificar tablet em 768 × 1024 e 1024 × 768;
- percorrer o conteúdo até o final em todas as regiões roláveis;
- conferir foco visível, área de toque e rótulos acessíveis;
- executar lint e build;
- registrar quando a validação visual em dispositivo ainda estiver pendente.

## Regra para ampliar o Design System

Um novo padrão só é criado quando nenhuma primitive ou composição existente
atende à necessidade funcional. A extensão deve:

1. resolver uma categoria reutilizável, não apenas uma tela;
2. possuir nome semântico;
3. consumir tokens vigentes;
4. cobrir temas e estados;
5. ser documentada antes ou junto da implementação;
6. ser adicionada à auditoria e a este contrato.

## Exemplo aplicado: Comunhão Estudos

- referência estrutural: card Missão da Semana;
- família: `editorial-journey-card`;
- arte: banners próprios Amanhecer e Santuário;
- CTA principal: `InstitutionalAction` com “Acessar estudos”;
- revisão e gerenciamento: `Button` secundário/ghost, visíveis por permissão;
- posição: abaixo da Missão da Semana;
- grafia do banner: incorporada à arte, ampliada para mobile;
- rotas e permissões não alteram a hierarquia visual.
