# Relatório de Levantamento — oracao-app

## 1. Informações Gerais

| Campo | Valor |
|---|---|
| Nome do Projeto | oracao-app (Comunhão \| Oração Constante) |
| Versão | 0.0.0 (pré-lançamento) |
| Propósito | Plataforma de intercessão e comunhão para mocidade (Assembleia de Deus) |
| Público-alvo | Jovens de EBD que participam do círculo de oração |
| Idioma | Português brasileiro |

## 2. Stack Tecnológica

| Tecnologia | Versão | Finalidade |
|---|---|---|
| React | ^19.2.7 | Framework frontend |
| Vite | ^8.1.1 | Build tool / dev server |
| Tailwind CSS | ^4.3.2 | Estilização utilitária |
| React Router DOM | ^7.18.1 | Roteamento SPA |
| Lucide React | ^1.24.0 | Ícones |
| Supabase JS | ^2.110.2 | Backend-as-a-Service (DB + Realtime) |
| Oxlint | ^1.71.0 | Linter |
| Inter (Google Fonts) | — | Tipografia principal |

## 3. Estrutura de Diretórios

```
oracao-app/
├── .env                          # Credenciais Supabase (ATENÇÃO: commitado!)
├── .gitignore
├── .oxlintrc.json
├── README.md                     # Template Vite padrão (não customizado)
├── index.html
├── package.json
├── package-lock.json
├── vite.config.js
├── setup_db.sql                  # Schema PostgreSQL + RLS policies
├── public/
│   ├── favicon.svg
│   └── icons.svg
├── src/
│   ├── main.jsx
│   ├── App.jsx                   # Rotas: /, /mural, /ranking, /register, /admin
│   ├── index.css                 # Tailwind + tema customizado
│   ├── assets/
│   │   ├── hero.png
│   │   ├── react.svg
│   │   └── vite.svg
│   ├── components/
│   │   ├── layout/
│   │   │   └── BaseLayout.jsx    # App shell: fundo aurora + bottom nav
│   │   ├── MocidadeGrid.jsx      # Grid de jovens com anéis de status
│   │   └── PedidoCard.jsx        # Card de pedido/testemunho
│   ├── pages/
│   │   ├── Register.jsx          # Cadastro (nome + telefone)
│   │   ├── Home.jsx              # Dashboard: missão, sustentador, disponibilidade
│   │   ├── Mural.jsx             # Mural de oração (pedidos + intercessão)
│   │   ├── Ranking.jsx           # Leaderboard com pódio
│   │   └── Admin.jsx             # Sorteio do círculo + gestão pastoral
│   ├── services/
│   │   ├── supabaseClient.js     # Cliente Supabase (env vars)
│   │   └── dataService.js        # Camada de dados centralizada
│   └── documentação/
│       └── Genesis               # Documento interno de design
└── docs/                         # Documentação do projeto (NOVA)
```

## 4. Funcionalidades Implementadas

### 4.1 Cadastro de Usuário (Register.jsx)
- Formulário com nome e telefone WhatsApp
- Inserção direta em `supabase.from('usuarios').insert()`
- ID armazenado em `localStorage` sob chave `oracao_app_user_id`
- Redirecionamento para Home após sucesso

### 4.2 Dashboard (Home.jsx)
- Exibe **Missão da Semana**: quem o usuário deve orar
- Exibe **Sustentador**: quem ora pelo usuário
- Grid da mocidade com **anéis de status**:
  - Verde (`ring-emerald-400`) = disponível
  - Vermelho (`ring-rose-400`) = orando
  - Cinza = offline
- Botão "Mão Levantada" para alternar disponibilidade
- Botões placeholder para Mensagem e Orar Agora
- Atualização em tempo real via Supabase Realtime

### 4.3 Mural de Oração (Mural.jsx)
- Lista de pedidos e testemunhos
- Cada pedido mostra autor, texto, contagem de intercessores
- Botão "Estou Orando" para interceder (toggle)
- Botão FAB para criar novo pedido via modal
- Atualização em tempo real

### 4.4 Ranking (Ranking.jsx)
- Pódio visual (1º, 2º, 3º lugares)
- Lista de classificação geral com pontos de comunhão
- Ícones de chama e medalha

### 4.5 Administração (Admin.jsx)
- Algoritmo de **Sorteio do Círculo**:
  1. Filtra usuários ativos (login nos últimos 15 dias)
  2. Embaralha com Fisher-Yates
  3. Conecta em permutação circular: `orando_por_id` = próximo, `sendo_orado_por_id` = anterior
  4. Atualiza via `upsert`
