# Constituição Visual

> Toda tela do Sala de Oração deve ser reconhecível em menos de um segundo,
> mesmo sem a logo.

## Sensação do lugar

O Sala de Oração é um espaço digital de comunhão. A interface deve desaparecer
para que a comunhão permaneça. Toda tela deve transmitir pelo menos três destas
sensações: acolhimento, reverência, esperança, calma, pertencimento e propósito.

Nunca deve transmitir urgência constante, excesso de informação, agressividade
ou competição. Também não deve parecer cassino, banco, painel corporativo, rede
social tóxica, jogo ou gibi.

## Cultura material

As referências são madeira, bronze envelhecido, pedra, linho, folhas e luz
quente. Vidro cromado, plástico, neon, carbono e metal futurista não pertencem
à identidade.

## Vocabulário

- **O verde não é o fundo; o verde é a vida.** Ele é reservado para presença,
  ação, progresso, foco e estados positivos;
- verde musgo e sálvia significam vida, presença e esperança;
- bronze e âmbar significam fidelidade e celebração, não riqueza;
- rosa queimado significa cuidado e atenção humana;
- marfim oferece luz e contraste sem recorrer ao branco agressivo;
- Inter organiza a interface; Fraunces marca missão, versos e momentos de
  significado;
- folhas discretas, anéis de presença e insígnias heráldicas reforçam o lugar.

Os materiais semânticos são:

- noite: canvas e silêncio;
- pedra: cards e superfícies comuns;
- madeira: navegação e elementos de apoio;
- folha: ações e presença viva;
- bronze: patentes e memória;
- luz quente: missão, celebração e reconhecimento;
- pergaminho: texto principal.

## Composição

O espaço vazio permite que a oração respire. Superfícies são sólidas,
silenciosas e claramente hierarquizadas. Bordas são discretas, raios contidos e
sombras raras. Uma tela não deve acumular brilho, gradiente, glassmorphism e
movimento simultaneamente.

Toda tela segue a hierarquia:

```text
canvas → hero → conteúdo principal → conteúdo secundário → navegação
```

Deve existir no máximo um hero e um ponto focal primário por tela.

## Movimento

Tudo desacelera. Entradas parecem respiração, vento ou luz; interações respondem
sem chamar atenção para si. Nada explode, pisca, pulsa continuamente ou compete
com a oração. `prefers-reduced-motion` é obrigatório.

## Contrato de implementação

- componentes consomem tokens semânticos definidos em `src/index.css`;
- cores literais não são contrato de componente nem devem se espalhar por telas;
- primitives reutilizáveis vivem em `src/components/ui/`;
- componentes de domínio são extraídos somente quando expressam significado
  recorrente do produto;
- controles interativos possuem alvo mínimo de 44 × 44px, foco visível,
  semântica apropriada e contraste AA sempre que possível;
- Inter serve interface e corpo; Fraunces serve missão, versos e destaques
  emocionais;
- telas novas reutilizam primitives antes de criar variações locais.

## Elementos proibidos

- azul elétrico, vermelho neon e gradientes arco-íris;
- sombras gigantes e glows concorrentes;
- glassmorphism exagerado;
- cards excessivamente arredondados;
- ilustração cartoon;
- estética gamer, e-sports, NFT, fantasy RPG ou militar;
- texto funcional menor que 11px;
- símbolos que dependam apenas de cor.

## Heráldica

As patentes oficiais são Servo Fiel, Guardião, Intercessor, Atalaia,
Discipulador, Missionário, Conselheiro e Pacificador. Todas usam o mesmo escudo,
borda dupla, bronze envelhecido, fundo musgo e profundidade. Apenas o símbolo e
a cor secundária variam.

Os SVGs e tokens canônicos vivem em `src/assets/badges/`. A progressão e os
limiares vivem em `src/services/patente.ts`.

## Critério de revisão

Antes de aceitar uma tela, responder:

1. Ela parece pertencer ao Sala de Oração sem a logo?
2. Existe apenas um ponto focal?
3. O verde representa vida ou está sendo usado apenas como cor?
4. A tela transmite acolhimento ou apenas informação?
5. Hierarquia, contraste, foco, movimento e toque permanecem acessíveis?

Qualquer resposta negativa exige revisão. Uma nova tela deve parecer inevitável:
coerente com o lugar, sem novidade visual gratuita. O procedimento executável
de revisão vive em `.ai/skills/design-review/SKILL.md`.
