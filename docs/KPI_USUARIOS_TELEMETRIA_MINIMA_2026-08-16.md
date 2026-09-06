# KPI de usuários e telemetria mínima

**Implementado em:** 16/08/2026  
**Release:** `1.4.0-dev.43` / `versionCode 14043`

## Entrega

O módulo **Administração → Indicadores de usuários** reúne, com filtros de 7,
30 e 90 dias:

- saldo Kesef atual, Kesef recebido e utilizado no período;
- contagem de acessos por área sem armazenar URL, consulta ou conteúdo;
- usuários com atividade e volume total de acessos;
- até três pessoas com quem cada usuário mais interagiu;
- separação das contagens por mensagens, salas de oração, comentários e
  intercessões.

O relatório não retorna texto de mensagens, comentários, pedidos de oração ou
qualquer intenção privada. A consulta exige `people.sensitive` e cada abertura
gera um registro em `admin_audit_log`.

## Dados e retenção

`user_area_usage_daily` guarda somente usuário, área semântica, dia, contagem e
primeiro/último horário. A RPC `registrar_acesso_area` aceita uma lista fechada
de áreas e só registra o próprio usuário autenticado. Registros diários com
mais de 90 dias são consolidados em `user_area_usage_monthly` e expurgados da
tabela detalhada. Ambas as tabelas negam acesso direto a clientes.

O saldo Kesef é calculado pelo ledger completo; recebido e utilizado respeitam
o período selecionado. Interações são agregadas em tempo de consulta a partir
dos registros operacionais já existentes.

## Arquivos centrais

- migration `20260816143000_kpis_usuarios_telemetria_minima.sql`;
- `src/components/UsageTracker.tsx`;
- `src/services/userAnalyticsRoutes.ts` e `userAnalyticsService.ts`;
- `src/pages/admin/AdminUserInsights.tsx`;
- RPC `admin_listar_kpis_usuarios`.

## Validação

- migration aplicada ao Supabase remoto;
- lint sem avisos;
- 42 arquivos e 202 testes aprovados;
- build web/PWA aprovado;
- teste unitário cobre a classificação semântica das rotas.

Os números de acesso começam a ser coletados após a instalação desta versão;
Kesef e interações históricas já aparecem conforme os registros existentes.
