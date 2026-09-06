# Performance e cache

## Estratégia da Home

A Home usa `stale-while-revalidate` para conteúdo estrutural:

1. a última Home válida é lida do armazenamento local;
2. a interface pode ser exibida sem aguardar a rede;
3. os dados são consultados novamente em segundo plano;
4. a resposta atual substitui a cópia local e renova o cache.

O cache expira em 24 horas e é removido no login, cadastro e encerramento da sessão, evitando que uma conta reutilize o conteúdo de outra.

## Dados que permanecem remotos

Convites, chamadas, salas de oração, notificações e demais estados operacionais não dependem do cache da Home. Esses fluxos continuam consultando o servidor e usando atualizações em tempo real.

## Estratégia do Mural

O Mural também usa `stale-while-revalidate`: exibe o último feed válido e consulta uma versão atual em segundo plano. Alterações locais de intercessão, edição, exclusão e comentários renovam a cópia exibida.

O cache do Mural expira em 30 minutos, antes do vencimento de uma hora das URLs assinadas das imagens. Publicações e interações continuam sendo confirmadas pelo Supabase e pelo Realtime.

## Política por área

| Área | Validade | Comportamento |
| --- | ---: | --- |
| Início | 24 horas | Estrutura imediata e atualização em segundo plano |
| Mural | 30 minutos | Feed imediato; imagens expiram antes das URLs assinadas |
| EBD | 7 dias | Conteúdo editorial offline e sincronização da publicação |
| Tesouro | 30 minutos | Catálogo imediato; saldo e resgates revalidados |
| Cantina | 2 minutos | Anúncios imediatos; estoque e evento revalidados |
| Carteira | 5 minutos | Último saldo apenas para apresentação; ledger e operações remotos |
| Perfil | 24 horas | Identidade imediata; cache renovado após edição |
| Configurações | local | Preferências já persistidas no dispositivo |
| Comunidade e Sala de Oração | sem cache de presença | Disponibilidade e chamadas precisam refletir o momento atual |
| Mensagens e notificações | sem cache funcional | Conteúdo privado e contadores permanecem remotos/Realtime |
| Pedidos e Administração | sem cache operacional | Decisões, estoque e estados administrativos sempre atuais |

## Otimizações de rede

- dupla da semana, sustentador e lista da comunidade são carregados em paralelo;
- solicitações simultâneas do ID interno do perfil compartilham a mesma promessa em andamento;
- o splash Android foi reduzido de 2.000 ms para 700 ms.

## Invalidação

Os caches são versionados pelas chaves `comunhao:dashboard-cache:v1` e `comunhao:mural-cache:v1`. Uma mudança incompatível no contrato deve incrementar a versão correspondente.
