# Development only

O APK debug gerado por `npm run apk:development` usa o identificador
`br.com.igreja.oracao.dev`, mantém a assinatura debug desta estação e participa
do canal remoto `testing` na pasta `app-updates/development`. Ele pode atualizar
as instalações development anteriores sem substituir a RC3.

Desde `1.4.0-dev.2`, o app consulta o manifesto HTTPS ao iniciar. Toda atualização
deve incrementar `versionCode`, preservar o mesmo applicationId e a mesma chave
de assinatura, publicar primeiro o APK e por último o manifesto.

## APK de 02/08/2026

Arquivo: `comunhao-1.4.0-dev.1-debug.apk`

### Novas funcionalidades para validação

- Tesouro com catálogo visual, saldo em Kesef e representação oficial da moeda.
- Fluxo de resgate transacional, com fila de aprovação, proteção contra pedidos
  duplicados e saldo projetado.
- Administração da loja com criação e edição de produtos.
- Upload de foto do produto em JPEG, PNG ou WebP, com prévia e otimização
  automática antes do envio.
- Botão “Publicar na loja” mantido visível em um rodapé fixo, respeitando a área
  segura e a navegação do celular.
- Miniaturas dos produtos na listagem administrativa.
- Armazenamento das imagens protegido pela permissão administrativa
  `store.manage`.
- Salas de oração por voz e vídeo com endpoint LiveKit incluído no APK.
- Recuperação automática de sala órfã ao iniciar um novo convite.
- Envio de convite idempotente, sem duplicidade causada por dois toques.
- Mensagens de erro das salas traduzidas para português.
- Estúdio EBD com “Liberar dia agora” para antecipar um conteúdo programado já
  publicado, sem liberar os demais dias da semana.

### Roteiro rápido de teste

1. Entre com uma conta que possua permissão para administrar a loja.
2. Abra Administração → Loja e estoque → Novo produto.
3. Selecione uma foto e confirme se a prévia aparece.
4. Preencha nome, descrição, preço em Kesef, estoque e categoria.
5. Role o formulário e confirme que “Publicar na loja” continua acessível.
6. Publique e confira a imagem no catálogo do Tesouro e na miniatura
   administrativa.
7. Convide a dupla para orar, aceite pelo segundo usuário e valide áudio e
   vídeo em dois aparelhos.
8. Feche uma sala sem concluir, abra novamente o app e confirme que um novo
   convite consegue recuperar o estado anterior.

Este é um APK de desenvolvimento. Ele não substitui nem atualiza automaticamente
a instalação RC3.

## Histórico posterior — 10/08/2026

O roteiro de `dev.1` acima continua preservado como marco inicial. O canal
development atualmente oferece atualização direta para:

```text
1.4.0-dev.20
versionCode 14020
APK remoto comunhao-1.4.0-dev.20.apk
SHA-256 550c7810138397f6fe3f578bdc1928c19052de2ad072296525915f89281a3b6e
```

Marcos recentes: Estúdio EBD responsivo e RAG vinculado; publicação incremental
corrigida; Mocidade por último acesso sem heartbeat; aceite digital versionado e
central de privacidade no Perfil. O manifesto deve continuar sendo publicado
por último e conferido com cache-buster após cada release.

## Release atual — 10/08/2026

```text
1.4.0-dev.22
versionCode 14022
APK remoto comunhao-1.4.0-dev.22.apk
SHA-256 a2ce394fe2409d6f8e9eb6505667084696d8526cedfa6be2206187b0f475d662
```

Esta versão acrescenta troca de senha autenticada, solicitação auditável de
remoção de conta, bloqueio de novo login durante a exclusão e a primeira regra
do Design System Editorial. Dia e data permanecem permitidos na arte da capa;
o nome do dia deixa de ser aceito como título temático redundante.

Backend remoto validado com conta sintética e limpeza posterior. Migration
`20260811001000` aplicada; `login-username` e `gerar-dia-ebd` republicadas.

## Release atual — 14/08/2026

```text
1.4.0-dev.23
versionCode 14023
APK remoto comunhao-1.4.0-dev.23.apk
SHA-256 f0a93f3df2503c5c9ad62db88fd23750be4410f999cfcdd66efaa93ec9b757d6
```

