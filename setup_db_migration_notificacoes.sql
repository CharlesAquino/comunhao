-- ============================================================
-- Migration: Push Notifications
-- ============================================================

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  usuario_id UUID PRIMARY KEY REFERENCES public.usuarios(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário gerencia própria subscription"
  ON public.push_subscriptions FOR ALL
  USING (usuario_id IN (SELECT id FROM public.usuarios WHERE auth_user_id = auth.uid()));
