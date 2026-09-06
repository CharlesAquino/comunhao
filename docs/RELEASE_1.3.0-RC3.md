# Comunhão 1.3.0-rc.3 — Atualização, guias, gesto e Mural Feed

## Entregas

- detecção de atualização pelo `versionCode` 13003;
- limpeza seletiva de WebView/Cache Storage após atualização, sem apagar localStorage, sessão ou preferências;
- remoção de Service Workers dentro do Android;
- registro do Service Worker somente no navegador/PWA;
- recarga automática do pacote novo no primeiro início após atualização;
- interceptação nativa do gesto Voltar do Android e fallback por gesto lateral no conteúdo web;
- guia de primeiro acesso;
- guia de novidades para usuários atualizados;
- ajuda contextual ao final das páginas principais e administrativas;
- Mural redesenhado como feed social de oração;
- versão `1.3.0-rc.3`, `versionCode 13003`.

## Regra de teste essencial

Instalar a RC3 **por cima da RC2**, abrir sem desinstalar e confirmar que:

1. o layout novo aparece imediatamente;
2. o usuário permanece conectado;
3. preferências permanecem salvas;
4. o guia de novidades aparece uma única vez;
5. o gesto lateral volta à tela anterior e não encerra o app;
6. o Mural carrega e atualiza em tempo real.
