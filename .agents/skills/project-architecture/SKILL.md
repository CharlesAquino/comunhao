---
name: project-architecture
description: Regras fundamentais de arquitetura, performance e rede do projeto. Use ao planejar fluxos de dados, componentes pesados ou integrações de tempo real.
---

# Project Architecture

O projeto exige altíssima performance para garantir fluidez, especialmente em hardwares com recursos limitados (smartphones antigos e media boxes). 

## Regras de Performance e Arquitetura

1. **Worker Threads para Processamento Pesado**: Processamentos massivos (como parsing de M3U, indexação de grandes volumes de dados de mídia) DEVEM obrigatoriamente ser delegados a Web Workers (Worker Threads) para não bloquear o rendering e a main thread da UI.
2. **Shadow Connect (Pre-warming)**: A latência deve ser mitigada conectando-se antecipadamente aos serviços principais. Utilize pre-warming de sockets/conexões assim que houver a intenção de navegação para recursos de tempo real, diminuindo o tempo visível de "handshake".
3. **Viewport Enforcer**: Evite falhas e quebras de layout em telas anômalas mantendo os limites absolutos controlados e assegurando dimensões fluídas dentro da "safe area".
4. **Animações (CSS vs JS)**: Sempre priorize animações puras em CSS Tailwind (transições, keyframes em stylesheets) em vez de bibliotecas pesadas de animação em JavaScript (como Framer Motion), a fim de economizar ciclos de CPU e preservar a suavidade de 60 FPS.
5. **Session Context & Sync**: Nunca sobrescreva lógicas cruciais de rede ou design sem antes verificar o contexto do projeto. Mudanças críticas devem observar o risco de colapso de memória.
