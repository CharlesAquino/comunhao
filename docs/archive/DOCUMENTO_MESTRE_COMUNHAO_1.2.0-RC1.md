# Comunhão — Documento Mestre do Projeto Unificado

Versão: **1.2.0-rc.1**  
VersionCode Android: **12001**  
Data da consolidação: **30/07/2026**  
Status: **Release Candidate para testing fechado**

## Fonte única de verdade

Este diretório reúne o código canônico do aplicativo Comunhão. A estação oficial recomendada é:

`/home/pcnono/Secretária/Comunhao-Workspace/comunhao-app`

Não aplique novos patches em cópias antigas. Toda mudança futura deve partir deste projeto, em branch Git própria.

## Conteúdo consolidado

- autenticação por usuário/WhatsApp e recuperação;
- identidade, avatares e privacidade;
- Home, Comunidade, Perfil, Ranking, Carteira/Kesef e Loja;
- Círculo de Oração, convites, aceite, sala LiveKit e feedback;
- Central de Atividades com filtros, deduplicação e painel responsivo;
- notificações internas, Web/PWA e push FCM Android;
- Mural com tempo real, horários relativos e intercessões;
- EBD clássica e Estúdio Editorial;
- publicação agendada, por dia e semana imediata;
- arquivamento seguro de lições;
- geração editorial com Groq;
- RAG sistêmico com pgvector/HNSW;
- Fundação Administrativa, papéis, permissões e auditoria;
- Protocolo Sentinela Fase 1;
- atualizador de APK e scripts de release.

## Validação realizada

- TypeScript: 0 erros;
- Vitest: 19 arquivos e 95 testes aprovados;
- Vite/PWA: build aprovado;
- Oxlint: 0 erros;
- System Doctor: 50 aprovações, 6 alertas e 0 falhas com ambiente público configurado;
- Sentinela: sem achados bloqueantes nos módulos protegidos.

Consulte `VALIDACAO_RELEASE_RC1.md` e o Documento Mestre em DOCX distribuído junto ao projeto.
