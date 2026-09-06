-- ============================================================
-- Migração: Reforço de Segurança (RLS) + Campo de Papel
-- ============================================================
-- Aplicar após setup_db.sql

-- 0. Bucket de avatares (necessário criar via dashboard Supabase)
--    Nome: avatars
--    Público: true
--    SQL equivalente (se suportado):
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- CREATE POLICY "Acesso público a avatares" ON storage.objects FOR SELECT USING (true);
-- CREATE POLICY "Upload de avatar pelo usuário" ON storage.objects FOR INSERT WITH CHECK (true);

-- 1. Adiciona campo 'papel' à tabela usuarios
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS papel TEXT CHECK (papel IN ('admin', 'membro')) DEFAULT 'membro';

-- 1b. Adiciona campo auth_id para vincular ao Supabase Auth
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id) UNIQUE;

-- 1c. Adiciona campo device_id para identificação de dispositivo
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS device_id TEXT;

-- 2. Remove políticas antigas e excessivamente permissivas
DROP POLICY IF EXISTS "Atualizações de perfil e anel" ON usuarios;
DROP POLICY IF EXISTS "Remoção pública de pedidos" ON pedidos;
DROP POLICY IF EXISTS "Remoção pública de intercessões" ON intercessoes;

-- 3. Política restritiva para UPDATE em usuarios
--    Usa auth.uid() quando o usuário tem auth_id vinculado
CREATE POLICY "Atualizações de perfil e anel" ON usuarios
  FOR UPDATE USING (auth_id IS NULL OR auth_id = auth.uid()) WITH CHECK (auth_id IS NULL OR auth_id = auth.uid());

-- 4. Remove políticas de DELETE em pedidos e intercessoes
--    (apenas admins via painel ou operações manuais no banco)
CREATE POLICY "Remoção de pedidos" ON pedidos
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = pedidos.autor_id
      AND usuarios.papel = 'admin'
    )
  );

CREATE POLICY "Remoção de intercessões" ON intercessoes
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM usuarios
      WHERE usuarios.id = intercessoes.usuario_id
      AND usuarios.papel = 'admin'
    )
  );

-- 5. Garante que as permissões existentes permanecem
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercessoes ENABLE ROW LEVEL SECURITY;

-- 6. Política para SELECT em usuarios: visível para todos (mocidade, ranking)
--    A privacidade é da própria igreja/grupo
DROP POLICY IF EXISTS "Acesso a usuários" ON usuarios;
CREATE POLICY "Acesso a usuários" ON usuarios
  FOR SELECT USING (true);
