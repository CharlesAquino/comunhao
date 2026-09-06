# Plano de Ação — oracao-app

## Objetivo
Evoluir o `oracao-app` de MVP/protótipo para uma aplicação segura, testada e pronta para uso em produção por grupos de mocidade.

## Prioridades

### Prioridade 1 — 🔴 Segurança (Urgente)
Proteger dados dos usuários e impedir acessos não autorizados.

| # | Tarefa | Esforço | Dependências |
|---|---|---|---|
| 1.1 | Remover `.env` do versionamento e adicionar ao `.gitignore` | 5 min | — |
| 1.2 | Criar `.env.example` com variáveis documentadas | 5 min | — |
| 1.3 | Proteger rota `/admin` com senha/configuração | 2h | — |
| 1.4 | Implementar autenticação via Supabase Auth (phone OTP) | 8h | 1.1 |
| 1.5 | Apertar políticas RLS no banco de dados | 2h | — |

### Prioridade 2 — 🟡 Qualidade de Código
Aumentar confiabilidade e manutenibilidade.

| # | Tarefa | Esforço | Dependências |
|---|---|---|---|
| 2.1 | Adicionar TypeScript ao projeto | 4h | — |
| 2.2 | Criar constantes compartilhadas (chaves localStorage, limites) | 1h | — |
| 2.3 | Adicionar estados de loading em todos botões de mutação | 2h | — |
| 2.4 | Implementar Error Boundaries | 1h | — |
| 2.5 | Substituir `console.error` por sistema de notificação | 2h | — |

### Prioridade 3 — 🟡 Testes e Confiabilidade
Garantir que as funcionalidades principais funcionem corretamente.

| # | Tarefa | Esforço | Dependências |
|---|---|---|---|
| 3.1 | Configurar Vitest + Testing Library | 1h | 2.1 |
| 3.2 | Testar `dataService.js` (mock do Supabase) | 4h | 3.1 |
| 3.3 | Testar algoritmo de sorteio do círculo | 2h | 3.1 |
| 3.4 | Testar fluxo de registro e autenticação | 2h | 3.1 |

### Prioridade 4 — 🟢 Documentação e DevX
Melhorar onboarding e experiência do desenvolvedor.

| # | Tarefa | Esforço | Dependências |
|---|---|---|---|
| 4.1 | Customizar README com instruções do projeto | 1h | — |
| 4.2 | Criar documentação de setup e deploy | 1h | — |
| 4.3 | Adicionar script de lint ao CI | 30min | — |

### Prioridade 5 — ⚪ PWA e Offline
Preparar para instalação em dispositivos móveis.

| # | Tarefa | Esforço | Dependências |
|---|---|---|---|
| 5.1 | Gerar manifest.json e icons | 1h | — |
| 5.2 | Configurar service worker com Vite PWA plugin | 2h | — |
| 5.3 | Estratégia de cache para assets estáticos | 1h | 5.2 |

## Cronograma Sugerido

### Sprint 1 (Segurança)
```
Dia 1:  1.1, 1.2, 1.3
Dia 2-3: 1.4 (autenticação)
Dia 4:  1.5 (RLS), revisão
```

### Sprint 2 (Qualidade)
```
Dia 1-2: 2.1 (TypeScript)
Dia 3:  2.2, 2.3, 2.4
Dia 4:  2.5
```

### Sprint 3 (Testes)
```
Dia 1-2: 3.1, 3.2
Dia 3:  3.3, 3.4
```

### Sprint 4 (Documentação + PWA)
```
Dia 1:  4.1, 4.2
Dia 2:  4.3, 5.1
Dia 3:  5.2, 5.3
```

## Métricas de Sucesso

### Segurança
- [ ] `.env` removido do histórico e ignorado
- [ ] Rota `/admin` requer autenticação
- [ ] Usuários só podem alterar próprios registros (RLS)
- [ ] Todas as políticas RLS usam `auth.uid()`

### Qualidade
- [ ] Projeto em TypeScript (strict mode)
- [ ] Zero `console.error` em produção
- [ ] Error Boundaries em todas as rotas
- [ ] Loading states em todas as ações assíncronas

### Testes
- [ ] Cobertura mínima de 60% nas funções de serviço
- [ ] Testes de sorteio do círculo com casos borda
- [ ] Testes de fluxo de registro

### Documentação
- [ ] README com setup, arquitetura e deploy
- [ ] Schema do banco documentado
- [ ] Guia de contribuição

---

**Próxima revisão:** Após conclusão do Sprint 1
**Responsável:** opencode