Esta versão protege o limite por membro também no resgate imediato da Cantina,
corrige falhas de execução e hooks, substitui prompts nativos por diálogos
acessíveis e inicia a separação efetiva dos domínios Cantina, Tesouro e EBD.
Antes da geração do pacote, a migration `20260814172000` foi aplicada ao projeto
Supabase vinculado com preflight contendo somente essa alteração.
O APK foi publicado antes do manifesto, preservando a atualização online por
pacotes incrementais. A função `buscar-memoria-rag` também foi republicada pelo
workspace ativo no projeto `csxrhvgfnkqmkehgmnkp`.

## Release atual — ajuste visual de 14/08/2026

```text
1.4.0-dev.24
versionCode 14024
APK remoto comunhao-1.4.0-dev.24.apk
SHA-256 1397881821a61e4ab797c751f775277f3f84c32ac7a6e511473b5ee5b5de57b1
```

A Cantina passa a usar cards em lista nos celulares estreitos, preservando duas
colunas apenas quando há largura suficiente. Durante o evento, o acesso à
Carteira aparece uma única vez no cabeçalho; os produtos permanecem como
vitrine informativa, com descrição, alérgenos, estoque, Kesef e detalhes.

## Correção imediata — 14/08/2026

```text
1.4.0-dev.25
versionCode 14025
APK remoto comunhao-1.4.0-dev.25.apk
SHA-256 a0dcf5d311a6ad724cecff181ecd8cde6ff9e69c06073e0ec275cea6f290cea4
```

Corrige a imagem que invadia o conteúdo dos cards da `dev.24`, impede que o
WebView desenhe sob a barra de status e alinha a nomeação administrativa ao
contrato de oito caracteres do banco. Os papéis `operador_loja` e
`operador_cantina` permanecem compatíveis e passam a conceder os mesmos acessos
operacionais à Loja e à Cantina.

## Reserva antecipada — 14/08/2026

```text
1.4.0-dev.26
versionCode 14026
APK remoto comunhao-1.4.0-dev.26.apk
SHA-256 824a1e06398101e1c105dcbaeb33c79ff57cf7a1d613e3ebe20a2d795f988585
```

Corrige a divergência em que os detalhes do produto ainda ofereciam reserva
depois do início do evento. A partir do início, a interface direciona para o
resgate presencial na Carteira, em conformidade com a validação do banco.

## Novo mecanismo de resgate — 14/08/2026

```text
1.4.0-dev.27
versionCode 14027
APK remoto comunhao-1.4.0-dev.27.apk
SHA-256 8870fc10ea11263e96d17475f5c2bf55d6d10095b5885913b45661ac341f9045
```

Reorganiza a Cantina por evento, com os produtos dentro do mesmo contêiner e
ação `Resgatar` em cada item. O mecanismo de resgate abre em primeiro plano,
independente da rolagem, e oferece QR Code, código manual e NFC sem alterar a
interface principal da Carteira.

## Correção terminológica — 14/08/2026

```text
1.4.0-dev.28
versionCode 14028
APK remoto comunhao-1.4.0-dev.28.apk
SHA-256 5a6913de16027a54efa1188628685e6f3f6d8987e85337704abd20f01b465770
```

Substitui `Pagar com Kesef` por `Resgatar com Kesef`. O Kesef permanece descrito
como ponto interno usado para resgatar benefícios, sem linguagem de pagamento,
compra ou conversão monetária.

## PDV da Cantina — 14/08/2026

```text
1.4.0-dev.29
versionCode 14029
APK remoto comunhao-1.4.0-dev.29.apk
SHA-256 c05a730681cb0a9715cb6dbdb8fd24e46290e5bcadbef9204f0822af24588b03
```

Redesenha a operação presencial como um PDV móvel: catálogo com imagens,
controles de quantidade, total destacado, resumo do pedido e geração do resgate.
O painel seguinte exibe QR Code, código manual, validade e proteção do débito.
A migration `20260814203000` permite ao operador consultar os itens necessários
ao caixa sem conceder criação ou alteração de estoque.

## Administração com identidade Comunhão — 14/08/2026

```text
1.4.0-dev.30
versionCode 14030
APK remoto comunhao-1.4.0-dev.30.apk
SHA-256 c153f9712df4e9f0d79b07c081fb84442e4f6389153a09c07cdda15b16cf7508
```

Refina a visão geral administrativa com composição compacta e simétrica nos
temas Amanhecer e Santuário. O cabeçalho passa a usar o emblema oficial e o
avatar da pessoa autenticada; referências a Kesef usam a imagem oficial da
moeda. Os acessos continuam filtrados pelas permissões reais do perfil.

