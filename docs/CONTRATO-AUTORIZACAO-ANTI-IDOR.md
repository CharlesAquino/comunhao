# Contrato de autorização contra IDOR/BOLA

**Vigente desde:** 23/08/2026  
**Migrations de referência:** `20260823120000_idor_hardening.sql`,
`20260823130000_idor_hardening_engajamento.sql` e
`20260823140000_idor_least_privilege.sql`  
**Development remoto:** aplicadas em 23/08/2026 no projeto
`csxrhvgfnkqmkehgmnkp`; `db push --dry-run` final sem pendências.

## Regra invariável

Um identificador recebido do app localiza um objeto; ele nunca comprova que o
usuário pode ler ou alterá-lo. A autorização deve ser recalculada no servidor a
partir do JWT, de `usuario_atual_id()`, do vínculo com o objeto ou de uma
permissão administrativa explícita.

Toda nova tabela ou operação por ID deve responder, antes da implementação:

1. quem é o proprietário ou participante do objeto;
2. qual papel pode agir sobre objetos de terceiros;
3. quais colunas cada ator pode alterar;
4. se o recurso é público, comunitário, privado ou administrativo;
5. qual teste negativo troca o ID por um objeto de outro usuário.

## Matriz vigente

| Recurso | Leitura | Mutação |
|---|---|---|
| `usuarios` | comunidade autenticada, limitada por grants de coluna | somente o próprio perfil e colunas editáveis |
| `pedidos` | comunidade autenticada | autor; administração por fluxo autorizado |
| `intercessoes` | comunidade autenticada | somente o próprio participante |
| `mensagens` | remetente ou destinatário | remetente cria; destinatário altera apenas `lida` |
| `app_notificacoes` | destinatário | destinatário altera apenas `lida` |
| `convites_oracao` | remetente ou destinatário | somente RPCs de domínio |
| `oracao_jornadas` | proprietário | proprietário |
| `kesef_ledger` / `kesef_saldo` / XP / PC | proprietário ou permissão econômica | somente RPCs autorizadas e vinculadas ao ator |
| `loja_pedidos` | proprietário ou operador | somente RPCs transacionais |
| progresso e certificados de Estudos | proprietário ou gestor | progresso pela RPC; certificado emitido pelo servidor |
| rascunhos de Estudos | gestor ou revisor designado | gestor; publicação por permissão específica |

## Regras de implementação

- RLS deve estar habilitada em todo recurso privado ou mutável por usuário.
- Policies devem declarar `TO authenticated` e comparar com
  `public.usuario_atual_id()`; não confiar em `usuario_id` enviado.
- Tabelas de ledger, auditoria, convites e transações não recebem escrita
  direta do cliente quando existe uma RPC de domínio.
- Quando apenas uma propriedade é editável, usar grants por coluna. RLS sozinha
  não impede mass assignment dentro de uma linha autorizada.
- Funções `SECURITY DEFINER` devem usar `SET search_path = ''`, nomes de schema
  qualificados, autorização interna e `REVOKE ... FROM PUBLIC, anon`.
- Views sobre dados privados devem usar `security_invoker = true`.
- Service role nunca deve chegar ao navegador ou APK.

## Gate de revisão

Uma alteração por ID não está pronta sem ao menos estes casos:

- usuário A acessa o próprio objeto: permitido;
- usuário A troca o ID pelo objeto de B: vazio, `403` ou erro de permissão;
- A tenta mudar proprietário, papel ou coluna não autorizada: negado;
- operador sem a permissão específica: negado;
- requisição anônima: negada;
- Realtime e Storage aplicam a mesma regra da leitura normal.

O teste `20260823120000_idor_hardening.test.sql` protege estruturalmente esse
contrato. Testes de integração autenticados devem continuar cobrindo a troca
real de IDs em development/staging antes de publicar.
