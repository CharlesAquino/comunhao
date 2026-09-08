# Integração contínua da Home — 08/09/2026

## Resultado confirmado

A Home usa HomeJourneySurface para compartilhar uma arte contínua por tema entre a missão, EBD, Estudos e a chegada à comunidade. Os traços finos e a textura de Louvor foram referências diretas. O usuário aprovou a versão com Bíblia antiga aberta, cujas páginas se prolongam nos traços dourados. O tema claro recebeu o mesmo motivo com material marfim e sálvia próprios, sem clarear a imagem escura com filtros.

A moldura e os dados da Missão permanecem nos componentes de produção. Títulos, nomes, estados e botões continuam em HTML. A imagem decorativa não contém controles. As junções internas estão pintadas no arquivo; a máscara CSS atua somente nas extremidades externas para encontrar o shell.

## Implementação

- Artes finais: src/assets/estudos/home-journey-dark-v2.png e home-journey-light-v2.png. Originais preservados.
- Estrutura: src/components/home/HomeJourneySurface.tsx, consumida em src/pages/Home.tsx.
- CSS específico: src/styles/home-journey.css. A formação mantém uma coluna e usa o tamanho do contêiner para alinhar conteúdo e motivos.
- Removida a regra antiga de grid-template-rows com !important no tablet, que colocava Estudos sobre o pergaminho.
- Em 320 px, título e chamada de Estudos têm linha própria, com texto complementar limitado à área livre da Bíblia.
- No tema claro, os CTAs compactos compartilham a mesma camada de iluminação de Orar com Sophia, definida em src/index.css. Removida a textura escura herdada que apagava o dourado; raio proporcional em home-editorial.css.
- A composição local é uma extensão editorial autorizada pelo usuário; reutiliza os componentes e ações existentes, sem introduzir nova primitive.

## Verificação local

Capturas do navegador com componentes reais e dados fictícios em home-journey-preview.html/tsx:

| Viewport | Temas | Resultado |
| --- | --- | --- |
| 320 × 800 | escuro e claro | Sem overflow horizontal; textos dentro das seções; ajuste de quebra estreita |
| 390 × 844 | escuro e claro | Junção da missão, pergaminho e Bíblia inspecionada |
| 768 × 1024 | escuro e claro | Grid corrigido; EBD e Estudos sobre suas áreas próprias |
| 1024 × 768 | escuro e claro | Coluna central mantida; Bíblia íntegra; rolagem até comunidade |

Os CTAs de EBD e Estudos mediram 44 px de altura em todos os viewports verificados. Acionamento dos dois callbacks, convite/cancelamento fictícios, ausência de missão e estado Em preparação verificados na prévia. Sem erros ou avisos no console na verificação. O snapshot mostra rótulos acessíveis e estado desabilitado no convite pendente.

Lint aprovado. Seis testes existentes de homeCards aprovados. Build Vite/PWA aprovado, com aviso preexistente de depreciação de inlineDynamicImports.

## Evidências e limites

- 390-dark-final.jpg e 390-light-final.jpg: transição da missão até Estudos.
- 320-light-final.jpg: composição estreita e botões claros corrigidos.
- 768-dark-final.jpg, 768-light-final.jpg, 1024-dark-final.jpg, 1024-light-final.jpg: composição de tablet.
- responsive-metrics.json: medidas observadas no navegador.
- image-prompts.md: ferramenta integrada ImageGen, referências e sequência de prompts.

As capturas foram recebidas diretamente do navegador e gravadas sem alteração visual no workspace. O exportador direto do conector não reconheceu este caminho de workspace; a gravação usou a imagem retornada pelo próprio conector.

A evidência é da prévia local, não de uma sessão autenticada nem de um APK em dispositivo físico. Não houve publicação, alteração de backend ou envio remoto. A revisão não certifica acessibilidade integral nem todos os comprimentos possíveis de conteúdo.

