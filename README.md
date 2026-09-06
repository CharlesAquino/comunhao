# Comunhão — Projeto unificado

Aplicativo cristão de comunhão, oração, ensino bíblico e interação comunitária.

## Versão atual

```text
Versão: 1.3.0-rc.1
VersionCode Android: 13001
Canal: testing
Situação: candidato para piloto real
```

Esta é a única base recomendada para novas implementações. Não aplique patches em cópias antigas do projeto.

## Principais módulos

- autenticação por usuário e senha;
- perfis, comunidade, mensagens e oração;
- salas de oração e LiveKit;
- Mural com intercessões e Realtime;
- EBD e Estúdio Editorial;
- geração editorial por Groq;
- biblioteca de conhecimento e RAG;
- Central de Atividades;
- notificações push FCM;
- carteira Kesef, ranking e patentes;
- administração, governança e auditoria;
- Protocolo Sentinela Fase 1;
- atualização de APK fora da Play Store.

## Desenvolvimento

```bash
npm ci
npm run dev
```

## Validação

```bash
npm run validate:rc
```

## Gerar APK para o grupo piloto

O build usa a mesma identificação Android do aplicativo atual:

```text
br.com.igreja.oracao
```

Para instalar como atualização, é obrigatório assinar com a mesma chave usada no APK já instalado.

```bash
npm run release:testing
```

Saídas:

```text
release/testing/comunhao-1.3.0-rc.1.apk
release/testing/comunhao-1.3.0-rc.1.apk.sha256
release/testing/version.json
```

## Publicar no canal de testes

O APK de testing consulta exclusivamente:

```text
https://csxrhvgfnkqmkehgmnkp.supabase.co/storage/v1/object/public/app-updates/testing/version.json
```

A chave `SUPABASE_SERVICE_ROLE_KEY` deve existir apenas no terminal local:

```bash
export SUPABASE_SERVICE_ROLE_KEY='SUA_CHAVE_LOCAL'
npm run publish:testing
unset SUPABASE_SERVICE_ROLE_KEY
```

O script publica o APK primeiro e o manifesto por último.

## Documento mestre

Consulte:

```text
DOCUMENTO_MESTRE_COMUNHAO_1.3.0-RC1-TESTING.md
```

## Adenda development — estado em 21/08/2026

A seção RC1 acima permanece como instrução histórica do canal piloto. O
O workspace ativo está em `1.4.0-dev.44` (`versionCode 14044`) e usa três
linhas separadas: produção permanece preservada; o canal online do grupo piloto
usa a pasta `development`; e o APK `dev.44` local é pré-release exclusivo para
validação, ainda não publicado.

```text
applicationId: br.com.igreja.oracao.dev
canal lógico do atualizador: testing
pasta remota: app-updates/development
manifesto: https://csxrhvgfnkqmkehgmnkp.supabase.co/storage/v1/object/public/app-updates/development/version.json
APK pré-release local: release/development/comunhao-1.4.0-dev.44-debug.apk
```

Geração e publicação autorizadas:

```bash
npm run apk:development
node scripts/publicar-release-testing.mjs \
  --config release/development/update.config.json \
  --apk release/development/comunhao-1.4.0-dev.44-debug.apk \
  --manifest release/development/version.json \
  --use-supabase-cli true
```

Antes de uma nova release, incremente `versionCode`, execute lint/test/build e
confirme migrations/funções remotas. Leia
`release/development/README.md` e `docs/SESSAO_2026-08-15_ORACAO_FIGURINHAS_REGISTRO_COMPLETO.md`
para o estado funcional, release online e riscos residuais. A publicação de
`dev.44` permanece pendente de autorização explícita.
