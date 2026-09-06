# Diretriz da Home — Presença, Familiaridade e Engajamento Significativo

**Data:** 09/08/2026  
**Status:** em execução — lote imediato iniciado em 09/08/2026  
**Origem:** avaliações externas de interface reunidas pelo responsável do produto, confrontadas com o estado atual do código

## 1. Objetivo

Este documento reúne as avaliações recebidas sobre a Home, elimina repetições,
explicita contradições e separa o que deve ser:

1. corrigido agora;
2. validado com pessoas reais;
3. planejado para médio prazo;
4. mantido como direção de longo prazo;
5. rejeitado por conflito com o propósito do Comunhão.

O documento não trata retenção como fim. O norte adotado é:

> **O objetivo não é maximizar tempo de tela. É aumentar a quantidade e a
> qualidade de ações comunitárias significativas.**

## 2. Limites desta consolidação

- As avaliações foram produzidas sobre capturas de versões diferentes da Home.
- Alguns textos descrevem componentes que já foram removidos ou reorganizados.
- Afirmações sobre neurociência, dopamina, FOMO e prazos como "21 dias" não
  foram verificadas nesta consolidação e não devem ser tratadas como evidência.
- Regras como 70/20/10 são heurísticas operacionais, não leis científicas.
- Sugestões visuais só entram no produto quando preservam privacidade, autonomia,
  honestidade e responsabilidade pastoral.

## 3. Estado atual da Home

A Home atual possui esta arquitetura principal:

1. identidade e saudação;
2. estados contextuais de retomada e convites;
3. Missão da Semana, com parceiro e estado "Orando por você";
4. dois caminhos lado a lado: convite direto e Sala de Oração;
5. pessoas disponíveis agora;
6. Jornada de Serviço.

Já foram implementados:

- texto operacional mínimo de 13 px nos componentes revisados;
- alvos de toque de pelo menos 44 x 44 px na lista de pessoas;
- carrossel horizontal com continuidade visual;
- contagem explícita de pessoas disponíveis;
- tokens de superfície, raio e tipografia;
- componentes de interação do Santuário Contemporâneo;
- primeira família de ícones temáticos próprios;
- Sala de Oração como destino do segundo CTA da missão;
- disponibilidade temporária centralizada na Sala, sem switch permanente na Home.

Consequentemente, recomendações sobre o antigo bloco "Cuidado em oração",
o antigo switch da Home ou o layout anterior de três entradas não devem ser
reaplicadas literalmente.

## 4. Consensos aproveitáveis

### 4.1 A Home deve contar uma história, não listar recursos

O consenso mais valioso é organizar a experiência como progressão humana:

**Eu → necessidade/propósito → outra pessoa → comunidade → participação → memória**

A arquitetura deve permanecer estável. Personalização pode mudar o conteúdo
dentro das regiões, mas não deve reorganizar a Home por algoritmo.

### 4.2 Presença é mais importante que volume de conteúdo

O Comunhão não deve prometer "mais coisas para ver". Deve comunicar:

> **Existem pessoas aqui com você e existe uma forma concreta de cuidar ou ser cuidado.**

Sinais adequados:

- pessoas realmente disponíveis;
- pedidos reais aguardando acolhimento;
- uma intercessão real em andamento;
- convite real da dupla semanal;
- estado vazio honesto quando ninguém estiver disponível.

### 4.3 Estrutura estável e atmosfera viva

O sistema visual deve ter duas camadas:

#### Arquitetura

Quase invariável:

- grid, espaçamento e ordem;
- tipografia;
- raios e superfícies;
- navegação;
- hierarquia de ações;
- convenções de toque e estados;
- sistema de ícones.

#### Atmosfera

Variável com moderação:

- conteúdo da missão;
- pessoas presentes;
- mensagens de acolhimento;
- luminosidade discreta;
- microinterações;
- um elemento extraordinário por vez.

Como regra de contenção, pode-se usar a heurística:

- 70% invariantes;
- 20% contexto;
- 10% novidade.

### 4.4 Identidade reconhecível sem depender da logo

As âncoras recomendadas e compatíveis com o produto são:

- verde profundo como ambiente;
- bronze/dourado como marcação semântica, não como CTA universal;
- creme/pergaminho para texto e luz;
- Fraunces em títulos editoriais e Inter em operações;
- rostos como sinal de presença humana;
- ícones temáticos próprios;
- vocabulário: Jornada, Missão, Círculo, Comunidade, Intercessão,
  Presença, Caminho e Serviço.

Roxo ou outra cor excepcional pode existir em uma arte, pessoa, campanha ou
missão específica. Não deve virar uma nova cor de ação do sistema.

### 4.5 Legibilidade e acessibilidade são estruturais

