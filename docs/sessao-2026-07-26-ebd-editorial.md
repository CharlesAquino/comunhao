# Sessão 26/07/2026 — Memória operacional da EBD e do Estúdio Editorial

**Status:** implementado no working tree, com migrations aplicadas no remoto  
**Último commit estável anterior a este ciclo:** `9963c7e`  
**APK disponível no workspace:** `android/app/build/outputs/apk/debug/app-debug.apk` gerado em 26/07/2026 18:17, potencialmente desatualizado frente ao código atual

## O que foi feito

Neste ciclo, a aba EBD deixou de depender apenas do modelo legado de lições e
quiz. Foi implementado um motor editorial com conteúdo remoto versionado,
renderer da jornada semanal e uma interface administrativa para criação,
edição, revisão e publicação.

Também foi consolidada a mudança de autenticação cotidiana para `username +
senha`, mantendo o WhatsApp como canal de confiança para cadastro e recuperação
de senha. A verificação periódica de dispositivo saiu do fluxo principal.

No mesmo período, o app recebeu:

- refino do Design System visual nas abas principais;
- nova camada de profundidade glass/textura suave;
- ícone Android oficial da marca;
- remoção dos mocks principais de conteúdo da Home;
- remoção das contas de teste `Jovem Teste 1` a `Jovem Teste 5`;
- correções de avatares e de atraso na disponibilidade;
- base documental para operação do Estúdio.

## Estado atual da EBD

### Implementado

- rota administrativa `/admin/ebd-studio`;
- tipos editoriais em `src/types/ebdEditorial.ts`;
- serviço editorial em `src/services/ebdEditorialService.ts`;
- editor visual MVP em `src/pages/EbdStudio.tsx`;
- renderer da jornada em `src/components/ebd/EbdJourney.tsx`;
- fallback em `src/pages/EBD.tsx` para a EBD antiga quando não houver conteúdo
  editorial publicado;
- publicação versionada com snapshot no banco;
- atualização por Realtime sem necessidade de novo APK para trocar conteúdo.

### Aplicado no banco remoto

- migration `20260726210000_ebd_editorial_studio.sql`;
- migration `20260726211000_ebd_editorial_realtime.sql`.

### Ainda não concluído

- Lição 5 ainda não foi inserida integralmente nem publicada pelo Estúdio;
- persistência remota de progresso e respostas privadas ainda não existe;
- desbloqueio programado com antecipação por Kesef ainda está apenas
  documentado;
- importador de JSON/PDF/fotografias ainda não existe;
- o APK precisa ser regenerado para incluir com segurança todas as alterações
  recentes do working tree.

## Arquivos centrais desta etapa

- `src/pages/EbdStudio.tsx`
- `src/components/ebd/EbdJourney.tsx`
- `src/services/ebdEditorialService.ts`
- `src/types/ebdEditorial.ts`
- `src/pages/EBD.tsx`
- `src/App.tsx`
- `supabase/migrations/20260726210000_ebd_editorial_studio.sql`
- `supabase/migrations/20260726211000_ebd_editorial_realtime.sql`
- `docs/ebd-sistema-editorial-v1.md`
- `docs/ebd-licao-05-piloto.md`
- `docs/estudio-editorial-ebd-operacao.md`
- `docs/autenticacao-username-whatsapp.md`

## Decisões já tomadas

- conteúdo da EBD deve ser atualizado remotamente, sem exigir novo APK para
  cada nova lição;
- o Estúdio é a estação de trabalho editorial dentro do produto;
- o conteúdo diário da jornada será liberado por data;
- o WhatsApp permanece como meio de confiança para cadastro inicial e
  recuperação de senha;
- o login cotidiano do jovem passa a ser feito por `username + senha`;
- o número de telefone não deve ficar exposto no uso cotidiano;
- a antecipação por Kesef, quando implementada, deve ser tratada como acesso
  antecipado solidário e não como paywall de ensino bíblico.

## Pontos de retomada

Ao retomar o trabalho, validar primeiro estes itens:

1. se a conta administradora continua com `usuarios.papel = 'admin'`;
2. se a tabela `public.ebd_editorial_lessons` continua publicada no Realtime;
3. se o Estúdio abre em `/admin/ebd-studio`;
4. se já existe alguma lição `published` no banco;
5. se o APK foi rebuildado depois das mudanças mais recentes.

## Próximos passos recomendados

1. Inserir a Lição 5 completa no Estúdio e publicar uma primeira versão real.
2. Validar no celular a experiência da aba EBD com conteúdo remoto.
3. Regenerar o APK Android depois da validação final do working tree.
4. Implementar importador JSON para acelerar a produção editorial.
5. Persistir progresso, respostas privadas e estado dos dias no backend.
6. Implementar o desbloqueio antecipado por Kesef com transação atômica e
   prestação de contas do fundo social.

## Riscos e pendências

- O working tree está grande e heterogêneo; não é seguro assumir que o APK de
  18:17 representa o estado atual.
- Em 27/07/2026 já existe um APK mais recente, gerado às 22:53:52 de
  26/07/2026, com hash
  `17bb617abccda5fa606aa3f73756505faa5a7ec9c6b5f068605abc8f8071b3fc`.
- Ainda não existe commit estável novo para esta fase.
- O serviço de autenticação e o fluxo editorial mudaram em paralelo; antes de
  publicar para a mocidade real, o ideal é fechar um ciclo de teste manual
  ponta a ponta.
- As chaves Supabase expostas no `.env` continuam pendentes de rotação.
- A gamificação da jornada editorial ainda não está ligada ao backend de Kesef
  e XP.
- A publicação individual por dia existe no frontend, mas depende da RPC atual,
  que ainda exige um documento com sete dias antes de publicar.
