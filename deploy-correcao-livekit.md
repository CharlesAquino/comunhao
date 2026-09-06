# Correção LiveKit — Edge Function + Secrets

## 1. Deploy da Edge Function corrigida

Abra o terminal na raiz do projeto e execute:

```bash
npx supabase login
```

Cole seu **Supabase Access Token** (criar em https://supabase.com/dashboard/account/tokens).  
Depois:

```bash
npx supabase functions deploy gerar-token-livekit --project-ref csxrhvgfnkqmkehgmnkp
```

## 2. Configurar secrets do LiveKit

No Dashboard do LiveKit Cloud (https://cloud.livekit.io), copie a **API Key** e **API Secret**.  
Depois execute:

```bash
npx supabase secrets set --project-ref csxrhvgfnkqmkehgmnkp LIVEKIT_API_KEY=sua_chave LIVEKIT_API_SECRET=seu_secret
```

Ou configure manualmente em:  
https://supabase.com/dashboard/project/csxrhvgfnkqmkehgmnkp/settings/functions

---

## Testar depois

1. Abrir dois navegadores
2. Charles (`[TELEFONE REDIGIDO]` / `[CREDENCIAL REDIGIDA]`) → clica **Orar Agora**
3. Jovem Teste 5 (`[TELEFONE REDIGIDO]` / `[SENHA REDIGIDA E ROTACIONADA]`) → vê o convite → clica **Voz**
4. Ambos são redirecionados pra `/sala/:salaId` com vídeo
