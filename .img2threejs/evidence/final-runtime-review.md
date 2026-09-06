# Revisão final do Kesef 3D

Data: 2026-08-23

## Resultado

- Objeto renderizado com corpo cilíndrico, espessura e 72 ranhuras laterais.
- Frente e verso provisório utilizam a identidade visual do Kesef.
- O contorno visual vem da própria textura da moeda, sem aro artificial desconectado.
- Giro automático suave e inspeção por ponteiro.
- Movimento contínuo desativado por `prefers-reduced-motion`.
- Renderização pausada fora da viewport.
- Fallback 2D preservado para falha ou perda de contexto WebGL.
- Geometrias, materiais, texturas, observers, eventos e contexto WebGL descartados no unmount.
- Three.js carregado dinamicamente na Carteira e excluído do precache global do PWA.

## Evidência visual

Inspeção realizada em Chrome headless com WebGL nos temas Amanhecer e Santuário, incluindo vista frontal e inclinada. A grafia, o relevo aparente, a espessura e a serrilha permaneceram legíveis.

## Verificações

- `npm run lint`
- teste unitário do fallback acessível
- `npm run build`
- precache final sem o chunk `three.module-*`
