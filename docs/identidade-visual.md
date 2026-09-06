# Identidade Visual — Comunhão | Oração Constante

> **Nota de versão (26/07/2026):** as seções históricas abaixo descrevem a
> primeira identidade menta/glass. Para novas implementações, a referência
> normativa é
> [`design-system-interacoes-2026-07-26.md`](design-system-interacoes-2026-07-26.md),
> que consolida a direção **Santuário Contemporâneo — Glass Suave**.

## Paleta de Cores

### Primária — Verde Claro (Menta Pastel)
Inspirada em dark UI kits modernos (Booking App UI Kit Dark UI).

| Token | Hex | RGB | Uso |
|---|---|---|---|
| `verde-50` | `#ecfdf5` | (236, 253, 245) | Fundos muito sutis, hover extremo |
| `verde-100` | `#d1fae5` | (209, 250, 229) | **Primário claro** — text-gradient, badges, glow |
| `verde-200` | `#a7f3d0` | (167, 243, 208) | **Primário médio** — botões CTA, ícones ativos, anéis |
| `verde-300` | `#6ee7b7` | (110, 231, 183) | **Secundário** — gradiente de botão, aurora |
| `verde-400` | `#34d399` | (52, 211, 153) | **Acento médio** — bordas de botão |
| `verde-500` | `#10b981` | (16, 185, 129) | **Acento escuro** (reserva) |

### Secundária — Âmbar (Testemunhos)

| Token | Hex | RGB | Uso |
|---|---|---|---|
| `âmbar-400` | `#fbbf24` | (251, 191, 36) | Badge de testemunho |
| `âmbar-500` | `#f59e0b` | (245, 158, 11) | Glow de testemunho, ícone Trophy |

### Neutros — Fundo

| Token | Hex | RGB | Uso |
|---|---|---|---|
| `fundo-escuro` | `#0f0d1a` | (15, 13, 26) | Base do gradiente (roxo escuro) |
| `fundo-claro` | `#0a1a1a` | (10, 26, 26) | Topo do gradiente (verde petróleo) |
| `glass-bg` | `rgba(15, 23, 42, 0.4)` | — | Background dos cards glass |
| `glass-strong` | `rgba(15, 23, 42, 0.6)` | — | Background do bottom nav |

## Tipografia

- **Fonte primária**: Inter (variável, pesos 300–800)
- **Títulos**: `font-extrabold` (800), `tracking-tight`
- **Seções**: `font-bold` (700), `tracking-[0.15em]`, uppercase
- **Badges/Labels**: `font-bold` (700), `tracking-[0.12em]`, uppercase
- **Corpo**: `text-sm`, `font-medium` (500), `text-slate-300`

## Glassmorfismo

```css
.glass {
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(20px) saturate(1.4);
  border: 1px solid rgba(51, 65, 85, 0.4);
}

.glass-strong {
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(30px) saturate(1.6);
  border: 1px solid rgba(51, 65, 85, 0.5);
}
```

## Ícones

- **Biblioteca**: Lucide React v1.24.0
- **Tamanhos padrão**:
  - Navegação: 22px
  - Ações (botões): 18px
  - Ícones de seção: 20px
  - Badges pequenos: 10–14px

## Animações

| Nome | Duração | Efeito |
|---|---|---|
| `aurora` | 6s | Bolhas de fundo pulsantes (infinite alternate) |
| `fade-in` | 0.4s | Opacidade 0→1 |
| `slide-up` | 0.4s | Opacidade + translateY(16px)→0 |
| `page-enter` | 0.4s | fade-in + slide-up combinados |
| `card-enter` | 0.4s | slide-up com delays em cascata (0.05s a 0.4s) |

## Emojis × Ícones (Substituições)

| Substituído | Por | Arquivos |
|---|---|---|
| `👋` (aceno) | removido | Home.tsx |
| `🙏` (mãos postas) | `Heart` | Register.tsx, PedidoCard.tsx |
| `✨` (brilho) | `Sparkles` | PedidoCard.tsx |
| `🙌` (mãos levantadas) | `Sparkles` | PedidoCard.tsx |
| `+` (texto) | `Plus` | Mural.tsx |
| vazio | `MessageCircle` | Mural.tsx (estado vazio) |

