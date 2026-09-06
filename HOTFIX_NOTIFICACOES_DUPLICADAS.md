# Hotfix — notificações duplicadas

Este pacote corrige duplicações no frontend sem alterar o banco de dados.

## O que mudou

- Uma única conexão Supabase Realtime é compartilhada por usuário.
- Eventos repetidos são descartados por `id` e `evento_chave`.
- O canal tem encerramento atrasado para evitar duas assinaturas durante o ciclo duplo do React StrictMode.
- A central de notificações deduplica o carregamento inicial e eventos recebidos em tempo real.
- O contador considera apenas notificações não lidas únicas.
- Foram adicionados testes unitários para a deduplicação.

## Aplicação

Descompacte este ZIP sobre a pasta atual do projeto e valide:

```bash
npm run lint -- --quiet
npm run build
npm test -- notificationDeduplication notificationRouting conviteRouting sorteio adminAuth constants
```

Não há migration nova e não é necessário executar `supabase db push` para este hotfix.

Depois do build:

```bash
npx cap sync android
cd android
./gradlew assembleDebug
```
