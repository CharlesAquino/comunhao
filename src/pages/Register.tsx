import { useState, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Heart, User, Phone, Gift, Lock, ArrowRight, LogIn, Eye, EyeOff, AtSign, Mail } from 'lucide-react';
import { ROUTES } from '../services/constants';
import AvatarPicker from '../components/AvatarPicker';
import Button from '../components/ui/Button';
import { isValidUsername, registerWithUsername } from '../services/authService';
import { updateCurrentUserAvatar } from '../services/dataService';
import { useToast } from '../contexts/ToastContext';

export default function Register() {
  const [nome, setNome] = useState('');
  const [telefone, setTelefone] = useState('');
  const [username, setUsername] = useState('');
  const [emailRecuperacao, setEmailRecuperacao] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [codigoIndicacao, setCodigoIndicacao] = useState('');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();

  const handleRegister = async (e: FormEvent) => {
    e.preventDefault();
    if (!nome || !telefone || !username || !password) return;
    if (!isValidUsername(username)) {
      toast.error('Use 4 a 24 caracteres, começando por uma letra.');
      return;
    }
    if (password.length < 8) {
      toast.error('A senha precisa ter pelo menos 8 caracteres.');
      return;
    }

    setLoading(true);
    const raw = telefone.trim().replace(/\D/g, '');
    const formatted = raw.startsWith('55') ? `+${raw}` : `+55${raw}`;

    try {
      await registerWithUsername({
        nome,
        telefone: formatted,
        username,
        password,
        emailRecuperacao: emailRecuperacao || undefined,
        codigoIndicacao: codigoIndicacao || undefined,
      });
      if (avatarFile) await updateCurrentUserAvatar(avatarFile);
      navigate(ROUTES.PERFIL);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível criar a conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="scrollbar-hidden relative mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center overflow-y-auto p-8 py-12" style={{background: 'var(--body-bg)', backgroundAttachment: 'fixed'}}>

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-15%] left-[-10%] w-[60%] h-[40%] rounded-full blur-[100px]" style={{ background: 'var(--aurora-blob1)' }}></div>
        <div className="absolute bottom-[-10%] right-[-15%] w-[50%] h-[40%] bg-blue-700/15 rounded-full blur-[100px]"></div>
        <div className="absolute top-[50%] left-[40%] w-[40%] h-[30%] bg-teal-500/10 rounded-full blur-[80px]"></div>
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[var(--accent-solid)] rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg border border-green-subtle">
            <Heart size={28} className="text-white drop-shadow-lg" fill="currentColor" />
          </div>
          <h1 className="font-display text-2xl txt-primary mb-1">Bem-vindo</h1>
          <p className="txt-tertiary text-sm leading-relaxed">Junte-se à mocidade e fortaleça<br/>a corrente de intercessão.</p>
        </div>

        <div className="glass rounded-2xl p-6 shadow-2xl relative overflow-hidden">
          <div className="glass-shine"></div>

          <form onSubmit={handleRegister} className="space-y-4 mt-5">
            <AvatarPicker onFileSelect={setAvatarFile} label="Foto de perfil (opcional — você poderá alterar depois)" />

            <div className="space-y-1.5">
              <label htmlFor="cadastro-nome" className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Seu Nome</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 txt-secondary" size={18} />
                <input
                  id="cadastro-nome"
                  type="text"
                  placeholder="Ex: Charles"
                  className="w-full input-theme rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-[var(--accent-solid)] focus:border-green-subtle outline-none transition text-sm"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cadastro-username" className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Nome de usuário</label>
              <div className="relative">
                <AtSign className="absolute left-4 top-1/2 -translate-y-1/2 txt-secondary" size={18} />
                <input
                  id="cadastro-username"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="Ex: CharlesAquino"
                  className="w-full input-theme rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-[var(--focus)] outline-none transition text-sm"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.replace(/\s/g, ''))}
                  minLength={4}
                  maxLength={24}
                  pattern="[A-Za-z][A-Za-z0-9._]{3,23}"
                  required
                />
              </div>
              <p className="ml-1 text-[11px] txt-muted">Será usado para entrar. Letras, números, ponto ou sublinhado.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cadastro-whatsapp" className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">WhatsApp</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 txt-secondary" size={18} />
                <input
                  id="cadastro-whatsapp"
                  type="tel"
                  placeholder="Ex: 27999998888"
                  className="w-full input-theme rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-[var(--accent-solid)] focus:border-green-subtle outline-none transition text-sm"
                  value={telefone}
                  onChange={(e) => setTelefone(e.target.value)}
                  required
                />
              </div>
              <p className="ml-1 text-[11px] txt-muted">Será o canal de recuperação de senha quando esse recurso estiver disponível.</p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cadastro-email" className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">E-mail de recuperação (opcional)</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 txt-secondary" size={18} />
                <input
                  id="cadastro-email"
                  type="email"
                  placeholder="voce@exemplo.com"
                  className="w-full input-theme rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-[var(--focus)] outline-none transition text-sm"
                  value={emailRecuperacao}
                  onChange={(e) => setEmailRecuperacao(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cadastro-senha" className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 txt-secondary" size={18} />
                <input
                  id="cadastro-senha"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 8 caracteres"
                  className="w-full input-theme rounded-xl py-3.5 pl-11 pr-11 focus:ring-2 focus:ring-[var(--accent-solid)] focus:border-green-subtle outline-none transition text-sm"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="field-icon-button right-2"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="cadastro-indicacao" className="text-[11px] font-bold txt-secondary uppercase tracking-[0.12em] ml-1">Código de Indicação (opcional)</label>
              <div className="relative">
                <Gift className="absolute left-4 top-1/2 -translate-y-1/2 txt-secondary" size={18} />
                <input
                  id="cadastro-indicacao"
                  type="text"
                  placeholder="Ex: A1B2C3D4"
                  className="w-full input-theme rounded-xl py-3.5 pl-11 pr-4 focus:ring-2 focus:ring-[var(--accent-solid)] focus:border-green-subtle outline-none transition text-sm uppercase"
                  value={codigoIndicacao}
                  onChange={(e) => setCodigoIndicacao(e.target.value)}
                  maxLength={8}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || password.length < 8}
              className="w-full min-h-12 text-base"
            >
              {loading ? "Criando conta..." : "Criar Conta"}
              {!loading && <ArrowRight size={18} />}
            </Button>
          </form>
        </div>

        <div className="text-center mt-6">
          <Link
            to={ROUTES.LOGIN}
            className="inline-flex items-center gap-2 txt-secondary hover:txt-primary text-sm font-semibold transition"
          >
            <LogIn size={16} />
            Já tem conta? Faça login
          </Link>
        </div>

        <p className="text-center txt-muted text-xs mt-4">
          Ao entrar, você concorda em orar pelo seu parceiro da semana.
        </p>
      </div>
    </div>
  );
}
