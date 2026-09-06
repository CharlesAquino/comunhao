# Sessão de 15/08/2026 — chamadas, salas e figurinhas

> Registro operacional append-only das implementações publicadas entre
> `1.4.0-dev.34` e `1.4.0-dev.42`. O documento diferencia o que foi confirmado
> por código, banco e automação do que ainda depende de validação em aparelhos.

## 1. Estado ao encerrar

| Item | Estado confirmado |
|---|---|
| Release development vigente | `1.4.0-dev.42` (`versionCode 14042`) |
| Application ID | `br.com.igreja.oracao.dev` |
| Canal do atualizador | canal lógico `testing`, pasta remota `app-updates/development` |
| APK remoto | `comunhao-1.4.0-dev.42.apk` |
| SHA-256 | `dee2fed900d5603f04e16bb7f2d7408b369b26f20f29f1b4a36a282fd429bbbf` |
| Projeto Supabase | `csxrhvgfnkqmkehgmnkp` |
| Testes ao encerrar | 41 arquivos, **192 testes aprovados** |
| Lint | aprovado, sem erros |
| Build | Vite/PWA e Android debug aprovados |
| Migrations de hoje | `20260815003000`, `20260815193000`, `20260815220000` aplicadas remotamente |

Endereços vigentes:

- APK: `https://csxrhvgfnkqmkehgmnkp.supabase.co/storage/v1/object/public/app-updates/development/comunhao-1.4.0-dev.42.apk`;
- manifesto: `https://csxrhvgfnkqmkehgmnkp.supabase.co/storage/v1/object/public/app-updates/development/version.json`.

## 2. Problemas que motivaram o trabalho

Foram tratados quatro grupos de problemas relacionados:

1. chamadas de voz e vídeo não sinalizavam ou falhavam antes de solicitar a
   mídia no Android;
2. um convite aceito antigo podia reabrir uma chamada, e a dupla semanal podia
   receber convite involuntário depois do encerramento de outra sala;
3. o fluxo entrava diretamente na conexão sem uma antessala para revisar
   microfone e câmera, e não permitia convidar outras pessoas de dentro do
   saguão ou da chamada;
4. a comunidade queria reações visuais pentecostais na sala e, depois, o mesmo
   catálogo persistente nas mensagens individuais.

Também foi corrigida a geometria global que mantinha o app com largura de
telefone em tablets, incluindo o Samsung Tab S9 Plus informado no teste.

## 3. Chamadas de voz e vídeo

### 3.1 Sinalização e contingência

A release `dev.34` habilitou `convites_oracao` no Realtime e manteve uma
consulta de contingência a cada quatro segundos. Assim, uma indisponibilidade
ou atraso do evento Realtime não elimina completamente a detecção do convite.

O Android passou a declarar os acessos necessários a microfone, câmera e
ajustes de áudio. O modo escolhido no convite é preservado na entrada: uma
chamada de vídeo prepara a câmera; uma chamada de voz não a liga por engano.

Migration aplicada: `20260815003000_habilitar_realtime_convites_oracao.sql`.

### 3.2 Contexto seguro no Android

A `dev.35` separou corretamente os ambientes:

- navegador comum continua exigindo `localhost` ou HTTPS para
  `getUserMedia`;
- Capacitor Android pode seguir para a solicitação nativa de permissão;
- aparelhos sem API de mídia recebem orientação para atualizar o Android
  System WebView.

Na `dev.36`, a Edge Function `gerar-token-livekit` foi republicada com a
política CORS vigente. O preflight da origem nativa `https://localhost` foi
confirmado com HTTP 204.

### 3.3 Antessala e aceite explícito

A `dev.38` introduziu o fluxo inspirado em aplicativos de reunião:

```text
convite recebido
       ↓
recusar | entrar com vídeo | entrar sem câmera
       ↓
antessala: revisar microfone e câmera
       ↓
Entrar na oração
       ↓
conexão LiveKit
```

A mídia só é conectada à sala depois da confirmação. O desenho foi aplicado
aos temas Santuário e Amanhecer e inclui mensagem de privacidade sobre a
ativação da câmera.