Regras consolidadas:

- texto operacional não depende apenas de 11–12 px e baixo contraste;
- alvos de toque mínimos de 44 x 44 px;
- nomes reais e longos devem fazer parte dos testes;
- truncamento deve ser deliberado, nunca resultado de colisão;
- contraste deve ser medido nos dois temas;
- brilho baixo, tela pequena e fonte ampliada devem fazer parte da validação;
- estados de loading, erro e vazio obedecem ao mesmo DS.

## 5. Divergências e decisões

| Tema | Avaliações | Decisão |
|---|---|---|
| Um ou vários acentos | Algumas pedem acento único; outras sugerem azul, roxo, âmbar e glows | Interface usa verde + bronze/creme. Cores adicionais ficam restritas a conteúdo excepcional, nunca a controles globais. |
| CTA da Home | As avaliações citam versões com "Preciso", "Levantar a mão" e "Sala" | Estado aprovado atual: "Convidar {dupla}" + "Sala de Oração" no mesmo contexto semanal. Validar compreensão antes de mudar novamente. |
| Disponibilidade | Algumas defendem switch permanente na Home | Disponibilidade temporária fica na Sala de Oração, com tempo e modalidade. A Home apenas sinaliza presença real. |
| Movimento | Algumas pedem pulsos, auras, partículas e avatares animados | Movimento é funcional, discreto e respeita `prefers-reduced-motion`. Não animar tudo para simular atividade. |
| Gamificação | Algumas celebram minutos, XP e recompensa visual; outras rejeitam competição espiritual | Kesef pode existir como economia transparente, mas oração e cuidado não viram ranking, streak punitivo ou caça-níquel. |
| Densidade da missão | Uma avaliação valoriza todos os estados; outra considera o card carregado | Manter um card, mas revelar estados conforme contexto. Não empilhar informação que não exige ação naquele momento. |
| Jornada no rodapé | Avaliada como assinatura valiosa e também como elemento solto | Manter discreta agora. No médio prazo, conectá-la a memória real da participação. |

## 6. Correções imediatas

### P0 — Integridade de dados e linguagem

#### Corrigir "min em comunhão"

**Concluído em 09/08/2026.** A Home deixou de apresentar saldo de Kesef ou
pontos como minutos. Até existir uma fonte real de duração e período, o local
usa a mensagem não quantitativa "Seu espaço de cuidado e comunhão". A consulta
de saldo que alimentava a falsa métrica também foi removida do Dashboard.

No estado atual, `tempoComunhao` recebe `kesefSaldo.saldo` ou
`pontos_comunhao`. Portanto, o texto apresentado como minutos não representa
tempo medido.

Decidir entre:

1. implementar uma fonte real de duração e declarar o período (hoje/semana);
2. remover a unidade de minutos e apresentar o dado pelo seu significado real;
3. ocultar temporariamente a métrica.

Não corrigir apenas o texto sem corrigir a semântica do dado.

### P1 — Robustez visual da Home atual

**Primeiro lote concluído em 09/08/2026:**

- saudação deixou de truncar o nome e agora permite quebra segura;
- nomes das pessoas ganharam duas linhas e largura ligeiramente maior;
- continuidade horizontal recebeu fade lateral discreto;
- alvos de toque de 44 px foram preservados;
- tokens e classes `home-prayer-*` sem consumidores foram removidos.
- tokens de texto secundário, muted, acento e celebração passaram a ser
  verificados automaticamente com contraste mínimo de 4,5:1 sobre as
  superfícies principais nos temas claro e escuro;
- os tokens muted e celebração do tema claro foram corrigidos após a medição;
- o cabeçalho ganhou adaptação adicional abaixo de 360 px, reduzindo avatar,
  espaçamento e título sem eliminar conteúdo.

**Ainda requer validação humana em dispositivos:** fonte ampliada, leitura sob
luz ambiente e compreensão da hierarquia dos dois CTAs. A conformidade de cor
base agora possui proteção automatizada, mas não substitui o teste perceptivo.

- testar o cabeçalho com nomes longos, fonte ampliada e largura mínima suportada;
- impedir colisão entre saudação e utilitários flutuantes;
- revisar truncamentos na lista usando nomes reais;
- adicionar fade lateral sutil ao carrossel, se o corte parcial não comunicar
  deslocamento com clareza;
- medir contraste de texto secundário, nomes e botão secundário nos dois temas;
- manter diferença visual clara entre "Convidar" e "Sala", sem alterar dimensão;
- remover tokens `home-prayer-*` que deixaram de ter consumidor, caso a revisão
  confirme que não fazem mais parte do sistema.

### P1 — Coerência documental

