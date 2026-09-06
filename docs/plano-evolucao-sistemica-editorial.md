# Evolução sistêmica do Editorial EBD

**Status:** em execução  
**Atualizado em:** 01/09/2026

## Objetivo

Fazer o Estúdio Editorial permanecer rápido, confiável e claro quando houver dezenas ou centenas de lições, muitas fontes RAG e várias revisões por semana. O sistema deve reduzir trabalho remoto repetido sem reduzir a governança editorial, a fidelidade ao RAG ou a revisão humana.

## Princípios operacionais

- Uma ação editorial deve ter estado visível: pendente, salvando, salvo ou falhou.
- Escritas de rascunho são serializadas; uma resposta antiga não pode sobrepor uma edição mais nova.
- Dados grandes são carregados somente quando a tela realmente precisa deles.
- O painel mostra primeiro a próxima decisão editorial, não todos os controles possíveis.
- A IA é assistente de rascunho. RAG, validação, revisão e publicação continuam separados.

## Diagnóstico inicial

| Área | Gargalo identificado | Direção de melhoria |
|---|---|---|
| Biblioteca de lições | A lista traz o documento JSON completo de cada lição. | Criar índice editorial leve e carregar o documento completo somente ao abrir uma lição. |
| Autosave | Edições rápidas podiam disparar persistências concorrentes. | Fila de escrita serializada, debounce e indicação clara de estado. |
| Fontes RAG | A listagem inteira da biblioteca era buscada ao abrir o Estúdio, mesmo sem abrir o seletor. | Carregamento sob demanda, cache curto e invalidação após alteração de fonte. |
| Geração de IA | Uma tentativa pode consumir contexto e saída mesmo quando só um bloco precisa de correção. | Manter reparo por bloco, registrar custo/duração e introduzir orçamento por geração. |
| Mídia | Imagens são enviadas sem derivativos editoriais. | Gerar variantes de capa/lista/detalhe e servir tamanho adequado à superfície. |
| Interface | Biblioteca não mostrava andamento; controles de contexto, dia e publicação disputavam atenção. | Acervo em cards, painel semanal, área diária focada e ações avançadas progressivas. |

## Entregas já aplicadas

1. **Autosave protegido:** debounce de 1,2 s e bloqueio de persistências concorrentes enquanto uma escrita de rascunho está em curso.
2. **Fontes RAG sob demanda:** o seletor busca fontes apenas quando é aberto, reaproveita a resposta por dois minutos e invalida o cache após envio, ativação ou remoção de uma fonte.
3. **Biblioteca editorial em cards:** a tela inicial do Estúdio agora exibe capa, estado, versão, progresso semanal, modo de liberação e ação de abertura de forma responsiva.

## Próximas etapas de implementação

### 1. Índice editorial leve

Criar uma RPC de leitura administrativa que retorne somente `id`, número, título, subtítulo, estado, versão, capa explícita, quantidade de dias prontos e data de atualização. O documento completo será solicitado por ID ao abrir a lição.

Resultado: a biblioteca continua rápida mesmo com 100+ lições e documentos longos.

### 2. Fila de persistência editorial

Extrair a lógica de salvamento para um pequeno coordenador de escrita por lição. Ele deve consolidar alterações durante a digitação, garantir ordem, tentar novamente erros transitórios e nunca publicar automaticamente.

Resultado: menos gravações, nenhuma corrida de versões e recuperação clara após falha de rede.

### 3. Observabilidade de geração

Exibir no Estúdio, por execução, provedor, modelo, duração, fontes RAG usadas, blocos solicitados, reparos e motivo de falha seguro. O dado técnico completo fica apenas no log administrativo.

Resultado: diagnóstico rápido de limite, cota, contexto insuficiente ou bloco rejeitado.

### 4. Orçamento e fila de IA

Aplicar uma fila por lição/dia com idempotência, impedir gerações duplicadas e registrar orçamento estimado de entrada/saída. A interface deve informar quando uma geração está em andamento e evitar cliques repetidos.

Resultado: menos custo, menos 429/502 induzidos por repetição e melhor previsibilidade editorial.

### 5. Mídia editorial responsiva

Adicionar processamento de imagem para tamanhos de biblioteca, capa e conteúdo; salvar metadados de dimensões e `altText` obrigatório para imagens publicadas.

Resultado: cards e EBD pública carregam imagens menores, com melhor desempenho móvel.

### 6. Workspace editorial por camadas

Consolidar a navegação em três níveis:

- **Semana:** capa, identidade, progresso, fontes e estado de revisão.
- **Dia:** título, blocos, IA e prévia do jovem.
- **Operações:** histórico, publicação, liberação e arquivamento.

Resultado: menos rolagem, hierarquia visual mais clara em celular, tablet e desktop.

## Critérios de aceite

- Abrir a biblioteca não deve carregar documentos completos nem a lista RAG inteira.
- Nunca há duas escritas de rascunho simultâneas para a mesma lição.
- Toda geração tem rastreabilidade por execução e correlação de erro.
- Conteúdo, revisão e publicação continuam bloqueados pelas mesmas permissões existentes.
- O layout continua utilizável a partir de 320 px e se reorganiza, sem apenas esticar, em tablets e desktop.