A `dev.39` moveu o convite recebido para a camada modal raiz, acima dos
utilitários e da navegação. Isso evita que os botões sejam cortados no Android.
A altura segue o viewport visual e nomes longos respeitam a largura útil.

## 4. Tablets e geometria responsiva

A `dev.36` removeu do shell global o limite fixo de largura de telefone. A
partir de 600 px, o layout usa a largura disponível com gutters progressivos,
preservando o comportamento dos celulares.

Foram contemplados em código:

- tablets compactos e grandes;
- retrato e paisagem;
- fundo ambiental preenchendo o viewport;
- navegação e utilitários adaptativos;
- safe areas e viewport dinâmico do Android.

**Limite de evidência:** o código e o build estão confirmados. A validação
visual final em todas as dimensões reais de tablet continua sendo QA manual.

## 5. Separação dos contextos de oração

### 5.1 Dupla semanal versus Sala de Oração

A `dev.40` formalizou duas origens distintas em `convites_oracao`:

- `dupla_semana`: compromisso com a dupla definida para a semana;
- `sala_oracao`: convite eventual para uma sala comunitária.

Essa separação impede que encerrar uma sala eventual dispare automaticamente
um convite para a dupla semanal. O convite da dupla exige confirmação
explícita antes do envio, reduzindo toque residual ou ação involuntária.

A inicialização também deixou de interpretar um registro antigo já aceito
como uma chamada nova (`dev.37`). O encaminhamento do remetente continua
ocorrendo quando uma transição real de `pendente` para `aceito` é observada.

### 5.2 Convites dentro da sala

O saguão e a sala conectada receberam a ação **Convidar alguém**. A pessoa
selecionada recebe um convite do tipo `sala_oracao` e, ao aceitar, entra no
mesmo identificador de sala LiveKit.

O banco aplica as seguintes regras:

- somente participante atual pode convidar;
- o convite referencia a sala de origem;
- a sala admite no máximo 25 participantes pelo contrato atual;
- convites relacionados são finalizados quando a sala é encerrada;
- identidade segue `auth.uid() → usuarios.auth_user_id → usuarios.id`.

Migration aplicada:
`20260815193000_separar_origem_e_convites_sala.sql`.

## 6. Pacote de figurinhas Comunhão

### 6.1 Direção visual aprovada

Foram preservados dois formatos oficiais com a mesma geometria:

- **Essencial:** verdes, âmbar e tons equilibrados;
- **Vibrante:** amarelo, coral, turquesa, azul, violeta e verde Comunhão.

Ambos usam linguagem de figurinha contemporânea, contorno claro, personagens
jovens e boa leitura nos temas Santuário e Amanhecer. Os painéis finais estão
versionados em:

- `src/assets/stickers/comunhao-essencial-v1.png`;
- `src/assets/stickers/comunhao-vibrante-v1.png`.

### 6.2 Catálogo fechado

O catálogo compartilhado contém 16 IDs:

| ID | Rótulo acessível |
|---|---|
| `eita-gloria` | Eita glória! |
| `aleluia` | Aleluia! |
| `amem` | Amém! |
| `paz-do-senhor` | A paz do Senhor |
| `deus-e-fiel` | Deus é fiel |
| `estou-orando` | Estou orando |
| `conte-comigo` | Conte comigo |
| `recebo` | Recebo! |
| `fogo-santo` | Fogo Santo |
| `renovo` | Renovo |
| `avivamento` | Avivamento |
| `marchando-em-fe` | Marchando em fé |
| `vitoria` | Vitória! |
| `gloria-a-deus` | Glória a Deus! |
| `de-joelhos` | De joelhos |
| `juntos-em-oracao` | Juntos em oração |

A definição canônica está em
`src/services/prayerStickerService.ts`. As duas artes são sprites 4×4 e
compartilham linha, coluna, ID e rótulo.

### 6.3 Uso efêmero na Sala de Oração

