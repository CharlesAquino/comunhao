# Direção de arte do Comunhão

## Fontes normativas

Ler na ordem definida por `docs/DESIGN-SYSTEM-CONTRATO-IMPLEMENTACAO.md`.
Consultar especialmente:

- `docs/DESIGN-SYSTEM-ACOES.md`;
- `docs/design-system-interacoes-2026-07-26.md`;
- `docs/identidade-visual.md`;
- `adr/ADR-002-linguagem-visual-sala-de-oracao.md`;
- o documento especializado da feature.

Não duplicar tokens em uma composição criativa. Consumir os tokens e
componentes vigentes.

## Linguagem geral

Manter reverência, calor humano, editorial-sacral contemporâneo, elegância
simples e simbolismo sutil. Construir foco com espaço, contraste, escala e luz;
decorar bordas e atmosfera sem disputar com conteúdo e controles.

Usar Inter para interface e Fraunces para títulos de significado conforme o
contrato vigente. Reservar bronze para detalhe e celebração; manter menta/verde
para ação, presença e seleção. Evitar aparência medieval, heráldica repetitiva,
pergaminho genérico, bisel metálico e sombra dura.

## Amanhecer e Santuário

Projetar os dois temas como composições equivalentes, não como inversão
automática. Preservar hierarquia, legibilidade, recorte e atmosfera em ambos.
Não usar uma arte escura com filtro como substituto automático da variante
clara quando a composição exigir luz própria.

## Produtos e editoriais

Permitir identidade própria para Comunhão Estudos, Rede EBD, Tesouro, Kesef e
campanhas, mas preservar a linguagem comum de interação. Uma arte pode ser
exclusiva; botão, navegação, foco, estados e ritmo de layout continuam sendo do
Design System.

Para Estudos, agrupar assets por curso em
`public/studies/courses/<slug-do-curso>/`. Criar card, banner e hero específicos
ao conteúdo. Não repetir o banner institucional como capa genérica.

## Banners, cards e heroes

- Preservar leitura em 390 x 844 sem letras pequenas.
- Manter título e significado também no HTML, mesmo quando houver grafia na
  imagem.
- Não incorporar botões ou estados interativos na arte.
- Usar card 16:9; reservar área segura de hero para texto e CTA HTML.
- Validar 768 x 1024 e 1024 x 768 com recomposição intencional, não estiramento.
- Integrar a arte à família visual hospedeira, sem moldura concorrente.

