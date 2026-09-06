# Manual Operacional de Engenharia

**Versão:** 1.0  
**Status:** vigente  
**Projeto:** Comunhão | Oração Constante

## 1. Finalidade

Este manual define como o projeto planeja, decide, executa e verifica mudanças.
Ele não documenta React, Supabase ou regras de produto; essas informações
possuem fontes canônicas próprias.

Esta arquitetura documental está congelada como v1.0. Novas categorias só
devem surgir após uma necessidade observada no uso real.

## 2. Princípios

### 2.1 Documentos descrevem a realidade

Documentos registram fatos, decisões, planos aprovados e evidências observadas;
nunca aspirações apresentadas como estado atual.

- ADR registra uma decisão e seu estado.
- SPEC registra um plano formal submetido ao fluxo de aprovação.
- Auditoria registra evidências observadas e avaliações rastreáveis.
- `.ai/` registra fatos estáveis e normas vigentes.
- Checklist registra uma sequência operacional aprovada.

Ideias soltas pertencem à discussão que as originou, não à documentação
canônica.

### 2.2 Uma única fonte canônica

Cada informação deve possuir uma fonte canônica:

| Informação | Fonte |
|---|---|
| Missão | [`.ai/00-mission.md`](../.ai/00-mission.md) |
| Produto e público | [`.ai/01-product.md`](../.ai/01-product.md) |
| Conceitos do domínio | [`.ai/02-domain.md`](../.ai/02-domain.md) |
| Arquitetura vigente | [`.ai/03-architecture.md`](../.ai/03-architecture.md) |
| Postura de segurança | [`.ai/04-security.md`](../.ai/04-security.md) |
| Orientação para agentes | [`.ai/05-engineering.md`](../.ai/05-engineering.md) |
| Processo de engenharia | [`engineering/manual.md`](manual.md) |
| Plano aprovado | [`specs/`](../specs/) |
| Procedimento operacional | [`checklists/`](../checklists/) |
| Decisão arquitetural | [`adr/`](../adr/) |
| Evidência sanitizada | [`audit/`](../audit/) |

Outros documentos devem referenciar a fonte, não copiar seu conteúdo.

### 2.3 O ambiente é fato; o repositório é declaração

Em auditorias de infraestrutura e banco, o estado observado no ambiente é o
fato operacional. Scripts locais mostram intenção e história até que sejam
reconciliados com esse estado.

O objetivo posterior é tornar o ambiente reproduzível por artefatos canônicos,
mas nunca presumir essa condição sem evidência.

Depois da reconciliação, o projeto deve consolidar uma baseline canônica capaz
de reproduzir o banco conhecido. Até essa baseline existir e ser validada,
scripts SQL locais permanecem história, não prova do estado atual.

### 2.4 Segurança prevalece sobre velocidade

Achados P0 pausam a operação afetada e exigem escalonamento. Urgência não
autoriza ampliar escopo, executar contenção improvisada ou omitir evidências.

## 3. Estrutura documental

```text
.ai/                       contexto normativo curto
engineering/manual.md      processo permanente
specs/                     planos formais
checklists/                execução operacional
adr/                       decisões arquiteturais
audit/reports/             relatórios sanitizados
audit/manifests/           manifestos sanitizados
audit/findings/            matrizes de achados sanitizadas
```

Dados brutos de produção nunca entram no repositório. `audit/raw/` não deve
existir dentro dele.

## 4. Ciclos de vida

### 4.1 SPEC

Estados permitidos:

```text
Draft → Review → Approved → Executing → Completed → Archived
                  └──────────────→ Cancelled
```

- **Draft:** elaboração; não autoriza execução.
- **Review:** pronta para revisão.
- **Approved:** conteúdo aprovado; a autorização operacional ainda depende dos
  gates definidos na própria SPEC.
- **Executing:** execução autorizada e em curso.
- **Completed:** critérios de conclusão satisfeitos.
- **Archived:** preservada como histórico, fora do trabalho ativo.
- **Cancelled:** não será executada; deve registrar o motivo.

Uma SPEC deve conter objetivo, escopo, restrições, riscos, critérios de
conclusão, evidências esperadas e aprovações necessárias.

### 4.2 ADR

Estados permitidos:

```text
Proposed → Accepted → Superseded
         ├─────────→ Deprecated
         └─────────→ Rejected
```

- **Proposed:** proposta explícita, ainda não canônica.
- **Accepted:** decisão vigente.
- **Superseded:** substituída por outro ADR identificado.
- **Deprecated:** deixou de ser recomendada sem substituição direta.
- **Rejected:** considerada e não adotada.

Uma proposta não deve ser descrita como arquitetura vigente. Um ADR aceito deve
registrar contexto, decisão, alternativas e consequências.

### 4.3 Auditoria

Estados permitidos:

```text
Planned → Collected → Sanitized → Reviewed → Closed
```

- **Planned:** coleta definida e não executada.
- **Collected:** evidência bruta coletada fora do repositório.
- **Sanitized:** material revisado e seguro para registro.
- **Reviewed:** achados avaliados.
- **Closed:** relatório e encaminhamentos concluídos.

Relatórios distinguem evidência, inferência e ponto inconclusivo.

### 4.4 Checklist

