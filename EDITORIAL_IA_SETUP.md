# Comunhão — Editorial Inteligente: geração de um dia com IA

Esta entrega adiciona ao Estúdio Editorial EBD:

- botão **Gerar com IA** em cada dia da semana;
- formulário de público, tom, objetivo e instruções adicionais;
- geração de exatamente oito blocos editoriais;
- prévia antes de aplicar;
- aplicação somente como rascunho local;
- nenhuma gravação ou publicação automática;
- autenticação administrativa na Edge Function;
- auditoria em `ebd_ai_executions`.

## 1. Aplicar o banco de dados

Na raiz do projeto:

```bash
npx supabase db push
```

## 2. Configurar provedores de IA

O orquestrador vigente tenta os provedores nesta ordem:

1. **Gemini 2.5 Flash** — geração estruturada principal;
2. **Cloudflare Workers AI** — contingência;
3. **Groq GPT-OSS 120B** — contingência;
4. **Groq GPT-OSS 20B** — última contingência.

Todos recebem o mesmo contexto RAG, contrato editorial e validação no servidor.
Nenhum provedor pode publicar conteúdo automaticamente.

### Gemini (prioritário)

```bash
npx supabase secrets set GEMINI_API_KEY="SUA_CHAVE"
npx supabase secrets set GEMINI_MODEL="gemini-2.5-flash"
```

O plano Google AI Pro melhora ferramentas pessoais como Gemini, NotebookLM e
Flow, mas a disponibilidade da API depende da cota e do faturamento do projeto
da chave no Google AI Studio. Consulte o uso nesse projeto antes de aumentar o
volume de gerações.

### Cloudflare Workers AI

```bash
npx supabase secrets set \
  CLOUDFLARE_API_TOKEN="SEU_TOKEN" \
  CLOUDFLARE_ACCOUNT_ID="SEU_ACCOUNT_ID" \
  CLOUDFLARE_AI_MODEL="@cf/meta/llama-3.3-70b-instruct-fp8-fast"
```

### Groq (contingência)

```bash
npx supabase secrets set GROQ_API_KEY="SUA_CHAVE_GROQ"
npx supabase secrets set GROQ_MODEL="openai/gpt-oss-120b"
```

A chave fica somente no Supabase e nunca é enviada ao navegador.

## 3. Publicar a Edge Function

```bash
npx supabase functions deploy gerar-dia-ebd
```

Não use `--no-verify-jwt`: a função precisa receber a sessão do administrador.

## 4. Iniciar o app

```bash
npm run dev -- --host
```

Abra o Estúdio Editorial, escolha uma lição e um dia, e pressione **Gerar com IA**.

## Fluxo de segurança

1. A função valida a sessão do Supabase.
2. Confirma que o usuário tem `papel = 'admin'`.
3. Gera JSON estruturado com os blocos selecionados no Estúdio.
4. Mostra uma prévia no app.
5. O administrador decide se aplica o conteúdo.
6. O conteúdo continua sem ser salvo até o botão **Salvar**.
7. Publicação continua separada e exige a ação já existente no Estúdio.

## Arquivos alterados

- `src/pages/EbdStudio.tsx`
- `src/services/ebdEditorialService.ts`
- `src/types/ebdEditorial.ts`
- `supabase/functions/gerar-dia-ebd/index.ts`
- `supabase/migrations/20260729090000_ebd_ai_executions.sql`

## Adenda de contrato — 10/08/2026

O contrato inicial de “exatamente oito blocos” acima foi substituído por geração
seletiva. O gestor pode escolher qualquer combinação dos dez tipos vigentes:
abertura, texto, passagem bíblica, personagem, linha do tempo, reflexão, missão,
oração, quiz e vídeo. A resposta deve conter exatamente os tipos selecionados,
na ordem canônica.

Regras atuais adicionais:

- geração automática de segunda-feira a sábado;
- domingo reservado para atividade especial ainda não definida;
- pelo menos uma fonte RAG ativa/pronta precisa estar vinculada à lição;
- a busca considera somente essas fontes e usa até quatro chunks ranqueados;
- título e subtítulo do dia são gerados em coerência com o roteiro semanal;
- título, subtítulo, resumo, tema, versículo e metadados da lição alimentam o
  contexto; ausências são informadas, sem bloqueio total;
- resultado aplicado é salvo como trabalho editorial, mas nunca publicado sem
  ação humana;
- respostas do provedor são validadas por JSON Schema e normalização server-side;
- erros usam código público e `correlationId`.

## Adenda de provedores — 01/09/2026

O prompt atual é `ebd-day-v14-gemini-primary-multi-provider-depth-recovery`.
Gemini usa saída JSON estruturada; Cloudflare e Groq preservam o mesmo contrato
como fallback. O backend valida novamente tipo, ordem, tamanho mínimo/máximo,
quiz e campos permitidos antes de devolver qualquer rascunho ao navegador.

Quando Gemini ou Cloudflare devolvem somente um bloco superficial, o backend
tenta reparo cirúrgico desse bloco e, para os tipos textuais permitidos, uma
recuperação final em texto puro. Fragmentos de JSON são rejeitados para não
vazarem no conteúdo exibido.

Fontes de implementação: `gerar-dia-ebd` e migration
`20260810191500_rag_filtrado_por_fontes_editoriais.sql`.
