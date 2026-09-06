-- O cadastro direto substituiu o OTP de registro e recebe uma finalidade própria.
ALTER TABLE public.auth_rate_limits
  DROP CONSTRAINT IF EXISTS auth_rate_limits_finalidade_check;

ALTER TABLE public.auth_rate_limits
  ADD CONSTRAINT auth_rate_limits_finalidade_check
  CHECK (finalidade IN ('login', 'cadastro', 'otp_registro', 'otp_recuperacao'));
