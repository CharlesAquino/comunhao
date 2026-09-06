# WhatsApp e Evolution API

## Estado atual

A integração genérica de WhatsApp foi descontinuada. O aplicativo não envia
convites, avisos administrativos ou notificações de duplas por WhatsApp.

A antiga Edge Function `enviar-whatsapp` e o serviço cliente correspondente
foram removidos do código. Caso a função tenha sido publicada anteriormente,
ela também deve ser excluída do projeto Supabase remoto.

O único uso previsto para WhatsApp é a futura recuperação de senha. Esse fluxo
ainda não está estruturado e permanece desabilitado na interface. As funções
`enviar-otp` e `verificar-otp` rejeitam o modo de cadastro e ficam reservadas
exclusivamente para a recuperação.

Nenhuma credencial da Evolution API deve ser adicionada ao frontend.
