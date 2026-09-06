---
name: design-review
description: Revisar e orientar telas, componentes e alterações visuais do Sala de Oração segundo sua Constituição Visual. Usar antes de criar uma tela, ao alterar layout, tema, tokens, navegação ou componentes, e na revisão final de qualquer entrega frontend.
---

# Revisar o design

## Preparar

1. Ler integralmente `.ai/06-design-language.md`.
2. Inspecionar a tela nos temas Santuário e Amanhecer.
3. Inventariar tokens e componentes existentes antes de propor novos.
4. Preservar regras de negócio, rotas e funcionalidades fora do escopo.

## Revisar

Avaliar e registrar evidências para:

- identidade reconhecível sem logo;
- uma hierarquia com no máximo um hero e um ponto focal;
- materiais coerentes: noite, pedra, madeira, folha, bronze, luz e pergaminho;
- verde reservado a ação, presença, progresso, esperança e foco;
- luz quente reservada a missão, fidelidade, honra e celebração;
- ritmo, espaço e densidade contemplativos;
- consistência com primitives existentes;
- contraste, foco, teclado, semântica, toque e movimento reduzido;
- equivalência de identidade entre Santuário e Amanhecer.

Não aprovar pelo apelo estético isolado. Exigir pertencimento, legibilidade e
coerência operacional.

## Responder às cinco perguntas

1. A tela pertence ao Sala de Oração sem a logo?
2. Existe apenas um ponto focal?
3. O verde representa vida ou apenas colore a interface?
4. A tela acolhe ou apenas informa?
5. A experiência permanece acessível?

Se qualquer resposta for “não”, revisar antes de implementar ou entregar.

## Implementar

- reutilizar tokens semânticos e primitives;
- evitar hexadecimais e estilos mágicos nas páginas;
- criar abstrações somente quando houver recorrência real;
- limitar efeitos simultâneos e movimento ornamental;
- validar ambos os temas e os estados loading, empty, error, hover, focus e
  disabled no escopo alterado.

## Entregar

Informar:

1. qual é o ponto focal;
2. como cada material foi usado;
3. quais componentes e tokens foram reutilizados ou criados;
4. resultado das cinco perguntas;
5. divergências, riscos e itens fora do escopo;
6. validações técnicas executadas.
