---
name: design-system
description: Diretrizes de design, cores e hierarquia visual do aplicativo. Use sempre que for construir ou modificar componentes de UI, docks, navegação e interações de estado.
---

# Design System e Identidade Visual

A estética do aplicativo se baseia em uma linguagem visual "Premium Sanctuary". Sempre respeite estas regras ao construir UI:

## 1. Paleta de Cores e Iluminação
*   **Fogo Oliva**: A indicação de disponibilidade/luz utiliza tons de Verde Oliva (ex: `#BEC092` para brilhos suaves, `#6b8e23` para contrastes em fundos claros).
*   **Ouro/Bronze**: Elementos de identidade nobre usam Bronze (`var(--bronze)`) em temas claros, e gradientes dourados (`from-amber-200 via-amber-400 to-amber-600`) em temas escuros para garantir alta reflexividade.
*   **Contraste (Light vs Dark Mode)**: A iluminação virtual obedece à física. No modo claro (`data-theme='light'`), a luz não consegue sobressair, logo os componentes iluminados devem usar cores mais densas/pigmentadas (Bronze sólido, Oliva escuro). No modo escuro (`data-theme='dark'`), os elementos brilham com drop-shadows coloridos e gradientes luminosos. **Sempre use as variáveis CSS do `:root` ou defina as regras com precisão para ambos os temas em vez de confiar cegamente em `dark:` utilities.**

## 2. Texturas e Materiais
*   **Glassmorphism**: Docks e menus flutuantes usam o efeito de vidro fosco (`backdrop-filter: blur`, `color-mix` no `background`) em vez de cores sólidas e opacas, com sutis reflexos luminosos no topo ou fundo.
*   **Elevação Sensível**: Sombras são coloridas (glow) em vez de apenas cinzas ou pretas, simulando a difusão da luz ambiente.

## 3. Composição
*   Prefira o espaço em branco (respiro) abundante e evite amontoar elementos. Os contêineres e cartões devem parecer "ilhas".
