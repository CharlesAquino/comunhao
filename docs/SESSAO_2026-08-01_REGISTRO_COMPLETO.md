# Registro consolidado da sessão — 01/08/2026

> Escopo: decisões, diagnósticos, implementações e validações realizadas na
> sessão de trabalho de 01/08/2026. O documento não contém segredos, tokens,
> chaves ou dados pessoais sensíveis. Relatos de teste feitos pelo responsável
> são identificados como validação externa, não como evidência automatizada.

## 1. Contextualização e fonte ativa

- O projeto ativo foi identificado em `app/`.
- Versões anteriores e paralelas foram tratadas como material temporário de
  consulta e linha do tempo, nunca como fonte para build, migration ou release.
- O conteúdo útil das versões históricas foi reconciliado nas normativas ativas
  de banco, Design System, Skills, agentes, RAG, EBD Editorial e Genesis.
- O responsável retirou a pasta histórica depois da consolidação.
- `CONTEXTO_MESTRE_IMPLEMENTACAO.md` permaneceu como contexto consolidado, sem
  substituir as documentações fundadoras do projeto.

## 2. Execução web, Android e estabilidade

- O projeto foi executado para testes em webapp e Android.
- Foi produzido APK para instalação externa pelo Google Drive.
- O responsável relatou que o login abria, o preview era exibido e o app fechava
  no aparelho; capturas do relatório de falha do MIUI foram usadas como contexto.
- Foi diagnosticada incompatibilidade de `crypto.randomUUID` em runtimes sem a
  API disponível; o projeto passou a usar geração de identificador compatível.
- Falhas `net::ERR_CONNECTION_CLOSED` e respostas de autenticação do Supabase
  foram separadas de falhas de renderização do React.

## 3. Mural social

- O cabeçalho fixo e excessivamente informativo do Mural foi simplificado para
  devolver prioridade visual às publicações.
- O botão de criação foi retirado da página inicial congestionada e colocado no
  compositor de publicação, conforme o fluxo indicado pelo responsável.
- Cabeçalhos e rodapés do compositor foram corrigidos para não ficarem atrás das
  navegações superior e inferior.
- Os botões de tipo de publicação — Pedido, Testemunho, Reflexão e Gratidão —
  foram reconciliados com o padrão de componentes do projeto.
- “No que podemos interceder?” foi tratado como ação, seguindo a linguagem do
  menu, e não como campo de busca.
- O fluxo de foto no Mural foi analisado, migrado e corrigido para relacionar a
  mídia enviada à publicação exibida.
- O sheet de comentários foi movido para uma camada global, com safe area e
  compositor fora da navegação inferior. O responsável confirmou a correção no
  dispositivo.

## 4. Design System

- Foi realizada auditoria baseada nas documentações Genesis, Agents e
  identidade visual.
- Foi reafirmado que o Design System é contrato e não pode ser substituído por
  estilos inventados durante implementações pontuais.
- A direção aprovada é limpa, refinada, serena e menos genérica, preservando a
  tipografia e a identidade “Santuário Contemporâneo”.
- Botões canônicos e tokens existentes devem ser reutilizados; documentações
  base não podem ser sobrescritas para justificar divergências.
- Temas claro e escuro são requisitos equivalentes, não uma adaptação opcional.

## 5. Indicação e Kesef

- O programa “Compartilhe e ganhe Kesef” foi generalizado para membros
  elegíveis, seguindo o modelo inicialmente disponível na carteira de Charles.
- O crédito ocorre somente quando o novo membro é validado por alguém com
  função administrativa autorizada.
- O bônus progride por patente, de 5 a 40 Kesef.
- A migration `20260801223000_indicacao_validacao_admin_patente.sql` foi aplicada
  ao Supabase vinculado.
- A documentação específica foi registrada em
  `docs/INDICACAO_VALIDACAO_ADMIN_2026-08-01.md`.

## 6. Capas públicas de perfil

- Foi criado um mecanismo de personalização do card principal do perfil.
- Catálogo inicial: Essencial, Louvor, Vocal, Ensino, Liderança, Intercessão e
  Comunhão.
- A escolha é pública e estética; não concede cargo, papel, patente ou permissão.
- A persistência foi adicionada em `usuarios.perfil_capa`, com allowlist no
  banco pela migration `20260801231500_perfil_capas_servico.sql`.
- Seis capas escuras autorais foram geradas com ImageGen, otimizadas para WebP e
  adicionadas a `public/profile-covers/`.
- Após o responsável apontar a ausência do tema claro, foram geradas seis
  variantes correspondentes `*-light.webp`, preservando composição e usando
  marfim, pergaminho, sálvia suave e dourado discreto.
- A troca de asset acompanha o `ThemeContext` do app, e não apenas a preferência
  do sistema operacional.
- O cancelamento da edição restaura nome e capa persistidos e descarta a nova
  foto ainda não enviada.
- Um `403` posterior à implantação foi diagnosticado como ausência de grant da
  nova coluna no modelo de permissões por coluna.
