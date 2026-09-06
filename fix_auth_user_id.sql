-- ============================================================
-- Diagnóstico e Correção: auth_user_id
-- ============================================================
-- Passo 1: Verificar quais usuários NÃO têm auth_user_id
SELECT id, nome, telefone, auth_user_id
FROM public.usuarios
WHERE auth_user_id IS NULL;

-- Passo 2: Verificar se os auth.users existem para esses telefones
SELECT id, phone
FROM auth.users
WHERE phone IN (
  SELECT telefone FROM public.usuarios WHERE auth_user_id IS NULL
);

-- Passo 3: Vincular auth_user_id para cada usuário
-- (Substitua cada telefone pelo auth.users.id correspondente)
UPDATE public.usuarios u
SET auth_user_id = a.id
FROM auth.users a
WHERE u.auth_user_id IS NULL
  AND a.phone = u.telefone;

-- Passo 4: Verificar se o RLS do convites_oracao permite SELECT
-- Teste: faça login como Teste5 e execute:
SELECT * FROM public.convites_oracao
WHERE destinatario_id IN (
  SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()
)
LIMIT 5;
