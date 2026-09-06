# Comunhão 1.4.0-dev.1 — Mural Social

## Última modificação — 2026-08-01 12:32 — 1.4.0-dev.1

- compositor do Mural compactado para foto em miniatura e tipos em chips;
- helper do tipo selecionado mantido em uma única linha contextual;
- botão inferior preservado acima da safe area e da navegação do app;
- guarda SQL adicionada para impedir auto-notificações na aceitação de oração;
- teste estrutural da proteção adicionado;
- validação executada: 24 arquivos de teste, 110 testes e build de desenvolvimento aprovados.

## Correção adicional — 2026-08-01

O registro nativo de push ficou desativado por padrão no canal `development`. O APK DEV não inclui `google-services.json`; portanto, FCM só deve ser habilitado explicitamente quando a configuração Firebase estiver presente.

## Estado

Esta versão existe **somente no ambiente de desenvolvimento**. Ela não deve ser publicada no canal `testing`, não deve substituir a RC3 e não deve usar o manifesto de atualização atual.

Identidade Android de desenvolvimento:

- Nome: `Comunhão Dev`
- Application ID: `br.com.igreja.oracao.dev`
- Versão: `1.4.0-dev.1-local`
- Version code: `14001`

A variante pode ser instalada ao lado da versão de testes atual.

## Primeira entrega funcional

- quatro tipos de publicação: pedido, testemunho, reflexão e gratidão;
- uma foto por publicação;
- compressão local para WebP;
- máximo de 1,2 MB após compressão;
- exibição fixa em proporção 4:5;
- remoção indireta de metadados EXIF pelo processamento em canvas;
- comentários de até 500 caracteres;
- comentários em Realtime;
- notificação real para o autor da publicação;
- intercessão com estado persistente, coração vermelho e desfazer;
- contagem otimista de intercessores;
- selo de patente sem transcrição ao lado do nome;
- detalhes da patente ao tocar;
- prioridade visual e de ordenação para pedidos recentes sem intercessão;
- moderação compatível com os quatro tipos.

## Banco e Storage

Migration preparada:

`supabase/migrations/20260801010000_mural_social_dev1.sql`

Ela cria:

- `mural_midias`;
- `mural_comentarios`;
- bucket privado `mural-media`;
- políticas RLS;
- produtor de atividade `comentario_publicacao`;
- Realtime para comentários e mídias;
- extensão segura dos tipos da tabela `pedidos`.

**Não aplicar no Supabase de produção durante o período de estabilização da RC3.** Use Supabase local ou um projeto separado de staging.

## Arquitetura

```text
Usuário cria publicação
        ↓
texto entra em pedidos
        ↓
foto é comprimida no aparelho
        ↓
arquivo vai para mural-media
        ↓
metadados entram em mural_midias
        ↓
feed recebe atualização Realtime
```

```text
Usuário comenta
        ↓
mural_comentarios
        ↓
trigger de atividade
        ↓
app_notificacoes
        ↓
Central de Atividades
```

## O que ficou para as próximas etapas

### dev.2 — acompanhamento

- ciclo pedido → em oração → acompanhamento → testemunho;
- atualização da situação pelo autor;
- painel de pedidos sem resposta;
- tempo até a primeira intercessão.

### dev.3 — compartilhamento social

- minicard Story, quadrado e WhatsApp;
- imagem personalizada;
- link profundo para a publicação;
- QR Code;
- métricas de compartilhamento.

## Referência visual

`docs/mockups/comunhao-1.4-mural-social-overview.png`
