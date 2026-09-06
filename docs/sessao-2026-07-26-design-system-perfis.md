# Sessão 26/07 — Design System, perfis e avatares

**Status:** concluída  
**Data:** 2026-07-26  
**Escopo:** frontend, documentação e Storage de avatares

## Resultado

O aplicativo passou a adotar a linguagem visual **Santuário Contemporâneo**,
com identidade compartilhada entre os temas Santuário e Amanhecer. Home, Mural,
sala de oração, Perfil e Comunidade receberam o primeiro lote funcional.

A fonte normativa da identidade é
[`06-design-language.md`](../.ai/06-design-language.md), e a decisão está
registrada em
[`ADR-002`](../adr/ADR-002-linguagem-visual-sala-de-oracao.md).

## Design System

- Inter consolidada para interface e Fraunces para títulos de significado;
- tokens semânticos centralizados em `src/index.css`;
- materiais definidos como noite, pedra, madeira, folha, bronze, luz e
  pergaminho;
- canvas escuro neutralizado e verde reservado a ação, presença, progresso e
  foco;
- primitives de botão, card, badge, icon button, section header, progress bar e
  estados de feedback em `src/components/ui/`;
- navegação inferior e controles superiores alinhados à nova hierarquia;
- barra de rolagem visualmente oculta sem impedir rolagem;
- revisão visual reutilizável em `.ai/skills/design-review/`.

## Jornada de Serviço

As nove patentes angelicais da apresentação foram substituídas por oito
patentes próprias:

Servo Fiel, Guardião, Intercessor, Atalaia, Discipulador, Missionário,
Conselheiro e Pacificador.

Cada patente possui SVG autoral editável em `src/assets/badges/`. O componente
`BadgeRank` conecta os ativos ao cálculo de progressão. Limiares, significados e
fonte canônica estão em [`sistema-patentes.md`](sistema-patentes.md).

## Perfis sociais

- cadastro permite escolher foto opcional;
- Perfil permite adicionar ou trocar foto e editar o nome;
- avatar do usuário aparece na Home e abre o próprio Perfil;
- avatares da missão, Home e Comunidade abrem `/perfil/:userId`;
- perfil de outro membro é somente leitura e expõe apenas dados sociais já
  usados no produto;
- telefone e identificadores de autenticação não são consultados pelo perfil
  público;
- entrar em uma sessão aberta permanece uma ação separada do clique no avatar;
- `ProtectedRoute` acompanha a sessão do Supabase sem interpretar falha
  transitória de `getUser()` como logout.

## Storage remoto

Foi confirmado no projeto remoto `OraçãoAPP` que `storage.objects` possuía RLS
habilitada sem policies para avatares. Isso causava resposta HTTP 400 nos
uploads.

A migration
[`20260726130000_avatar_storage_policies.sql`](../supabase/migrations/20260726130000_avatar_storage_policies.sql)
foi aplicada isoladamente ao remoto e registrada no histórico:

- bucket público `avatars`;
- limite de 5 MB;
- MIME types JPEG, PNG e WebP;
- leitura pública restrita ao bucket;
- INSERT, UPDATE e DELETE para `authenticated` somente dentro da pasta
  `auth.uid()`.

A migration local `20260722_sessoes_oracao_grupo.sql` não foi aplicada durante
essa operação e continua sem registro correspondente no histórico remoto.

O frontend agora usa `auth.uid()` como pasta no Storage e exige confirmação da
linha atualizada por `usuarios.auth_user_id = auth.uid()`. Updates que afetem
zero linhas não são mais reportados como sucesso.

## Validação

Na conclusão técnica anterior à documentação:

- TypeScript sem erros;
- lint sem erros, com avisos preexistentes;
- 53 de 53 testes passando;
- build Vite e PWA concluídos;
- `git diff --check` sem problemas.

## Pendências

- validar manualmente um novo upload de avatar após a policy remota;
- reconciliar o histórico da migration local `20260722` antes de qualquer
  próximo `supabase db push`;
- tratar o aviso de bundle principal acima de 500 kB em ciclo próprio;
- revisar avisos preexistentes de lint sem misturá-los ao lote visual;
- realizar a auditoria remota completa definida na SPEC-001 antes de declarar o
  banco reproduzível ou a segurança demonstrada.

Nenhum commit foi criado nesta sessão.

## Adendo — autenticação e interações

No mesmo ciclo, o projeto recebeu:

- login cotidiano por username e senha;
- WhatsApp restrito a cadastro, recuperação e integrações autorizadas;
- e-mail opcional para recuperação;
- remoção da verificação periódica de dispositivo;
- proteção de telefone e e-mail nas consultas públicas;
- rate limit para login e OTP;
- migrations e quatro Edge Functions publicadas no Supabase;
- fluxo comunitário “Levantar a mão” concluído e tornado idempotente;
- canais Realtime com identificadores únicos;
- padronização global de botões, abas, switches e controles especiais.

A direção visual final substitui o excesso de medalhões e bronze por glass
suave, textura discreta, ícones lineares, iluminação interna e profundidade 3D
moderna. A especificação completa está em
[`design-system-interacoes-2026-07-26.md`](design-system-interacoes-2026-07-26.md).
