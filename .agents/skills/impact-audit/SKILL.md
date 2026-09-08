---
name: impact-audit
description: Auditoria obrigatória de impacto (AI) de 5 pontos a ser realizada antes de prosseguir com qualquer mudança estrutural, de performance ou de design no aplicativo. Use sempre que o usuário solicitar uma alteração significativa.
---

# Auditoria de Impacto (AI)

Sempre que houver uma solicitação para mudar configurações estruturais ou de design do projeto (especialmente envolvendo UI pesada, carregamento de mídia, arquitetura de rede ou dependências visuais), você DEVE realizar a seguinte Auditoria de Impacto de 5 pontos e obter aprovação (ou resolver internamente) antes de implementar a mudança:

1. **Evolução vs. Legado**: O que exatamente melhora na percepção do usuário final em comparação com a versão atual?
2. **Custo de Recurso**: Qual o impacto estimado em RAM, CPU e Tempo de Carregamento (especialmente considerando hardware limitado / aparelhos antigos)?
3. **Risco de Colapso**: Quais as 3 principais formas dessa mudança quebrar o app em hardware limitado ou conexões lentas?
4. **Variáveis de Reversão**: Como voltamos ao estado anterior se a implementação falhar em produção?
5. **Conflito de Design System**: A mudança respeita a hierarquia visual do projeto (vidro/glassmorphism, paleta Ouro/Bronze/Verde Oliva)?

A implementação só deve prosseguir após a reflexão técnica sobre esses pontos.