**Concluído em 09/08/2026 nas referências vigentes.** O ADR visual e o Design
System de interações agora registram os dois destinos atuais da Home, a
disponibilidade temporária dentro da Sala, a família de ícones próprios e a
proibição de presença simulada. Documentos de sessão permanecem como histórico
e não devem prevalecer sobre essas referências.

Existem documentos históricos conflitantes. A referência normativa atual
deve ser atualizada para refletir:

- CTA `care` como Sala de Oração, não necessariamente "Levantar a mão";
- família de ícones temáticos próprios;
- bronze restrito a foco, celebração e estrutura;
- disponibilidade temporária dentro da Sala;
- separação entre arquitetura e atmosfera.

## 7. Próximo passo recomendado

O próximo passo não é adicionar outro componente. É congelar uma candidata
de Home e validá-la em uso real.

### Ciclo de 1–2 semanas

1. concluir P0 e P1;
2. selecionar 5–8 pessoas com perfis e idades diferentes;
3. executar tarefas sem explicar a interface:
   - identificar quem é a dupla semanal;
   - convidar a dupla;
   - entrar na Sala de Oração;
   - localizar uma pessoa disponível;
   - explicar o significado de "Orando por você";
4. observar compreensão, hesitação, erros e linguagem usada;
5. testar reconhecimento dos novos ícones com legenda;
6. registrar apenas problemas repetidos por mais de uma pessoa;
7. corrigir e congelar a Home como referência DS v1.

### Critérios de aprovação

- a pessoa distingue "Convidar" de "Sala" sem explicação;
- entende se alguém está realmente disponível;
- não interpreta Kesef/pontos como minutos;
- encontra as duas ações principais rapidamente;
- reconhece ao menos 80% dos ícones temáticos no contexto antes de considerar
  remoção de legendas;
- nenhuma função essencial depende apenas de cor;
- nenhum texto ou controle colide com fonte ampliada.

## 8. Médio prazo

### 8.1 PresenceCard e Pulso Comunitário real

Criar uma primitiva de presença reutilizável para Home e Sala:

- quantidade real de pessoas disponíveis;
- modalidade e expiração quando pertinente;
- transição discreta quando o estado real muda;
- estado vazio acolhedor;
- nenhum contador inflado.

O "pulso" pode mostrar, de forma agregada e privada:

- pedidos atualmente acolhidos;
- pessoas temporariamente disponíveis;
- intercessões confirmadas recentemente.

Evitar expor quem pediu oração ou formar uma rede visual de relações privadas.

### 8.2 Memória, não competição

Evoluir Jornada de Serviço para registrar:

- missão semanal concluída;
- pedido acolhido;
- oração confirmada;
- acompanhamento realizado;
- marcos pessoais privados.

Não publicar ranking de espiritualidade nem comparar volume de oração.

### 8.3 Resumo semanal privado

Explorar um encerramento simples:

- "Você e sua dupla caminharam juntos esta semana";
- pessoas cuidadas e cuidados recebidos, com privacidade;
- continuidade sugerida sem culpa;
- opção de dispensar e controlar lembretes.

### 8.4 Sistema de ícones

- documentar grid, traço, cantos, metáforas e tamanhos;
- testar reconhecimento antes de ocultar legendas;
- manter texto em navegação e ações críticas;
- usar ícone sem legenda apenas quando houver reconhecimento demonstrado,
  `aria-label` e contexto inequívoco.

## 9. Longo prazo

### 9.1 Sistema de Presença e Familiaridade

Formalizar um sistema ambiental com cinco motores:

1. **Familiaridade:** reconheço este lugar;
2. **Presença:** existem pessoas aqui;
3. **Pertencimento:** faço parte desta comunidade;
4. **Propósito:** existe uma ação significativa possível;
5. **Memória:** minha participação deixou uma marca privada e honesta.

O ciclo desejado é:

**reconhecimento → presença → significado → ação → memória → retorno**

### 9.2 Atmosfera temporal

Pode-se testar luminosidade e microcopy por período do dia, desde que:

- a arquitetura não mude;
- o tema escolhido pelo usuário seja respeitado;
- não haja promessa de atividade inexistente;
- o efeito seja discreto e desligável;
- desempenho e acessibilidade sejam preservados.

Não adotar, sem validação, paletas azuis/roxas completamente diferentes
para cada período. A variação deve ocorrer dentro da identidade existente.

### 9.3 Identidade externa derivada do produto

Os ativos reconhecíveis do aplicativo podem migrar para:

- notificações;
- comunicação da EBD;
- campanhas e eventos;
- cartazes e projeções;
- materiais físicos;
- redes sociais.

