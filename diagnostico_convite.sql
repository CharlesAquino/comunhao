-- ============================================================
-- DIAGNÓSTICO COMPLETO: Convite não aparece
-- ============================================================

-- 1. Verificar auth_user_id de TODOS os usuários
SELECT id, nome, telefone, auth_user_id, papel
FROM public.usuarios
ORDER BY nome;

-- 2. Verificar o sorteio (orando_por_id de cada um)
SELECT id, nome, orando_por_id, (
  SELECT nome FROM public.usuarios WHERE id = u.orando_por_id
) AS orando_por_nome
FROM public.usuarios u
WHERE orando_por_id IS NOT NULL;

-- 3. CORREÇÃO: Vincular auth_user_id de TODOS que estão sem
UPDATE public.usuarios u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.auth_user_id IS NULL
  AND a.phone = u.telefone;

-- 4. CORREÇÃO: Se ainda houver usuários sem auth_user_id,
--    criar manualmente (substitua os IDs abaixo pelos corretos)
-- SELECT id, phone FROM auth.users;  -- lista auth.users disponíveis

-- 5. Verificar se a tabela convites_oracao tem dados
SELECT * FROM public.convites_oracao ORDER BY criado_em DESC LIMIT 10;

-- 6. Testar RLS: logue como Teste5 no app e execute:
-- SELECT * FROM public.convites_oracao
-- WHERE destinatario_id IN (
--   SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
-- );
