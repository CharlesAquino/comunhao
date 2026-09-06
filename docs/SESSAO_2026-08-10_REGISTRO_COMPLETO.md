# Sessão de 10/08/2026 — registro completo

> Registro histórico append-only. Este documento descreve o estado observado ao
> final da sessão e não apaga as auditorias que motivaram as correções.

## 1. Identificação do estado

| Item | Estado confirmado |
|---|---|
| Produto | **Comunhão**; apresentação institucional vigente: **Comunhão \| Oração Constante** |
| Workspace ativo | `COMUNHAO-MURAL-SOCIAL-1.4.0-DEV1/app` |
| Release interna publicada | `1.4.0-dev.20` (`versionCode 14020`) |
| Application ID development | `br.com.igreja.oracao.dev` |
| Canal consultado pelo app development | `testing`, pasta remota `app-updates/development` |
| Projeto Supabase | `csxrhvgfnkqmkehgmnkp` |
| Controlador informado | Charles Thadeu Pereira de Aquino |
| Canal de privacidade | `charlesaquino33@gmail.com` |
| Testes ao encerrar | 34 arquivos, **158 testes aprovados** |
| Build | Vite/PWA e Android debug concluídos |
| Lint | 0 erros; avisos preexistentes permanecem |
| APK remoto | `comunhao-1.4.0-dev.20.apk` |
| SHA-256 | `550c7810138397f6fe3f578bdc1928c19052de2ad072296525915f89281a3b6e` |

## 2. Contexto da sessão

A sessão começou com uma auditoria do Editorial EBD por causa de falhas que
voltavam horas depois das correções. O fluxo real foi exercitado pelo
responsável no navegador, com console aberto, e revelou problemas independentes
em CORS, idempotência, indexação RAG, contrato do provedor de IA, publicação
diária, normalização de dias legados, permissões, layout e comunicação de erro.

Depois da estabilização editorial, foram implementadas a ordenação privada da
Mocidade pelo último acesso autenticado e a primeira versão do aceite digital,
com identidade confessional, Termos de Uso, Diretrizes e Aviso de Privacidade.

## 3. Editorial EBD e RAG

### 3.1 Auditoria preservada

As duas auditorias originais permanecem como evidência do estado encontrado:

- `audit/AUDITORIA_EBD_EDITORIAL_2026-08-10.md`;
- `audit/AUDITORIA_FLUXO_PUBLICACAO_EBD_2026-08-10.md`.

Elas não devem ser reescritas como se os defeitos nunca tivessem existido. As
adendas nesses documentos indicam o que foi mitigado e o que continua aberto.

### 3.2 Indexação da Memória Sistêmica

- O preflight CORS passou a aceitar `idempotency-key`.
- As origens locais autorizadas incluem a faixa usada pelo Vite, além do
  contexto Capacitor.
- Reindexações concorrentes recebem tratamento idempotente e correlação de
  erro em vez de falhar silenciosamente.
- O pipeline separou a geração de embedding na função
  `gerar-embedding-rag`.
- O erro operacional passa a ser persistido e exibido com referência segura.
- O arquivo original continua preservado e as fontes podem ser desativadas sem
  apagar a trilha.

### 3.3 RAG vinculado à lição

A geração editorial não consulta livremente todas as fontes da biblioteca. A
migration `20260810191500_rag_filtrado_por_fontes_editoriais.sql` criou
`buscar_memoria_rag_filtrada`, que exige os IDs explicitamente vinculados à
lição, fonte ativa e status `ready`.

Consequência operacional: se houver 80 arquivos e cinco sobre o mesmo
personagem, somente os arquivos vinculados àquela lição entram como candidatos.
Entre eles, a recuperação híbrida ranqueia chunks por 80% de similaridade
semântica e 20% de relevância lexical. A geração atual usa até quatro trechos
para respeitar o orçamento de tokens do provedor.

### 3.4 Geração por IA

Estado vigente:

- o gestor escolhe quais dos dez tipos de bloco serão gerados: abertura, texto,
  passagem bíblica, personagem, linha do tempo, reflexão, missão, oração,
  quiz e vídeo;
- a IA deve devolver exatamente os tipos selecionados e na ordem canônica;
- título e subtítulo do dia são gerados para o recorte pedagógico diário;
- título, subtítulo e resumo gerais da lição são enviados como contexto
  editorial; quando faltarem, a UI informa **Input não encontrado** sem bloquear
  toda a geração;
- público, tom, objetivo e instruções adicionais continuam editáveis;
- a IA recebe o roteiro semanal já produzido para evitar repetição e manter
  progressão cronológica, doutrinária ou pedagógica;
