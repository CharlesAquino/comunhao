# SPEC-002 — Protocolo Sentinela de Segurança

## Objetivo

Proteger a Sala de Oração contra abuso de identidade, quebra de autorização, replay, consumo irrestrito de recursos, manipulação editorial, vazamento de dados, prompt injection e falhas operacionais, sem criar atrito desnecessário para usuários legítimos.

## Princípios

- cliente, APK e navegador são ambientes não confiáveis;
- autenticação e autorização são responsabilidades diferentes;
- toda regra crítica é aplicada no servidor;
- acesso é negado por padrão;
- erros públicos não revelam topologia, SQL, stack ou provedor;
- ações críticas são idempotentes e auditáveis;
- logs não armazenam tokens, conteúdo privado nem IP em claro;
- publicação e economia usam transações atômicas;
- IA nunca publica automaticamente;
- documentos RAG são dados não confiáveis, não instruções.

## Bounded contexts

- **Identity & Access:** sessão, papel e permissão.
- **EBD Editorial:** rascunho, revisão, publicação, versão e arquivo.
- **Knowledge & RAG:** fonte, extração, chunk, embedding e busca.
- **Security Operations:** limite, idempotência, auditoria, risco e circuito.
- **Media Safety:** quarentena, validação e promoção — próxima fase.
- **Kesef Economy:** ledger e operações atômicas — próxima fase.

## Máquina de estados editorial

```text
draft → review → published → archived
           ↓
         draft
```

Regras:

- `published` somente por `publicar_ebd_editorial_seguro`;
- publicação exige permissão `ebd.publish`, estado `review`, sete dias válidos, versão esperada e chave idempotente;
- conteúdo publicado é imutável nesta fase;
- exclusão física pelo cliente é proibida;
- arquivamento exige motivo e auditoria.

## Contratos de segurança

### Rate limiting

A Edge Function combina ação, usuário autenticado e origem de rede, aplica SHA-256 com `SECURITY_HASH_PEPPER` e consome uma política transacional no banco. Nenhum IP é persistido em claro.

### Idempotência

Operações críticas exigem `Idempotency-Key`. A mesma chave e o mesmo hash retornam a resposta anterior; a mesma chave com payload diferente é rejeitada.

### Erros

Resposta pública:

```json
{
  "error": "Não foi possível concluir a solicitação.",
  "code": "INTERNAL_ERROR",
  "correlationId": "uuid"
}
```

Detalhes técnicos ficam restritos aos logs de execução e aos eventos sanitizados.

### Circuit breaker

Ações críticas podem ser suspensas por `system.manage`, com motivo, prazo e registro na auditoria administrativa.

## Definition of Done

- regra server-side;
- RLS/grants revisados;
- schema estrito;
- limites de frequência, tamanho e tempo;
- idempotência quando houver efeito ou custo;
- erro público neutro;
- auditoria sanitizada;
- teste positivo e negativo;
- rollback documentado;
- validação em staging antes do remoto.
