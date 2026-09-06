-- Remove políticas existentes que limitam o UPDATE
DROP POLICY IF EXISTS convites_update ON public.convites_oracao;
DROP POLICY IF EXISTS "convites_update" ON public.convites_oracao;

-- Recria permitindo remetente E destinatário atualizarem
CREATE POLICY convites_update ON public.convites_oracao
  FOR UPDATE
  USING (
    destinatario_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
    OR remetente_id IN (SELECT id FROM usuarios WHERE auth_user_id = auth.uid())
  );
