# Auditoria estática de segurança — Fase 0

**Escopo analisado:** arquivos enviados em 30/07/2026 nos pacotes do Estúdio EBD, Mural, RAG, IA editorial e fundação administrativa.

**Limitação:** os pacotes são recortes e patches sobrepostos, não um clone integral do repositório nem um dump do banco remoto. As conclusões abaixo são confirmadas nos arquivos recebidos; o estado remoto ainda precisa ser inventariado antes do deploy.

## Achados confirmados

| ID | Severidade | Achado | Evidência no material recebido | Tratamento nesta fase |
|---|---|---|---|---|
| SNT-001 | Crítica | Usuário com permissão de edição podia tentar alterar `status`, `versao` e `publicado_em` diretamente na tabela editorial, contornando a RPC de publicação e o snapshot. | Policy de `UPDATE` abrangia a linha inteira; o serviço fazia alteração direta de status. | Privilégios por coluna, trigger de invariantes e RPCs exclusivas de transição. |
| SNT-002 | Alta | Edge Functions aceitavam qualquer origem (`Access-Control-Allow-Origin: *`). | Funções `gerar-dia-ebd`, `buscar-memoria-rag` e `indexar-memoria-rag`. | Allowlist por `ALLOWED_ORIGINS`, preflight restrito e `Vary: Origin`. |
| SNT-003 | Alta | Operações caras não possuíam rate limiting próprio. | Geração por IA, busca vetorial e indexação podiam ser repetidas sem limite de domínio. | Contadores transacionais por ação, ator e origem anonimizada. |
| SNT-004 | Alta | Operações críticas não possuíam idempotência. | Publicação, indexação e geração poderiam ser duplicadas por repetição, timeout ou clique duplo. | Chaves idempotentes, hash da requisição, cache de resposta e conflito de replay. |
| SNT-005 | Alta | Mensagens internas do banco, parser e provedor de IA eram devolvidas ao cliente. | `return jsonResponse({ error: message }, 500)`. | Erro público neutro, `correlationId` e auditoria interna sanitizada. |
| SNT-006 | Alta | Indexação limitava caracteres extraídos, mas não o tamanho bruto do arquivo nem sua assinatura. | Download completo antes da extração; MIME vinha do metadado. | Limite de 20 MB, allowlist de MIME, assinatura PDF/ZIP, limite de páginas e deadline. |
| SNT-007 | Média | Payloads aceitavam propriedades desconhecidas. | Normalização lia campos conhecidos, mas não rejeitava campos adicionais. | Rejeição explícita de propriedades não previstas. |
| SNT-008 | Média | Resultado estruturado da IA não garantia a ordem exata dos blocos no runtime. | Validava tipos permitidos e quantidade, mas não a posição de cada tipo. | Schema posicional e validação runtime da ordem editorial. |
| SNT-009 | Média | A entrada adicional e a memória RAG eram interpoladas no prompt sem delimitação forte de confiança. | Texto recuperado e instruções adicionais entravam no prompt principal. | Delimitadores de dados não confiáveis e regra explícita anti-prompt-injection. |
| SNT-010 | Média | Exclusão editorial era física e direta pelo cliente. | Serviço chamava `.delete()` na tabela. | Arquivamento auditado por RPC; `DELETE` revogado do cliente. |
| SNT-011 | Média | Não havia circuit breaker para interromper escrita cara ou crítica durante incidente. | Ausência de mecanismo operacional. | Circuit breakers por ação e RPC administrativa auditada. |
| SNT-012 | Média | Upload de imagem editorial permanece público e sem quarentena server-side. | Serviço envia diretamente ao bucket e devolve URL pública. | **Risco residual:** requer Fase 2 com bucket de entrada, validação e promoção. |

## Barreiras aplicadas

1. **Domínio e autorização:** transições EBD exclusivamente por casos de uso server-side.
2. **Clean Architecture:** módulo compartilhado de segurança para Edge Functions.
3. **Dados:** logs append-only, IDs de recursos e origem de rede armazenados apenas como hash.
4. **Resiliência:** rate limiting transacional, idempotência e circuit breakers.
5. **Design System Security:** componentes para impedir cliques duplicados, mascarar dados e exibir erros por referência.
6. **IA/RAG:** entrada não confiável isolada, schema estrito e limites de custo.

## Riscos residuais antes de produção

- inventariar policies e grants **reais** no Supabase remoto;
- confirmar se todas as tabelas privadas têm RLS e testes negativos;
- criar quarentena e processamento de mídia server-side;
- proteger progresso, reflexões e respostas privadas fora do `localStorage`;
- implantar MFA obrigatório para administradores no provedor de autenticação;
- adicionar WAF/CDN e CAPTCHA adaptativo na borda;
- verificar dependências, workflows, segredos e assinatura do APK no repositório completo;
- executar teste E2E autenticado com membro, editor, revisor e administrador;
- revisar a estratégia de edição de conteúdo já publicado: nesta fase, lições publicadas ficam imutáveis.
