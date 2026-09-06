import type { LucideIcon } from 'lucide-react';
import {
  BellRing,
  BookOpenCheck,
  CircleHelp,
  Coins,
  HeartHandshake,
  Home,
  MessageCircle,
  PackageOpen,
  ShieldCheck,
  Trophy,
  UserRound,
  UsersRound,
} from 'lucide-react';

export interface PageGuide {
  title: string;
  description: string;
  bullets: string[];
  tip?: string;
  Icon: LucideIcon;
}

const GUIDES: Array<{ match: (pathname: string) => boolean; guide: PageGuide }> = [
  {
    match: path => path === '/',
    guide: {
      title: 'Início',
      description: 'Acompanhe sua jornada, disponibilidade para oração e os movimentos da comunidade.',
      bullets: ['Levante a mão para ficar disponível.', 'Aceite convites para iniciar uma sala de oração.', 'Use os atalhos superiores para mensagens, atividades e configurações.'],
      tip: 'O gesto de voltar leva à tela anterior; no Início ele não fecha o aplicativo.',
      Icon: Home,
    },
  },
  {
    match: path => path === '/mural',
    guide: {
      title: 'Mural',
      description: 'Um feed comunitário de pedidos, testemunhos e intercessões.',
      bullets: ['Toque em Interceder para entrar em oração pelo pedido.', 'Use Compartilhar para encaminhar uma publicação.', 'O botão + cria um novo clamor.'],
      tip: 'Publicações novas e intercessões aparecem em tempo real.',
      Icon: MessageCircle,
    },
  },
  {
    match: path => path === '/ebd',
    guide: {
      title: 'EBD',
      description: 'Leia a lição publicada, avance pelos blocos e acompanhe seu progresso.',
      bullets: ['Abra a lição disponível.', 'Marque os blocos concluídos.', 'Retorne depois sem perder o progresso salvo no aparelho.'],
      Icon: BookOpenCheck,
    },
  },
  {
    match: path => path === '/loja',
    guide: {
      title: 'Tesouro',
      description: 'Troque Kesef por itens disponíveis e acompanhe seus pedidos.',
      bullets: ['Confira saldo e estoque.', 'Abra o item antes de confirmar.', 'Acompanhe aprovação e entrega em Meus pedidos.'],
      Icon: PackageOpen,
    },
  },
  {
    match: path => path === '/ranking',
    guide: {
      title: 'Ranking',
      description: 'Veja o avanço da comunidade por XP, constância e participação.',
      bullets: ['O ranking é um incentivo, não uma competição espiritual.', 'As ações válidas atualizam XP e patentes.'],
      Icon: Trophy,
    },
  },
  {
    match: path => path === '/carteira',
    guide: {
      title: 'Carteira',
      description: 'Consulte Kesef, histórico e movimentações da sua conta.',
      bullets: ['Kesef é a moeda de participação do app.', 'Cada movimentação exibe origem e data.'],
      Icon: Coins,
    },
  },
  {
    match: path => path === '/comunidade' || path.startsWith('/perfil/'),
    guide: {
      title: 'Comunidade',
      description: 'Encontre pessoas, abra perfis e inicie conversas.',
      bullets: ['Toque em uma pessoa para ver o perfil.', 'Use Mensagem para conversar em particular.'],
      Icon: UsersRound,
    },
  },
  {
    match: path => path === '/mensagens' || path.startsWith('/chat/'),
    guide: {
      title: 'Mensagens',
      description: 'Converse com segurança e acompanhe mensagens não lidas.',
      bullets: ['Abra uma conversa na caixa de entrada.', 'O indicador destaca novas mensagens.', 'Use o gesto de voltar para retornar à caixa de entrada.'],
      Icon: BellRing,
    },
  },
  {
    match: path => path === '/perfil',
    guide: {
      title: 'Perfil',
      description: 'Cuide da sua identidade e acompanhe sua jornada no Comunhão.',
      bullets: ['Atualize sua foto e identificação.', 'Consulte patente, XP e sequência.', 'Abra Configurações para ajustar o aplicativo e sua conta.'],
      Icon: UserRound,
    },
  },
  {
    match: path => path === '/configuracoes',
    guide: {
      title: 'Configurações',
      description: 'Reúna preferências, notificações, segurança e informações do aplicativo.',
      bullets: ['Escolha a qualidade visual adequada ao aparelho.', 'Defina quais notificações deseja receber.', 'Acesse senha, privacidade, exclusão da conta e atualizações.'],
      Icon: UserRound,
    },
  },
  {
    match: path => path.startsWith('/sala/') || path.startsWith('/timer/'),
    guide: {
      title: 'Momento de oração',
      description: 'Permaneça nesta tela enquanto a sessão estiver ativa e encerre somente ao concluir.',
      bullets: ['Use microfone e câmera conforme a necessidade.', 'O gesto lateral retorna com segurança; durante uma ação aberta, o app tenta fechar primeiro a sobreposição.', 'Use Amém para concluir a sessão corretamente.'],
      Icon: HeartHandshake,
    },
  },
  {
    match: path => path === '/guia',
    guide: {
      title: 'Guia de patentes',
      description: 'Conheça os níveis de participação e as ações que contribuem para sua jornada.',
      bullets: ['Patentes representam constância e serviço.', 'XP é acumulado por ações válidas no aplicativo.'],
      Icon: Trophy,
    },
  },
  {
    match: path => path === '/admin',
    guide: {
      title: 'Visão geral administrativa',
      description: 'Centralize supervisão, conteúdo, operação e governança.',
      bullets: ['Os cartões mostram o que precisa de atenção.', 'Atualize os indicadores antes de tomar uma decisão.', 'Abra o menu para acessar apenas módulos permitidos ao seu papel.'],
      Icon: ShieldCheck,
    },
  },
  {
    match: path => path.startsWith('/admin/pessoas'),
    guide: {
      title: 'Pessoas e acessos',
      description: 'Pesquise membros, acompanhe atividade e administre papéis.',
      bullets: ['Selecione uma pessoa para abrir os detalhes.', 'Informe uma justificativa antes de alterar acessos.', 'Todas as mudanças administrativas são auditadas.'],
      Icon: UsersRound,
    },
  },
  {
    match: path => path.startsWith('/admin/moderacao'),
    guide: {
      title: 'Moderação do Mural',
      description: 'Revise publicações, corrija textos, altere a classificação e remova conteúdo inadequado.',
      bullets: ['Busque por autor ou conteúdo.', 'Use Alternar para mudar entre clamor e testemunho.', 'Exclusões exigem confirmação e ficam vinculadas à governança.'],
      Icon: ShieldCheck,
    },
  },
  {
    match: path => path.startsWith('/admin/ebd'),
    guide: {
      title: 'Editorial EBD',
      description: 'Crie, revise, publique e arquive lições com controle editorial.',
      bullets: ['Preencha os sete dias antes de publicar a semana.', 'Use Publicar dia agora para uma liberação pontual.', 'Arquive lições criadas por engano sem perder o histórico.'],
      Icon: BookOpenCheck,
    },
  },
  {
    match: path => path.startsWith('/admin/conhecimento'),
    guide: {
      title: 'Memória sistêmica',
      description: 'Gerencie fontes de conhecimento utilizadas pelo sistema editorial e pelo RAG.',
      bullets: ['Cadastre fontes confiáveis.', 'Indexe somente conteúdo revisado.', 'Consulte a recuperação antes de usar uma resposta gerada.'],
      Icon: CircleHelp,
    },
  },
  {
    match: path => path.startsWith('/admin/loja'),
    guide: {
      title: 'Loja e estoque',
      description: 'Administre catálogo, estoque, pedidos e entregas.',
      bullets: ['Mantenha o estoque atualizado.', 'Aprove ou rejeite pedidos com atenção.', 'Marque como entregue somente após a confirmação real.'],
      Icon: PackageOpen,
    },
  },
  {
    match: path => path.startsWith('/admin/auditoria'),
    guide: {
      title: 'Auditoria',
      description: 'Consulte o histórico das ações administrativas e eventos de governança.',
      bullets: ['Filtre por período e responsável.', 'Use o correlationId para investigar eventos relacionados.', 'Não altere registros de auditoria.'],
      Icon: ShieldCheck,
    },
  },
  {
    match: path => path.startsWith('/admin/oracao'),
    guide: {
      title: 'Oração e sorteio',
      description: 'Acompanhe sessões, disponibilidade e ciclos de oração.',
      bullets: ['Atualize os dados antes do sorteio.', 'Confira elegibilidade e sessões abertas.', 'Evite repetir ações enquanto uma operação estiver processando.'],
      Icon: HeartHandshake,
    },
  },
  {
    match: path => path.startsWith('/admin'),
    guide: {
      title: 'Módulo administrativo',
      description: 'Use este módulo conforme as permissões do seu papel.',
      bullets: ['A seta superior retorna à etapa anterior.', 'A ação inferior oferece uma segunda saída segura.', 'Operações sensíveis exigem confirmação e ficam na auditoria.'],
      Icon: CircleHelp,
    },
  },
];

export function getPageGuide(pathname: string): PageGuide {
  return GUIDES.find(item => item.match(pathname))?.guide ?? {
    title: 'Como usar esta tela',
    description: 'Consulte as ações disponíveis e use a navegação segura para retornar.',
    bullets: ['Procure os botões de ação destacados.', 'Use o gesto lateral ou a seta para voltar.'],
    Icon: CircleHelp,
  };
}
