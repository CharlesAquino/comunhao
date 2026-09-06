# Plano sequencial de qualidade e segurança

Plano para os próximos dias, mantendo as alterações online pausadas até a
conclusão dos bloqueadores.

## Registro de implementação

Cada item concluído deve ser sinalizado imediatamente com `CONCLUÍDO`, data,
evidência e responsável. Itens em andamento usam `EM ANDAMENTO`; itens que
dependem de acesso externo usam `BLOQUEADO — DEPENDÊNCIA EXTERNA`.

| Item | Status | Evidência |
| --- | --- | --- |
| Segredos fora do código e documentação redigida | **CONCLUÍDO** | Auditoria local e scripts E2E sem credenciais fixas — 16/08/2026 |
| Regras de ouro e barreira de release | **CONCLUÍDO** | `docs/REGRAS-DE-OURO-SEGURANCA.md` — 16/08/2026 |
| Alerta de qualidade e plano sequencial | **CONCLUÍDO** | Este documento e `docs/ALERTA-DE-QUALIDADE.md` — 16/08/2026 |
| Rotação de credenciais reais | **BLOQUEADO — DEPENDÊNCIA EXTERNA** | Requer acesso aos secrets do Supabase, CI e hosts |
| Testes RLS remotos | **BLOQUEADO — DEPENDÊNCIA EXTERNA** | Requer projeto Supabase e contas sintéticas |
| Rate limiting e anti-bot no provedor | **BLOQUEADO — DEPENDÊNCIA EXTERNA** | Requer acesso ao proxy/host |
| Headers no domínio de produção | **EM ANDAMENTO** | Configurados no Netlify; falta confirmar o domínio final |
| Auditoria de dependências | **EM ANDAMENTO** | Correções compatíveis aplicadas; pendências transitivas registradas |

## Dia 1 — inventário e preparação

- congelar novas features críticas;
- listar segredos, ambientes, Edge Functions, integrações e responsáveis;
- confirmar quais credenciais históricas ainda podem estar válidas;
- preparar contas sintéticas e janela de manutenção;
- registrar backup atual e plano de rollback.

**Saída:** inventário aprovado e janela de rotação definida.

## Dia 2 — credenciais e autenticação

- gerar novas chaves e senhas;
- atualizar secrets do Supabase, CI e hosts;
- republicar as Edge Functions dependentes;
- testar login, troca de senha, OTP, exclusão e bloqueio de conta;
- invalidar credenciais antigas.

**Saída:** autenticação validada com credenciais novas.

## Dia 3 — RLS e banco

- executar matriz de acesso por papel e titular;
- testar leitura e escrita cruzada entre contas sintéticas;
- validar Kesef, Cantina, mensagens, chamadas, EBD e indicadores;
- conferir migrations aplicadas e policies duplicadas/permissivas;
- registrar evidências dos testes.

**Saída:** nenhum acesso indevido reproduzido.

## Dia 4 — abuso, rede e infraestrutura

- configurar rate limiting de login, cadastro e OTP;
- adicionar proteção anti-bot no provedor de borda;
- confirmar HTTPS, HSTS, headers e permissões de câmera/microfone;
- revisar cookies, expiração e revogação de sessão;
- testar rede lenta, perda de conexão e retomada.

**Saída:** cenários de abuso e transporte seguro aprovados.

## Dia 5 — dependências e recuperação

- revisar `npm audit` e atualizar o toolchain Capacitor;
- isolar ferramentas de build vulneráveis do ambiente de produção;
- executar backup e restauração em ambiente seguro;
- medir RTO/RPO e documentar o procedimento;
- corrigir ou aceitar formalmente vulnerabilidades transitivas.

**Saída:** dependências e recuperação com risco conhecido.

## Dia 6 — QA de produto

- testar dois celulares autenticados em chamada de voz e vídeo;
- testar convite da dupla separado da Sala de Oração;
- testar Cantina com QR, código, NFC, reserva e retirada por terceiro;
- testar Mural, EBD, Tesouro e Carteira nos dois temas;
- testar Samsung Tab S9 Plus e dimensões tablet;
- validar acessibilidade, foco, textos e botões do Design System.

**Saída:** roteiro E2E aprovado com evidências visuais.

## Dia 7 — release controlado

- executar lint, testes, build, auditoria de segredos e dependências;
- revisar migrations e manifesto;
- gerar APK incremental sem publicar;
- instalar em dispositivo de validação;
- aprovar ou reabrir bloqueadores;
- somente depois publicar pacote e manifesto na ordem correta.

**Saída:** release aprovado, reversível e documentado.

## Critérios de parada

O plano deve ser interrompido e o alerta de qualidade mantido se houver:

- segredo exposto ou credencial antiga ainda ativa;
- falha de RLS entre titulares;
- login/OTP sem limite de tentativas;
- backup sem restauração comprovada;
- chamada ou resgate quebrado em dispositivo suportado;
- vulnerabilidade crítica sem isolamento ou aprovação formal.

## Nova frente iniciada — Comunhão Estudos

| Item | Status | Evidência |
| --- | --- | --- |
| Definição da temporada piloto | **CONCLUÍDO** | `docs/ESTUDOS-PILOTO-01-QUEM-E-JESUS.md` — 18/08/2026 |
| Revisão pastoral da Semana 1 | **PENDENTE** | Validar fidelidade bíblica, doutrina, linguagem, limites e aplicação |
| Produção do vertical slice da Semana 1 | **PENDENTE** | Episódio 3–6 min, contexto, recuperação, missão e pergunta para o pastor |
| Teste com 5–10 jovens | **PENDENTE** | Observar abandono, navegação, compreensão, duração e intenção de continuar |
| Fundação técnica integrada ao EBD | **PENDENTE** | Content Engine, RLS, vigência e aba de Revisão Pastoral por estudo |
