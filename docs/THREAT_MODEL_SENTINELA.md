# Modelo de ameaças — Protocolo Sentinela

## Ativos prioritários

- identidades e sessões;
- papéis administrativos;
- pedidos de oração e conteúdo privado;
- rascunhos e versões EBD;
- biblioteca RAG e fontes doutrinárias;
- segredos de infraestrutura e provedores;
- Kesef, XP e futuro fundo social;
- APK, pipeline de build e artefatos;
- auditoria e evidências de incidente.

## Fronteiras de confiança

```text
Dispositivo / navegador não confiável
              ↓ JWT
Supabase Auth e API com RLS
              ↓ RPC / Edge Function
Casos de uso server-side
              ↓ service_role restrita
Banco, Storage, provedores de IA e jobs
```

## Classes de tentativa intrusiva

### Identidade

Força bruta, credential stuffing, enumeração de contas, OTP bombing, roubo e replay de token, sessão fixada, phishing de administrador e abuso de cadastro.

### Autorização

IDOR/BOLA, troca de IDs, mass assignment, alteração de papel, acesso a rascunhos, execução de RPC administrativa, acesso indevido a Realtime e bypass por cliente modificado.

### Conteúdo e injeção

SQL injection, XSS armazenado, HTML/Markdown malicioso, URL perigosa, JSON excessivo, prototype pollution, path traversal, payload aninhado e tentativa de quebrar o renderer.

### Recursos e disponibilidade

Spam, scraping, consultas caras, upload massivo, conexão Realtime excessiva, geração de IA repetida, indexação abusiva, corrida concorrente e ataque para elevar a fatura.

### Editorial

Publicação direta, bypass de revisão, alteração de snapshot, edição silenciosa do conteúdo publicado, conflito entre editores, mídia externa maliciosa e exclusão destrutiva.

### IA e RAG

Prompt injection em PDF, envenenamento da memória, instrução escondida em documento, exfiltração de prompt/segredo, saída fora do schema, hallucination tratada como fonte e publicação automática.

### Arquivos e mídia

MIME falso, executável disfarçado, SVG ativo, arquivo poliglota, ZIP bomb, PDF malformado, metadado privado, arquivo gigante, hotlink e sobrescrita de objeto.

### Economia

Crédito duplicado, saldo negativo, replay de compra, alteração de preço, corrida de débito, estorno falso, modificação de ledger e desvio do fundo social.

### Supply chain

Pacote malicioso, typosquatting, lockfile adulterado, GitHub Action comprometida, segredo em commit, artefato substituído e conta de mantenedor sequestrada.

### Infraestrutura e insider

CORS amplo, grants residuais, RLS ausente, `SECURITY DEFINER` inseguro, `search_path` manipulável, dashboard comprometido, service role exposta, administrador curioso e exclusão de logs.

## Estratégia de barreiras

- **prevenir:** menor privilégio, schema estrito, RLS, RPC, assinatura e limite;
- **conter:** rate limit, idempotência, circuit breaker e quarentena;
- **detectar:** eventos sanitizados, correlação e métricas de risco;
- **recuperar:** snapshots, arquivamento, rollback, backup e rotação de segredos;
- **aprender:** causa raiz e teste de regressão para cada incidente confirmado.