## Degradê de Fundo

```
background: linear-gradient(180deg, #0f0d1a 0%, #0f0d1a 60%, #0a1a1a 100%);
```

## Aurora (Efeito Neural Expressive)

3 camadas de blur com mix-blend-mode `screen`:
- Verde claro: `bg-emerald-300/15` → blur-100px
- Verde menta: `bg-emerald-200/10` → blur-120px
- Teal: `bg-teal-300/10` → blur-80px

## Tema Claro (estilo Instagram)

Ativado via botão `☀️`/`🌙` no canto superior direito (persiste em `localStorage`).

Inspirado no tema claro do Instagram: fundo claro neutro, cards brancos, texto escuro `#262626` e cinzas suaves.

### Diferenças do Tema Escuro

| Propriedade | Escuro | Claro |
|---|---|---|
| Fundo | `#0f0d1a` → `#0a1a1a` | `#fafafa` → `#f5f5f5` |
| Texto primário | `#f1f5f9` | `#262626` |
| Texto secundário | `#cbd5e1` | `#737373` |
| Texto terciário | `#94a3b8` | `#8e8e8e` |
| Glass | `rgba(255,255,255,0.03)` + blur | `rgba(255,255,255,0.9)` + sombra |
| Glass-strong | `rgba(255,255,255,0.05)` + blur | `rgba(255,255,255,0.95)` + sombra |
| Bordas | `rgba(71,85,105,0.5)` | `rgba(219,219,219,0.6)` |
| Inputs | fundo escuro | `#ffffff` |
| Aurora | opacidade 0.5–0.8 | opacidade ~0.03 |
| Verde accent | `#a7f3d0` (claro) | `#10b981` (vibrante) |

### Arquitetura

- `src/contexts/ThemeContext.tsx` — estado, toggle e persistência
- `data-theme="dark|light"` no `<html>` via `useEffect`
- `src/components/ThemeToggle.tsx` — botão `Sun`/`Moon`
- Variáveis CSS em `:root` e `[data-theme="light"]` em `src/index.css`
- Classes utilitárias: `.txt-primary`, `.txt-secondary`, `.txt-tertiary`, `.txt-muted`, `.bg-surface`, `.bg-elevated`, `.border-subtle`, `.input-theme`, `.txt-green`, `.txt-amber`, `.txt-rose`

## Histórico de Alterações

### 2026-07-12 — Modernização Visual

#### Parte 1: Emojis → Ícones + Paleta Menta Pastel
- Substituição de todos os emojis por ícones Lucide (Heart, Sparkles, Plus, MessageCircle)
- Paleta verde alterada de `emerald-400/500` (vibrante) para `emerald-100/200/300` (menta pastel)
- Padronização de tracking: `tracking-[0.12em]` para badges, `tracking-[0.15em]` para títulos
- Remoção de `tracking-wider`/`tracking-widest` em favor de valores explícitos
- Ajuste de cores da aurora, botões, badges, glows e anéis para o novo tom

#### Parte 2: Glass mais translúcido
- `.glass`: de `rgba(15,23,42,0.4)` para `rgba(255,255,255,0.03)` com blur 24px
- `.glass-strong`: de `rgba(15,23,42,0.6)` para `rgba(255,255,255,0.05)` com blur 32px
- Bordas alteradas de azul-escuro para branco sutil
- Saturação reduzida (1.4 → 1.1 / 1.6 → 1.2)
- Brilho `.glass-shine` ampliado para 50% com opacidade 0.08

#### Parte 3: Tema Claro + Theme Toggle
- Sistema de temas via `ThemeContext` + `data-theme` + CSS variables
- Tema claro estilo Instagram: fundo `#fafafa`, texto `#262626`, cards brancos com sombra
- Botão `Sun`/`Moon` persistente (localStorage) no canto superior direito
- Classes utilitárias: `.txt-primary`, `.txt-secondary`, `.bg-surface`, `.bg-elevated`, `.border-subtle`, `.input-theme`
- Variáveis CSS para glass, inputs, glows, aurora e bordas em cada tema