- A migration `20260801234000_corrigir_permissao_perfil_capa.sql` adicionou
  somente `perfil_capa` ao contrato permitido e à view sanitizada
  `usuarios_publicos`.
- O responsável aprovou visualmente as variantes de tema.

## 7. Auditoria consultiva do Tesouro

- O Tesouro foi analisado como produto, operação e economia comunitária.
- Foram identificadas como prioridades: contrato de saldo incorreto,
  processamento não atômico, risco de solicitação duplicada, concorrência de
  estoque, ausência do saldo na tela, terminologia inconsistente e fluxo
  administrativo sem justificativa obrigatória.
- A direção conceitual aprovada é **economia comunitária fechada com carteira e
  livro-razão**, não “mini banco virtual”.
- Kesef é interno, não monetário, intransferível, sem juros, compra, saque ou
  conversão individual garantida em dinheiro.
- O sistema herda disciplinas financeiras — ledger imutável, atomicidade,
  idempotência, auditoria e saldo não negativo — sem se apresentar como banco.

## 8. Tesouro — Etapa 1 em implementação

- Criada a migration `20260801235500_tesouro_fluxo_transacional.sql`.
- `debitar_kesef` passa a serializar débitos por membro.
- Criada `solicitar_resgate_loja`, com identidade derivada da sessão,
  idempotência, bloqueio de solicitação pendente duplicada e validação de saldo,
  item e estoque no servidor.
- Inserção direta de pedidos por clientes autenticados é removida; solicitações
  passam pela RPC.
- Criada `admin_processar_pedido_loja`, responsável por validar permissão,
  transição de estado, estoque, débito, pedido e auditoria na mesma transação.
- Rejeição passa a exigir justificativa.
- A política funcional adotada é fila por ordem de solicitação: o item somente é
  garantido e debitado na aprovação.
- O cliente passou a consultar o saldo canônico `kesef_saldo.saldo`.
- A interface passou a exibir saldo, preço em Kesef, saldo projetado, aviso de
  fila e estados de processamento que impedem toques repetidos.

## 9. Validações registradas até este ponto

- Antes da Etapa 1 do Tesouro: 26 arquivos de teste e 116 testes aprovados.
- Builds de produção concluídos para as mudanças de perfil e permissões.
- Lint sem erros bloqueantes; avisos preexistentes continuam catalogados em
  áreas não relacionadas.
- Migrations de indicação e perfil foram confirmadas no histórico remoto.
- A migration transacional do Tesouro passou por dry-run, foi aplicada e aparece
  sincronizada no histórico remoto como `20260801235500`.
- Após a integração, 27 arquivos e 118 testes foram aprovados; lint sem erro
  bloqueante e build de produção concluído.
- O lint estrutural remoto não apontou falha nas novas RPCs do Tesouro, mas
  revelou funções legadas quebradas fora deste escopo: `criar_perfil_usuario`,
  `finalizar_sala_oracao`, `registrar_evento_engajamento`,
  `verificar_provas_pendentes`, `is_admin` e `incrementar_apoio_oracao`, além de
  dois avisos de volatilidade em `ebd_validar_documento`. Esses achados devem ser
  corrigidos em uma frente própria.

## 10. Pendências da sequência

1. validar solicitação, aprovação, rejeição e entrega em ambiente autenticado;
2. capturar o estado atual do Tesouro para orientar a Etapa 2 sem inventar uma
   linguagem visual desconectada;
3. implementar a Etapa 2: experiência visual e funcional do membro;
4. implementar a Etapa 3: operação administrativa;
5. implementar a Etapa 4: identidade e transparência comunitária;
6. tratar em frente separada as funções legadas quebradas pelo lint remoto.

## 11. Continuação em 02/08/2026 — criação visual do Tesouro

- O responsável esclareceu que não existiam produtos ou pedidos cadastrados e
  solicitou que o Tesouro fosse tratado como criação de uma feature nova.
- Foram geradas três direções visuais mobile fundamentadas no Design System e
  na identidade vigente; a direção 1, de vitrine editorial serena, foi escolhida.
- Foram produzidas três fotografias autorais com ImageGen para Bíblia de Estudo,
  Garrafa Térmica e Devocional Diário, otimizadas em WebP e armazenadas em
  `public/store-products/`.
- A UI foi reestruturada com saldo, recompensa em destaque, affordance por
  capacidade de resgate, produtos complementares e acesso a Meus resgates.
- Os preços normativos existentes foram preservados; os valores ilustrativos do
  conceito visual não substituíram as regras econômicas do projeto.
- A migration `20260802003000_tesouro_catalogo_inicial.sql` cadastrou três itens
  com estoque e assets locais e foi aplicada ao Supabase vinculado.
- O formulário administrativo deixou de apagar `imagem_url` ao editar um item.
- Após a mudança, 27 arquivos e 118 testes passaram; build concluído e lint sem
  novo aviso no Tesouro.
