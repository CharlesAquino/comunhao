-- Coluna para rastrear última verificação de dispositivo
alter table public.usuarios add column if not exists ultima_verificacao timestamptz;
