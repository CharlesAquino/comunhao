# Sistema de Interface do Comunhão

**Natureza:** memória operacional derivada  
**Autoridade:** não normativa  
**Fonte normativa principal:** `docs/DESIGN-SYSTEM-CONTRATO-IMPLEMENTACAO.md`

Este arquivo permite que a skill `interface-design` recupere decisões já
aprovadas. Em qualquer divergência, prevalecem o contrato do Design System, os
documentos especializados, os tokens em `src/index.css` e os componentes
vigentes em `src/components/ui/`.

## Direção

- Personalidade: reverente, acolhedora e contemporânea.
- Linguagem: Santuário Contemporâneo.
- Sensação: calor humano, presença, clareza editorial e simbolismo sutil.
- Regra: consistência do produto prevalece sobre novidade visual local.
- Temas: Santuário (escuro) e Amanhecer (claro) possuem composições
  equivalentes, não mera inversão automática.

## Hierarquia

- Um focal principal por tela ou card editorial.
- Um único CTA institucional por território visual relevante.
- Conteúdo e interação permanecem legíveis sem arte, motion ou WebGL.
- Identidade editorial própria não cria navegação, botões ou estados paralelos.

## Tipografia

- Interface, controles e corpo: Inter.
- Títulos de significado: Fraunces.
- Hierarquia usa tamanho, peso, contraste e espaço; não apenas aumento de fonte.
- Texto em banner mobile não pode depender de letras pequenas.

## Cor

- Verde/menta: ação, presença e seleção.
- Bronze: detalhe, foco e celebração; nunca controle universal.
- Marfim, pedra, sálvia e verde profundo: superfícies e atmosfera.
- Rosa queimado e âmbar: uso semântico ou editorial controlado.
- Toda cor deve vir de tokens vigentes; não registrar hex local como padrão.

## Profundidade

- Estratégia: camadas sutis de superfície, linha interna clara, halo curto,
  sombra de contato e sombra longa difusa.
- Elevação interativa máxima aproximada: 2 px.
- Pressionado aproximado: escala 0.985.
- Evitar bisel, relevo metálico, sombra preta dura, borda bronze grossa e
  perspectiva dramática.

## Espaçamento e responsividade

- Reutilizar tokens e ritmos existentes; não inventar escala paralela.
- Mobile de referência: 390 x 844.
- Tablet obrigatório: 768 x 1024 e 1024 x 768.
- Largura extra reorganiza a composição; não estica cards, imagens, navegação
  ou tipografia.
- Texto corrido preserva medida de leitura próxima de 65–75 caracteres.

## Componentes e ações

- CTA institucional: `InstitutionalAction`.
- Ação local com rótulo: `Button`.
- Ação somente com ícone: `IconButton` com nome acessível.
- Ação de oração: `PrayerActionButton`.
- Abas, escolhas, switches e disclosures usam classes semânticas aprovadas.
- Área de toque mínima: 44 x 44 px.
- Estados obrigatórios: repouso, foco, pressionado, desabilitado, carregamento;
  acrescentar hover quando o dispositivo suportar.

## Cards, banners e assets

- Cards editoriais da Home seguem `editorial-journey-card` quando a referência
  for Missão da Semana.
- Arte integra o card sem segunda moldura concorrente.
- Botões e estados nunca são incorporados à imagem.
- Card editorial: 16:9; hero reserva área segura para título, descrição e CTA
  em HTML.
- Estudos organiza assets em `public/studies/courses/<slug-do-curso>/`.
- O banner institucional não é capa genérica de todos os conteúdos.

## Movimento

- Movimento é funcional, discreto e semelhante à respiração.
- Movimentos comuns ficam entre 1 e 2 px; cenas promocionais podem ter direção
  própria, desde que não alterem a linguagem de interação do app.
- Respeitar `prefers-reduced-motion` e preservar estado final compreensível.
- Pausar trabalho offscreen e limpar timelines, observers, listeners e loops.

## Assinaturas do produto

- Luz Compartilhada em momentos institucionais, sem substituir ícones
  funcionais.
- Oliveira, chama, trigo, estrela, lâmpada, pomba, trombeta, escudo e cruz como
  vocabulário contextual, não ornamento repetitivo.
- Atmosfera editorial-sacral contemporânea reconhecível sem depender da logo.

## Gate antes de salvar novos padrões

Não acrescentar decisões a este arquivo apenas porque apareceram numa tela.
Salvar somente padrões aprovados, reutilizados e reconciliados com o contrato
normativo. Extensões do Design System devem ser documentadas primeiro no
documento normativo correspondente.