## Padronização de todas as abas administrativas — 14/08/2026

```text
1.4.0-dev.31
versionCode 14031
APK remoto comunhao-1.4.0-dev.31.apk
SHA-256 f70e0ceac2b05e570bc0298a95549c1798a135780a0b3459a11a987b3d524d98
```

Estende a identidade visual do Comunhão para Pessoas, Oração, Pastoral,
Moderação, EBD, Memória, Loja, Cantina e Auditoria. As telas agora reutilizam
cabeçalhos, métricas, barras de filtro e seções responsivas, preservando os
temas Amanhecer e Santuário. O emblema permanece restrito ao topo das áreas
principais e a moeda oficial identifica os principais valores em Kesef.

## Chamadas de oração — 15/08/2026

```text
1.4.0-dev.34
versionCode 14034
APK remoto comunhao-1.4.0-dev.34.apk
SHA-256 d192e13ae6d6e2ac25adad9d855fc4ebb2b0b03ea8379fc8eafb9d2380fa782d
```

Restaura a sinalização das chamadas de voz e vídeo habilitando
`convites_oracao` no Realtime e mantendo consulta de contingência a cada quatro
segundos. O Android passa a declarar microfone, câmera e ajustes de áudio; a
sala respeita o modo escolhido e liga a câmera ao iniciar uma chamada de vídeo.
A migration `20260815003000` foi aplicada ao projeto remoto antes da publicação.

## Mídia no aplicativo Android — 15/08/2026

```text
1.4.0-dev.35
versionCode 14035
APK remoto comunhao-1.4.0-dev.35.apk
SHA-256 13845c760d6e012001b65858b33bd2ecf24941653ddf756b4e0b600ad42f3d51
```

Corrige a validação de contexto seguro da Sala de Oração. O navegador
continua exigindo `localhost` ou HTTPS, enquanto o Capacitor Android segue para
a solicitação nativa de microfone e câmera. Caso o mecanismo de mídia não esteja
disponível no aparelho, a interface passa a orientar a atualização do Android
System WebView.

## Layout responsivo para tablets — 15/08/2026

```text
1.4.0-dev.36
versionCode 14036
APK remoto comunhao-1.4.0-dev.36.apk
SHA-256 d1a6f42edc96c4861cc2c779df6c68b056106c1521279d10da14ac552253167a
```

Remove o limite de largura de telefone aplicado pelo shell global. A partir de
600 px, o Comunhão passa a usar a largura disponível com gutters progressivos,
navegação e utilitários adaptativos. O comportamento cobre retrato e paisagem
em tablets compactos e grandes, preservando a apresentação atual nos celulares.
Na mesma validação, `gerar-token-livekit` foi republicada com a política CORS
atual. O preflight da origem nativa `https://localhost` passou de HTTP 403 para
HTTP 204, liberando a solicitação autenticada do token de áudio e vídeo.

## Inicialização sem chamada automática — 15/08/2026

```text
1.4.0-dev.37
versionCode 14037
APK remoto comunhao-1.4.0-dev.37.apk
SHA-256 9e28e28663760ab078e4c981670745693c5418d4fc5fe121765ca4af5ef7cf0b
```

Impede que um convite antigo ainda marcado como aceito abra a Sala de Oração
quando o aplicativo é iniciado. O remetente continua sendo encaminhado quando o
aceite novo chega via Realtime ou quando o polling observa a transição real de
`pendente` para `aceito`.

## Novo aceite e antessala da oração — 15/08/2026

```text
1.4.0-dev.38
versionCode 14038
APK remoto comunhao-1.4.0-dev.38.apk
SHA-256 d12d337dceb3c75c37154c339778c9bb3f9b7318d0dabcd96ab758700e18d76a
```

Aplica o layout aprovado aos temas Santuário e Amanhecer. A chamada recebida
oferece recusa, entrada com vídeo e entrada sem câmera. Depois do aceite, uma
antessala permite revisar microfone e câmera; a conexão LiveKit só começa quando
a pessoa confirma `Entrar na oração`. O fluxo possui cobertura automatizada dos
três caminhos de resposta e da confirmação dos dispositivos. O enquadramento
ambiental também passa a preencher toda a largura de tablets em retrato e
paisagem, em vez de permanecer limitado à largura de telefone.

