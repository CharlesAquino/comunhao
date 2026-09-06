# ADR-002 — Linguagem Visual do Sala de Oração

**Status:** Accepted  
**Data:** 2026-07-26  
**Decisores:** responsável do produto e engenharia

## Contexto

O aplicativo possuía componentes visualmente funcionais, mas não era
reconhecível como um lugar próprio sem a presença da marca. Temas, efeitos,
tipografia, gamificação e símbolos competiam entre si e permitiam associações
com dashboard, jogo mobile ou interface genérica.

## Decisão

Adotar **Santuário Contemporâneo** como linguagem visual oficial do Sala de
Oração.

A regra de reconhecimento é:

> Toda tela do Sala de Oração deve ser reconhecível em menos de um segundo,
> mesmo sem a logo.

A linguagem usa:

- Inter para interface e Fraunces para títulos de significado;
- verde musgo e sálvia, bronze envelhecido, âmbar, marfim e rosa queimado;
- superfícies sólidas, espaço generoso, bordas discretas e sombras raras;
- movimento contido, semelhante à respiração;
- escudo oficial com borda dupla e heráldica contemporânea;
- símbolos oficiais: oliveira, escudo e cruz, chama, trombeta, trigo, estrela,
  lâmpada e pomba;
- família funcional de ícones temáticos próprios para oração conjunta,
  presença, silêncio, texto, voz e vídeo;
- consistência com precedência sobre novidade visual.

Na experiência vigente, a Home preserva dois destinos distintos no contexto
da dupla semanal: **Convidar {parceiro}** e **Sala de Oração**. Pedido reservado,
intercessão e disponibilidade temporária pertencem à Sala. A arquitetura da
Home permanece estável; conteúdo contextual pode mudar sem reordenar seus
territórios.

Os detalhes normativos pertencem a
[`06-design-language.md`](../.ai/06-design-language.md). Os tokens e ativos
heráldicos pertencem a `src/assets/badges/`. Este ADR não duplica essas fontes.

## Alternativas consideradas

### Manter identidade por tela

Permitiria liberdade local, mas perpetuaria a sensação de produtos diferentes
dentro do mesmo aplicativo.

### Usar uma biblioteca visual genérica

Reduziria o trabalho inicial, mas não produziria reconhecimento próprio e
criaria dependência estética de terceiros.

### Adotar estética gamer ou angelical fantástica

Tornaria a progressão mais explícita, mas conflitaria com reverência, serviço e
comunhão.

## Consequências

- novos componentes precisam demonstrar pertencimento à linguagem;
- símbolos têm significado estável e não são decoração intercambiável;
- novas insígnias devem derivar do escudo e tokens oficiais;
- neon, cartoon, glassmorphism exagerado e efeitos concorrentes são rejeitados;
- familiaridade de padrões de interação pode vir de produtos conhecidos, mas a
  expressão visual permanece própria;
- mudanças na linguagem exigem revisão deste ADR e da fonte normativa.
- disponibilidade social precisa representar estado real, temporário e
  expirável; presença ou atividade simulada são incompatíveis com a linguagem;
- movimento deve ser funcional, discreto e respeitar `prefers-reduced-motion`.

## Critério de conformidade

Uma tela está conforme quando continua reconhecível sem logo, nome do produto
ou conteúdo religioso explícito e quando não depende de tendências visuais
incompatíveis com o caráter contemplativo do produto.
