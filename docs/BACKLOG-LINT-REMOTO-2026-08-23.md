# Backlog do lint remoto após o anti-IDOR

**Mapeado em:** 23/08/2026  
**Estado:** concluído em development em 23/08/2026  
**Origem:** `supabase db lint --linked --level error`

Os erros abaixo são legados e independentes das migrations anti-IDOR. O erro
de assinatura de `registrar_evento_engajamento` foi corrigido durante o
endurecimento e não faz mais parte deste backlog.

| Prioridade | Função | Erro confirmado | Impacto provável | Tratamento planejado |
|---|---|---|---|---|
| P1 | `criar_perfil_usuario` | referencia `usuarios.device_id`, coluna inexistente | fluxo legado de criação de perfil pode falhar se ainda for chamado | confirmar consumidores; remover o campo obsoleto ou aposentar a RPC |
| P1 | `finalizar_sala_oracao` | `usuario_id` ambíguo em consulta PL/pgSQL | encerramento de sala pode falhar no ramo afetado | qualificar alias de tabela e criar regressão com dois participantes |
| P2 | `verificar_provas_pendentes` | `status` e `usuario_id` ambíguos | verificação de ascensão pode falhar | qualificar todas as colunas e testar usuário específico e lote |
| P2 | `is_admin` | consulta tabela inexistente `public.profiles` | helper legado sempre falha se executado | mapear chamadas e substituir por `admin_tem_permissao` ou remover |
| P2 | `incrementar_apoio_oracao` | referencia `pedidos.quantidade_apoios`, coluna inexistente | contador legado de apoio pode falhar | confirmar substituição pelo Mural Social e aposentar ou migrar |

## Ordem de retomada

1. reproduzir cada função em development sem alterar dados permanentes;
2. mapear consumidores no app, triggers e outras RPCs;
3. corrigir P1 com testes SQL negativos e positivos;
4. corrigir ou aposentar P2, evitando manter duas fontes de verdade;
5. executar `db lint`, testes SQL, testes do app e auditoria de migrations;
6. aplicar em development mediante preflight e registrar evidência remota.

## Gate

Este backlog só volta a `em andamento` depois que o Kesef 3D possuir objeto
renderizado, fallback 2D, movimento reduzido, descarte de recursos e validação
visual nos temas Amanhecer e Santuário.

## Conclusão

O gate foi satisfeito antes da retomada: o Kesef 3D recebeu objeto renderizado,
fallback 2D, suporte a movimento reduzido, descarte de recursos, carregamento
dinâmico e validação visual nos dois temas.

A migration `20260823150000_corrigir_funcoes_legadas_lint.sql` foi aplicada no
development com os seguintes resultados:

- `criar_perfil_usuario`: removida por estar obsoleta, sem consumidores e
  incompatível com o contrato atual de cadastro;
- `incrementar_apoio_oracao`: removida; o modelo atual usa intercessões do
  Mural Social e não possui o contador legado;
- `is_admin`: redirecionada ao helper vigente de administração, sem acesso
  anônimo;
- `finalizar_sala_oracao`: colunas qualificadas, acesso anônimo revogado e
  encerramento limitado a host, participante ou administração autorizada;
- `verificar_provas_pendentes`: colunas qualificadas e escopo preso ao usuário
  autenticado; a função mutável interna deixou de ser executável diretamente
  pelo cliente.

Evidência final: `supabase db lint --linked --level error` retornou
`results: []`.
