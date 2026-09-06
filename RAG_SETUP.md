# Comunhão — Memória Sistêmica RAG

Este incremento cria uma biblioteca administrativa de conhecimento para toda a plataforma.

## Entregas

- rota `/admin/conhecimento`;
- upload privado de PDF, DOCX, TXT, Markdown, HTML, CSV e JSON;
- classificação por escopo e categoria;
- preservação do arquivo original no Storage;
- extração de texto, divisão em trechos e geração de embeddings;
- embeddings gratuitos com o modelo nativo `gte-small` da Supabase;
- armazenamento no Postgres com `pgvector`;
- busca híbrida semântica + lexical em português;
- ativação, arquivamento, reindexação e exclusão de fontes;
- tela para testar quais trechos o RAG recupera;
- integração do RAG com a Edge Function `gerar-dia-ebd` usando os escopos `global` e `ebd`.

## Arquitetura

```text
Arquivo original
      ↓
Storage privado plataforma-conhecimento
      ↓
Edge Function indexar-memoria-rag
      ↓
Extração → limpeza → chunks com sobreposição
      ↓
Supabase.ai gte-small (384 dimensões)
      ↓
Postgres + pgvector + Full Text Search
      ↓
RPC buscar_memoria_rag
      ↓
Geradores da plataforma recebem contexto recuperado
```

## Limites do MVP

- até 15 MB por arquivo;
- até 250 páginas por PDF;
- até 180 mil caracteres e 120 chunks por arquivo;
- PDF precisa possuir camada de texto;
- PDFs digitalizados como imagem ainda precisam de OCR, previsto para a próxima fase;
- imagens isoladas ainda não são indexadas; futuramente receberão descrição visual/OCR.

## Instalação

Na raiz do Comunhão, com o patch extraído:

```bash
bash /CAMINHO/comunhao-rag-sistemico-patch/aplicar.sh
```

Confira as migrations antes de aplicar:

```bash
npx supabase db push --dry-run --include-all
```

Se a saída mostrar apenas migrations esperadas, aplique:

```bash
npx supabase db push --include-all
```

Implante as funções:

```bash
npx supabase functions deploy indexar-memoria-rag \
  --project-ref csxrhvgfnkqmkehgmnkp \
  --no-verify-jwt

npx supabase functions deploy buscar-memoria-rag \
  --project-ref csxrhvgfnkqmkehgmnkp \
  --no-verify-jwt

npx supabase functions deploy gerar-dia-ebd \
  --project-ref csxrhvgfnkqmkehgmnkp \
  --no-verify-jwt
```

As funções usam `--no-verify-jwt` somente para permitir o preflight CORS. Cada handler valida a sessão e o papel de administrador internamente.

Valide o frontend:

```bash
npm run lint
npm test
npm run build
```

Execute:

```bash
npm run dev -- --host
```

Acesse:

```text
Estúdio EBD → Memória
```

## Primeiro teste recomendado

1. Envie a Lição 5 completa.
2. Use escopo `EBD` e categoria `Lição / revista`.
3. Adicione tags como `licao-5`, `debora`, `baraque`, `juizes`.
4. Aguarde o status `Pronta`.
5. Em “Testar recuperação”, pesquise uma pergunta cuja resposta esteja no documento.
6. Gere novamente um dia da Lição 5.
7. A resposta da função trará também `rag.chunksUsed` e `rag.sources` para auditoria.

## Segurança

- somente administradores podem gerir ou consultar a biblioteca pela interface;
- o bucket é privado;
- chunks não são expostos para usuários comuns;
- geradores usam `service_role` somente dentro das Edge Functions;
- conteúdo recuperado é tratado como fonte, nunca como instrução de sistema;
- documentos podem ser desativados sem exclusão definitiva.

## Próximas fases

- OCR para PDFs escaneados e imagens;
- vínculo explícito entre fonte, lição e páginas;
- painel de cobertura da semana e citações por bloco;
- ingestão automática de URLs autorizadas;
- versionamento de fontes e detecção de alterações;
- RAG com permissões por ministério/comunidade;
- integração com outros geradores: notificações, formação, mural e assistência administrativa.

## Adenda operacional — 10/08/2026

### Estado remoto confirmado

- `indexar-memoria-rag` v9 ativa;
- `gerar-embedding-rag` v2 ativa;
- `buscar-memoria-rag` v5 ativa;
- `gerar-dia-ebd` v25 ativa;
- migrations locais/remotas alinhadas, incluindo
  `20260810191500_rag_filtrado_por_fontes_editoriais.sql`.

### Mudanças do dia

- CORS permite `idempotency-key` e preflight nas origens development autorizadas.
- A indexação utiliza idempotência, correlação pública e recuperação de fonte
  presa em processamento.
- A geração de embedding foi isolada em Edge Function própria.
- `buscar_memoria_rag_filtrada` exige `p_fonte_ids` e impede o gerador editorial
  de consultar fontes não vinculadas à lição.
- O ranking filtrado combina 80% semântico e 20% lexical; o gerador usa até
  quatro chunks para permanecer dentro do limite de tokens.
- O conteúdo recuperado continua marcado como não confiável no prompt.

### Pendência de reconciliação

O metadado remoto de `buscar-memoria-rag` v5 ainda aponta para um workspace
histórico. A função está ativa, mas deve ser comparada e republicada a partir
deste workspace oficial antes de evoluções futuras.
