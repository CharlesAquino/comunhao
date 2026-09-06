# Three.js e React Three Fiber

## Escolha de arquitetura

Preferir React Three Fiber em projetos React quando componentes, estado,
suspense e composição declarativa trouxerem benefício. Usar Three.js puro para
uma cena isolada, integração imperativa existente ou runtime sem React. Não
envolver uma cena Three.js madura em R3F apenas por preferência.

Consultar a documentação oficial correspondente à versão instalada. Não
memorizar APIs instáveis de loaders, WebGPU, TSL, pós-processamento ou Drei.

## Contrato mínimo de cena

Definir antes de codificar:

- função da cena e objeto-herói;
- câmera, enquadramento e limites de interação;
- iluminação, materiais e ambiente;
- hierarquia de grupos, pivôs e objetos animáveis;
- carregamento e estado de erro;
- fallback estático ou 2D;
- orçamento de DPR, draw calls, triângulos, texturas e memória;
- política de pausa quando oculto ou fora da viewport.

## Padrões para R3F

- Manter `<Canvas>` fora de rerenders desnecessários.
- Usar `useFrame` apenas para valores que precisam variar por frame; evitar
  `setState` React dentro do loop.
- Reutilizar geometrias, materiais e texturas.
- Usar Suspense e preload com parcimônia; apresentar fallback acessível fora do
  canvas.
- Controlar DPR e qualidade de acordo com dispositivo e desempenho.
- Preferir render sob demanda quando a cena for majoritariamente estática.
- Fazer dispose de recursos criados manualmente e encerrar listeners/controls.
- Não duplicar loops entre R3F, GSAP e `requestAnimationFrame`.

## Integração com GSAP

Animar refs de objetos ou parâmetros dedicados. Criar timeline no ciclo de vida
correto, pausar/reverter no cleanup e deixar `useFrame` somente para efeitos que
dependam do delta. Evitar GSAP e `useFrame` escreverem na mesma propriedade.

Para scroll, mapear progresso para uma timeline ou propriedade estável. Não
acoplar leitura de DOM, física e render 3D num único callback pesado.

## Shaders e pós-processamento

Adicionar somente depois de composição, material e luz resolverem a maior
parte da cena. Definir fallback, reduzir passes e medir em dispositivo móvel.
Manter shaders pequenos, parâmetros documentados e erro de compilação visível
em desenvolvimento.

## Fallback

Preservar título, conteúdo e CTA em HTML. Se WebGL falhar, movimento reduzido
estiver ativo, bateria/desempenho forem inadequados ou o asset não carregar,
usar poster, ilustração ou composição CSS equivalente. O canvas nunca pode ser
o único portador de informação ou navegação.