A comunicação externa deve usar os mesmos símbolos, cores, tipografia e
vocabulário do produto, em vez de inventar uma campanha visual desconectada.

## 10. Sugestões a validar antes de adotar

| Sugestão | Hipótese a validar | Risco |
|---|---|---|
| Variação ambiental por horário | Aumenta acolhimento sem confundir o tema | Pode parecer decorativa ou inconsistente |
| Chama como motivo de presença | Comunica vida sem julgamento | Pode ser interpretada como streak ou desempenho espiritual |
| Resumo semanal | Cria memória e continuidade | Pode soar como cobrança ou expor informação sensível |
| Pulso comunitário | Aumenta percepção de comunidade real | Contadores baixos podem comunicar abandono; exige bom estado vazio |
| CTA de reciprocidade | Facilita cuidar depois de ser cuidado | Não pode sugerir dívida moral |
| Arte excepcional da missão | Cria novidade controlada | Pode competir com funções se houver mais de uma por tela |
| Legendas removidas dos ícones | Reduz ruído após aprendizado | Prejudica descoberta e acessibilidade se removida cedo |

## 11. Recomendações rejeitadas

Não fazem parte do norte do produto:

- FOMO espiritual ou mensagens como "você está perdendo a comunhão";
- culpa: "não deixe sua dupla esperando";
- presença, números ou atividade simulada;
- urgência e escassez artificiais;
- streak com perda, punição ou vergonha;
- ranking público de quem ora mais;
- recompensas variáveis semelhantes a caça-níquel;
- aumentar tempo de tela como objetivo;
- fazer minutos crescerem apenas por permanecer no aplicativo;
- glow antecipatório baseado no horário habitual para induzir uso;
- desbloquear decoração por sequência de dias como pressão comportamental;
- grafo público de intercessão entre pessoas;
- microanimações constantes em todos os avatares;
- "cidade iluminada", mapa ou estrelas sem função clara e dados reais;
- neomorfismo que reduza contraste ou affordance;
- esconder informação importante em tooltip no mobile;
- reorganizar a Home dinamicamente por algoritmo.

## 12. Métricas recomendadas

### Produto e comunidade

- taxa de ação significativa por visita;
- pedido criado → pedido acolhido;
- convite enviado → convite aceito;
- intercessão acolhida → intercessão confirmada;
- acompanhamento realizado;
- reciprocidade ao longo do tempo, sem exposição pública;
- retorno ao aplicativo seguido de ação significativa;
- sessões interrompidas recuperadas.

### UX e identidade

- tempo para compreender a Home;
- taxa de conclusão das tarefas principais;
- erros de escolha entre convite e Sala;
- percepção de presença comunitária;
- reconhecimento do Comunhão sem a logo;
- reconhecimento contextual dos ícones;
- legibilidade e acessibilidade nos dois temas.

### Não usar como objetivo isolado

- tempo bruto de sessão;
- quantidade de telas abertas;
- cliques sem resultado comunitário;
- volume de notificações;
- retorno motivado por culpa ou perda.

## 13. Backlog consolidado

| Horizonte | Item | Resultado esperado |
|---|---|---|
| Agora | Corrigir a semântica de "min em comunhão" | Dado e linguagem confiáveis |
| Agora | Testar header, nomes longos e fonte ampliada | Eliminar truncamento estrutural |
| Agora | Medir contraste e alvos nos dois temas | Fechar requisitos básicos de acessibilidade |
| Agora | Revisar peso de "Convidar" versus "Sala" | Hierarquia compreensível |
| Agora | Limpar tokens sem consumidor e atualizar DS | Evitar deriva documental |
| Próximo | Teste moderado com 5–8 pessoas | Validar linguagem, ações e ícones |
| Próximo | Congelar Home DS v1 | Referência estável para outras abas |
| Médio | PresenceCard e pulso com dados reais | Comunidade percebida sem feed infinito |
| Médio | Memória privada da Jornada | Continuidade sem competição |
| Médio | Resumo semanal opcional | Encerramento e acompanhamento |
| Médio | Biblioteca completa de ícones | Identidade proprietária consistente |
| Longo | Atmosfera temporal validada | Ambiente vivo sem perder familiaridade |
| Longo | Sistema de Presença e Familiaridade | Norte integrado de produto e marca |
| Longo | Identidade aplicada fora do app | Reconhecimento consistente do ecossistema |

## 14. Decisão final

A Home não precisa de uma reformulação nem de novos blocos neste momento.
Ela precisa de integridade de dados, robustez responsiva, validação humana e
disciplina de sistema.

O próximo salto do Comunhão não é parecer mais "engajador". É tornar-se um
lugar digital reconhecível onde presença real, cuidado e memória conduzem a
ações significativas sem manipulação.