- a fonte RAG e as instruções livres são tratadas como dados não confiáveis,
  protegendo o prompt contra instruções embutidas;
- o JSON é validado por schema e novamente normalizado no servidor;
- quiz possui perguntas, alternativas, modo simples/múltiplo e respostas por
  índice;
- vídeo recebe proposta de roteiro, nunca uma URL inventada;
- o resultado é aplicado e salvo no rascunho, mas nunca publicado
  automaticamente;
- falhas do provedor retornam código público e `correlationId` sem expor
  credenciais ou resposta interna completa.

O plano gratuito do provedor apresentou falhas HTTP 413 e limites de tokens.
Foram reduzidos contexto, quantidade de chunks e esforço de raciocínio. Isso
mitiga, mas não elimina indisponibilidade ou rate limit externo.

### 3.5 Segunda-feira a sábado; domingo reservado

A produção semanal assistida considera **seis conteúdos**, de segunda-feira a
sábado. Domingo permanece no contrato de sete dias para compatibilidade, mas a
geração por IA está desabilitada na interface e o dia aparece como atividade
especial em planejamento. A futura definição pode ser atividade online, jogral
ou outro formato aprovado; nenhum formato foi assumido como decidido.

### 3.6 Publicação diária e continuidade do rascunho

- IDs duplicados em documentos legados são normalizados pela posição canônica
  do dia da semana.
- `ebd_publicar_dia_editorial` publica o dia pela posição, usa lock,
  `expected_version`, idempotência, snapshot e auditoria.
- `ebd_salvar_dia_editorial_nao_liberado` permite continuar preparando os dias
  ainda bloqueados depois de publicar segunda-feira; um dia já liberado
  permanece imutável nesse fluxo.
- A libertação do dia é opcional e separada de salvar/produzir.
- O estado publicado usa RPCs autorizadas; o acesso direto que retornava 403
  deixou de ser o caminho operacional.
- O progresso do Estúdio considera seis dias prontos e informa o domingo
  especial separadamente.

### 3.7 Reestruturação visual do Estúdio

O Estúdio deixou o formato de quebra-cabeça de cards e passou a um fluxo em
quatro etapas: Contexto, Conteúdo semanal, Revisão e Publicação. O desktop usa
editor principal com painel de progresso; o mobile usa progresso compacto,
conteúdo em coluna, ação inferior acessível e áreas seguras. Blocos ficam
ordenáveis e editáveis. Os controles inoperantes de tamanho da fonte foram
removidos.

As imagens editoriais passaram a usar `object-contain` e limites responsivos,
preservando a composição sem corte no Estúdio e na leitura da lição.

## 4. Comunidade e último acesso

### 4.1 Decisão final

A Mocidade é ordenada por `usuarios.last_login desc nulls last`, com nome e ID
como desempate. O valor exato de `last_login` não é exposto no retorno público.

O acesso é registrado uma única vez ao entrar na área autenticada, inclusive
quando a sessão é restaurada automaticamente. Não existe heartbeat, rastreamento
contínuo, intervalo periódico ou indicador público de horário.

### 4.2 Linha do tempo da decisão

A migration `20260810220000_comunidade_ordem_por_presenca.sql` representou uma
primeira exploração de presença. Ela foi deliberadamente substituída por:

- `20260810223000_comunidade_ordem_por_ultimo_login.sql`, que removeu tabela e
  funções de presença;
- `20260810224500_registrar_login_automatico.sql`, que atualiza somente
  `last_login` na entrada autenticada.

Essa substituição é normativa: não reintroduzir presença contínua sem nova
decisão explícita e avaliação de privacidade.

## 5. Aceite digital, identidade e privacidade

### 5.1 Documentos v1.0.0

Foram criados três documentos independentes:

1. **Termos de Uso** — aceite;
2. **Identidade e Diretrizes da Comunidade** — aceite;
3. **Aviso de Privacidade** — ciência.

Os textos identificam o Comunhão como iniciativa cristã, protestante e
evangélica, preservando respeito a pessoas de outros credos e deixando claro que
a moderação considera conteúdo e conduta, não crença presumida.

### 5.2 Evidência e minimização

- `documentos_legais` guarda versões imutáveis, tipo de manifestação e SHA-256.
- `aceites_legais` guarda conta, documento, versão, hash, tipo, horário do
  servidor e versão do app.
- As tabelas têm RLS e acesso direto revogado para `anon` e `authenticated`.
- Leitura e registro ocorrem somente pelas RPCs `listar_documentos_legais` e
  `registrar_aceites_legais`.
- Não foi adicionado IP, credo declarado, fingerprint ou identificador extra de
  aparelho como prova de aceite.

