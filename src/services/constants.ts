export const STORAGE_KEYS = {
  USER_ID: 'oracao_app_user_id',
  DEVICE_ID: 'oracao_app_device_id',
  ADMIN_AUTH: 'oracao_app_admin_auth',
};

export const LIMITS = {
  INACTIVE_DAYS: 15,
  MIN_USERS_FOR_DRAW: 2,
};

export const MESSAGES = {
  USER_NOT_FOUND: 'Usuário não encontrado no banco de dados.',
  NOT_AUTHENTICATED: 'USER_NOT_AUTHENTICATED',
  AWAITING_DRAW: 'Aguardando sorteio...',
  ANONYMOUS: 'Anônimo',
  ADMIN_UNAUTHORIZED: 'Senha de administrador incorreta.',
};

export const ROUTES = {
  LOGIN: '/login',
  REGISTER: '/register',
  HOME: '/',
  MURAL: '/mural',
  MENSAGENS: '/mensagens',
  RANKING: '/ranking',
  ADMIN: '/admin',
  VERIFY_OTP: '/verify-otp',
  RECUPERAR_SENHA: '/recuperar-senha',
  EBD: '/ebd',
  LOJA: '/loja',
  CARTEIRA: '/carteira',
  PERFIL: '/perfil',
  CONFIGURACOES: '/configuracoes',
  PERFIL_USUARIO: (userId: string) => `/perfil/${userId}`,
  COMUNIDADE: '/comunidade',
  ORACAO: '/oracao',
};

export const STORAGE = {
  AVATAR_BUCKET: 'avatars',
  EBD_MEDIA_BUCKET: 'ebd-media',
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
};
