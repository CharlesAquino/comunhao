---
name: security-boundaries
description: Define os limites de segurança, acesso a segredos, banco de dados, rede e operações privilegiadas.
---

# Limites de Segurança

1. **Supabase RLS**: O front-end React acessa o Supabase via chaves anônimas (anon key). Todas as tabelas sensíveis devem ter RLS (Row Level Security) habilitado limitando o acesso a `auth.uid() = id`.
2. **Segredos**: Nunca versione `.env.local` ou chaves de serviço (`service_role`). 
3. **Navegação (Capacitor/App)**: Intents ou chamadas a recursos de disco no Android (ex: baixar APK) devem ocorrer via pastas seguras para não barrar no Play Protect.
