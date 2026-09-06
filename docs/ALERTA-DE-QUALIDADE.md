# Alerta de qualidade do Comunhão

> **STATUS: ATENÇÃO CONTROLADA**
>
> O projeto está funcional e validado localmente, mas não deve ser considerado
> pronto para uma publicação ampla enquanto os itens críticos abaixo não forem
> concluídos e evidenciados.

## Bloqueadores atuais

- rotação de credenciais históricas expostas;
- matriz de testes RLS no Supabase remoto;
- rate limiting e proteção anti-bot em autenticação/OTP;
- confirmação de HTTPS e headers no domínio de produção;
- revisão das vulnerabilidades transitivas do toolchain (`tar`, `sharp`, `uuid`);
- teste de restauração de backup;
- QA autenticado em dois celulares e tablet.

## Evidência local atual

- lint aprovado;
- 45 arquivos de teste aprovados;
- 210 testes aprovados;
- build web aprovado;
- APK de validação `dev.44` gerado;
- regras de ouro de segurança documentadas.

## Regra de decisão

Nenhuma publicação ampla deve ocorrer com um bloqueador aberto sem:

1. risco explicitamente registrado;
2. responsável definido;
3. prazo de correção;
4. aprovação formal do risco;
5. plano de rollback.

Este alerta deve ser revisado ao final de cada ciclo de release.

## Convenção de sinalização

Toda entrega deve atualizar este alerta e o plano sequencial no mesmo commit ou
pacote de trabalho. O registro precisa indicar:

- `CONCLUÍDO`, quando houver evidência reproduzível;
- `EM ANDAMENTO`, quando a correção local existir, mas faltar validação;
- `BLOQUEADO — DEPENDÊNCIA EXTERNA`, quando depender de Supabase, provedor,
  credencial ou decisão fora do repositório.

Não usar `CONCLUÍDO` apenas porque o código foi escrito: a sinalização exige
teste, evidência e registro da data.
