# Autenticação por usuário e senha

## Decisão atual

O acesso usa `username + senha`. O cadastro cria a conta diretamente e não
solicita nem confirma código por WhatsApp.

O telefone permanece privado e vinculado apenas ao futuro fluxo de recuperação
de senha por WhatsApp. Essa recuperação ainda não está estruturada e permanece
indisponível na interface.

Internamente, o Supabase Auth ainda mantém o telefone como identificador da
conta. A Edge Function `login-username` resolve o username no servidor e nunca
devolve o telefone ao formulário de login.

## Fluxos

### Cadastro

1. O membro informa nome, username, WhatsApp, senha e e-mail opcional.
2. `registrar-username` valida os dados, cria a conta e inicia a sessão.

A verificação OTP por WhatsApp no cadastro foi descontinuada.

### Login

1. O membro informa username e senha.
2. `login-username` aplica limite de tentativas e resolve o telefone no backend.
3. O app recebe os tokens e cria a sessão Supabase.

### Recuperação

A tela informa que o recurso está em preparação e não dispara mensagens. As
Edge Functions `enviar-otp` e `verificar-otp` aceitam somente o contexto de
recuperação e não podem ser usadas para criar contas.

## Privacidade e segurança

- `usuarios_publicos` não contém telefone, e-mail, dados de dispositivo ou
  identificador de autenticação.
- O cliente autenticado não deve ter acesso de leitura às colunas privadas.
- Contatos administrativos são expostos somente por RPCs com permissão.
- Um trigger protege papel, telefone, username, pontuação, XP e vínculos
  sensíveis contra alteração indevida.
- Login e o backend reservado para recuperação têm limite de tentativas.
- Códigos de recuperação têm hash SHA-256, validade de dez minutos e no máximo
  cinco tentativas.
- Mensagens de erro evitam confirmar a existência de uma conta.

## Publicação no Supabase

As alterações locais precisam ser publicadas no ambiente correspondente:

```bash
npx supabase functions deploy login-username
npx supabase functions deploy registrar-username
npx supabase functions deploy enviar-otp
npx supabase functions deploy verificar-otp
```

As credenciais da Evolution API somente serão necessárias quando a recuperação
por WhatsApp for concluída.

## Roteiro mínimo de homologação

1. Cadastrar uma conta sem solicitar ou confirmar OTP.
2. Entrar novamente apenas com username e senha.
3. Confirmar que a recuperação informa que o recurso está em preparação.
4. Confirmar que `/verify-otp` redireciona para `/recuperar-senha`.
5. Confirmar que uma chamada de OTP com modo de cadastro é rejeitada.
6. Entrar como membro e confirmar que telefone/e-mail não são consultáveis.