A `dev.41` adicionou um botão de figurinhas à barra da chamada. O seletor:

- alterna entre Essencial e Vibrante;
- apresenta os 16 itens;
- funciona em celular e tablet;
- possui nomes acessíveis e foco visível;
- respeita `prefers-reduced-motion`.

Ao selecionar uma figurinha, o cliente publica um `Uint8Array` pelo canal de
dados confiável do LiveKit, com o tópico
`comunhao.prayer-sticker.v1`. O payload validado contém versão, ID, pacote e
horário de envio. Todos os participantes conectados veem a reação e o nome de
quem enviou; o remetente renderiza a própria reação imediatamente.

As reações da sala:

- desaparecem após aproximadamente 3,2 segundos;
- não são gravadas no PostgreSQL;
- não entram no histórico nem geram notificação;
- usam animação de entrada/saída da composição. As personagens não possuem
  animação quadro a quadro nesta versão.

### 6.4 Uso persistente nas mensagens

A `dev.42` reutilizou o mesmo seletor no chat individual. Ao contrário da sala,
a figurinha do chat é persistente e permanece no histórico.

O compositor oferece o botão de figurinhas ao lado do campo de texto. A
mensagem visual aparece sem balão convencional, mas preserva:

- remetente e destinatário;
- data e hora do servidor;
- estado de leitura;
- descrição textual acessível;
- resumo na caixa de conversas;
- notificação interna adequada ao tipo.

O schema de `mensagens` passou a ter:

| Campo | Contrato |
|---|---|
| `tipo` | `texto` ou `figurinha`; padrão `texto` |
| `figurinha_id` | ID fechado do catálogo ou `null` |
| `figurinha_pacote` | `essencial`, `vibrante` ou `null` |
| `texto` | texto normal ou rótulo acessível/fallback da figurinha |

O banco rejeita combinações incoerentes, IDs desconhecidos e pacotes fora da
lista. As mensagens antigas continuam válidas pelo `default 'texto'`.

As RLS existentes foram mantidas:

- remetente autenticado só insere em seu próprio nome;
- apenas remetente e destinatário leem a conversa;
- somente o destinatário marca a mensagem como lida.

Migration aplicada: `20260815220000_figurinhas_mensagens.sql`.

## 7. Arquivos centrais afetados

| Área | Arquivos principais |
|---|---|
| Sala LiveKit | `src/pages/SalaOracao.tsx`, `src/services/prayerRoomService.ts` |
| Antessala | `src/components/oracao/PrayerPreJoin.tsx` |
| Convite para sala | `src/components/oracao/RoomInvitePicker.tsx`, `src/services/conviteService.ts` |
| Catálogo | `src/services/prayerStickerService.ts` |
| Componentes de figurinha | `src/components/oracao/PrayerSticker.tsx`, `PrayerStickerPicker.tsx` |
| Chat persistente | `src/pages/Chat.tsx`, `src/services/mensagemService.ts` |
| Estilos | `src/index.css` |
| Android | `android/app/build.gradle`, manifesto e assets sincronizados pelo Capacitor |
| Releases | `release/development/*` |

## 8. Migrations aplicadas no ambiente remoto

| Migration | Finalidade | Estado |
|---|---|---|
| `20260815003000_habilitar_realtime_convites_oracao.sql` | Realtime dos convites | Aplicada |
| `20260815193000_separar_origem_e_convites_sala.sql` | Origem dos convites, convite interno e limite da sala | Aplicada |
| `20260815220000_figurinhas_mensagens.sql` | Tipo persistente de figurinha no chat | Aplicada |

Antes da última aplicação, o preflight remoto mostrou exclusivamente
`20260815220000` pendente. Depois, `supabase db push` confirmou sua aplicação.

## 9. Linha de releases publicadas em 15/08

