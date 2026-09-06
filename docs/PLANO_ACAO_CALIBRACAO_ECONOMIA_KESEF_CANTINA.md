# Plano de ação — Calibração da economia Kesef para a Cantina

**Data:** 11/08/2026  
**Responsável de produto:** Charles  
**Estado:** E0/E1 instrumentados localmente; dados remotos ainda não medidos  
**Base:** ADR-003, SPEC-003 e ledger Kesef existente

## Objetivo

Definir valores de resgate sustentáveis e acessíveis sem criar equivalência com
reais. Nenhum item da Cantina deve receber valor definitivo antes de medir emissão,
distribuição, saldo, estoque, frequência dos eventos e comportamento do piloto.

Este plano não procura descobrir quanto um produto “vale em dinheiro”. Ele procura
responder quantas semanas de participação, em condições reais, devem permitir que
um membro resgate determinado benefício sem esgotar o estoque ou excluir usuários
ocasionais.

## Princípios obrigatórios

1. Kesef não possui cotação em reais e custo financeiro do item não entra na fórmula.
2. Mediana e percentis têm prioridade sobre média, pois grandes saldos distorcem a
   leitura.
3. Usuários ativos e ocasionais são analisados separadamente.
4. Ajustes administrativos, estornos e dados sintéticos são classificados e não
   contam como emissão regular.
5. Valores iniciais são hipóteses de piloto, não tabela permanente.
6. Nenhum relatório operacional expõe saldo nominal de membro sem necessidade e
   permissão específica; a análise padrão é agregada.
7. Estoque protegido e acesso razoável têm prioridade sobre maximizar o consumo de
   Kesef.

## Métricas e definições

| Métrica | Definição operacional | Decisão apoiada |
|---|---|---|
| Emissão semanal | Soma dos créditos regulares por membro e semana, excluindo ajustes, estornos e testes | Faixa inicial de valores |
| Emissão mediana | Mediana da emissão semanal individual, com P25, P75 e P90 | Acessibilidade real |
| Ativo | Membro com ao menos uma atividade elegível em 2 das últimas 4 semanas | Capacidade recorrente |
| Ocasional | Membro com atividade elegível em somente 1 das últimas 4 semanas | Proteção contra exclusão |
| Saldo | Soma canônica do ledger por membro em uma data de corte | Poder de resgate existente |
| Concentração | Participação do top 1%, 5%, 10% e 20% no saldo; Gini como apoio | Limites por pessoa e risco de captura |
| Estoque ofertado | Unidades confirmadas por item e evento | Capacidade máxima de atendimento |
| Frequência | Eventos de Cantina por mês e intervalo médio | Pressão de consumo |
| Intenção de resgate | Percentual de elegíveis que declara/solicita reserva | Previsão de demanda |
| Resgate efetivo | Entregas ÷ reservas válidas e resgates imediatos iniciados | Ajuste de oferta e preço |
| Cobertura de estoque | Estoque disponível ÷ demanda estimada | Risco de ruptura |
| Velocidade | Kesef debitado em resgates ÷ saldo médio circulante no período | Ritmo de retirada de circulação |
| Acessibilidade | Semanas de emissão mediana necessárias para um resgate | Experiência do membro |

### Segmentações mínimas

- ativo recorrente, ativo recente e ocasional;
- membro com saldo zero, baixo, intermediário e alto, por percentis;
- novos membros, sem revelar identidade no relatório;
- origem do crédito (`oração`, EBD, Mural, indicação etc.);
- evento, item, horário, reserva antecipada e resgate na hora;
- titular retirando e representante retirando, apenas em agregado.

## Indicadores de decisão

### Semanas de participação

```text
semanas_para_resgate = valor_kesef_do_item / emissão_semanal_mediana_do_segmento
```

O valor deve ser analisado para ativos e ocasionais. A decisão não pode usar apenas
o membro médio geral.

### Demanda estimada

```text
demanda_estimada = membros_elegíveis × intenção_de_resgate × quantidade_média
```

