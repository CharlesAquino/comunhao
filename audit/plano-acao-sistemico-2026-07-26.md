# Plano de ação sistêmico — execução

## Estado

Implementação local concluída e validada. A ativação completa do fluxo de membro
depende da aplicação controlada da nova migration no Supabase remoto.

## Ações executadas

1. Removido o fallback de `usuarios.id` para `auth.users.id`.
2. Adicionada vinculação segura de perfil legado pelo telefone verificado no JWT.
3. Criados helpers RLS `usuario_atual_id()` e `usuario_atual_e_admin()`.
4. Reescritas policies de `usuarios`, `pedidos` e `intercessoes` para usar o ID
   real do perfil.
5. Intercessão agora verifica erros de leitura, inserção e exclusão.
6. Kesef e XP só são creditados depois da intercessão persistir.
7. Timer valida convite aceito e participação antes de iniciar.
8. Chat diferencia membro inexistente, perfil desvinculado, erro e conversa vazia.
9. Chat e Timer deixaram de acessar Supabase diretamente nos componentes.
10. Login e Admin receberam associação entre labels e inputs e nomes acessíveis
    nos botões de senha.
11. Adicionados dois testes de regressão para impedir o retorno do fallback de ID.

## Validações

- 55/55 testes aprovados em 9 arquivos.
- Lint sem erros; permanecem 18 avisos preexistentes.
- Build e PWA aprovados.
- Verificação visual:
  - Login: telefone, senha e controle de exibição possuem nomes acessíveis.
  - Timer inválido: bloqueado, sem cronômetro e sem botão “Amém”.
  - Chat inválido: erro explícito, sem estado vazio contraditório.

## Ativação remota pendente

Migration:

`supabase/migrations/20260726120000_correcao_identidade_e_rls.sql`

Antes de aplicá-la:

1. Reconciliar `20260722_sessoes_oracao_grupo.sql` com o histórico remoto.
2. Confirmar backup do banco.
3. Revisar `usuarios` com `auth_user_id IS NULL` ou duplicado.
4. Aplicar a migration em ambiente de homologação.
5. Reexecutar login, Home, Perfil, Mural, Intercessão e Carteira.
6. Só então promover para produção.

Não foi executado `supabase db push`, pois o projeto documenta divergência no
histórico remoto e um push poderia incluir migrations fora deste plano.

## Figma

O quadro não pôde ser criado nesta sessão porque não há ferramenta/conector Figma
disponível. As 22 capturas originais e as 3 capturas pós-correção estão prontas
para importação, acompanhadas dos relatórios e resultados JSON.
