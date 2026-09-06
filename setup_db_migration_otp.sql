-- Tabela para armazenar códigos OTP enviados via WhatsApp
-- Evita custo de SMS usando Evolution API para entrega
create table if not exists public.otp_codes (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  code_hash text not null,
  tentativas integer not null default 0,
  expires_at timestamptz not null,
  used_at timestamptz,
  criado_em timestamptz not null default now()
);

create index if not exists idx_otp_telefone on public.otp_codes(telefone, criado_em desc);

alter table public.otp_codes enable row level security;

-- Ninguém lê otp_codes diretamente (só as Edge Functions via service_role)
create policy "service_role_only" on public.otp_codes for all using (false);
