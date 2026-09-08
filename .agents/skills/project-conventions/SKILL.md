---
name: project-conventions
description: Centraliza padrões de naming, estrutura, erros, TypeScript, componentes e logs específicos da equipe. Use ao criar novos arquivos ou refatorar código.
---

# Convenções de Projeto

1. **TypeScript Rigoroso**: Evite tipagens soltas como `any`. Sempre use interfaces e tipos explícitos para propriedades de componentes e retornos de API.
2. **Nomenclatura**: PascalCase para componentes React (ex: `BaseLayout.tsx`). camelCase para funções e hooks (ex: `useAuth`). Kebab-case para pastas em algumas arquiteturas, mas siga o padrão da estrutura atual (ex: `pages/`, `components/`).
3. **Tratamento de Erros**: Utilize blocos `try/catch` em chamadas assíncronas e sempre lide de forma graciosa na UI (evite crashs silenciosos, exiba feedback com `ToastContext`).