## Correção da camada da chamada — 15/08/2026

```text
1.4.0-dev.39
versionCode 14039
APK remoto comunhao-1.4.0-dev.39.apk
SHA-256 a8e37be48a368aeecb9f7365baec3b98b3f77f25af45db7053755f597ab9894d
```

A chamada recebida passa a ser renderizada na camada modal raiz, acima dos
utilitários e da navegação persistente. Isso impede o corte dos botões de aceite
no Android. A altura acompanha o viewport visual do aparelho e nomes longos
permanecem dentro da largura útil.

## Fluxos de oração separados — 15/08/2026

```text
1.4.0-dev.40
versionCode 14040
APK remoto comunhao-1.4.0-dev.40.apk
SHA-256 3c8058d9f8f189d56f862ba7ccbcdf2653ad33284b9ce11f4dd9b9066f3cb9a1
```

Separa no banco e na interface o convite da dupla semanal do convite eventual
da Sala de Oração. O compromisso semanal passa por uma confirmação explícita,
evitando envio por toque residual depois de encerrar uma chamada. O saguão e a
sala conectada ganham a ação `Convidar alguém`; o aceite inclui a pessoa na mesma
sala LiveKit. A migration `20260815193000` adiciona origem, autoriza somente
participantes a convidar, limita a sala a 25 pessoas e finaliza os convites
quando a sala é encerrada.

## Figurinhas na Sala de Oração — 15/08/2026

```text
1.4.0-dev.41
versionCode 14041
APK remoto comunhao-1.4.0-dev.41.apk
SHA-256 323165efdaff656c34cd5a08199874998b80a6d847850a36a661c18df94c6d45
```

Adiciona 16 reações pentecostais nas coleções Essencial e Vibrante. O
seletor fica na barra da chamada, respeita celular, tablet, temas e preferência
de movimento reduzido. Cada reação é transmitida pelo canal confiável de dados
da sala LiveKit, aparece ao vivo para todos os presentes e não é persistida.

## Figurinhas nas mensagens — 15/08/2026

```text
1.4.0-dev.42
versionCode 14042
APK remoto comunhao-1.4.0-dev.42.apk
SHA-256 dee2fed900d5603f04e16bb7f2d7408b369b26f20f29f1b4a36a282fd429bbbf
```

Reutiliza as coleções Essencial e Vibrante no chat individual. A figurinha é
um conteúdo persistente próprio, exibido sem balão convencional, com remetente,
horário e confirmação de leitura. A migration `20260815220000` mantém as RLS,
fecha o catálogo permitido e adapta as notificações e clientes antigos por meio
de uma descrição textual acessível.

## Indicadores protegidos de usuários — 16/08/2026

```text
1.4.0-dev.43
versionCode 14043
APK remoto comunhao-1.4.0-dev.43.apk
SHA-256 a904023073c761746af909e9139aa613ec112aa5ca7c788247165b7536029eb1
```

Adiciona ao admin um painel protegido por `people.sensitive` com Kesef atual e
movimentado, acessos agregados por área e principais vínculos de interação. Não
expõe conteúdo privado, audita cada consulta e consolida a telemetria detalhada
após 90 dias.

## Design System de botões — 16/08/2026

```text
1.4.0-dev.44
versionCode 14044
APK local comunhao-1.4.0-dev.44-debug.apk
SHA-256 5a36ae2646b33a0b6db133fa939c58774428aff40b4463829a77b07e16e3c02b
```

Padroniza as ações comuns com `Button`, `IconButton` e `InstitutionalAction`.
Resgate, reserva, moderação, gerenciamento de pessoas, guias e painéis
administrativos passam a seguir o mesmo componente visual. Abas, filtros,
controles de quantidade, QR Code, NFC e chamadas continuam especializados.

Este pacote foi gerado somente para validação local e ainda não foi publicado
no canal online.

## Estado operacional consolidado — 21/08/2026

`dev.44` (`versionCode 14044`) continua sendo o APK pré-release local usado
exclusivamente pelo responsável pelo produto. Ele não substitui a versão de
produção e ainda não está disponível no manifesto online.

O canal online do grupo piloto permanece separado: usa o canal lógico
`testing`, a pasta remota `app-updates/development` e o manifesto
`app-updates/development/version.json`. Produção usa o manifesto próprio em
`app-updates/production/version.json` e permanece intocada.
