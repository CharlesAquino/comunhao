# Sistema de Patentes — Jornada de Serviço

O XP é acumulativo e nunca é gasto. Ele reconhece constância, serviço,
perseverança, comunhão, proteção e missão. A progressão não representa poder ou
hierarquia espiritual.

## Patentes

| Patente | XP mínimo | Símbolo | Significado |
|---|---:|---|---|
| Servo Fiel | 0 | Oliveira | Constância e serviço |
| Guardião | 300 | Escudo e cruz | Proteção da comunidade |
| Intercessor | 800 | Chama | Oração constante |
| Atalaia | 1.800 | Trombeta | Vigilância espiritual |
| Discipulador | 3.500 | Espiga | Formação e multiplicação |
| Missionário | 6.000 | Estrela | Envio e missão |
| Conselheiro | 9.500 | Lâmpada | Discernimento e cuidado |
| Pacificador | 18.500 | Pomba | Comunhão e maturidade |

As sete primeiras patentes possuem quatro divisões, de IV a I. Pacificador é a
patente máxima. A antiga faixa de 13.500 XP foi absorvida pela progressão
interna de Conselheiro; nenhum XP existente precisa ser alterado.

## Etapas narrativas

- **Serviço:** Servo Fiel, Guardião e Intercessor;
- **Missão:** Atalaia, Discipulador e Missionário;
- **Sabedoria:** Conselheiro e Pacificador.

## Fontes canônicas

- cálculo, limiares e divisões: `src/services/patente.ts`;
- SVGs e especificação visual: `src/assets/badges/`;
- componente React: `src/components/BadgeRank.tsx`;
- linguagem visual: `.ai/06-design-language.md`.

As patentes são calculadas no frontend a partir de `usuarios.xp`. Os nomes das
patentes não são persistidos pelo sistema atual.
