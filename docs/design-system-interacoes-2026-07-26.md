# Design System de Interações — Santuário Contemporâneo

**Status:** aprovado  
**Data:** 26/07/2026  
**Escopo:** botões, ícones, navegação, abas e controles interativos  
**Temas:** claro e escuro

## Direção aprovada

A interface deve comunicar acolhimento, presença e contemporaneidade. A
identidade utiliza textura orgânica e materiais glass, mas evita aparência
medieval, heráldica ou excessivamente metálica.

Características:

- superfícies translúcidas com textura quase imperceptível;
- iluminação interna curta e difusa;
- profundidade 3D moderna criada por camadas de sombra;
- ícones lineares e semanticamente claros;
- menta como cor de ação, presença e seleção;
- bronze restrito a pequenos detalhes, foco e celebração;
- movimentos entre 1 e 2 px, sem animações cenográficas;
- paridade de contraste e hierarquia entre os temas.

## O que evitar

- medalhões metálicos repetidos;
- brasões em todos os ícones;
- bordas bronze grossas;
- recortes ornamentais ou aparência de pergaminho;
- sombras duras, bisel e relevo metálico;
- ícones decorativos que prejudiquem a compreensão;
- texturas com contraste suficiente para competir com o conteúdo.

O emblema Luz Compartilhada continua sendo a marca principal, usada em login,
ícone do aplicativo e momentos institucionais. Ele não deve substituir todos
os ícones funcionais.

## Primitivas

### `Button`

Arquivo: `src/components/ui/Button.tsx`

Uso para ações com rótulo:

- `primary`: ação principal;
- `secondary`: alternativa neutra;
- `ghost`: ação discreta;
- `danger`: ação destrutiva;
- `icon`: reservado a compatibilidade; prefira `IconButton`.

Estados obrigatórios: repouso, hover, foco, pressionado e desabilitado.

### `IconButton`

Arquivo: `src/components/ui/IconButton.tsx`

Uso para ações cujo conteúdo visual é somente um ícone. Exige `label`, usado em
`aria-label` e `title`.

### `PrayerActionButton`

Arquivo: `src/components/ui/PrayerActionButton.tsx`

CTA próprio da Home:

- `prayer`: “Convidar {par da semana}” — convite direto para a dupla;
- `care`: “Sala de Oração” — entrada para pedido, intercessão e presença ao vivo.

Os dois aparecem lado a lado, com dimensões simétricas. A diferença de
hierarquia vem de cor e contraste, não de tamanho. Eles não podem apontar para
o mesmo destino nem repetir a mesma intenção.

O texto das ações críticas permanece visível. Ícones próprios podem assumir
maior presença conforme o reconhecimento for validado, mas legenda só pode ser
removida com teste de compreensão, contexto inequívoco e `aria-label`.

## Controles especiais

Nem todo `<button>` deve virar um botão de ação genérico. Os seguintes
controles mantêm semântica própria e usam classes normativas:

| Classe | Uso |
|---|---|
| `sanctuary-tab` | abas internas |
| `sanctuary-choice` | alternativas e seletores |
| `sanctuary-switch` | estados binários; disponibilidade somente dentro da Sala |
| `sanctuary-disclosure` | expandir patente, lição ou painel |
| `sanctuary-mini-action` | fechar toast ou ação contextual pequena |
| `field-icon-button` | exibir/ocultar senha |
| `sanctuary-control` | controles compostos, como avatar |
| `mural-create-button` | ação flutuante para criar pedido |

## Navegação inferior

A navegação deve parecer um painel glass suavemente suspenso:

- fundo translúcido com blur;
- textura em baixa opacidade;
- iluminação interna superior;
- sombra externa longa e difusa;
- ícones em contêineres simples de cantos suaves;
- item ativo em menta, com indicador inferior fino;
- sem medalhões, textura metálica ou brasões repetidos.

O botão flutuante do Mural é alinhado à coluna real do aplicativo, inclusive em
telas largas, e permanece completamente acima da navegação e da área segura.

## Profundidade 3D

A profundidade é construída com:

1. linha interna clara de 1 px;
2. halo interno de baixa opacidade;
3. sombra curta de contato;
4. sombra longa e difusa;
5. elevação de até 2 px no hover;
6. compressão de aproximadamente `0.985` ao pressionar.

Não usar rotação perceptível, perspectiva dramática ou sombras pretas duras.
Com `prefers-reduced-motion`, transições são reduzidas.

## Temas

### Claro

- canvas marfim;
- superfícies brancas/pedra translúcidas;
- texto principal escuro;
- ação primária verde;
- sombra com baixa opacidade;
- textura quase invisível.

### Escuro

- canvas verde-preto;
- superfícies grafite translúcidas;
- texto principal pergaminho claro;
- ação primária menta;
- iluminação interna um pouco mais perceptível;
- textura suave, nunca ruidosa.

## Cobertura

A padronização foi aplicada em:

- Home e CTAs de oração;
- menu inferior;
- Mural;
- EBD;
- Tesouro;
- Perfil, Carteira, Comunidade, Ranking e Guia;
- Admin;
- Chat;
- Timer e salas de oração;
- Login, cadastro, OTP e recuperação.

As ações comuns usam as três primitivas. Os botões diretos restantes são
somente controles especiais listados neste documento.

## Disponibilidade e fluxo legado “Levantar a mão”

A disponibilidade para orar não é permanente nem controlada na Home. Ela vive
na Sala de Oração, exige período de 15, 30 ou 60 minutos e uma ou mais
modalidades entre silêncio, texto, voz e vídeo. A Home apenas apresenta pessoas
cuja disponibilidade real ainda está vigente.

O fluxo técnico historicamente chamado “Levantar a mão” continua existindo
como sessão comunitária, mas não define mais o rótulo nem o CTA principal da
Home:

1. cria ou retoma uma sessão aberta;
2. mostra o modal de oração com cronômetro;
3. lista participantes em tempo real;
4. permite que outros membros entrem pela comunidade;
5. permite sair ou encerrar com “Amém”;
6. preserva uma tela final antes de fechar.

A RPC `abrir_sessao_grupo` é idempotente. Uma sessão aberta anteriormente é
retomada em vez de gerar `SESSAO_JA_ABERTA`.

## Validação de referência

Na aprovação desta direção:

- 59 testes passaram;
- build Vite e PWA concluíram;
- 12 capturas autenticadas foram realizadas em 390 × 844;
- temas claro e escuro foram verificados;
- o fluxo real de abertura e encerramento da sala foi exercitado;
- nenhuma ocorrência foi registrada no console na captura final.
