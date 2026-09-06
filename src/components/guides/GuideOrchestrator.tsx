import { useEffect, useMemo, useState } from 'react';
import { BellRing, BookOpenCheck, HeartHandshake, Home, MessageCircle, RefreshCw, ShoppingBag, Sparkles, UserRound } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import GuideModal, { type GuideStep } from './GuideModal';
import { APP_VERSION_NAME, FIRST_ACCESS_CANDIDATE_KEY, RELEASE_GUIDE_PENDING_KEY } from '../../services/runtimeLifecycle';

const FIRST_GUIDE_DONE = 'comunhao:first-access-guide-complete:v1';
const RELEASE_GUIDE_DONE = `comunhao:release-guide-complete:${APP_VERSION_NAME}`;
const AUTH_PATHS = new Set(['/login', '/register', '/verify-otp', '/recuperar-senha']);

const FIRST_ACCESS_STEPS: GuideStep[] = [
  { title: 'Bem-vindo ao Comunhão', description: 'O aplicativo foi criado para aproximar a comunidade por meio da oração, ensino e cuidado.', bullets: ['Suas principais áreas ficam na barra inferior.', 'Mensagens e atividades ficam no topo.', 'Sempre há uma explicação disponível no final das páginas.'], Icon: Sparkles },
  { title: 'Comece pelo Início', description: 'Na tela inicial você acompanha sua jornada e pode se disponibilizar para orar.', bullets: ['Levante a mão quando estiver disponível.', 'Aceite um convite para entrar em uma sala.', 'Seu status muda conforme a atividade.'], Icon: Home },
  { title: 'Ore pelo Mural', description: 'O Mural funciona como um feed da comunidade, com pedidos e testemunhos.', bullets: ['Interceda por uma publicação.', 'Compartilhe com alguém.', 'Publique seu próprio clamor no botão +.'], Icon: MessageCircle },
  { title: 'Participe da oração', description: 'Convites e salas unem duas ou mais pessoas em um momento de oração.', bullets: ['O gesto de voltar retorna à etapa anterior.', 'A tela não fecha o app enquanto houver uma rota interna para retornar.'], Icon: HeartHandshake },
  { title: 'Aprenda na EBD', description: 'Leia as lições publicadas e acompanhe seu progresso por blocos.', bullets: ['Seu progresso fica salvo.', 'Novas lições aparecem na Central de Atividades.'], Icon: BookOpenCheck },
  { title: 'Não perca novidades', description: 'Mensagens, convites e atividades ficam reunidos nos atalhos superiores.', bullets: ['O indicador mostra itens não lidos.', 'Notificações podem chegar mesmo com o app fechado.'], Icon: BellRing },
];

const RELEASE_STEPS: GuideStep[] = [
  { title: 'Atualizações dentro do app', description: 'As próximas versões de teste serão oferecidas pelo próprio Comunhão, sem depender de um novo link no Drive.', tip: 'O Android ainda pedirá sua confirmação antes de instalar cada atualização.', Icon: RefreshCw },
  { title: 'Uma jornada nova a cada semana', description: 'A EBD destaca a lição atual e mantém cada dia organizado dentro do tema da semana.', bullets: ['Os conteúdos podem ser publicados dia por dia.', 'Dias ainda não publicados permanecem protegidos.'], Icon: BookOpenCheck },
  { title: 'Lições com identidade visual', description: 'A imagem da segunda-feira agora identifica a lição em miniatura, deixando títulos, períodos e conteúdos mais fáceis de reconhecer.', Icon: Sparkles },
  { title: 'Mural para cuidado real', description: 'Pedidos, testemunhos, reflexões e gratidão aparecem em um feed mais limpo, com fotos, intercessões, comentários e compartilhamento.', Icon: MessageCircle },
  { title: 'Tesouro mais completo', description: 'O catálogo ganhou imagens, saldo em Kesef e um fluxo mais claro para solicitar recompensas e acompanhar pedidos.', Icon: ShoppingBag },
  { title: 'Seu perfil, sua identidade', description: 'Escolha uma ambientação para o cartão do perfil. A personalização acompanha os temas claro e escuro e pode ser vista pela comunidade.', Icon: UserRound },
];

export default function GuideOrchestrator() {
  const location = useLocation();
  const [mode, setMode] = useState<'first' | 'release' | null>(null);
  const [step, setStep] = useState(0);
  const isAuth = AUTH_PATHS.has(location.pathname);

  useEffect(() => {
    if (isAuth || mode) return;
    const timer = window.setTimeout(() => {
      const releasePending = localStorage.getItem(RELEASE_GUIDE_PENDING_KEY) === APP_VERSION_NAME;
      if (releasePending && localStorage.getItem(RELEASE_GUIDE_DONE) !== '1') {
        setMode('release');
        return;
      }
      const firstCandidate = localStorage.getItem(FIRST_ACCESS_CANDIDATE_KEY) === '1';
      if (firstCandidate && localStorage.getItem(FIRST_GUIDE_DONE) !== '1') setMode('first');
    }, 650);
    return () => window.clearTimeout(timer);
  }, [isAuth, mode]);

  const steps = useMemo(() => mode === 'release' ? RELEASE_STEPS : FIRST_ACCESS_STEPS, [mode]);

  if (!mode) return null;

  const finish = () => {
    if (mode === 'release') {
      localStorage.setItem(RELEASE_GUIDE_DONE, '1');
      localStorage.removeItem(RELEASE_GUIDE_PENDING_KEY);
    } else {
      localStorage.setItem(FIRST_GUIDE_DONE, '1');
      localStorage.removeItem(FIRST_ACCESS_CANDIDATE_KEY);
    }
    setMode(null);
    setStep(0);
  };

  return <GuideModal title={mode === 'release' ? 'Novidades desta versão' : 'Primeiro acesso'} steps={steps} currentStep={step} onStepChange={setStep} onClose={finish} onComplete={finish} />;
}
