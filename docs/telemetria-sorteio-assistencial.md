# Telemetria assistencial do Sorteio

O painel `Admin > Oração e sorteio > Telemetria assistencial` apoia o cuidado do Círculo de Oração. Ele não é um ranking de espiritualidade e não exibe intenções, mensagens ou conteúdo de oração.

## Sinais acompanhados

- Chamadas iniciadas, aceites e encontros concluídos.
- Taxa de aceite e de continuidade após o aceite.
- Chamadas pendentes há mais de 30 minutos, recusas e expirações.
- Falhas de continuidade relatadas pelo app após uma chamada de convite rejeitada.
- Última formação do círculo, responsável pela execução e relações de intercessão.
- Pedidos de oração ativos como sinal assistencial; nomes só aparecem para papéis com permissão sensível.

## Fontes e limites

Convites, aceites e encerramentos vêm de `convites_oracao`. Cada novo sorteio cria um snapshot em `sorteio_circulo_execucoes` e `sorteio_circulo_relacoes`, preservando o histórico de formações futuras. Falhas de app são armazenadas em `oracao_telemetria_eventos` com código técnico limitado e coalescência de 45 segundos para não contar retries como ocorrências distintas.

Dados anteriores à migration não possuem snapshots de círculo nem falhas de app; os indicadores históricos que já existiam continuam disponíveis pelos convites registrados.

## Privacidade e acesso

O RPC `admin_obter_telemetria_sorteio` exige `prayer.read`. A lista assistencial nunca retorna o texto da intenção. A identidade de quem pediu oração é exibida apenas para quem também possui `people.sensitive` ou `pastoral.read`.
