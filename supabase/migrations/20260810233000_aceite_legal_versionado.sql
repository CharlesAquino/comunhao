-- Documentos legais e aceite digital versionado do Comunhão.
-- O texto apresentado é preservado integralmente junto de um SHA-256.

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.documentos_legais (
  codigo text not null,
  versao text not null,
  titulo text not null,
  resumo text not null,
  conteudo text not null,
  tipo_aceite text not null check (tipo_aceite in ('aceite', 'ciencia')),
  hash_conteudo text not null,
  vigente_desde timestamptz not null,
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  primary key (codigo, versao)
);

create unique index if not exists documentos_legais_um_ativo_por_codigo_idx
  on public.documentos_legais(codigo) where ativo;

create table if not exists public.aceites_legais (
  usuario_id uuid not null references public.usuarios(id) on delete cascade,
  documento_codigo text not null,
  documento_versao text not null,
  hash_conteudo text not null,
  tipo_aceite text not null check (tipo_aceite in ('aceite', 'ciencia')),
  aceito_em timestamptz not null default now(),
  versao_app text,
  primary key (usuario_id, documento_codigo, documento_versao),
  foreign key (documento_codigo, documento_versao)
    references public.documentos_legais(codigo, versao) on delete restrict
);

create index if not exists aceites_legais_usuario_idx
  on public.aceites_legais(usuario_id, aceito_em desc);

alter table public.documentos_legais enable row level security;
alter table public.aceites_legais enable row level security;
revoke all on public.documentos_legais, public.aceites_legais from public, anon, authenticated;

