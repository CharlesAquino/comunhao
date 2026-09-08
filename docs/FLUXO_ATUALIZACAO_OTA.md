# Fluxo de Atualização OTA (Over-The-Air)

Este documento detalha o processo de publicação de novas atualizações e implementações diretamente no aplicativo de forma remota, utilizando o mecanismo de atualização OTA (Over-The-Air) disponível nos canais de **Testing** e **Development**.

A principal vantagem deste fluxo é permitir que testadores e equipe de desenvolvimento recebam atualizações automaticamente ao abrir o aplicativo, sem precisar baixar e instalar um novo APK manualmente.

## ⚠️ Regra de Ouro da Atualização OTA
A atualização OTA só deve ser utilizada para atualizações de código fonte web (TypeScript, React, CSS, Assets).
Caso sejam adicionados ou removidos **Plugins Nativos do Capacitor** (ex: Push Notifications, Câmera), é estritamente necessário gerar um novo APK (Hard Update) e distribuí-lo.

## 1. Como Funciona o Mecanismo?
O aplicativo possui um serviço interno (`updateService.ts`) que roda quando o app (nativo Android) é inicializado. Ele:
1. Faz o fetch de um arquivo remoto `version.json` hospedado no Supabase Storage (Bucket: `app-updates`).
2. Compara o `versionCode` local com o `versionCode` remoto.
3. Se o remoto for maior, ele aciona o Modal de Atualização (`UpdateDialog.tsx`) sugerindo (ou obrigando) a instalação do novo pacote via Capacitor ApkUpdater.

## 2. Canais Disponíveis
Temos dois canais principais para builds nativos e atualização OTA:
- **Testing**: Voltado para os testadores do grupo piloto. Utiliza o `release/testing/release.config.json` e a URL de manifesto terminada em `testing/version.json`.
- **Development**: Voltado para desenvolvimento interno (`br.com.igreja.oracao.dev`). Utiliza o `release/development/update.config.json` e a URL de manifesto terminada em `development/version.json`.

*(O canal de **Release/Produção PWA** é engatilhado via push na branch `main` e atualizado pela esteira do Netlify, valendo-se do Service Worker para as atualizações web).*

## 3. Passo a Passo: Publicando uma Atualização OTA

Sempre que concluir uma nova implementação ou pacote de *features*, siga as etapas abaixo para mandar a novidade aos usuários:

### Passo 1: Incrementar a Versão
O mecanismo OTA **só reconhecerá a atualização se o `versionCode` for maior** que a versão instalada.
Atualize a versão e incremente o código (ex: `14056` -> `14057`) nos seguintes arquivos:
- `package.json` (no campo `version`)
- `android/app/build.gradle` (em `appVersionCode` e `appVersionName`)
- `release/testing/release.config.json`
- `release/development/update.config.json`

*(Dica: A IA pode fazer esse bump rodando scripts `sed` diretamente)*

### Passo 2: Gerar o Build e o Manifesto
Rode os scripts que constroem a interface, otimizam o Capacitor e geram o novo APK (junto do arquivo `version.json` correspondente):

**Para o canal Testing:**
```bash
npm run release:testing
```

**Para o canal Development:**
```bash
npm run apk:development
```

### Passo 3: Publicar no Servidor (Supabase)
Utilize o script de publicação para jogar o APK e o manifesto na nuvem. Ele utilizará as credenciais em `.env.local` e fará o upload para o Storage.

**Para publicar no canal Testing:**
```bash
npm run publish:testing -- --use-supabase-cli
```

**Para publicar no canal Development:**
Como não há um script `publish:development` fixo, usamos o mesmo script, mas apontando os argumentos para a pasta de desenvolvimento:
```bash
node scripts/publicar-release-testing.mjs \
  --config release/development/update.config.json \
  --apk release/development/comunhao-NOME-DA-VERSAO-debug.apk \
  --manifest release/development/version.json \
  --use-supabase-cli
```

### Passo 4: Notificar
Após o sucesso do comando, basta avisar o usuário para reabrir o app e aceitar a atualização do Modal OTA.
