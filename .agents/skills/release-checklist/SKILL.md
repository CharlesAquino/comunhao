---
name: release-checklist
description: Codifica testes, builds e verificações necessárias antes de publicações ou atualizações OTA (Over-The-Air).
---

# Checklist de Lançamento (Release/OTA)

1. **Auditoria de Quebra**: Revisar se alguma alteração quebra estado cacheado ou AsyncStorage/Capacitor.
2. **Verificação de Build**: Sempre execute `npm run build` ou os scripts de release nativos do projeto para atestar que o compilador TS e o Vite não falham.
3. **Update Manifest**: Atualize corretamente a versão em `package.json`, `build.gradle` e nos scripts de OTA (`version.json`) antes de subir para o canal (Testing/Development).
