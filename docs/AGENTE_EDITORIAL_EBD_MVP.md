# Agente Editorial EBD — MVP Preparar Dia

## Objetivo

Preparar um único dia de uma lição EBD usando o RAG oficial e o roteiro semanal, criando apenas um rascunho editorial. O agente não envia para revisão, não publica e não dispara notificações.

## Fluxo

1. Um administrador abre uma lição em `draft` e informa o objetivo do dia.
2. O Estúdio envia `mode: prepare_day`, o `atualizado_em` conhecido e as fontes RAG vinculadas.
3. A Edge Function valida a permissão `ebd.manage`, estado da lição, idempotência, fontes e conflito de edição.
4. O contexto reúne dados canônicos da lição, posição do dia, roteiro semanal e trechos RAG.
5. A função cria uma execução em `ebd_ai_executions` e uma trilha em `ebd_agent_runs`.
6. A geração passa pelos mesmos contratos de estrutura, profundidade e qualidade do editor manual.
7. Somente após a validação, o dia é gravado no documento da lição ainda em rascunho. Uma alteração humana concorrente cancela a escrita com `EDITORIAL_CONFLICT`.
8. O agente termina em `draft_ready`; a revisão, o envio para revisão e a publicação continuam humanos.

## Contexto e memória

- Contexto: lição, dia, objetivo, roteiro semanal e fontes RAG oficiais.
- Memória persistida: apenas decisões editoriais mínimas, identificadores de fontes, ferramentas usadas e resultado resumido.
- Não entram nesta tabela dados pessoais, pedidos de oração, inferências pastorais ou conteúdo sensível da comunidade.

## Governança

| Ação | Regra |
| --- | --- |
| Sugerir/gerar blocos, quiz e prompt visual | Permitida no modo de rascunho |
| Gravar o rascunho do dia | Permitida, auditada e protegida contra conflito |
| Enviar para revisão | Ação explícita de administrador |
| Publicar ou disparar push | Ação humana com permissão própria |
| Alterar lição em revisão/publicada | Bloqueada para o agente |

## Tabelas e rastreabilidade

- `ebd_ai_executions`: entrada, saída, provedor, modelo, tokens e duração.
- `ebd_agent_runs`: objetivo, resumo de contexto, ferramentas, estado do rascunho e resultado resumido.
- As duas só são visíveis a administradores; as escritas vêm da Edge Function com service role.

## Próxima evolução

Exibir a lista de execuções `ebd_agent_runs` no Estúdio e conectar uma sugestão visual a um fluxo de geração de imagem que também pare para aprovação humana.