with documentos(codigo, versao, titulo, resumo, conteudo, tipo_aceite) as (
  values
  (
    'termos_uso',
    '1.0.0',
    'Termos de Uso',
    'Regras para acessar, participar e publicar no Comunhão.',
    $terms$
TERMOS DE USO DO COMUNHÃO
Versão 1.0.0 — vigência em 10 de agosto de 2026

1. IDENTIFICAÇÃO
Comunhão é uma iniciativa digital cristã, protestante e evangélica, controlada por Charles Thadeu Pereira de Aquino. Contato oficial: charlesaquino33@gmail.com.

2. FINALIDADE
O aplicativo existe para fortalecer oração, ensino bíblico, cuidado pastoral e convivência comunitária dentro de sua identidade confessional. O Comunhão não substitui atendimento médico, psicológico, jurídico, policial ou serviços de emergência.

3. CONTA E SEGURANÇA
Cada pessoa é responsável pelas informações fornecidas, pela confidencialidade da senha e pelas atividades realizadas em sua conta. É proibido ceder contas, personificar terceiros, tentar acessar dados alheios ou contornar mecanismos de segurança.

4. CONTEÚDO DO USUÁRIO
Ao publicar textos, imagens, mensagens ou pedidos de oração, o usuário declara possuir autorização para fazê-lo e concede ao Comunhão permissão limitada para armazenar, exibir e processar esse conteúdo somente para operar as funcionalidades escolhidas. O usuário permanece responsável pelo conteúdo que envia.

5. IDENTIDADE CONFESSIONAL
O uso dos espaços comunitários pressupõe respeito à identidade cristã, protestante e evangélica do Comunhão. Pessoas de qualquer origem podem utilizar o aplicativo desde que respeitem essa finalidade e as Diretrizes da Comunidade.

6. MODERAÇÃO
Conteúdos ou condutas incompatíveis com estes Termos ou com as Diretrizes poderão ser limitados ou removidos. Conforme gravidade e reincidência, a conta poderá receber advertência, restrição, suspensão ou encerramento. A decisão deve indicar a regra aplicada e disponibilizar canal de contestação.

7. DISPONIBILIDADE
O serviço pode sofrer manutenção, indisponibilidade ou alteração. Medidas razoáveis serão adotadas para preservar continuidade e segurança, sem garantia de funcionamento ininterrupto.

8. ALTERAÇÕES
Mudanças materiais nestes Termos gerarão nova versão e novo aceite antes da continuidade do uso. Ajustes meramente formais poderão ser informados sem novo aceite.

9. ENCERRAMENTO E DIREITOS
O usuário pode deixar de utilizar o serviço e solicitar informações ou exclusão de seus dados pelo canal oficial, observadas as hipóteses legais de conservação.

10. LEGISLAÇÃO
Estes Termos são regidos pelas leis brasileiras. Nenhuma disposição limita direitos assegurados pela legislação aplicável.
    $terms$,
    'aceite'
  ),
  (
    'diretrizes_comunidade',
    '1.0.0',
    'Identidade e Diretrizes da Comunidade',
    'Compromisso com a finalidade cristã e uma convivência respeitosa.',
    $guidelines$
IDENTIDADE E DIRETRIZES DA COMUNIDADE
Versão 1.0.0 — vigência em 10 de agosto de 2026

1. NOSSA IDENTIDADE
O Comunhão é uma iniciativa cristã, protestante e evangélica. Seus espaços de oração, ensino, EBD, comunhão e cuidado são orientados pela Bíblia e por essa identidade confessional.

2. CONVIVÊNCIA ESPERADA
Participe com verdade, respeito, prudência e cuidado. Preserve a dignidade, a intimidade e a segurança das pessoas. Divergências devem ser tratadas sem humilhação, ameaça, perseguição ou exposição indevida.

3. CONTEÚDOS COMPATÍVEIS
São bem-vindos conteúdos de oração, edificação cristã, estudo bíblico, testemunho responsável, serviço, cuidado comunitário e dúvidas apresentadas de boa-fé.

4. CONTEÚDOS INCOMPATÍVEIS
Não é permitido utilizar o Comunhão para proselitismo, recrutamento, realização de rituais ou divulgação sistemática de doutrinas incompatíveis com sua identidade cristã protestante e evangélica. Também são proibidos discurso de ódio, discriminação religiosa, assédio, ameaça, fraude, exposição de dados pessoais, conteúdo sexual impróprio, incentivo à violência ou atividades ilegais.

5. RESPEITO A OUTRAS PESSOAS
A identidade confessional do aplicativo não autoriza ataques contra pessoas ou grupos de outras religiões, contra quem não possui religião ou contra outras tradições cristãs. A moderação considera o conteúdo e a conduta, nunca uma crença presumida.

6. PEDIDOS DE ORAÇÃO E CUIDADO
Não compartilhe dados de terceiros sem autorização. Ao relatar situações de saúde, família ou intimidade, informe apenas o necessário e escolha cuidadosamente a visibilidade. Emergências devem ser encaminhadas aos serviços públicos competentes.

7. MODERAÇÃO E CONTESTAÇÃO
Violações podem resultar em orientação, remoção, limitação, suspensão ou encerramento da conta. O usuário poderá solicitar revisão pelo e-mail charlesaquino33@gmail.com, informando seu usuário e a decisão contestada.
    $guidelines$,
    'aceite'
  ),
  (
    'aviso_privacidade',
    '1.0.0',
    'Aviso de Privacidade',
    'Como o Comunhão coleta, utiliza, protege e elimina dados pessoais.',
    $privacy$
AVISO DE PRIVACIDADE DO COMUNHÃO
Versão 1.0.0 — vigência em 10 de agosto de 2026

1. CONTROLADOR E CONTATO
O controlador dos dados é Charles Thadeu Pereira de Aquino. Solicitações de privacidade: charlesaquino33@gmail.com.

2. DADOS TRATADOS
Podemos tratar dados de cadastro e autenticação, como nome, usuário, telefone, e-mail de recuperação, foto e identificadores técnicos; dados de uso, como último acesso, preferências, notificações e progresso; conteúdos enviados, como publicações, mensagens, pedidos de oração e acompanhamento pastoral; e registros de segurança e auditoria.

3. DADOS SENSÍVEIS
Pedidos de oração, mensagens ou acompanhamento podem revelar informações religiosas, familiares ou de saúde. Esses dados recebem acesso restrito conforme a visibilidade escolhida e as permissões da equipe. Quando o tratamento depender de consentimento, ele será solicitado de forma específica no momento da coleta.

4. FINALIDADES
Os dados são usados para autenticar contas, entregar funcionalidades, organizar a comunidade, permitir oração e cuidado, enviar comunicações solicitadas, prevenir abuso, proteger o serviço, atender direitos dos titulares e cumprir obrigações legais.

5. BASES LEGAIS
O tratamento ocorre conforme a finalidade e pode se apoiar na execução destes Termos, consentimento, legítimo interesse acompanhado de avaliação, exercício regular de direitos, proteção da vida ou cumprimento de obrigação legal. Dados sensíveis somente serão tratados nas hipóteses permitidas pelo artigo 11 da LGPD.

6. COMPARTILHAMENTO E OPERADORES
O Comunhão utiliza provedores técnicos para infraestrutura, autenticação, notificações, comunicação, áudio e vídeo e geração de conteúdo editorial. Atualmente podem participar Supabase, Firebase Cloud Messaging, LiveKit, Resend, Evolution/WhatsApp e Groq. Cada operador deve receber apenas os dados necessários à função contratada. Alguns tratamentos podem envolver transferência internacional, sujeita às salvaguardas legais aplicáveis.

7. VISIBILIDADE COMUNITÁRIA
Nome, foto, apresentação visual e conteúdos que o usuário decide publicar podem ser vistos por outros membros autenticados. Telefone, e-mail, credenciais e horário exato do último acesso não integram o perfil comunitário público. A lista da comunidade pode utilizar o último acesso apenas para ordenação.

8. RETENÇÃO E ELIMINAÇÃO
Os dados são mantidos enquanto necessários às finalidades informadas, à segurança, à prestação do serviço ou ao cumprimento de obrigações. Conteúdos expirados podem permanecer por período limitado para auditoria, prevenção de abuso e cópias de segurança. Ao fim da necessidade, serão eliminados ou anonimizados, ressalvadas hipóteses legais de conservação.

9. SEGURANÇA
São utilizadas autenticação, controle de acesso, políticas por linha, permissões administrativas, registros de auditoria, limitação de tentativas e criptografia fornecida pela infraestrutura. Nenhum sistema é totalmente isento de risco; incidentes relevantes serão tratados e comunicados conforme a legislação.

10. DIREITOS DO TITULAR
O titular pode solicitar confirmação, acesso, correção, informações sobre compartilhamento, revisão, portabilidade quando aplicável, anonimização, bloqueio, eliminação e revogação de consentimento. Solicitações devem ser enviadas a charlesaquino33@gmail.com e poderão exigir confirmação segura de identidade.

11. CRIANÇAS E ADOLESCENTES
O tratamento de dados de menores deve observar seu melhor interesse e as autorizações legalmente exigidas. Contas ou funcionalidades destinadas a menores poderão exigir procedimento adicional de responsabilidade parental.

12. ATUALIZAÇÕES
Mudanças materiais neste Aviso serão apresentadas em nova versão. O histórico de ciência preservará a versão efetivamente apresentada ao usuário.
    $privacy$,
    'ciencia'
  )
)
insert into public.documentos_legais (
  codigo, versao, titulo, resumo, conteudo, tipo_aceite,
  hash_conteudo, vigente_desde, ativo
)
select
  codigo, versao, titulo, resumo, conteudo, tipo_aceite,
  encode(extensions.digest(convert_to(conteudo, 'UTF8'), 'sha256'), 'hex'),
  '2026-08-10 00:00:00-03'::timestamptz,
  true
