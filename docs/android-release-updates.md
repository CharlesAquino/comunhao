# Android — canal de testes e atualização do APK

**Versão piloto:** `1.3.0-rc.1`  
**VersionCode:** `13001`  
**Canal:** `testing`

## Endereços

Produção permanece intocada:

```text
https://csxrhvgfnkqmkehgmnkp.supabase.co/storage/v1/object/public/app-updates/production/version.json
```

Piloto real:

```text
https://csxrhvgfnkqmkehgmnkp.supabase.co/storage/v1/object/public/app-updates/testing/version.json
```

## Regra principal

O primeiro APK do grupo piloto deve ser instalado manualmente e assinado com a mesma chave da versão atual. Depois disso, o aparelho passa a consultar o canal testing e recebe os próximos RCs pela tela interna de atualização.

## Gerar

```bash
npm ci
npm run release:testing
```

## Verificar assinatura

```bash
./scripts/verificar-assinatura-apk.sh   /caminho/apk-anterior.apk   release/testing/comunhao-1.3.0-rc.1.apk
```

## Publicar

```bash
export SUPABASE_SERVICE_ROLE_KEY='SUA_CHAVE_LOCAL'
npm run publish:testing
unset SUPABASE_SERVICE_ROLE_KEY
```

A chave de serviço não deve usar prefixo `VITE_` e não deve ser salva no projeto.

## Documento completo

Consulte `DOCUMENTO_MESTRE_COMUNHAO_1.3.0-RC1-TESTING.md`.

## Adenda — canal development, estado em 21/08/2026

Esta seção não altera o canal RC histórico acima. A instalação development
possui trilha própria:

```text
applicationId: br.com.igreja.oracao.dev
pré-release local: 1.4.0-dev.44
versionCode: 14044
manifesto: app-updates/development/version.json
APK: release/development/comunhao-1.4.0-dev.44-debug.apk
```

O fluxo aprovado é atualizar diretamente pelo app instalado. Não criar um novo
applicationId a cada correção. Incrementar `versionCode`, preservar a assinatura,
publicar APK antes do manifesto e validar o manifesto remoto com cache-buster.

Comandos vigentes no workspace ativo:

```bash
npm run apk:development
node scripts/publicar-release-testing.mjs \
  --config release/development/update.config.json \
  --apk release/development/comunhao-1.4.0-dev.44-debug.apk \
  --manifest release/development/version.json \
  --use-supabase-cli true
```

O `dev.44` acima é pré-release local e não foi publicado no canal online.
Produção continua apontando para `app-updates/production/version.json`; o
piloto online continua usando `app-updates/development/version.json`.
