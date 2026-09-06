# Auditoria funcional ponta a ponta — 26/07/2026

## Veredito

**Reprovado para uso completo.** Autenticação funciona, mas a conta `Jovem Teste 1`
não consegue resolver seu perfil em `usuarios`. Isso quebra Home, Comunidade,
Perfil e todas as gravações que dependem de `usuarios.id`.

## Ambiente e evidências

- App local Vite em viewport móvel de 390 × 844.
- Chrome headless via Playwright Core.
- Supabase remoto configurado no `.env`.
- Conta membro: `Jovem Teste 1`.
- Conta administrativa: `Charles Aquino`.
- Evidências: `audit/evidencias-2026-07-26/`.
- Eventos do navegador: `audit/evidencias-2026-07-26/eventos.json`.
- Resultado estruturado: `audit/evidencias-2026-07-26/resultado-inicial.json`.

## Base automatizada

- Lint: aprovado, sem erros e com 18 avisos.
- Testes: 53/53 aprovados em 8 arquivos.
- Build: aprovado, inclusive Service Worker/PWA.
- Alerta de build: bundle principal de 1.151,85 kB (306,31 kB gzip).
- Auditoria npm informou 10 vulnerabilidades de severidade alta após resolver a
  ferramenta temporária de teste. Nenhuma correção automática foi aplicada.

## Fluxos testados

| # | Fluxo | Saúde | Resultado |
|---|---|---|---|
| 1 | Login de membro | Parcial | Credenciais aceitas; consulta de `ultima_verificacao` retornou 406. |
| 2 | Verificação periódica | Parcial | Tela abriu e tentou enviar código; contingência “Pular” navegou corretamente. OTP real não foi informado. |
| 3 | Home | Falhou | “Usuário não encontrado no banco de dados”; dashboard indisponível. |
| 4 | Mural — leitura | Aprovado | Pedido existente e contagem renderizaram. |
| 5 | Mural — criar pedido | Falhou | POST retornou 409; UI exibiu “Erro ao criar pedido”. Nada persistiu. |
| 6 | Mural — interceder | Falhou | Inserção retornou 409; mesmo assim o código tentou crédito Kesef, também 409, e gerou erro não tratado. |
| 7 | Ranking/Jornada | Parcial | Tela renderiza, mas progresso pessoal ficou zerado pela ausência do perfil. |
| 8 | EBD | Parcial | Estado vazio correto; não havia lição/quiz remoto para testar conclusão e créditos. |
| 9 | Tesouro — itens | Parcial | Estado vazio correto; não havia item para testar resgate. |
| 10 | Tesouro — pedidos | Aprovado | Aba alternou e exibiu estado vazio correto. |
| 11 | Carteira | Parcial | Saldo, histórico vazio e código de indicação renderizaram; créditos/débitos ficaram bloqueados. |
| 12 | Comunidade | Falhou | “Usuário não encontrado no banco de dados”. |
| 13 | Perfil | Falhou | “Perfil não encontrado”. Upload e edição ficaram bloqueados. |
| 14 | Guia de Patentes | Aprovado | Conteúdo e progressão renderizaram. |
| 15 | Chat com ID inexistente | Falhou | Mostra simultaneamente “Carregando...” e estado vazio, sem erro de destinatário inválido. |
| 16 | Sala LiveKit com ID inexistente | Aprovado | Falhou de forma controlada e ofereceu “Voltar”. |
| 17 | Timer com convite inexistente | Falhou criticamente | Iniciou cronômetro e habilitou “Amém” sem validar o convite. |
| 18 | Cadastro | Parcial | Formulário renderiza; criação/OTP não foi concluída para evitar criar outra conta de teste. |
| 19 | Admin como membro | Aprovado | Acesso negado e formulário de professor exibido. |
| 20 | Admin como Charles | Aprovado | Autenticou, carregou métricas e jovens sem erros HTTP observados. |
| 21 | Sorteio e WhatsApp administrativo | Não executado | Alteraria duplas reais e enviaria mensagens externas. |
| 22 | Tema e navegação inferior | Parcial | Navegação renderiza de forma consistente; alternador aparece, mas persistência entre sessões não foi isolada nesta rodada. |

## Causa principal

`getUserId()` tenta localizar o perfil por `auth_user_id` e, quando não encontra,
retorna o UUID de `auth.users`. Em seguida, os serviços consultam `usuarios.id`
usando esse UUID de autenticação. Para `Jovem Teste 1`, isso produziu consultas
406 e IDs inválidos em chaves estrangeiras, seguidos por respostas 409 nas
inserções.

O resultado é uma falha em cascata:

1. O perfil não é resolvido.
2. Home, Comunidade e Perfil não carregam.
3. Pedido e intercessão usam o UUID errado como `autor_id`/`usuario_id`.
4. O crédito Kesef é tentado mesmo quando a intercessão não foi inserida.

Isso é compatível com o estado documentado de que a migration RLS inicial ainda
não foi aplicada e também pode indicar contas de teste sem `auth_user_id`
corretamente vinculado.

## Riscos prioritários

1. **P0 — identidade/RLS:** corrigir a leitura do perfil e reconciliar
   `usuarios.auth_user_id` das contas de teste antes de qualquer outro teste.
2. **P0 — Timer:** validar convite, participação e estado antes de iniciar o
   cronômetro ou permitir finalização.
3. **P1 — intercessão:** verificar o erro do `insert` e aguardar os créditos;
   nunca creditar Kesef/XP após falha da intercessão.
4. **P1 — rotas dinâmicas:** Chat precisa distinguir carregamento, destinatário
   inexistente e conversa vazia.
5. **P1 — acessibilidade do Login/Admin:** rótulos visuais não estão associados
   aos inputs por `htmlFor`/`id`; o botão de mostrar senha também não tem nome
   acessível.
6. **P2 — mensagens:** falhas técnicas aparecem como mensagens genéricas, o que
   dificulta recuperação e suporte.

## Limites

- Não foi possível validar oração real em dupla, convite aceito, LiveKit com dois
  participantes, finalização válida do Timer, EBD/quiz, resgate de loja e
  créditos correspondentes porque o perfil membro está quebrado e faltam dados
  remotos nessas áreas.
- Screenshots sustentam a avaliação visual, mas não provam conformidade WCAG.
  Leitor de tela, zoom, contraste calculado e navegação completa por teclado
  exigem uma rodada dedicada após os P0.
