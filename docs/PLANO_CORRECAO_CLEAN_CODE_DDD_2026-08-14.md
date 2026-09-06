# Plano de correção — Clean Code e DDD

**Data:** 14/08/2026  
**Escopo:** aplicação Comunhão completa  
**Estratégia:** correção incremental por risco, sem reescrita geral nem alteração silenciosa de comportamento.

## Critérios de prioridade

| Nível | Critério | Exemplos |
|---|---|---|
| P0 | Pode quebrar execução, autorização, saldo, estoque ou dados | símbolo ausente, RPC sem regra de integridade, typecheck quebrado |
| P1 | Pode gerar estado antigo, duplicação ou comportamento intermitente | dependências incorretas de hooks, efeito assíncrono instável |
| P2 | Reduz capacidade de detectar regressões críticas | ausência de testes de Cantina, autenticação e fluxos transacionais |
| P3 | Mistura regras e contratos entre domínios | Cantina definida em tipos administrativos, telas concentrando regra |
| P4 | Aumenta custo e risco de mudança | componentes extensos, funções longas, tipagem genérica e duplicação |
| P5 | Qualidade final de entrega | build, bundle, QA móvel autenticado e documentação |

## Execução atual

### P0 — concluído no código e no banco remoto

- corrigida a referência ao ícone `Heart` sem importação na Home;
- corrigidos todos os erros encontrados pelo TypeScript estrito;
- adicionada tipagem explícita ao retorno da mocidade no dashboard;
- corrigido o contrato de criação de variações do Tesouro;
- removida a dependência de `String.replaceAll`, incompatível com o alvo atual;
- criada migration aditiva para aplicar `limite_por_membro` também ao resgate imediato da Cantina;
- criada verificação SQL do trigger e de seus privilégios;
- migration `20260814172000` aplicada e conferida no Supabase vinculado.

### P1 — concluído no código local

- corrigidas dependências de efeitos e callbacks em Home, Admin, Mural, EBD, Estúdio EBD e Biblioteca;
- evitados callbacks com dados antigos em assinaturas e carregamentos;
- erros assíncronos de crédito da EBD deixaram de produzir rejeições não tratadas;
- sanitização de caracteres de controle ficou explícita e sem alertas de regex.
- corrigida a mensagem ativa que ainda exigia “oito blocos”, alinhando-a à seleção editorial vigente.

### P2 — cobertura automatizada concluída nesta etapa

- criada suíte de contratos do serviço da Cantina;
- cobertos aprovisionamento idempotente, criação e confirmação do resgate imediato, retirada pelo operador, representante e propagação de erro remoto;
- adicionados testes das regras editoriais do Estúdio EBD;
- resultado atual: 37 arquivos e 176 testes aprovados.

Validações externas ainda necessárias:

1. teste autenticado de duas identidades para operador e beneficiário;
2. concorrência de saldo e estoque no banco;
3. limite combinado entre reserva antecipada e resgate imediato;
4. expiração e devolução de estoque;
5. não comparecimento, doação e retirada por representante;
6. E2E móvel da Carteira usando QR Code e código digitado.

### P3 — separação crítica concluída nesta etapa

- contratos da Cantina foram movidos de `types/admin.ts` para `types/cantina.ts`;
- operador, vitrine, Carteira e serviço agora compartilham o mesmo vocabulário de domínio;
- o acesso ao Supabase permanece concentrado em serviços, conforme o contrato do projeto.
- regras puras de navegação e brasões foram separadas dos componentes React;
- o módulo EBD legado foi extraído de `dataService.ts` para `ebdLessonService.ts`;
- as operações do Tesouro foram extraídas para `storeService.ts`;
- regras editoriais puras foram extraídas para `ebdStudioRules.ts` e receberam testes;
- prompts nativos foram substituídos por um diálogo acessível e validado.

Próximos cortes:

1. separar regras puras de disponibilidade, reserva e retirada do transporte Supabase;
2. dividir o serviço por capacidades: eventos, catálogo, reservas, checkout e relatórios;
3. criar casos de uso explícitos para reservar, confirmar, cancelar e doar;
4. isolar Tesouro, Carteira/Kesef e Cantina como módulos relacionados, mas independentes;
5. remover decisões de negócio de `Loja.tsx` e `AdminCantina.tsx`.

### P4 — redução dirigida concluída; dívida estrutural permanece

Ordem proposta pelos maiores pontos de concentração:

1. continuar a decomposição de `EbdStudio.tsx`;
2. separar catálogo, carteira e retirada atualmente orquestrados por `Loja.tsx`;
3. dividir capacidades remanescentes de `dataService.ts`;
4. decompor os formulários e relatórios de `AdminCantina.tsx`.

O objetivo não é reduzir linhas por si só. Cada extração deve criar um limite claro de responsabilidade e receber teste antes da próxima.

### P5 — pacote online publicado; QA físico pendente

- avisos locais de Fast Refresh eliminados pela configuração explícita dos hooks estáveis;
- build web, sincronização Android e APK debug aprovados;
- release `1.4.0-dev.23` publicada no canal online `development`, com o manifesto publicado por último;
- função `buscar-memoria-rag` republicada a partir do workspace ativo;
- fazer QA autenticado em dois celulares;
- validar os fluxos com conta sintética no ambiente remoto.

## Evidências locais desta etapa

- `npx tsc --noEmit`: aprovado;
- `npm run build:mobile`: aprovado;
- `npm run android:debug`: aprovado;
- `npm test -- --reporter=dot`: 37 arquivos, 176 testes aprovados;
- `npm run lint`: zero erro e zero aviso;
- `bash verificar-seguranca.sh`: aprovado;
- APK `1.4.0-dev.23`: SHA-256 `f0a93f3df2503c5c9ad62db88fd23750be4410f999cfcdd66efaa93ec9b757d6`;
- atualização online: APK publicado antes do manifesto no canal `app-updates/development`;
- `buscar-memoria-rag`: deploy confirmado no projeto `csxrhvgfnkqmkehgmnkp`.

## Estado de conclusão

O pacote crítico de correções está entregue no canal online. O trabalho que
permanece não bloqueia a distribuição da `dev.23`: é evolução estrutural
incremental e QA físico autenticado. O teste em dois celulares deve usar contas
distintas de operador e beneficiário e registrar QR Code, código manual, NFC
quando suportado, representante, estoque, saldo, data/hora e quantidade.

## Condições para considerar o trabalho completo

1. zero erro de TypeScript, build, lint e testes;
2. zero regra financeira ou de estoque confiada apenas ao cliente;
3. testes de banco para concorrência, idempotência e autorização;
4. testes E2E autenticados dos fluxos de maior risco;
5. telas principais sem regra de domínio relevante;
6. migrations aplicadas e validadas no ambiente correto;
7. QA móvel documentado com operador e beneficiário distintos;
8. documentação refletindo somente o comportamento comprovado.