from documentos
on conflict (codigo, versao) do nothing;

create or replace function public.listar_documentos_legais()
returns table (
  codigo text,
  versao text,
  titulo text,
  resumo text,
  conteudo text,
  tipo_aceite text,
  hash_conteudo text,
  vigente_desde timestamptz,
  aceito_em timestamptz
)
language plpgsql
security definer
set search_path = ''
stable
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
begin
  if auth.uid() is null or v_usuario_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;

  return query
  select
    d.codigo, d.versao, d.titulo, d.resumo, d.conteudo,
    d.tipo_aceite, d.hash_conteudo, d.vigente_desde, a.aceito_em
  from public.documentos_legais d
  left join public.aceites_legais a
    on a.usuario_id = v_usuario_id
   and a.documento_codigo = d.codigo
   and a.documento_versao = d.versao
   and a.hash_conteudo = d.hash_conteudo
  where d.ativo
  order by case d.codigo
    when 'termos_uso' then 1
    when 'diretrizes_comunidade' then 2
    when 'aviso_privacidade' then 3
    else 9
  end;
end;
$$;

create or replace function public.registrar_aceites_legais(
  p_documentos jsonb,
  p_versao_app text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario_id uuid := public.usuario_atual_id();
  v_ativos integer;
  v_confirmados integer;
begin
  if auth.uid() is null or v_usuario_id is null then
    raise exception using errcode = '42501', message = 'AUTH_REQUIRED';
  end if;
  if jsonb_typeof(p_documentos) <> 'array' then
    raise exception 'DOCUMENTOS_INVALIDOS';
  end if;
  if char_length(coalesce(p_versao_app, '')) > 80 then
    raise exception 'VERSAO_APP_INVALIDA';
  end if;

  select count(*) into v_ativos
  from public.documentos_legais where ativo;

  select count(distinct d.codigo) into v_confirmados
  from public.documentos_legais d
  join jsonb_array_elements(p_documentos) item
    on item->>'codigo' = d.codigo
   and item->>'versao' = d.versao
   and coalesce((item->>'confirmado')::boolean, false)
  where d.ativo;

  if v_ativos = 0 or v_confirmados <> v_ativos then
    raise exception 'ACEITE_INCOMPLETO';
  end if;

  insert into public.aceites_legais (
    usuario_id, documento_codigo, documento_versao,
    hash_conteudo, tipo_aceite, versao_app
  )
  select
    v_usuario_id, d.codigo, d.versao,
    d.hash_conteudo, d.tipo_aceite, nullif(btrim(coalesce(p_versao_app, '')), '')
  from public.documentos_legais d
  where d.ativo
  on conflict (usuario_id, documento_codigo, documento_versao) do nothing;
end;
$$;

revoke all on function public.listar_documentos_legais() from public, anon;
revoke all on function public.registrar_aceites_legais(jsonb, text) from public, anon;
grant execute on function public.listar_documentos_legais() to authenticated;
grant execute on function public.registrar_aceites_legais(jsonb, text) to authenticated;

comment on table public.documentos_legais is
  'Versões imutáveis dos documentos apresentados no aceite digital.';
comment on table public.aceites_legais is
  'Evidência mínima do documento aceito ou reconhecido pelo titular.';
