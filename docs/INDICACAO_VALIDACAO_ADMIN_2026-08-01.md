# Programa de indicação com validação administrativa

Implantado em 01/08/2026 no projeto Supabase
`csxrhvgfnkqmkehgmnkp` pela migration
`20260801223000_indicacao_validacao_admin_patente.sql`.

## Regra vigente

- todos os usuários possuem código de indicação;
- códigos ausentes foram gerados retroativamente;
- informar o código no cadastro apenas registra o vínculo;
- cadastro e primeira oração não creditam bônus;
- o bônus ocorre somente na validação do novo membro por uma conta com a
  permissão server-side `people.manage`;
- validação e crédito são atômicos e idempotentes;
- a ação exige motivo e entra em `admin_audit_log`;
- o bônus respeita o limite diário de 60 Kesef e nunca é reduzido
  silenciosamente: se não couber integralmente, a validação deve ser repetida
  depois.

## Progressão

| Patente do indicador no momento da validação | Bônus |
|---|---:|
| Servo Fiel | 5 Kesef |
| Guardião | 10 Kesef |
| Intercessor | 15 Kesef |
| Atalaia | 20 Kesef |
| Discipulador | 25 Kesef |
| Missionário | 30 Kesef |
| Conselheiro | 35 Kesef |
| Pacificador | 40 Kesef |

## Correções estruturais

As RPCs antigas usavam `auth.uid()` como se fosse `usuarios.id`. O fluxo novo
usa o contrato canônico `auth.uid() → usuarios.auth_user_id → usuarios.id`.
A referência idempotente também foi alinhada à coluna atual
`kesef_ledger.referencia_id`.

## Interface

- Carteira: mantém o card de Charles como modelo, agora para todos os membros;
- o texto informa o bônus correspondente à patente atual;
- Administração → Pessoas e acessos: `Gerenciar pessoa` → `Validar membro`;
- pessoas já validadas recebem o selo `Validado` e não podem ser validadas de
  novo.

## Validação técnica

- 25 arquivos de teste e 113 testes aprovados;
- lint sem erros, com warnings preexistentes;
- build Vite/PWA concluído;
- dry-run remoto aprovado;
- migration aplicada com sucesso;
- 25 migrations locais e remotas alinhadas;
- dump estrutural confirmou tabela, RPCs, ACLs e regra de limite diário.
