# Segurança

Estado confirmado para este ciclo:

- prontidão para produção suspensa durante a estabilização de segurança;
- nenhuma migration ou alteração remota sem autorização explícita;
- nenhuma leitura ou exibição de segredos;
- dados brutos de produção nunca entram no repositório;

A segurança do banco remoto ainda não foi demonstrada. A coleta aprovada está
definida na [`SPEC-001`](../specs/SPEC-001-auditoria-estado-remoto-supabase.md)
e requer autorização operacional separada.

As normas de autorização, severidade, evidência, resposta emergencial e
segredos estão no [manual de engenharia](../engineering/manual.md). O modelo de
identidade está em análise no
[`ADR-001`](../adr/ADR-001-modelo-identidade.md) e não é arquitetura aceita.
