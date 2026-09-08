# Pacotes editoriais preparados

O Estúdio recebe JSONs `comunhao.ebd.source.v1` produzidos conforme
`PROMPT_ASTRA_PACOTE_EDITORIAL_EBD.md`. A biblioteca privada conserva os dez
blocos completos de cada dia. Seleção e aplicação não chamam IA, embeddings,
RAG semântico ou Edge Functions de geração.

## Operação

1. Abra a lição correta em rascunho e selecione um dia de segunda a sábado.
2. Expanda “Conteúdo preparado · Importar pacote editorial”.
3. Selecione de um a seis JSONs de dia; acrescente manifest.json se disponível.
4. Confira lessonKey, revisão, quantidade de dias e número da lição e confirme
   o vínculo. Os arquivos são guardados em uma única inserção transacional.
5. Escolha a fonte/revisão do dia, os tipos desejados e confira os textos.
6. Aplique a seleção; confirme a substituição dos blocos atuais daquele dia.
7. Confira o salvamento automático e faça a revisão editorial antes de publicar.

A aplicação substitui os blocos do dia, mantém ID e calendário e estima o tempo
dos tipos escolhidos. Domingo não é importado. O fluxo aplica em rascunhos
e também em lições já publicadas (salvando dias não liberados via RPC
`saveUnreleasedEditorialDay`). Dias já liberados permanecem imutáveis. Os arquivos-fonte
permanecem completos para novas seleções. Para corrigir uma fonte já guardada,
importe uma revisão maior: UPDATE/DELETE não são concedidos ao cliente.

Erros estruturais impedem guardar o lote e identificam o arquivo/campo. Avisos
de extensão ou formato editorial não cortam nem regeneram o texto. É possível
reenviar um dia corrigido separadamente. Quiz exige três questões, quatro
alternativas distintas e gabarito válido. A suficiência pedagógica das questões
em relação aos blocos selecionados exige conferência humana.

O manifesto não preenche automaticamente título, número, fontes ou calendário
da lição. Sem manifesto, a confirmação de vínculo pelo gestor é a conferência
de identidade externa. O DOCX legado não contém os dez blocos prontos e não é
convertido nem complementado automaticamente por este fluxo.

Roteiro de vídeo e prompt de imagem não equivalem a mídia produzida. As mídias
reais continuam sendo vinculadas no editor. Não há síntese de voz nesta mudança.

## Backend e segurança

Tabela `public.ebd_source_days`: payload privado por lesson_id, lesson_key,
weekday e revision. Só `ebd.manage` pode consultar/inserir. Provenance nunca
entra no documento aplicado ao dia ou no snapshot público. A identidade usada
em created_by é auth.users.id, explicitamente distinta de usuarios.id.

Migration `20260907030000_ebd_source_days.sql` aplicada em
`csxrhvgfnkqmkehgmnkp`, com ensaio transacional revertido e registro atômico no
histórico. A migration de intercessão preexistente no workspace não foi aplicada
por esta tarefa. Nenhuma lição ou pacote autoral foi inserido na ativação.

Verificação: RLS ativa, duas policies, acesso anônimo de leitura negado,
UPDATE do cliente negado e um registro no histórico. Teste SQL confirmou
bloqueio de SELECT/INSERT para identidade sem permissão, com rollback.

Contenção reversível: recolher a UI no build seguinte e revogar INSERT da tabela
preserva os pacotes. Antes de qualquer remoção de tabela, exportar os arquivos
importados e obter autorização; não apagar fontes como rollback automático.

## Validação e limites

231 testes em 48 arquivos aprovados, incluindo preservação literal após
normalização do salvamento, gabaritos, seleção, calendário, exclusão de domingo,
erros estruturais e interação do painel. Lint e build Vite/PWA aprovados.
TypeScript global ainda acusa erros fora desta alteração: namespace THREE em
KesefCoin3D.tsx (329–330) e PromiseLike.catch em conviteService.ts (77).

O frontend está implementado e compilado localmente. Esta tarefa não publicou
APK, manifesto OTA ou release web. Validação visual isolada não substitui um
teste completo autenticado no Estúdio com pacote real revisado.