Checklists possuem versão e status `draft`, `approved` ou `retired`. Marcar
itens não altera seu conteúdo canônico; cada execução deve usar uma cópia fora
do documento-base ou um registro operacional aprovado.

## 5. Quando usar cada documento

- Criar uma **SPEC** para investigação, mudança relevante ou trabalho com
  múltiplos gates.
- Criar um **ADR** quando houver escolha arquitetural duradoura, alternativas
  reais e consequências para trabalhos futuros.
- Criar um **checklist** quando uma operação aprovada exigir ordem, conferência
  de contexto ou prevenção de erro humano.
- Criar uma **auditoria** quando forem coletadas evidências de ambiente,
  segurança, conformidade ou qualidade.
- Atualizar `.ai/` somente quando um fato estável ou norma vigente mudar.

## 6. Mudanças de banco

### 6.1 Autoridade

Nenhuma instrução genérica de implementação autoriza acesso ao banco remoto.
Leitura, escrita, migration, rotação de credenciais e alteração de políticas
são autorizações distintas.

Mudanças remotas exigem:

1. estado remoto reconciliado;
2. SPEC aprovada;
3. migration revisada;
4. plano de validação;
5. estratégia de reversão ou contenção;
6. autorização explícita do responsável pelo ambiente.

### 6.2 Escrita de migrations

Uma migration só pode ser escrita quando:

- o estado-base relevante é conhecido;
- dependências e ordem estão documentadas;
- impacto sobre dados, RLS, grants e funções foi avaliado;
- a mudança é idempotente quando tecnicamente apropriado;
- há testes positivos e negativos proporcionais ao risco.

Escrever uma migration não autoriza executá-la.

### 6.3 Aplicação

Antes da aplicação:

- confirmar projeto e ambiente;
- confirmar backup e capacidade de recuperação;
- revisar diff SQL;
- registrar executor e janela;
- impedir uso acidental de scripts históricos;
- definir sinais de sucesso e interrupção.

Depois da aplicação, validar o estado real e registrar evidência sanitizada.

## 7. Segurança

### 7.1 Severidade

| Nível | Tratamento |
|---|---|
| **P0** | Pausar produção ou operação afetada; escalar imediatamente. |
| **P1** | Corrigir antes da próxima release. |
| **P2** | Corrigir no ciclo atual. |
| **P3** | Planejar como hardening ou dívida técnica. |

Severidade exige evidência. Hipóteses são registradas como inconclusivas até
confirmação.

### 7.2 Revisão obrigatória

Revisão de segurança é obrigatória para:

- autenticação e autorização;
- RLS, grants e funções `SECURITY DEFINER`;
- uso de `service_role`;
- Edge Functions públicas;
- credenciais e rotação;
- upload ou exposição de arquivos;
- recompensas, saldo ou operações financeiras;
- Realtime com dados pessoais;
- mudanças em logs ou observabilidade com dados de usuários.

### 7.3 Segredos

- Segredos nunca são exibidos em documentação, logs de trabalho ou respostas.
- `.env` não é fonte documental.
- Remover um segredo do arquivo não corrige exposição histórica.
- Rotação requer autorização e checklist próprios.
- Chaves públicas, como uma anon key, não substituem RLS e autorização.

### 7.4 Evidências e sanitização

- Evidência bruta de produção permanece fora do repositório.
- `audit/` recebe apenas relatórios, manifestos e achados sanitizados.
- Manifestos preservam origem, horário, executor e integridade sem expor
  identificadores sensíveis.
- Evidência, inferência e ponto inconclusivo devem permanecer distinguíveis.
- O descarte do material bruto faz parte do encerramento da operação.

## 8. Resposta emergencial

Um achado P0 exige:

1. pausar a operação ou release afetada;
2. preservar evidências sem ampliar a coleta;
3. comunicar o responsável pelo ambiente;
4. registrar alcance conhecido e incertezas;
5. aguardar autorização para contenção, retomada ou investigação adicional.

Urgência não autoriza exploração, mudança remota improvisada ou exposição de
segredos. Contenção e correção devem possuir escopo e autoridade explícitos.

## 9. Rollback e recuperação

Toda mudança de produção precisa definir antes da execução:

- estado anterior conhecido;
- condição que dispara rollback;
- responsável pela decisão;
- procedimento de reversão ou contenção;
- validação após recuperação.

Quando rollback não for tecnicamente seguro, a SPEC deve declarar essa condição
e definir uma estratégia de avanço controlado. Backup não substitui um plano de
recuperação validado.

## 10. Releases

Uma release só está pronta quando:

- o escopo aprovado foi implementado;
- lint, testes e build aplicáveis passaram;
- migrations necessárias foram reconciliadas e autorizadas;
- riscos P0/P1 estão resolvidos ou a release foi explicitamente bloqueada;
- documentação canônica afetada foi atualizada;
- existe caminho de rollback ou contenção proporcional ao risco.

Documentação desatualizada não deve ser “corrigida” para afirmar um estado que
ainda não foi verificado.

## 11. Revisão e evolução deste manual

Alterações neste manual precisam indicar:

- problema observado no processo real;
- mudança proposta;
- documentos ou equipes afetadas;
- aprovação responsável;
- nova versão.

Não criar processos preventivos para necessidades meramente hipotéticas.
