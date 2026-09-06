# Registro consolidado da sessão — 02/08/2026

> Escopo: decisões, correções, implementações, migrations, builds e validações
> realizadas em 02/08/2026. Este documento não contém chaves, tokens ou outros
> segredos. As novidades percebidas pelo usuário estão separadas das alterações
> internas de engenharia.

## 1. Estabilidade web e Android

- A incompatibilidade de `crypto.randomUUID` em runtimes antigos foi tratada por
  geração de identificadores compatível.
- Falhas de autenticação e conectividade do Supabase foram separadas de falhas de
  renderização do React.
- As salas de oração receberam correções de convite, recuperação de sessões órfãs,
  mensagens de erro legíveis e integração LiveKit para voz e vídeo.
- O asset da moeda Kesef deixou de depender do endereço do servidor Vite local.
- Builds web e Android foram executados durante a sessão para validação real.

## 2. Mural social

- O cabeçalho foi simplificado para priorizar as publicações.
- O compositor ganhou posicionamento seguro em relação às navegações superior e
  inferior.
- O botão de publicação foi mantido dentro do fluxo de criação, sem duplicação na
  página principal.
- Tipos de postagem e chamada “No que podemos interceder?” foram reconciliados com
  os componentes canônicos do Design System.
- Upload, persistência e exibição de fotos no feed foram corrigidos.
- O painel de comentários passou a respeitar safe areas e a navegação inferior.

## 3. EBD — publicação e linha do tempo

- Foi identificado que a lição destacada era escolhida por `publicado_em`, campo
  operacional que também mudava em correções e antecipações.
- A seleção deixou de recolocar uma lição anterior no destaque por causa de uma
  alteração administrativa posterior.
- Foi documentada a arquitetura temporal que separa vigência editorial, evento de
  publicação e progresso pessoal.
- A lição vigente é a unidade semanal: segunda a domingo devem vir exclusivamente
  do documento da mesma lição.
- Conteúdos anteriores permanecem previstos para arquivo mensal, fora do foco, mas
  acessíveis.

## 4. EBD — publicação incremental

- Foi reafirmada como regra de domínio a publicação diária ou específica.
- Um dia pode ser publicado sem que a semana inteira esteja concluída.
- Dias vazios permanecem indisponíveis e não herdam conteúdo de outro dia.
- “Publicar semana” continua como conveniência opcional.
- Criada a RPC protegida `ebd_publicar_dia_editorial`, com permissão, versão
  esperada, idempotência, snapshot e auditoria.
- Criada a RPC `ebd_antecipar_semana_publicada` para liberar uma semana já
  publicada, sem atualização direta do documento pelo cliente.
- O Estúdio passou a explicar dias incompletos e bloqueios de fluxo.

## 5. EBD — identidade visual

- Adicionado `coverImageUrl` ao documento editorial.
- Na ausência de capa explícita, a primeira imagem não-vídeo da segunda-feira é
  usada como fallback.
- Sem ambas, a interface usa o símbolo institucional da EBD.
- A regra foi aplicada ao destaque público e à lista administrativa.
- Títulos e subtítulos receberam limites de linha e hierarquia mais compacta.
- O fallback foi coberto por teste automatizado e registrado nas especificações.

## 6. Tesouro e Kesef

- O Tesouro foi orientado como economia comunitária fechada, e não como banco.
- Foram implementados catálogo visual, representação oficial do Kesef, saldo,
  solicitação de recompensa e processamento administrativo transacional.
- Upload e miniaturas de produtos foram adicionados à administração da loja.
- O botão de publicação do produto foi mantido visível e protegido da navegação.

## 7. Perfis e indicação

- Capas públicas de perfil foram disponibilizadas para temas claro e escuro.
- A personalização é estética e não concede cargo ou permissão.
- O programa de indicação passou a premiar membros elegíveis depois da validação
  administrativa do indicado, com progressão por patente.

## 8. Atualização do aplicativo

- Foi confirmado que os APKs development da manhã não possuíam URL de manifesto e
  não podiam receber atualizações pelo app.
- Preparado o último APK-base manual `1.4.0-dev.2`, `versionCode 14002`, mantendo
  `br.com.igreja.oracao.dev` e a assinatura debug usada nas instalações anteriores.
- Ativado o canal remoto `testing` na pasta pública `app-updates/development`.
- APK e manifesto foram publicados no Supabase Storage.
- O APK remoto foi baixado novamente e seu SHA-256 foi comparado ao artefato local;
  ambos resultaram em
  `cab3d381ac62ccf59259bb99289e59d6d12448e55584d0ab8c3f296df0ebc8a3`.
- Versões futuras precisam preservar pacote e assinatura, incrementar
  `versionCode` e publicar o manifesto somente depois do APK.

## 9. Cards de apresentação da versão

Os cards voltados aos usuários foram atualizados para apresentar somente benefícios
percebidos:

1. atualizações oferecidas dentro do aplicativo;
2. EBD organizada por semana e publicada dia por dia;
3. identidade visual das lições por miniatura;
4. Mural mais limpo, social e orientado ao cuidado;
5. Tesouro com catálogo, Kesef e acompanhamento;
6. personalização pública do perfil.

RPCs, migrations, permissões e detalhes de armazenamento permanecem na documentação
técnica e não aparecem nos cards de apresentação.

## 10. Validações

- 125 testes automatizados aprovados antes do fechamento das mudanças editoriais.
- Builds Vite e Android concluídos.
- Migrations de EBD aplicadas ao Supabase remoto.
- Manifesto público validado.
- Integridade do APK remoto confirmada por SHA-256.
- Avisos preexistentes de lint e tamanho de bundle permanecem registrados, sem novo
  erro bloqueante introduzido pela sessão.
