# Índice da documentação do Comunhão

**Atualizado em:** 05/09/2026  
**Estado de referência:** `1.4.0-dev.52` / `versionCode 14052`

Este índice não substitui documentos históricos. Ele informa qual fonte deve ser
usada para compreender o estado atual e impede que planos ou releases antigas
sejam interpretados como implementação vigente.

## Ordem de leitura para retomada

1. `../AGENTS.md` — regras do repositório e adenda operacional atual;
2. `../../CONTEXTO_MESTRE_IMPLEMENTACAO.md` — contexto normativo consolidado;
3. `DESIGN-SYSTEM-CONTRATO-IMPLEMENTACAO.md` — gate obrigatório antes de criar
   ou alterar qualquer interface;
4. `SESSAO_2026-08-15_ORACAO_FIGURINHAS_REGISTRO_COMPLETO.md` — estado remoto do
   estado remoto e local verificado;
5. documento especializado da feature em trabalho;
6. auditorias e sessões anteriores como evidência cronológica.

## Fontes vigentes ou especializadas

| Tema | Documento | Uso atual |
|---|---|---|
| Sessão IA, agentes e qualidade (03–05/09) | `SESSAO_2026-09-03_A_09-05_IA_QUALIDADE_E_AGENTES.md` | Decisões vigentes sobre orquestração de IA, governança de agentes, Estudos, RAG/OCR e pendências operacionais |
| Evolução sistêmica do Editorial EBD | `plano-evolucao-sistemica-editorial.md` | Desempenho, persistência, RAG, IA, mídia e layout do Estúdio |
| KPI de usuários | `KPI_USUARIOS_TELEMETRIA_MINIMA_2026-08-16.md` | Métricas protegidas, retenção, auditoria e limites de conteúdo |
| Telemetria assistencial do sorteio | `telemetria-sorteio-assistencial.md` | KPIs do círculo, continuidade, snapshots de formação, privacidade e limites |
| Comunhão Estudos — estrutura | `COMUNHAO_ESTUDOS_REFERENCIA_ESTRUTURAL.md` | Posicionamento, trilhas, referências pedagógicas e contrato mínimo |
| Toolchain do Codex | `CODEX_AGENT_TOOLCHAIN.md`, `CODEX_AGENT_SKILLS_LOCK.json` | Precedência, Skills, MCPs, segurança e snapshot de integridade |
| Próxima onda de qualidade e IA | `PLANO_IMPLEMENTACAO_QUALIDADE_E_IA_2026-08-28.md` | Ordem de Playwright, Sentry, Zod, MSW, higiene, mobile, creative e decisão sobre OmniRoute |
| Creative Development Skills | `CREATIVE-DEVELOPMENT-SKILLS.md` | Orquestração de GSAP, Three/R3F, img2threejs, Remotion, arte, performance e acessibilidade |
| Incidente IA EBD 16/08 | `INCIDENTE_EBD_AI_JSON_VALIDATE_FAILED_2026-08-16.md` | Diagnóstico, correção server-side e validação pendente |
| Chamadas, salas e figurinhas | `SESSAO_2026-08-15_ORACAO_FIGURINHAS_REGISTRO_COMPLETO.md` | Estado vigente dev.34–dev.42, migrations, releases e QA pendente |
| Estado geral em 10/08 | `SESSAO_2026-08-10_REGISTRO_COMPLETO.md` | Base cronológica anterior para EBD, RAG, comunidade e aceite legal |
| Plano prioritário pós-dev.20 | `PLANO_ACAO_PRIORIDADES_2026-08-10.md` | Sequência vigente, gates e critérios de aceite |
| Android e atualizações | `android-release-updates.md` + `../release/development/README.md` | RC histórico e adenda development |
| Editorial EBD | `estudio-editorial-ebd-operacao.md` | Operação, com adenda atual |
| Design System Editorial EBD | `DESIGN_SYSTEM_EDITORIAL_EBD.md` | Hierarquia semântica, escrita, concordância e revisão |
| Cantina Kesef | `../adr/ADR-003-cantina-kesef-beneficio-comunitario.md`, `../specs/SPEC-003-cantina-kesef-eventos-qrcode-nfc.md`, `PLANO_IMPLEMENTACAO_CANTINA_KESEF.md` | Decisão econômica, requisitos e plano de implementação |
| Calibração econômica da Cantina | `PLANO_ACAO_CALIBRACAO_ECONOMIA_KESEF_CANTINA.md` | Métricas, gates e piloto antes de definir valores em Kesef |
| Linha do tempo EBD | `ANALISE_EBD_LINHA_DO_TEMPO_EDITORIAL.md` | Especificação ainda parcialmente pendente |
| Auditoria EBD | `../audit/AUDITORIA_EBD_EDITORIAL_2026-08-10.md` | Achados e adenda de mitigação |
| Publicação EBD | `../audit/AUDITORIA_FLUXO_PUBLICACAO_EBD_2026-08-10.md` | Achados e adenda de implementação |
| IA editorial | `../EDITORIAL_IA_SETUP.md` | Contrato inicial + adenda seletiva atual |
| RAG | `../RAG_SETUP.md` | Arquitetura e adenda remota atual |
| Admin | `../ADMIN_FOUNDATION.md` | Fundação administrativa |
| Segurança | `SECURITY_AUDIT_PHASE0.md`, `SPEC-002-protocolo-sentinela-seguranca.md`, `THREAT_MODEL_SENTINELA.md`, `CONTRATO-AUTORIZACAO-ANTI-IDOR.md` | Governança, riscos e contrato obrigatório de autorização por objeto |
| Backlog do lint remoto | `BACKLOG-LINT-REMOTO-2026-08-23.md` | Cinco erros legados mapeados para tratamento após o Kesef 3D |
| Contrato mestre do Design System | `DESIGN-SYSTEM-CONTRATO-IMPLEMENTACAO.md` | Gate obrigatório, precedência, checklist e critérios de extensão |
| Design System — ações | `DESIGN-SYSTEM-ACOES.md`, `design-system-interacoes-2026-07-26.md` | Hierarquia de CTAs, primitives e controles especiais |
| Identidade visual e QA | `identidade-visual.md`, `../design-qa.md` | Normas visuais e validação |
| Mural 1.4 | `MURAL_SOCIAL_1.4.0-DEV1.md` | Contrato do Mural Social |

## Documentos históricos

Os arquivos `sessao-*`, `RELEASE_1.3.0-*`, `archive/*`, planos antigos e documentos
mestres de RC preservam decisões e evidências da época. Eles não foram
sobrescritos. Quando conflitarem com o código, o ambiente remoto ou a adenda de
10/08/2026, devem ser classificados como **históricos**.

## Divergências conhecidas registradas

- documentos antigos podem indicar Capacitor/EBD/Kesef como pendentes; hoje
  estão implementados em graus documentados no registro de 10/08;
- o contrato original de IA menciona oito blocos; o contrato vigente é seleção
  entre dez tipos;
- a primeira migration de presença de 10/08 foi substituída por `last_login` sem
  heartbeat;
- o README da RC1 continua histórico; development local está em `1.4.0-dev.52`;
- a vigência semanal descrita na análise EBD ainda é proposta, não estado atual;
- textos legais v1.0.0 são base técnica e ainda requerem revisão jurídica e
  operacionalização dos direitos do titular.

## Regra de manutenção

Novas sessões devem criar uma nova entrada datada, acrescentar adendas aos
documentos afetados e atualizar este índice. Não apagar achados antigos nem
alterar silenciosamente uma versão legal, release ou decisão já publicada.
