export const PROFILE_COVER_IDS = [
  'neutro',
  'louvor',
  'vocal',
  'ensino',
  'lideranca',
  'intercessao',
  'comunhao',
  'oliveira',
  'vitral',
  'aguas-tranquilas',
  'refugio',
  'vigilia',
  'caminho',
  'luz-serena',
  'adoracao',
  'louvor-acustico',
  'devocional',
] as const;

export type ProfileCoverId = typeof PROFILE_COVER_IDS[number];

export interface ProfileCoverOption {
  id: ProfileCoverId;
  label: string;
  description: string;
  imageUrl: string | null;
  lightImageUrl: string | null;
}

export const PROFILE_COVERS: ProfileCoverOption[] = [
  { id: 'neutro', label: 'Essencial', description: 'A identidade original do perfil.', imageUrl: null, lightImageUrl: null },
  { id: 'louvor', label: 'Louvor', description: 'Ritmo, instrumentos e adoração.', imageUrl: '/profile-covers/louvor.webp', lightImageUrl: '/profile-covers/louvor-light.webp' },
  { id: 'vocal', label: 'Vocal', description: 'Voz, harmonia e expressão.', imageUrl: '/profile-covers/vocal.webp', lightImageUrl: '/profile-covers/vocal-light.webp' },
  { id: 'ensino', label: 'Ensino', description: 'Formação, estudo e partilha.', imageUrl: '/profile-covers/ensino.webp', lightImageUrl: '/profile-covers/ensino-light.webp' },
  { id: 'lideranca', label: 'Liderança', description: 'Direção, presença e cuidado.', imageUrl: '/profile-covers/lideranca.webp', lightImageUrl: '/profile-covers/lideranca-light.webp' },
  { id: 'intercessao', label: 'Intercessão', description: 'Escuta, oração e acolhimento.', imageUrl: '/profile-covers/intercessao.webp', lightImageUrl: '/profile-covers/intercessao-light.webp' },
  { id: 'comunhao', label: 'Comunhão', description: 'Pertencimento e serviço mútuo.', imageUrl: '/profile-covers/comunhao.webp', lightImageUrl: '/profile-covers/comunhao-light.webp' },
  { id: 'oliveira', label: 'Oliveira', description: 'Raízes, paz e perseverança.', imageUrl: '/profile-covers/oliveira.webp', lightImageUrl: '/profile-covers/oliveira-light.webp' },
  { id: 'vitral', label: 'Vitral', description: 'Luz, beleza e contemplação.', imageUrl: '/profile-covers/vitral.webp', lightImageUrl: '/profile-covers/vitral-light.webp' },
  { id: 'aguas-tranquilas', label: 'Águas Tranquilas', description: 'Descanso, direção e confiança.', imageUrl: '/profile-covers/aguas-tranquilas.webp', lightImageUrl: '/profile-covers/aguas-tranquilas-light.webp' },
  { id: 'refugio', label: 'Refúgio', description: 'Acolhimento, silêncio e segurança.', imageUrl: '/profile-covers/refugio.webp', lightImageUrl: '/profile-covers/refugio-light.webp' },
  { id: 'vigilia', label: 'Vigília', description: 'Atenção, constância e luz acesa.', imageUrl: '/profile-covers/vigilia.webp', lightImageUrl: '/profile-covers/vigilia-light.webp' },
  { id: 'caminho', label: 'Caminho', description: 'Direção, esperança e continuidade.', imageUrl: '/profile-covers/caminho.webp', lightImageUrl: '/profile-covers/caminho-light.webp' },
  { id: 'luz-serena', label: 'Luz Serena', description: 'Paz, presença e renovação.', imageUrl: '/profile-covers/luz-serena.webp', lightImageUrl: '/profile-covers/luz-serena-light.webp' },
  { id: 'adoracao', label: 'Adoração', description: 'Unidade, entrega e celebração.', imageUrl: '/profile-covers/adoracao.webp', lightImageUrl: '/profile-covers/adoracao-light.webp' },
  { id: 'louvor-acustico', label: 'Louvor Acústico', description: 'Canção, simplicidade e comunhão.', imageUrl: '/profile-covers/louvor-acustico.webp', lightImageUrl: '/profile-covers/louvor-acustico-light.webp' },
  { id: 'devocional', label: 'Devocional', description: 'Palavra, oração e intimidade.', imageUrl: '/profile-covers/devocional.webp', lightImageUrl: '/profile-covers/devocional-light.webp' },
];

export function normalizeProfileCover(value?: string | null): ProfileCoverId {
  return PROFILE_COVER_IDS.includes(value as ProfileCoverId) ? value as ProfileCoverId : 'neutro';
}

export function getProfileCover(value?: string | null): ProfileCoverOption {
  const id = normalizeProfileCover(value);
  return PROFILE_COVERS.find(option => option.id === id) ?? PROFILE_COVERS[0];
}
