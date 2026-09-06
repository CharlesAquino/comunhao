# Performance e acessibilidade

Aplicar esta referência junto de toda tarefa Creative Development.

## Contrato funcional

- Manter conteúdo, navegação e ações compreensíveis sem animação.
- Respeitar `prefers-reduced-motion` desde a arquitetura, não como remendo.
- Não depender de cor, profundidade, áudio, gesto ou movimento isoladamente.
- Manter foco visível, ordem de foco, semântica e área de toque mínima de 44 px.
- Preservar contraste e tempo de leitura nos temas Amanhecer e Santuário.
- Fornecer texto alternativo ou descrição quando a mídia transmitir conteúdo.

## Movimento reduzido

Preferir remover scrub, paralaxe, rotação, zoom, loops e deslocamentos amplos.
Substituir por estado final imediato ou fade curto somente quando não causar
desconforto. Não bloquear funcionalidade ao desativar o motion.

## Runtime e cleanup

- Escopar e reverter GSAP, ScrollTrigger, matchMedia e observers.
- Remover listeners e cancelar trabalho assíncrono ao desmontar.
- Pausar render loops, mídia e animações fora da viewport ou com página oculta.
- Liberar materiais, geometrias, texturas, render targets e controls criados
  manualmente.
- Evitar múltiplos observers e loops concorrentes para o mesmo efeito.

## Custo visual

- Preferir transform e opacity para motion de UI.
- Evitar blur amplo, filtros empilhados e sombras animadas em grandes áreas.
- Carregar 3D, vídeo e plugins avançados sob demanda.
- Comprimir texturas e mídia; escolher resolução pelo uso real.
- Controlar DPR, draw calls, luzes, sombras, pós-processamento e partículas.
- Medir bundle e experiência em dispositivo móvel; não inferir desempenho pelo
  desktop de desenvolvimento.

## Validação mínima

1. Navegar com teclado e touch.
2. Testar movimento normal e reduzido.
3. Testar Amanhecer e Santuário.
4. Testar 390 x 844, 768 x 1024 e 1024 x 768.
5. Percorrer todas as regiões roláveis com a barra visual oculta.
6. Testar fallback sem asset e, para 3D, sem WebGL.
7. Inspecionar console, memória, long tasks e regressão de bundle quando
   aplicável.
8. Executar lint, testes e build proporcionais à alteração.

