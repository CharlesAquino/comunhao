# ADR-001 — Modelo de identidade entre domínio e Supabase Auth

**Status:** Proposed  
**Data:** 2026-07-25  
**Decisores:** pendente  
**SPEC relacionada:** [`SPEC-001`](../specs/SPEC-001-auditoria-estado-remoto-supabase.md)

## Contexto

Os scripts SQL locais contêm dois modelos históricos:

1. `usuarios.id = auth.uid()`;
2. `usuarios.id` como identificador do domínio e `usuarios.auth_user_id` como
   vínculo com `auth.users`.

Essa divergência afeta RLS, RPCs, serviços e relações do domínio. O estado
remoto ainda não foi reconciliado, portanto este ADR não descreve a arquitetura
vigente.

## Problema

Não existe uma regra canônica confirmada para relacionar a identidade emitida
pelo Supabase Auth ao identificador usado nas tabelas do domínio. Enquanto os
dois modelos coexistirem, policies e funções podem comparar identificadores de
espaços diferentes ou depender de pressupostos incompatíveis.

## Modelo proposto

Se a auditoria remota confirmar que o modelo é compatível, adotar:

- `usuarios.id` como identificador interno e estável do domínio;
- `usuarios.auth_user_id` como vínculo único e anulável apenas durante fluxos
  legados controlados;
- autorização iniciada por `auth.uid()`;
- resolução do perfil por `usuarios.auth_user_id = auth.uid()`;
- operações pessoais privilegiadas derivando `usuario_id` da sessão, sem
  aceitar esse identificador como autoridade informada pelo cliente.

Enquanto o status for `Proposed`, esta seção não é uma decisão canônica e não
autoriza migration ou alteração de código.

## Alternativas consideradas

### Usar `usuarios.id = auth.uid()`

Simplifica algumas policies, mas acopla a identidade do domínio ao provedor de
autenticação e conflita com usuários preexistentes observados na história do
projeto.

### Manter os dois modelos

Evita migração imediata, mas perpetua autorização contraditória e aumenta o
risco de policies e RPCs compararem identificadores incompatíveis.

### Remover a tabela de perfil

Centralizaria identidade em `auth.users`, mas não atende diretamente aos dados
e relações específicos do domínio atualmente modelados em `usuarios`.

## Consequências esperadas

Se aceita:

- RLS e RPCs precisarão de uma forma canônica de resolver o perfil;
- `auth_user_id` precisará de unicidade e integridade verificadas;
- fluxos legados de vinculação precisarão de tratamento explícito;
- o cliente deixará de ser autoridade sobre seu próprio `usuario_id`;
- migrations e testes negativos deverão cobrir contas vinculadas, não
  vinculadas e tentativas de acesso cruzado.

## Riscos

- perfis legados podem não ter vínculo válido ou único;
- alterar a identidade usada por FKs pode exigir migração de dados;
- policies parcialmente migradas podem bloquear usuários legítimos ou permitir
  acesso cruzado;
- funções antigas podem continuar assumindo `usuarios.id = auth.uid()`;
- aceitar a proposta sem inventário remoto pode consolidar uma hipótese errada.

## Evidências ainda necessárias

- constraints e índices remotos de `usuarios.id` e `auth_user_id`;
- quantidade e natureza de perfis sem vínculo, obtidas por procedimento
  separado que preserve dados pessoais;
- policies e funções remotas que usam cada modelo;
- referências FK ao identificador de domínio;
- fluxos reais de cadastro, vinculação, login e recuperação;
- impacto sobre usuários preexistentes e contas administrativas.

## Critérios de aceitação

A proposta pode ser aceita somente se:

1. a coleta remota da SPEC-001 confirmar compatibilidade estrutural;
2. os dados existentes puderem ser reconciliados sem perda de identidade;
3. existir estratégia de migração, rollback e testes negativos;
4. RLS e RPCs puderem adotar uma resolução única e verificável;
5. os decisores responsáveis aprovarem explicitamente o ADR.

## Critérios de rejeição

A proposta deve ser rejeitada ou reformulada se:

- o estado remoto demonstrar que `usuarios.id` já é necessariamente a
  identidade Auth e separar os IDs não trouxer benefício proporcional;
- não for possível garantir unicidade e integridade de `auth_user_id`;
- a migração exigir perda de dados ou indisponibilidade sem mitigação aceitável;
- outra alternativa apresentar menor risco e menor custo operacional;
- as evidências permanecerem insuficientes para uma decisão segura.