Quando não houver histórico, utilizar três cenários: conservador, provável e pico.

### Cobertura e ruptura

```text
cobertura = estoque_confirmado / demanda_estimada
risco_de_ruptura = probabilidade de demanda superar estoque
```

Preço não é o único controle. Limite por membro, cota de reservas, estoque para
resgate na hora e fila de espera devem ser avaliados antes de elevar valores.

### Circulação

```text
velocidade_no_período = Kesef debitado / saldo médio agregado
taxa_de_drenagem = Kesef debitado / Kesef emitido no mesmo período
```

Velocidade muito baixa indica benefícios inacessíveis ou pouco atraentes. Drenagem
muito alta pode reduzir saldos rapidamente e prejudicar eventos seguintes.

## Sequência de execução

### E0 — Governança e qualidade dos dados

**Responsáveis:** Charles + administrador técnico  
**Duração sugerida:** 2 dias

- [ ] Inventariar todos os tipos de `kesef_ledger` e classificar crédito regular,
  débito, ajuste, estorno e teste.
- [ ] Confirmar que contas sintéticas, equipe técnica e duplicidades podem ser
  excluídas da amostra sem apagar o histórico.
- [ ] Definir janela inicial: recomendação de 8 a 12 semanas; registrar lacunas se
  o histórico útil for menor.
- [ ] Fixar definições de ativo/ocasional e versão da metodologia.
- [ ] Restringir consultas detalhadas a `economy.read`; publicar apenas agregados.

**Gate E0:** ledger classificado, período confiável e dicionário de dados aprovado.

**Implementação local em 11/08/2026:** a RPC agregada classifica como emissão
regular os tipos conhecidos (`oracao`, `licao`, `quiz_acerto`, bônus de streak e
`indicacao`) e expõe a composição por tipo para revisão. O gate permanece aberto
até executar contra o ambiente remoto e auditar os tipos efetivamente existentes.

### E1 — Linha de base econômica

**Responsáveis:** administrador técnico produz; Charles interpreta  
**Duração sugerida:** 2 a 3 dias

- [ ] Calcular emissão semanal média, mediana, P25, P75 e P90.
- [ ] Comparar ativos recorrentes, ativos recentes e ocasionais.
- [ ] Calcular distribuição de saldos e concentração no top 1%, 5%, 10% e 20%.
- [ ] Mapear frequência e volume das origens de emissão.
- [ ] Medir débitos históricos do Tesouro separadamente, sem assumir que seu padrão
  será igual ao da Cantina.
- [ ] Criar fotografia agregada versionada com data de corte.

**Gate E1:** painel base revisado, sem dados sintéticos ou ajustes contaminando a
emissão regular.

**Implementação local em 11/08/2026:** painel Admin criado com mediana/P25/P75,
segmentos, saldo mediano, concentração top 10% e taxa de drenagem. Ainda não há
resultado real até a migration ser aplicada e consultada remotamente.

### E2 — Planejamento de oferta e demanda

**Responsáveis:** Charles + responsáveis pelo evento  
**Duração sugerida:** antes de cada piloto

- [ ] Registrar estoque confirmado, estoque de segurança e limite máximo reservável.
- [ ] Informar frequência prevista dos eventos nos próximos 60 dias.
- [ ] Coletar intenção de resgate sem provisionar Kesef, por enquete curta ou lista
  de interesse, antes de abrir reservas reais.
- [ ] Projetar demanda conservadora, provável e de pico por item.
- [ ] Definir parcela do estoque para reserva antecipada e para resgate na hora.
- [ ] Definir limite inicial por membro para itens escassos.

**Gate E2:** estoque físico confirmado e cobertura calculada nos três cenários.

### E3 — Faixas experimentais de Kesef

**Responsáveis:** Charles propõe; liderança aprova  
**Duração sugerida:** 1 reunião de decisão

- [ ] Escolher uma meta explícita de semanas de participação para item simples,
  médio e escasso.