- A QA visual permanece bloqueada até existir uma captura autenticada da rota
  `/loja` no mesmo estado da referência.
- O responsável confirmou a moeda de bronze com inscrição hebraica e chama como
  representação oficial do Kesef. A imagem enviada continha o quadriculado
  gravado; foi preservado o asset canônico já recortado e transparente em
  `public/kesef-coin.png`, agora reutilizado no Tesouro e no saldo compacto.

## 12. Administração da loja — publicação com imagem

- O formulário administrativo anterior foi substituído por um editor responsivo
  em portal, independente do contexto de empilhamento do painel.
- O conteúdo do formulário possui rolagem própria e o rodapé de ação permanece
  fixo acima da `safe area`; no cadastro, a ação é explicitamente “Publicar na
  loja”.
- A interface oferece upload, prévia e troca da imagem do produto, aceitando
  JPEG, PNG e WebP com entrada máxima de 8 MB.
- Antes do envio, a imagem é redimensionada e convertida para WebP, limitada a
  aproximadamente 1,5 MB e 1600 px no maior lado.
- A migration `20260802073000_loja_produtos_storage.sql` criou o bucket público
  `loja-produtos`; escrita e remoção exigem autenticação e a permissão canônica
  `store.manage`, com pasta vinculada ao usuário responsável.
- Uploads órfãos são removidos quando a criação ou atualização falha; ao trocar
  uma imagem administrada pelo bucket, a versão anterior também é removida.
- A listagem administrativa passou a exibir miniaturas para facilitar a
  conferência visual do catálogo.
- Build de produção e a suíte existente foram executados com sucesso antes da
  aplicação remota da migration; foram adicionados testes para formatos,
  tamanho e identificação segura dos caminhos do bucket.

## 13. Correção dos convites para salas de oração

- O schema remoto confirmou que `enviar_convite_oracao` ainda utilizava uma
  implementação legada fora do histórico canônico de migrations.
- A implementação antiga não era idempotente, considerava participações
  históricas ao verificar salas ativas e concedia execução ao papel `anon`.
- A migration `20260802112000_corrigir_envio_convite_oracao.sql` foi aplicada ao
  Supabase remoto.
- Um segundo toque agora reutiliza o convite pendente existente em vez de
  retornar erro ou criar duplicidade.
- Eventuais convites pendentes duplicados foram consolidados, preservando o mais
  recente, e um índice parcial passou a garantir um único convite enviado ativo
  por membro.
- Apenas uma participação ainda conectada em uma sala ativa bloqueia um novo
  convite; registros históricos desconectados deixam de gerar falso bloqueio.
- A RPC passou a validar sessão, destinatário e tipo de conexão e agora pode ser
  executada somente por usuários autenticados.
- O frontend traduz os estados funcionais para mensagens claras em português.
- Após a correção, 29 arquivos e 123 testes foram aprovados e o build de
  produção foi concluído.
- Um teste autenticado revelou ainda `REMETENTE_EM_SALA_ATIVA`: a tela de sala
  só registrava saída ao concluir com “Amém”, deixando sessões órfãs após queda,
  fechamento da aba ou navegação interrompida.
- A migration `20260802181000_recuperar_sala_oracao_orfa.sql` passou a tratar o
  início de um novo convite na Home como intenção explícita de sair da sala
  anterior: desconecta apenas o próprio usuário, encerra a sala somente quando
  não resta ninguém conectado e não concede recompensa nessa limpeza.

## 14. Geração editorial com IA e RAG

- O botão “Gerar com IA” era bloqueado no preflight do navegador porque a
  versão remota de `gerar-dia-ebd` não autorizava o cabeçalho obrigatório
  `Idempotency-Key`.
- A origem de desenvolvimento `http://192.168.100.13:5179`, os endereços locais
  equivalentes e `capacitor://localhost` foram cadastrados em `ALLOWED_ORIGINS`.
- A Edge Function `gerar-dia-ebd` foi reimplantada com a camada compartilhada de
  segurança atual e autenticação validada internamente.
- O preflight remoto foi reproduzido com os mesmos cabeçalhos do navegador e
  respondeu `204`, incluindo `idempotency-key` em
  `Access-Control-Allow-Headers`.

## 15. Antecipação administrativa de conteúdo EBD

- O botão de publicação individual só aceitava lições em `review` e ficava sem
  ação útil após a publicação agendada.
- A ação foi renomeada para “Liberar [dia] agora” e passou a funcionar também
  em lições já publicadas quando o dia selecionado ainda está programado.
- A RPC `ebd_antecipar_dia_publicado` altera apenas `unlocksAt` do dia escolhido,
  preserva os demais horários, cria nova versão e snapshot, registra auditoria
  e protege repetição por idempotência e versão esperada.
- Dias já disponíveis e semanas em modo imediato não oferecem antecipação.
- A migration `20260802221000_ebd_antecipar_dia_publicado.sql` foi aplicada ao
  banco remoto; 29 arquivos e 124 testes passaram e um novo APK DEV foi gerado.
