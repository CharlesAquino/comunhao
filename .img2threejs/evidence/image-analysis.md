# Kesef — análise visual da referência

## Identificação

- Objeto: moeda/medalha metálica circular, domínio `object`, confiança 0,98.
- Uso-alvo: objeto-herói 3D em tempo real para a Carteira do aplicativo.
- Adequação: condicional; a face frontal é clara, mas a referência de 500 × 500 px não mostra verso nem espessura.

## Forma e hierarquia

- Silhueta radial, circular, com perspectiva frontal quase ortográfica.
- Macro: corpo cilíndrico espesso e aro periférico.
- Meso: borda externa desgastada, dois anéis de contas, campo frontal rebaixado e relevo central.
- Micro: inscrição hebraica, chama, pontos ornamentais, pitting, variação de pátina e desgaste de borda.
- Relações: o campo frontal é coplanar/rebaixado dentro do aro; inscrições e ornamentos ficam em relevo sobre a face; o corpo conecta frente e verso.

## Materiais observados

- Metal envelhecido, opaco, com base marrom-cobre escura e destaques bronze/dourados.
- Metalness alta; roughness média/alta e não uniforme.
- Pitting e granulação distribuídos pelo campo; cavidades mais escuras e bordas salientes mais polidas.
- A textura frontal contém iluminação já incorporada; será usada como evidência visual/textura controlada, não como albedo fisicamente exato.

## Características de identidade

- Inscrição hebraica `כסף` em relevo.
- Chama central inferior.
- Arco de pontos ao redor da chama.
- Dois anéis de contas próximos ao perímetro.
- Pátina bronze escura com desgaste dourado irregular nas bordas.
- Assimetria sutil do desgaste, apesar da geometria radial.

## Incertezas assumidas

- O verso será uma interpretação simples e coerente, sem alegar fidelidade histórica.
- A espessura e o perfil lateral serão proporcionais à leitura visual de uma medalha robusta.
- O relevo fino será preservado prioritariamente pela textura frontal; geometria real será usada no corpo, aro e profundidade lateral.
- Não há resolução suficiente para reconstruir microarranhões como geometria individual.

## Contrato inicial

- A face frontal parada deve manter a identidade da imagem original na escala de uso da Carteira.
- Uma inclinação de 45–75° deve revelar espessura, aro e resposta metálica coerentes.
- A cena deve possuir fallback 2D, movimento reduzido, pausa fora da viewport e qualidade adaptativa.
