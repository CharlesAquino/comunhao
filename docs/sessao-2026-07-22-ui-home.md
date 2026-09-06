# Sessão 22/07 — Refinamento UI Home + Tema Claro

## Card Missão da Semana
- Reformulado como perfil de rede social: **cover gradient** + **avatar grande sobreposto** + badge de status
- **Textura de ruído** (SVG feTurbulence, `mix-blend-soft-light`, opacidade 20%)
- **Efeito 3D** em todos os cards (`perspective: 800px`, `rotateX(2deg) rotateY(-1deg)` no hover)
- Sombras 3D por tema: `--card-3d-shadow`

## Botões de Ação (FAB)
- **Levantar a Mão**: `w-20 h-20 rounded-full bg-amber-500/90` (fixo, mesmo tom nos dois temas)
- **Orar Agora**: `w-20 h-20 rounded-full bg-[var(--accent-solid)]` (verde no escuro, marrom no claro)
- Caption abaixo com nome da dupla: `Orar com {primeiro nome}`
- `hover:scale-105 hover:brightness-110 active:scale-90`

## Integração Sustentado em Fé
- Movido para dentro do card da missão, abaixo dos botões (estilo "interação" de rede social)
- Separador `border-t border-white/5`

## Tema Claro — Paleta Tom sobre Tom (Marrom)
| Variável | Escuro | Claro |
|---|---|---|
| `--accent-solid` | `#3a7a5a` (verde) | `#806858` (marrom) |
| `--accent-soft` | `rgba(111,168,143,0.15)` | `rgba(160,136,120,0.15)` |
| `--cover-gradient` | verde → âmbar | marrom → areia |
| `--cover-overlay` | `rgba(15,15,18,0.8)` | `rgba(248,244,236,0.7)` |
| `--glass-bg` | `#1d1a14` | `#ffffff` (sólido) |
| `--nav-active` | `#a7f3d0` (verde) | `#c96a5a` (terracota) |
| `--nav-active-glow` | `rgba(167,243,208,0.6)` | `rgba(201,106,90,0.4)` |
| `--aurora-blob1/2/3` | verde/teal | marrom/areia |
| `--card-3d-shadow` | `rgba(0,0,0,0.4)` | `rgba(42,31,24,0.12)` |

## Convenção de Cores
- **Hardcoded Tailwind** (`bg-amber-500/90`, `txt-amber`): mesmo tom nos dois temas
- **CSS variables** (`bg-[var(--accent-solid)]`, `txt-green`, `bg-green-subtle`): mudam por tema
- **Sem verde no tema claro** — tudo na família marrom/terracota/areia

## Arquivos Alterados
- `src/pages/Home.tsx` — redesign completo
- `src/components/MocidadeGrid.tsx` — badge "orando" âmbar, contador ativos, suporte sessões
- `src/components/layout/BaseLayout.tsx` — nav ativo com CSS variables, aurora com variáveis
- `src/contexts/ThemeContext.tsx` — novas variáveis de acento, aurora, nav
- `src/index.css` — classes `bg-accent`, `bg-accent-soft`, `txt-quaternary`, `card-3d`