### 5.3 Experiência de acesso

- testadores novos e existentes recebem o gate na primeira abertura da versão;
- todas as três manifestações precisam ser marcadas antes de entrar;
- quem não concordar pode sair da conta;
- o registro pertence à conta: troca de aparelho ou reinstalação não repete o
  aceite da mesma versão;
- mudança material deve criar nova versão do documento e novo aceite/ciência;
- o Perfil passou a oferecer **Privacidade e documentos**, com textos vigentes e
  data de registro.

### 5.4 Limite jurídico

Esta implementação é uma base técnica de transparência e evidência; não é
certificação de conformidade com a LGPD nem substitui revisão jurídica.

## 6. Migrations de 10/08/2026

Consulta remota ao encerrar a sessão confirmou alinhamento local/remoto para:

| Migration | Finalidade | Estado remoto |
|---|---|---|
| `20260810191500` | RAG filtrado por fontes vinculadas | Aplicada |
| `20260810211500` | Publicação diária pela posição canônica | Aplicada |
| `20260810213000` | Salvamento de dia ainda não liberado | Aplicada |
| `20260810220000` | Exploração inicial de presença | Aplicada, depois substituída |
| `20260810223000` | Ordenação por último login e remoção da presença | Aplicada |
| `20260810224500` | Registro único de sessão restaurada | Aplicada |
| `20260810233000` | Documentos e aceite legal versionado | Aplicada |

## 7. Edge Functions confirmadas no projeto remoto

| Função | Versão remota ao encerrar | Observação |
|---|---:|---|
| `gerar-dia-ebd` | 25 | Ativa; valida sessão/papel no handler |
| `indexar-memoria-rag` | 9 | Ativa; preflight e segurança no handler |
| `gerar-embedding-rag` | 2 | Ativa |
| `buscar-memoria-rag` | 5 | Ativa; merece reconciliação futura porque o metadado remoto ainda aponta para workspace histórico |

O gateway remoto mostra `verify_jwt=false` para `gerar-dia-ebd` e
`indexar-memoria-rag`, conforme a estratégia de permitir preflight; ambos devem
continuar validando JWT, perfil e permissão dentro do handler. Essa defesa interna
é obrigatória e não pode ser removida.

## 8. Releases internas produzidas no dia

| Release | Marco principal |
|---|---|
| `1.4.0-dev.17` | Reestruturação visual responsiva do Editorial EBD |
| `1.4.0-dev.18` | Correções de publicação diária, continuidade editorial e leitura de imagens |
| `1.4.0-dev.19` | Mocidade ordenada pelo último acesso autenticado, sem heartbeat |
| `1.4.0-dev.20` | Aceite digital versionado e central de privacidade no Perfil |

O fluxo autorizado continua sendo atualização direta pelo próprio app. Não
criar novo aplicativo para cada versão. O APK development preserva applicationId,
assinatura debug desta estação, incremento de `versionCode` e manifesto remoto.

## 9. Pontos que ainda exigem atenção

### 9.1 Privacidade, pastoral e governança

1. Criar consentimentos granulares no ponto de coleta quando pedidos de oração,
   saúde ou acompanhamento pastoral dependerem de consentimento.
2. Definir procedimento para menores e responsabilidade parental antes de ampliar
   o piloto para crianças/adolescentes sem supervisão.
3. Formalizar matriz de retenção, eliminação, backup e resposta aos direitos do
   titular; hoje o texto existe, mas o processo operacional ainda precisa de SLA.
4. Registrar contratos/termos dos operadores e avaliar transferência internacional.
5. Criar procedimento de incidente, canal de contestação e revisão jurídica dos
   documentos antes de uma abertura pública ampla.
6. Não transformar o aceite geral em autorização genérica para todo dado
   sensível futuro.

### 9.2 Editorial EBD

1. Implementar vigência semanal canônica e impedir sobreposição. A seleção
   pública ainda usa o maior número publicado, não intervalo de datas.
2. Separar definitivamente o estado publicado da semana do estado de cada dia ou
   adotar documento de trabalho distinto do snapshot público.
3. Endurecer validação por tipo de bloco, datas, mídia e acessibilidade.
4. Implementar controle otimista também no salvamento normal entre dois editores.
5. Remontar/hidratar progresso por `lesson.id:version` e levar progresso privado
   para o servidor com RLS.
6. Criar testes de contrato SQL, serviço e E2E autenticado para publicação,
   Realtime, offline, troca de versão e virada de dia.
7. Corrigir a mensagem cliente `AI_BLOCK_COUNT_INVALID`, que ainda menciona
   “oito blocos” embora a geração atual aceite a seleção do gestor.
