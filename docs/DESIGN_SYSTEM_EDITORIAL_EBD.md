# Design System Editorial da EBD

**Versão:** 1.0  
**Criado em:** 10/08/2026  
**Escopo:** Estúdio Editorial, geração por IA, capas e jornada publicada

## Princípio

Cada informação deve cumprir uma função sem competir com outra. Dia, tema,
objetivo e imagem formam uma hierarquia; não são variações do mesmo título.

## Hierarquia semântica

| Nível | Função | Exemplo |
|---|---|---|
| Rótulo temporal | Localiza o aluno na semana | `Segunda-feira` |
| Propósito | Explica a etapa pedagógica | `Descobrir` |
| Título | Nomeia o assunto do dia | `O fim da liderança de Gideão` |
| Subtítulo | Delimita ou complementa o assunto | `O governo de Abimeleque` |
| Capa | Cria atmosfera e reconhecimento visual | imagem com dia/data e chamada temática |

### Regra antirrepetição

- O dia da semana aparece uma vez na interface como rótulo temporal.
- O título nunca pode ser apenas `Segunda-feira`, `Terça-feira` etc.
- O subtítulo não repete o título.
- A capa pode incorporar o dia ou a data como parte da direção artística. Esse
  rótulo deve continuar existindo uma vez no HTML para leitores de tela e para
  situações em que a imagem não carregue.
- A capa pode trazer a chamada temática, mas não substitui o título acessível nem
  o texto alternativo. Evitar duração e CTA dentro da arte, pois são informações
  funcionais e mutáveis.
- Quando a arte já contiver o dia, a repetição visual entre capa e rótulo HTML é
  intencional por acessibilidade. O que não pode ocorrer é usar novamente o nome
  do dia como título temático da página.

No exemplo auditado havia três ocorrências de `segunda-feira`: rótulo, título e
capa. O contrato correto preserva duas: o rótulo HTML acessível e o elemento
gráfico da capa. O título da página deve apresentar o assunto estudado.

## Escrita e concordância

- Usar português brasileiro e revisar concordância nominal e verbal.
- Preferir voz ativa, frases diretas e vocabulário acolhedor.
- Preservar nomes bíblicos, referências e sentido teológico da fonte vinculada.
- Não inventar citações. Citação literal exige referência verificável.
- Títulos usam caixa de frase: maiúscula inicial e nomes próprios; evitar Todas
  As Palavras Em Maiúscula.
- Títulos não terminam com ponto. Perguntas preservam `?`.
- Evitar caixa alta em textos longos; reservá-la a rótulos curtos.
- Não usar dois espaços, reticências decorativas ou exclamações em sequência.
- Manter tratamento coerente: preferir `você` nas instruções ao aluno.

## Semântica por campo

### Título

- responde: “qual assunto estudaremos?”;
- recomendado: 35 a 80 caracteres;
- limite técnico: 120 caracteres;
- não começa pelo dia da semana nem pelo nome da etapa pedagógica.

### Subtítulo

- responde: “qual recorte ou tensão orienta o estudo?”;
- uma frase curta, sem repetir o título;
- pode ficar vazio quando não acrescentar informação.

### Corpo e reflexão

- um parágrafo, uma ideia central;
- explicar termos incomuns antes de aplicá-los;
- perguntas de reflexão devem ser abertas, respeitosas e não indutivas;
- dados sensíveis nunca devem ser exigidos como resposta.

### Botões e estados

- usar verbo + objeto: `Continuar jornada`, `Verificar resposta`;
- comunicar consequência antes de publicação ou exclusão;
- erros dizem o que ocorreu e como corrigir, sem código técnico ao aluno.

## Fluxo de revisão

1. **Semântica:** cada campo cumpre sua função?
2. **Fonte:** afirmações e referências correspondem ao material vinculado?
3. **Língua:** ortografia, pontuação e concordância estão corretas?
4. **Tom:** o texto é acolhedor, reverente e adequado à faixa etária?
5. **Redundância:** dia, título, subtítulo, capa e CTA repetem informação?
6. **Acessibilidade:** imagem possui texto alternativo; informação não depende
   apenas de imagem, cor ou caixa alta?
7. **Preview:** revisar em mobile e desktop antes de publicar.

## Validações automáticas iniciais

O código bloqueia publicação diária quando:

- o título está vazio;
- o título repete o rótulo do dia;
- o subtítulo repete o título;
- existem espaços repetidos em título ou subtítulo.

Ortografia, concordância, fidelidade teológica e texto incorporado em imagem
continuam exigindo revisão humana. Um corretor automático futuro pode sugerir
ajustes, mas não deve alterar conteúdo publicado silenciosamente.
