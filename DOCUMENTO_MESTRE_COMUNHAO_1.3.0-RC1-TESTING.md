# Documento Mestre — Comunhão 1.3.0-rc.1

**Canal:** testing  
**VersionCode Android:** 13001  
**Data:** 30/07/2026  
**Estado:** preparado para piloto real, pendente de assinatura local e publicação no Storage

---

## 1. Decisão de versão

A tela atualmente em uso oferece a versão 1.2.2. Por isso, a base unificada não deve ser distribuída como 1.2.0-rc.1, pois pareceria uma regressão de versão.

A versão correta para o piloto passa a ser:

```text
versionName: 1.3.0-rc.1
versionCode: 13001
applicationId: br.com.igreja.oracao
```

O incremento para 1.3 representa a reunião de funcionalidades que antes estavam espalhadas em projetos e patches diferentes.

---

## 2. Separação dos canais

### Produção

```text
.../app-updates/production/version.json
```

Continua atendendo o aplicativo instalado pelos usuários comuns. Nenhum arquivo de produção deve ser substituído durante o piloto.

### Testing

```text
.../app-updates/testing/version.json
```

Atende apenas o APK compilado com `--mode testing`.

O canal é validado no cliente. Um build testing rejeita um manifesto production, e um build production rejeita um manifesto testing.

---

## 3. Nova tela de atualização

A tela foi atualizada para mostrar:

- selo **Canal de testes**;
- versão instalada e nova versão;
- título específico da release;
- data da publicação;
- tamanho do APK;
- notas da release com rolagem;
- aviso de uso restrito ao grupo piloto;
- progresso do download;
- botão curto para evitar quebra de texto.

A tela continua:

- verificando o `versionCode`;
- baixando o APK;
- validando SHA-256;
- validando o tamanho do arquivo;
- abrindo o instalador oficial do Android.

---

## 4. Conteúdo da release

Notas exibidas aos testers:

1. Projeto consolidado em uma única estação de trabalho.
2. Mural com horário real e atualização em tempo real.
3. Central de Atividades responsiva e notificações integradas.
4. Estúdio EBD com publicação imediata e arquivamento seguro.
5. RAG, Groq, push FCM e governança administrativa reunidos.
6. Protocolo Sentinela Fase 1 e reforços de segurança.

---

## 5. Identificação dentro do aplicativo

Na página Perfil, a área da versão passa a mostrar:

```text
Canal de testes
Versão instalada 1.3.0-rc.1 (13001)
```

Isso evita que um tester confunda a versão piloto com a versão pública.

---

## 6. Arquivos de controle

```text
.env.testing
release/testing/release.config.json
scripts/criar-manifesto-testing.mjs
scripts/gerar-release-testing.sh
scripts/publicar-release-testing.mjs
scripts/verificar-assinatura-apk.sh
src/test/updateService.manifest.test.ts
```

`release.config.json` é a fonte principal das informações exibidas na release.

---

## 7. Assinatura obrigatória

O Android só instala a nova versão sobre o aplicativo atual quando:

- o `applicationId` é o mesmo;
- o `versionCode` é maior;
- a assinatura digital é a mesma.

O arquivo local:

```text
android/keystore.properties
```

deve apontar para a mesma chave usada na versão que está instalada no aparelho.

Nunca colocar no Git, ZIP ou chat:

- arquivo `.jks`;
- senha da chave;
- `keystore.properties`;
- `SUPABASE_SERVICE_ROLE_KEY`.

Após gerar o APK, compare a assinatura:

```bash
./scripts/verificar-assinatura-apk.sh   /caminho/para/apk-anterior.apk   release/testing/comunhao-1.3.0-rc.1.apk
```

---

## 8. Geração local

Na raiz do projeto:

```bash
npm ci
npm run release:testing
```

O comando executa:

1. lint;
2. testes;
3. build Vite no modo testing;
4. System Doctor;
5. auditoria de segurança;
6. sincronização do Capacitor;
7. build Android release assinado;
8. cálculo SHA-256;
9. geração do `version.json`.

Saídas:

```text
release/testing/comunhao-1.3.0-rc.1.apk
release/testing/comunhao-1.3.0-rc.1.apk.sha256
release/testing/version.json
```

---

## 9. Publicação no Supabase Storage

O bucket já utilizado pelo projeto é:

```text
app-updates
```

A publicação do piloto usa a pasta:

```text
testing/
```

No terminal local:

```bash
export SUPABASE_SERVICE_ROLE_KEY='SUA_CHAVE_LOCAL'
npm run publish:testing
unset SUPABASE_SERVICE_ROLE_KEY
```

O script:

1. calcula novamente hash e tamanho;
2. envia o APK;
3. gera o manifesto final;
4. envia o manifesto por último;
5. consulta a URL pública;
6. confirma versão e SHA-256.

---

## 10. Entrada do primeiro grupo piloto

O aplicativo público atual consulta o canal `production`. Portanto, não se deve trocar o manifesto de produção apenas para recrutar testers.

Fluxo seguro:

1. gerar o APK `1.3.0-rc.1`;
2. confirmar a assinatura;
3. publicar no canal testing;
4. enviar o link do APK apenas aos testers;
5. instalar manualmente sobre a versão atual;
6. a partir daí, esse aparelho passa a consultar o canal testing;
7. próximas versões, como `1.3.0-rc.2`, aparecerão automaticamente na nova tela.

O app testing substitui o app existente no aparelho porque utiliza o mesmo `applicationId`. Ele não convive lado a lado com a produção.

---

## 11. Cenários do piloto

Cada tester deve validar:

### Instalação

- atualização instalada sem desinstalar o app;
- login e sessão preservados;
- versão exibida como `1.3.0-rc.1 (13001)`;
- selo de canal de testes visível no Perfil.

### Funcionalidades

- login;
- Home;
- Mural e intercessão;
- Realtime entre dois aparelhos;
- oração e aceite;
- sala de oração;
- mensagens;
- Central de Atividades;
- EBD;
- notificações push;
- perfil e carteira;
- funções administrativas por papel.

### Atualização interna

Para testar a nova tela, publicar depois uma versão `1.3.0-rc.2` com `versionCode` maior. Confirmar:

- tela aparece;
- versão instalada e nova são exibidas;
- notas estão corretas;
- botão não quebra em duas linhas;
- download progride;
- hash é validado;
- instalador Android abre;
- RC2 instala sobre RC1.

---

## 12. Critérios para promover a estável

Promover para `1.3.0` somente quando:

- nenhum bloqueio de login;
- nenhum bloqueio de atualização;
- nenhum problema de assinatura;
- migrations e Edge Functions validadas;
- push recebido com app aberto e fechado;
- Mural Realtime validado;
- fluxo de oração validado;
- EBD validada;
- testes automatizados aprovados;
- Doctor sem falhas;
- piloto concluído por pelo menos dois ciclos de RC.

---

## 13. Estado que ainda depende do computador local

Este pacote não contém:

- chave de assinatura;
- senhas;
- service role;
- APK release assinado;
- publicação remota executada.

Essas etapas precisam acontecer no computador que possui a chave original do aplicativo.

---

## 14. Estação de trabalho oficial

Após instalar o pacote unificado, o único caminho recomendado é:

```text
/home/pcnono/Secretária/Comunhao-Workspace/comunhao-app
```

Nenhum novo patch deve ser aplicado em cópias antigas.