- [ ] Produzir de duas a três faixas hipotéticas por item usando emissão mediana dos
  segmentos; não usar custo em reais.
- [ ] Simular quem consegue resgatar hoje em cada faixa, por percentis de saldo.
- [ ] Simular demanda, ruptura, Kesef drenado e saldo restante após o evento.
- [ ] Preferir limites/cotas quando a escassez for física; não transformar preço
  alto em mecanismo permanente de exclusão.
- [ ] Registrar hipótese, justificativa e data de validade dos valores escolhidos.

**Gate E3:** tabela experimental aprovada para um evento, com limites e rollback.

### E4 — Piloto controlado

**Responsáveis:** Charles + operador(es) da Cantina  
**Duração sugerida:** 1 a 3 eventos comparáveis

- [ ] Começar com poucos itens, estoque conhecido e sem mudança de valor durante
  reservas abertas.
- [ ] Medir visualização, tentativa, reserva, cancelamento, retirada, ausência,
  doação e ruptura.
- [ ] Registrar tempo de fila e falhas de QR/NFC separadamente da decisão econômica.
- [ ] Não aumentar emissão artificialmente para “fazer o preço funcionar”.
- [ ] Manter regra de ausência e cancelamento estável e informada.
- [ ] Coletar feedback anônimo sobre acessibilidade e clareza.

**Gate E4:** reconciliação entre estoque, reservas, entregas, ledger e holds; nenhuma
divergência material sem explicação.

### E5 — Revisão e ciclo contínuo

**Responsáveis:** Charles + liderança  
**Cadência sugerida:** após cada evento e revisão consolidada mensal

- [ ] Comparar previsto versus realizado por segmento e item.
- [ ] Investigar ruptura, sobra, baixa adesão e concentração antes de alterar valor.
- [ ] Mudar no máximo uma variável econômica relevante por ciclo sempre que possível.
- [ ] Versionar a tabela; valores novos afetam apenas novas reservas.
- [ ] Recalibrar quando emissão, frequência, estoque ou distribuição mudarem de
  forma material.
- [ ] Suspender novos anúncios se o ledger ou estoque não reconciliar.

## Painel mínimo para Charles

O Admin deve apresentar somente agregados por padrão:

- emissão semanal mediana e P25/P75 por segmento;
- membros ativos e ocasionais no período;
- saldo mediano e concentração top 10%;
- estoque, reservas, fila de espera e cobertura por item;
- percentual de resgate, cancelamento, ausência e ruptura;
- Kesef provisionado, liquidado e liberado;
- velocidade e taxa de drenagem;
- comparação entre hipótese e resultado do evento.

Não exibir ranking de “mais ricos em Kesef”. Consulta nominal deve ser excepcional,
justificada, auditada e limitada a quem possui finalidade operacional.

## Critérios iniciais de alerta

São sinais para pausar e revisar, não metas automáticas:

- estoque esgotado antes de a maior parte dos elegíveis ter oportunidade de acesso;
- reservas concentradas em pequena parcela dos membros;
- ocasionais sem capacidade realista de alcançar qualquer item;
- sobra elevada acompanhada de muitos membros com saldo insuficiente;
- aumento de ausências após mudança de valor ou regra;
- drenagem de Kesef que comprometa eventos seguintes;
- divergência entre holds, ledger, reservas e estoque físico;
- necessidade recorrente de ajustes manuais de saldo.

Os limites numéricos desses alertas serão definidos após E1. Fixá-los antes de
conhecer a distribuição criaria precisão artificial.

## Definition of Done

- fontes e tipos do ledger classificados;
- janela de dados e metodologia versionadas;
- emissão e saldo analisados por mediana, percentis e segmento;
- concentração e velocidade calculadas;
- estoque e frequência dos eventos confirmados;
- demanda simulada em três cenários;
- faixas experimentais documentadas sem referência a reais;
- piloto reconciliado e revisado;
- valores publicados com validade, responsável e histórico de alteração;
- painel agregado disponível para Charles;
- processo mensal de recalibração definido.
