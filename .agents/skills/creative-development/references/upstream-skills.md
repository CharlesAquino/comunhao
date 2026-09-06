# Skills canônicas instaladas

Instaladas localmente em `app/.agents/skills` em 23/08/2026.

## GSAP

Fonte: `https://github.com/greensock/gsap-skills`

- `gsap-core`
- `gsap-timeline`
- `gsap-scrolltrigger`
- `gsap-plugins`
- `gsap-utils`
- `gsap-react`
- `gsap-performance`
- `gsap-frameworks`

Usar essas skills como autoridade operacional de GSAP. Não copiar suas APIs
para a skill roteadora.

## img2threejs

Fonte: `https://github.com/img2threejs/img2threejs`

- `img2threejs` 1.5.1, incluindo scripts, grimoire, schemas e gates locais.

Executar o pipeline canônico completo. Não tratar apenas o `SKILL.md` como se
os scripts e estados fossem opcionais.

## Remotion

Fonte canônica instalada de
`https://github.com/remotion-dev/remotion/tree/main/packages/skills/skills`

- `remotion-best-practices` 4.0.515 como roteador;
- create, markup, studio, render, maps, captions, saas, interactivity, docs,
  upgrade e multimedia na mesma versão.

## Integridade e atualização

Consultar `upstream-lock.json` para o snapshot local. Em uma atualização:

1. baixar a nova versão para diretório temporário;
2. conferir fonte, licença, frontmatter, scripts e alterações de segurança;
3. validar as skills novas antes de substituir o snapshot;
4. atualizar hashes, versões, data e documentação na mesma mudança;
5. não editar silenciosamente módulos canônicos para adaptar o Comunhão;
   colocar adaptações na skill `creative-development`.