| Release | Entrega principal | SHA-256 |
|---|---|---|
| `dev.34` | Sinalização de chamadas e permissões Android | `d192e13ae6d6e2ac25adad9d855fc4ebb2b0b03ea8379fc8eafb9d2380fa782d` |
| `dev.35` | Contexto seguro de mídia no Capacitor | `13845c760d6e012001b65858b33bd2ecf24941653ddf756b4e0b600ad42f3d51` |
| `dev.36` | Layout responsivo para tablets e CORS LiveKit | `d1a6f42edc96c4861cc2c779df6c68b056106c1521279d10da14ac552253167a` |
| `dev.37` | Sem reabertura automática de convite antigo | `9e28e28663760ab078e4c981670745693c5418d4fc5fe121765ca4af5ef7cf0b` |
| `dev.38` | Novo aceite e antessala | `d12d337dceb3c75c37154c339778c9bb3f9b7318d0dabcd96ab758700e18d76a` |
| `dev.39` | Camada modal correta da chamada | `a8e37be48a368aeecb9f7365baec3b98b3f77f25af45db7053755f597ab9894d` |
| `dev.40` | Contextos separados e convite dentro da sala | `3c8058d9f8f189d56f862ba7ccbcdf2653ad33284b9ce11f4dd9b9066f3cb9a1` |
| `dev.41` | Figurinhas efêmeras na Sala de Oração | `323165efdaff656c34cd5a08199874998b80a6d847850a36a661c18df94c6d45` |
| `dev.42` | Figurinhas persistentes nas mensagens | `dee2fed900d5603f04e16bb7f2d7408b369b26f20f29f1b4a36a282fd429bbbf` |

## 10. Validação executada

Confirmado ao encerrar:

- `npm run lint`: aprovado;
- `npm test`: 41 arquivos e 192 testes aprovados;
- `npm run build`: aprovado;
- `npm run apk:development`: APK dev.42 gerado;
- publicação remota: APK enviado antes do manifesto;
- manifesto público verificado pelo script de publicação;
- SHA-256 local e remoto correspondente;
- migration do chat aplicada depois de preflight remoto.

## 11. QA manual ainda necessário

O seguinte não deve ser descrito como comprovado até o teste planejado com
dois celulares:

1. abrir uma sala de voz e outra de vídeo em dois aparelhos;
2. validar convite pela dupla e convite eventual sem cruzamento de contexto;
3. convidar uma terceira pessoa pelo saguão e durante a chamada;
4. enviar as 16 figurinhas nos dois sentidos e nos dois pacotes;
5. confirmar desaparecimento da reação da sala sem persistência;
6. enviar figurinha pelo chat e confirmar histórico, hora, leitura, lista de
   conversas e notificação;
7. repetir em Santuário e Amanhecer;
8. validar celular compacto e Samsung Tab S9 Plus em retrato e paisagem;
9. observar consumo e tempo de primeiro carregamento dos sprites em rede móvel.

## 12. Limites e próximos refinamentos

- As figurinhas são imagens estáticas com animação de apresentação; animação
  interna estilo Lottie/WebM ainda não foi implementada.
- Os dois sprites PNG somam aproximadamente 5,7 MB. Eles ficam associados aos
  chunks lazy de Sala/Chat, mas uma futura conversão para WebP/AVIF deve ser
  avaliada sem degradar texto ou transparência.
- Figurinhas persistentes estão no chat individual existente; não existe chat
  persistente de grupo dentro da sala.
- A sala suporta até 25 participantes pelo contrato do banco, mas capacidade
  audiovisual real depende da infraestrutura LiveKit, banda, CPU, topologia e
  plano contratado. O limite do banco não prova qualidade simultânea para 25.
- Não foi criada migration para reações da sala porque elas são deliberadamente
  efêmeras.

## 13. Regra de continuidade

Qualquer ampliação do catálogo exige atualizar em conjunto:

1. `PRAYER_STICKERS` e os sprites com geometria compatível;
2. constraints fechadas de `mensagens` por nova migration;
3. nomes acessíveis e ortografia;
4. testes de codificação/decodificação;
5. QA nos dois temas, celular e tablet.

Não reutilizar o canal efêmero LiveKit como histórico de conversa e não
armazenar figurinhas do chat como tokens ocultos dentro de mensagens de texto.
