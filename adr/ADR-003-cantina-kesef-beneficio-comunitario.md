# ADR-003 — Cantina Kesef como benefício comunitário por evento

**Status:** Proposto para aprovação  
**Data:** 11/08/2026  
**Responsável de produto:** Charles  
**Decisão necessária antes de migrations:** aprovação pastoral, contábil e jurídica

## Contexto

O Comunhão já possui Tesouro, carteira e ledger Kesef. A Cantina compartilhará a
aba do Tesouro, mas terá natureza operacional diferente: seus itens existem
somente durante um culto, congresso, acampamento, retiro ou outro evento aberto.

Os alimentos e objetos podem ser disponibilizados por Charles, pela organização
ou por outros membros. Essa disponibilização não cria direito a receber Kesef nem
conversão futura em reais.

## Decisão proposta

1. Kesef é um ponto interno de benefício, sem saque, cotação ou conversão em reais.
2. A Cantina é operada pela organização; não é marketplace entre membros.
3. A ação do membro é `resgatar`, não `comprar` ou `pagar`.
4. O Kesef debitado no resgate é retirado de circulação. Não é transferido ao
   contribuidor, operador, Charles ou a uma carteira da Cantina.
5. Compra, doação, cessão ou reembolso de itens ocorre fora do ledger Kesef e sem
   proporcionalidade com os pontos resgatados.
6. Itens da Cantina são sempre vinculados a um evento. Podem ser anunciados antes
   dele durante uma janela de reservas, mas deixam de aparecer quando o evento
   fecha ou expira, mesmo com estoque remanescente.
7. Estoque remanescente exige destinação explícita. Não migra automaticamente
   para outro evento.
8. QR Code é o mecanismo primário de identificação do resgate. NFC é um atalho
   opcional para localizar o caixa e seu pedido ativo; a confirmação permanece
   autenticada e transacional no servidor.
9. Autoridade operacional usa papéis e permissões administrativas, não as
   patentes de XP da Jornada de Serviço.
10. A reserva antecipada cria um aprovisionamento de Kesef e de estoque. O ponto
    continua pertencendo ao membro, mas fica indisponível para outro resgate.
11. O aprovisionamento vira débito definitivo somente na entrega ou na destinação
    por ausência, conforme regra aceita previamente pelo membro.
12. Cancelamento dentro do prazo, evento cancelado, item indisponível ou falha da
    organização liberam integralmente Kesef e estoque, sem penalizar o membro.
13. O titular pode autorizar um terceiro a retirar sua reserva no próprio evento.
    Isso é representação para retirada, não entrega ou transferência da reserva.
14. A Cantina não oferece entrega domiciliar, despacho ou transporte de produtos.
15. Valores em Kesef são hipóteses econômicas versionadas. Só podem ser publicados
    após medição de emissão, distribuição, saldo, estoque, frequência, demanda,
    concentração e velocidade, conforme plano de calibração.

## Papéis

- `gestor_cantina`: Charles, gestão geral, equipe, eventos, estoque, relatórios e
  estornos autorizados;
- `operador_cantina`: responsável pelo resgate em um evento/turno;
- `contribuidor`: pessoa que disponibilizou o item; não recebe permissão por isso;
- `membro`: pessoa autenticada que utiliza Kesef para resgatar;
- `administrador`: conserva acesso sistêmico e auditoria.

Uma insígnia temporária “Responsável pelo resgate” pode aparecer durante o turno,
mas não altera a patente espiritual/progressiva do usuário.

## Consequências

### Positivas

- evita split financeiro e equivalência Kesef/real;
- cria um sumidouro verificável para equilibrar a economia Kesef;
- permite planejar demanda sem cobrar o membro antes da entrega;
- permite participação comunitária sem remuneração automática;
- mantém rastreabilidade de estoque, resgates e operadores;
- reutiliza identidade, carteira, ledger, RLS, Realtime e Admin existentes.

### Custos e limites

- exige domínio separado do catálogo permanente do Tesouro;
- requer operação de abertura/fechamento e destinação de sobras;
- exige lembretes, prazo de cancelamento e apuração responsável de ausência;
- NFC não terá cobertura universal; QR Code continua obrigatório;
- alimentos exigem controles próprios de validade, conservação e alergênicos;
- o processo econômico e contábil deve ser validado antes da operação habitual.

## Alternativas rejeitadas

- transferir Kesef ao “vendedor”;
- converter Kesef em reais ou compensação proporcional;
- usar uma conta financeira da Cantina;
- permitir transferência livre de Kesef entre membros;
- tratar a retirada por terceiro como transferência de Kesef ou de titularidade;
- oferecer entrega em domicílio pela operação da Cantina;
- reutilizar `loja_itens` com itens permanentes e esconder manualmente depois;
- gravar valor, saldo ou autorização de débito em QR Code ou tag NFC;
- criar uma nova patente de XP para conceder permissão administrativa.
- debitar Kesef no momento da reserva antes da entrega;
- consumir automaticamente o aprovisionamento por simples passagem do horário,
  sem confirmação de que o item estava disponível e separado.

## Invariantes

```text
1 Kesef não representa R$ 1 nem qualquer fração de moeda.
resgate confirmado = débito imutável + baixa de estoque na mesma transação.
operador nunca debita silenciosamente a carteira do membro.
evento fechado = nenhum item anunciável ou resgatável.
tag/QR identifica intenção; o servidor determina conteúdo, valor e validade.
saldo disponível = saldo do ledger - aprovisionamentos ativos.
reserva entregue ou doada por ausência = um único débito definitivo.
falha da organização = liberação integral do aprovisionamento.
valor Kesef do item não é derivado de custo ou preço em reais.
```
