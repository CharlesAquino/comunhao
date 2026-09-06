# Incidente EBD IA — JSON_VALIDATE_FAILED — 16/08/2026

## Evidência

| Campo | Valor sanitizado |
|---|---|
| Horário | `2026-08-16T14:35:48Z` |
| Correlation ID | `dc499e74-ed26-481f-8776-9e4a3ca56d3b` |
| Modelo | `openai/gpt-oss-120b` |
| Prompt | `ebd-day-v5-weekly-coherence-rag` |
| Dia | segunda-feira |
| Blocos selecionados | 9, incluindo quiz |
| Fontes vinculadas | 1 |
| Resultado | falha antes de aplicar ou publicar conteúdo |
| Código do provedor | `JSON_VALIDATE_FAILED` |

## Diagnóstico

A chave, o modelo, a permissão e o RAG estavam operacionais. Gerações
anteriores com o mesmo modelo e prompt foram concluídas. O HTTP 400 ocorreu
porque a saída desta tentativa não satisfez o JSON Schema estruturado. A
mensagem anterior classificava todos os HTTP 400/422 como configuração de
solicitação inválida e, neste caso, induzia a um diagnóstico incorreto.

Nenhum rascunho foi aplicado e nenhuma lição foi publicada pela falha.

## Correção aplicada

`supabase/functions/gerar-dia-ebd/index.ts` passou a:

1. reconhecer especificamente HTTP 400 + `json_validate_failed`;
2. repetir a chamada uma única vez;
3. usar menor temperatura e reforço de concisão na repetição;
4. não repetir outros erros 4xx, autenticação ou rate limit;
5. registrar `providerAttempts` na auditoria de sucesso;
6. retornar `AI_PROVIDER_OUTPUT_SCHEMA_MISMATCH` com mensagem correta caso a
   segunda tentativa também falhe.

A Edge Function `gerar-dia-ebd` foi republicada no projeto
`csxrhvgfnkqmkehgmnkp` em 16/08/2026. Não houve migration nem nova versão de
APK, pois a mudança é exclusivamente server-side.

## Validação

- lint aprovado;
- 41 arquivos de teste e 192 testes aprovados;
- deploy remoto confirmado pelo Supabase CLI;
- nova tentativa autenticada pelo responsável ainda necessária para validar o
  caso real de nove blocos.

## Regra de continuidade

Se a falha persistir, consultar `security_events` pelo novo correlation ID. Não
aumentar repetidamente o número de retries: isso pode agravar limites do plano.
Se houver recorrência estatística, medir tokens e simplificar schema/prompt ou
decompor quiz e blocos editoriais em gerações separadas.