- **Sem proteção**: qualquer usuário pode acessar a rota /admin

## 5. Banco de Dados (setup_db.sql)

### Tabelas
| Tabela | Descrição |
|---|---|
| `usuarios` | Usuários com nome, telefone, status, pontos, conexões |
| `pedidos` | Pedidos de oração e testemunhos |
| `intercessoes` | Relação N:N entre usuários e pedidos |
| `historico_oracoes` | Histórico de sessões de oração |

### RLS (Row Level Security)
- **Todas as tabelas** têm RLS habilitado
- Políticas **permissivas demais**: `SELECT`, `INSERT`, `UPDATE`, `DELETE` públicos
- Qualquer usuário autenticado na API pode deletar qualquer registro

## 6. Problemas Identificados

### 🔴 Críticos
| ID | Problema | Arquivo | Severidade |
|---|---|---|---|
| C1 | `.env` commitado com credenciais Supabase reais | `.env` | 🔴 Crítico |
| C2 | Sem autenticação real — qualquer um pode impersonar outro usuário via localStorage | `Register.jsx:31` | 🔴 Crítico |
| C3 | Rota `/admin` sem proteção — qualquer um pode executar sorteio | `Admin.jsx` | 🔴 Crítico |
| C4 | Políticas RLS permitem DELETE e UPDATE públicos em todas as tabelas | `setup_db.sql` | 🔴 Crítico |

### 🟡 Médios
| ID | Problema | Arquivo | Severidade |
|---|---|---|---|
| M1 | Zero testes automatizados | — | 🟡 Médio |
| M2 | Sem TypeScript — sem segurança de tipos | Todos `.jsx` | 🟡 Médio |
| M3 | README não customizado (template Vite padrão) | `README.md` | 🟡 Médio |
| M4 | Sem PWA / service worker para suporte offline | — | 🟡 Médio |
| M5 | Botões sem estado de loading durante mutações | `Mural.jsx:31`, `Home.jsx:39` | 🟡 Médio |
| M6 | `console.error` em produção — sem tratamento adequado de erros | Vários | 🟡 Médio |

### 🟢 Baixos
| ID | Problema | Arquivo | Severidade |
|---|---|---|---|
| B1 | Chave `oracao_app_user_id` hardcoded como string literal | `dataService.js:8` | 🟢 Baixo |
| B2 | Limite de 15 dias hardcoded no algoritmo de sorteio | `Admin.jsx:16-17` | 🟢 Baixo |
| B3 | Sem Error Boundaries no React | `App.jsx` | 🟢 Baixo |
| B4 | Sem variáveis de ambiente para configuração | — | 🟢 Baixo |

## 7. Oportunidades de Melhoria

### Arquitetura
- Extrair constantes para arquivo compartilhado (chave localStorage, limite dias)
- Adicionar camada de serviços com tipagem
- Implementar Error Boundaries

### Segurança
- Remover `.env` do versionamento
- Implementar Supabase Auth com phone OTP
- Proteger rota admin com senha ou papel de administrador
- Restringir políticas RLS por `auth.uid()`

### Experiência do Desenvolvedor
- Migrar para TypeScript
- Adicionar testes unitários (Vitest)
- Customizar README
- Adicionar scripts de lint+test no CI

### Experiência do Usuário
- Adicionar loading states em botões de ação
- Implementar feedback visual para todas operações
- Adicionar PWA para instalação em dispositivos móveis

## 8. Estado Atual vs Roadmap

| Fase | Descrição | Status |
|---|---|---|
| Fase 1 | Setup do projeto, Tailwind v4 e estrutura de pastas | ✅ Concluído |
| Fase 2 | App Shell, Roteamento e Layout Base | ✅ Concluído |
| Fase 3 | Grid de Mocidade e Anéis de Status | ✅ Concluído |
| Fase 4 | Mural de Pedidos, Testemunhos e Interação | ✅ Concluído |
| Fase 5 | Camada de Abstração de Dados e Reatividade | ✅ Concluído |
| Fase 6 | Modelagem do BD e Implementação do Algoritmo Cíclico | ✅ Concluído |
| Fase 7 | Integração de Áudio (WebRTC) e Notificações WhatsApp | ⏳ Pendente |
| Fase 8 | Painel Administrativo e métricas pastorais | 🔄 Parcial |

---

*Documento gerado em: 12/07/2026*
*Autor: opencode — Levantamento automatizado do código-fonte*