8. Definir e implementar o domingo especial.

### 9.3 Engenharia e operação

1. Realizar QA visual autenticado em desktop e mobile; o build prova compilação,
   não fidelidade ou usabilidade real em todos os aparelhos.
2. Tratar avisos de hooks e o aviso de `Heart` não definido em `Home.tsx` antes
   que deixem de ser apenas lint warning.
3. Reduzir chunks acima de 500 kB, especialmente Sala de Oração.
4. Reconciliar/deployar `buscar-memoria-rag` a partir do workspace ativo para
   eliminar a referência remota ao diretório histórico.
5. Manter a rota development separada da RC3 até concluir validação e assinatura
   de produção.

## 10. Verificações finais

```text
npm test -- --run  -> 34 arquivos, 158 testes aprovados
npm run lint       -> 0 erros, avisos preexistentes
npm run build      -> Vite + PWA concluídos
npm run apk:development -> BUILD SUCCESSFUL
npx supabase migration list --linked -> migrations do dia alinhadas
npx supabase functions list -> funções remotas ativas
manifesto remoto -> 1.4.0-dev.20 / 14020
```

## 11. Regra de continuidade

Ao retomar o projeto, ler primeiro `../AGENTS.md`,
`../../CONTEXTO_MESTRE_IMPLEMENTACAO.md` e este registro. Documentos mais antigos
continuam válidos como linha do tempo, mas não substituem o código ativo, o banco
remoto verificado ou uma decisão posterior explicitamente registrada.

## 12. Manifesto da atualização documental

Foram acrescentados ou reconciliados nesta rodada:

- `AGENTS.md` — adenda operacional e decisões antirregressão;
- `Genesis.md` — ponto de entrada estável para o Genesis canônico;
- `src/documenta#U00e7#U00e3o/Genesis` — entrada cronológica 15;
- `../../CONTEXTO_MESTRE_IMPLEMENTACAO.md` — adenda de estado remoto;
- `../../README.md` e `../README.md` — estado development atual;
- `docs/README.md` — índice de fontes vigentes, especializadas e históricas;
- `EDITORIAL_IA_SETUP.md` — contrato seletivo que substitui os oito blocos fixos;
- `RAG_SETUP.md` — funções, filtro por fontes e pendência de reconciliação;
- `docs/estudio-editorial-ebd-operacao.md` — fluxo atual e pendências;
- `docs/ANALISE_EBD_LINHA_DO_TEMPO_EDITORIAL.md` — distinção entre mitigação
  implementada e vigência ainda proposta;
- auditorias EBD de 10/08 — adendas sem apagar os achados originais;
- `docs/android-release-updates.md` e `release/development/README.md` — trilha
  `dev.20` de atualização direta;
- `design-qa.md` — desktop reconhecido e mobile ainda pendente;
- apresentações técnicas duplicadas — adenda atual e redação de credencial;
- documentos históricos de LiveKit — telefone e senha reais redigidos, mantendo
  o roteiro e a evidência de que houve exposição.

O restante dos documentos históricos não foi reescrito. Sua classificação e
relação com o estado atual estão centralizadas em `docs/README.md`.

## Adenda final — dev.22, segurança da conta e linguagem editorial

Depois do fechamento original desta sessão:

- a migration `20260811001000_solicitacao_exclusao_conta.sql` foi aplicada no
  projeto remoto `OraçãoAPP`;
- `login-username` foi republicada para bloquear novos logins de contas com
  exclusão pendente;
- troca de senha e solicitação de remoção foram adicionadas ao Perfil;
- cadastro, troca de senha, fila, bloqueio e limpeza foram comprovados com conta
  sintética;
- `gerar-dia-ebd` foi republicada sem usar o dia da semana como fallback do
  título temático;
- `DESIGN_SYSTEM_EDITORIAL_EBD.md` passou a reger semântica, ortografia, escrita,
  concordância e hierarquia textual;
- datas e dias continuam autorizados dentro das artes. A repetição entre arte e
  rótulo HTML é intencional por acessibilidade; o terceiro uso como título é
  bloqueado;
- `1.4.0-dev.22` / `versionCode 14022` foi publicado em
  `app-updates/development`, SHA-256
  `a2ce394fe2409d6f8e9eb6505667084696d8526cedfa6be2206187b0f475d662`.

Validação local final: 35 arquivos e 166 testes aprovados; build concluído.
Os avisos técnicos preexistentes permanecem no backlog. Não havia vínculo ou
credencial do provedor web no workspace; por isso, o APK/manifesto foi publicado,
mas nenhum deploy Netlify/Vercel foi alegado.
