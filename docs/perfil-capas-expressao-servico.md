# Capas de perfil — expressão de serviço

## Objetivo

Permitir que cada membro personalize o card principal do próprio perfil com
uma linguagem visual ligada à forma como serve à comunidade. A escolha é
pública, mas exclusivamente estética: não declara cargo, não concede papel e
não altera patente ou permissão.

## Catálogo inicial

- Essencial: identidade original do perfil;
- Louvor: instrumentos e adoração;
- Vocal: voz e harmonia;
- Ensino: formação e estudo;
- Liderança: direção e cuidado;
- Intercessão: oração e acolhimento;
- Comunhão: pertencimento e serviço mútuo.

As imagens autorais estão em `public/profile-covers/`, no formato WebP, em
pares para os temas claro (`*-light.webp`) e escuro. A variante acompanha a
preferência de tema do próprio app. O catálogo e a normalização ficam
centralizados em
`src/services/profileCovers.ts`.

## Contrato funcional

1. O dono escolhe a capa em **Perfil > Editar** e confirma em **Salvar perfil**.
2. A escolha é persistida em `public.usuarios.perfil_capa`.
3. O mesmo tema aparece no perfil próprio e no perfil público visto por outros
   membros.
4. Valores ausentes ou desconhecidos retornam para `neutro` no cliente.
5. O banco aceita somente identificadores do catálogo por constraint.
6. Cancelar a edição restaura nome e capa persistidos e descarta a nova foto
   ainda não enviada.

## Evolução segura

Adicionar uma nova capa exige atualizar, no mesmo trabalho: o par de assets WebP,
catálogo TypeScript, allowlist da constraint por nova migration e testes. Não
usar a capa como prova de função ministerial nem como condição de autorização.
