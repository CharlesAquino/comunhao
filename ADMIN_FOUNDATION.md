# Comunhão — Fundação do novo painel administrativo

Esta entrega implementa a Fase 1 aprovada na análise de requisitos.

## Incluído

- shell administrativo responsivo, fora do limite móvel `max-w-md`;
- menu lateral no desktop e gaveta no celular;
- rotas modulares protegidas por permissão;
- compatibilidade com `usuarios.papel = admin` e `mod`;
- papéis funcionais cumulativos;
- catálogo de permissões no PostgreSQL;
- auditoria administrativa imutável;
- dashboard com indicadores reais;
- rota de auditoria;
- integração do Estúdio EBD e da Memória RAG ao novo shell;
- atualização das Edge Functions para permissões funcionais;
- redirecionamento de `/admin/ebd-studio` para `/admin/ebd`;
- correção para que Guardião não receba controles da Loja.

## Rotas

- `/admin`
- `/admin/pessoas`
- `/admin/oracao`
- `/admin/moderacao`
- `/admin/ebd`
- `/admin/conhecimento`
- `/admin/loja`
- `/admin/economia`
- `/admin/notificacoes`
- `/admin/auditoria`
- `/admin/sistema`
- `/admin/configuracoes`

Pessoas, Moderação, Loja, Economia, Notificações e Sistema já possuem rota, permissão e lugar no painel. Seus CRUDs serão migrados nas próximas fases.

## Papéis funcionais

- `administrador`
- `guardiao`
- `editor_ebd`
- `revisor_ebd`
- `operador_loja`
- `pastoral`
- `tecnico`

O papel legado `admin` continua com acesso integral. O papel legado `mod` passa a ser tratado como Guardião.

## Segurança

A interface usa permissões apenas para experiência visual. A migration também cria `admin_tem_permissao(...)`, atualiza RLS e exige a mesma permissão dentro das Edge Functions afetadas.
