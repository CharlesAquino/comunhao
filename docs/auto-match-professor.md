# Auto‑Match do Professor — Rascunho Futuro

## Problema

Após o fluxo de convite para oração, o convidado pode demorar a aceitar ou simplesmente nunca abrir o aviso. Ninguém deve ficar no vácuo.

## Solução

Se um convite ficar `status = 'convidando'` por mais de **5 minutos**, o Professor (admin) é conectado automaticamente com a pessoa.

### Fluxo

```
[Convite criado] → [5 min sem resposta] → Auto‑match do Professor
                                                │
                                                ├─ Professor entra como participante
                                                ├─ tipo_conexao = o que o convidante escolheu
                                                ├─ Sessão inicia (status = 'orando')
                                                ├── Notificação no app do Professor:
                                                │      "Você foi conectado com Fulano 🙏"
                                                └── WhatsApp pro jovem:
                                                       "Enquanto isso, o Pr. Charles está orando por você!"
```

### Como implementar (quando for a hora)

**Opção A — Edge Function agendada (ideal, requer Supabase Pro)**
```
cron: * * * * * (a cada 1 minuto)
Edge Function: auto-match
  1. SELECT sessoes_oracao WHERE status='convidando' AND criado_em < now() - interval '5 min'
  2. Busca usuário admin (papel = 'admin')
  3. Para cada sessão pendente:
     a. INSERT sessoes_participantes (professor, tipo_conexao = convidante.tipo)
     b. UPDATE sessoes_oracao SET status = 'orando', iniciada_em = now()
     c. Se tipo_conexao = 'voz'|'video': criar LiveKit room
  4. Dispara notificações + WhatsApp
```

**Opção B — Client‑side (MVP, funciona sem Pro)**
- Na Home do Professor, `useEffect` com `setInterval(30s)`:
  ```sql
  SELECT * FROM sessoes_oracao
  WHERE status = 'convidando'
    AND criado_em < now() - interval '5 minutes'
  ```
- Auto‑aceita com a conta logada
- Exibe banner/floating notification: *"Conectado com [Nome] 🙏"*
- Envia WhatsApp

### Regras

- Máximo de **3 conexões simultâneas** do Professor (para não sobrecarregar)
- Se jovem aceitar **antes** dos 5 min, fluxo normal (match não acontece)
- Se Professor já estiver em oração com alguém, entra na fila (FIFO)
- Professor ganha **Kesef + XP** normalmente pela sessão
