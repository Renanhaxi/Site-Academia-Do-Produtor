import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  KeyRound,
  Sparkles,
} from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

export type AuthMode = 'login' | 'register' | 'forgot' | 'reset_password';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: AuthMode;
  contextMessage?: string;
  onAuthSuccess?: (session: any) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = 'login',
  contextMessage,
  onAuthSuccess,
}) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Estados de visibilidade de senha ("olhinho")
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setErrorMsg('');
      setSuccessMsg('');
    }
  }, [isOpen, mode]);

  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Escuta evento de recuperação de senha do Supabase
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setMode('reset_password');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  if (!isOpen) return null;

  // Tradutor amigável de mensagens de erro do Supabase
  const translateAuthError = (msg: string): string => {
    const lower = msg.toLowerCase();
    if (lower.includes('invalid login credentials')) {
      return 'E-mail ou senha incorretos. Verifique seus dados ou clique em "Criar Acesso".';
    }
    if (lower.includes('user already registered') || lower.includes('already been registered')) {
      return 'Este e-mail já possui cadastro na Alcateia. Faça login ou recupere sua senha.';
    }
    if (lower.includes('password should be at least')) {
      return 'A senha deve conter no mínimo 6 caracteres.';
    }
    if (lower.includes('email not confirmed')) {
      return 'Seu e-mail aguarda confirmação. Verifique sua caixa de entrada (e Spam).';
    }
    if (lower.includes('rate limit') || lower.includes('too many requests')) {
      return 'Muitas tentativas seguidas. Aguarde alguns segundos e tente novamente.';
    }
    return msg || 'Ocorreu um erro na autenticação. Tente novamente.';
  };

  // Cálculo de força da senha para o cadastro
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { score: 0, label: '', color: 'bg-neutral-800' };
    let score = 0;
    if (pass.length >= 6) score += 1;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass) || /[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass) && pass.length >= 8) score += 1;

    const map: Record<number, { label: string; color: string; textColor: string }> = {
      1: { label: 'FRACA', color: 'bg-red-500', textColor: 'text-red-400' },
      2: { label: 'MODERADA', color: 'bg-amber-500', textColor: 'text-amber-400' },
      3: { label: 'FORTE', color: 'bg-emerald-500', textColor: 'text-emerald-400' },
      4: { label: 'BLINDADA', color: 'bg-[#C5A059]', textColor: 'text-[#DFCA95]' },
    };

    return { score, ...(map[score] || { label: 'MUITO CURTA', color: 'bg-red-500', textColor: 'text-red-400' }) };
  };

  const strength = getPasswordStrength(password);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim() || !password) {
      setErrorMsg('Preencha seu e-mail e sua senha para entrar.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      if (data.session) {
        if (onAuthSuccess) onAuthSuccess(data.session);
        onClose();
      }
    } catch (err: any) {
      setErrorMsg(translateAuthError(err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 6) {
      setErrorMsg('Sua senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas digitadas não coincidem. Verifique e tente novamente.');
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: name.trim() || 'Produtor Alcateia',
          },
        },
      });

      if (error) throw error;

      // Se o Supabase já retornou sessão direta (confirmação de email desativada)
      if (data.session) {
        if (onAuthSuccess) onAuthSuccess(data.session);
        onClose();
        return;
      }

      // Tenta login imediato caso o usuário tenha sido criado
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (!signInError && signInData.session) {
        if (onAuthSuccess) onAuthSuccess(signInData.session);
        onClose();
        return;
      }

      // Caso o projeto Supabase exija confirmação por e-mail
      setSuccessMsg(
        'Cadastro criado com sucesso! Verifique sua caixa de entrada (e Spam) caso seja solicitada a confirmação, ou faça login abaixo.'
      );
      setMode('login');
    } catch (err: any) {
      setErrorMsg(translateAuthError(err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email.trim()) {
      setErrorMsg('Informe o e-mail da sua conta para recuperar a senha.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/meus-acessos`,
      });

      if (error) throw error;

      setSuccessMsg(
        `Instruções de redefinição enviadas para ${email.trim()}. Verifique sua caixa de entrada e a pasta Spam.`
      );
    } catch (err: any) {
      setErrorMsg(translateAuthError(err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (password.length < 6) {
      setErrorMsg('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('As senhas não coincidem.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) throw error;

      setSuccessMsg('Sua senha foi atualizada com sucesso!');
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setErrorMsg(translateAuthError(err.message || ''));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md bg-carbon border border-neutral-800 rounded-3xl shadow-[0_25px_70px_rgba(0,0,0,0.9)] overflow-hidden my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Linha superior dourada */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/60 to-transparent pointer-events-none" />

        {/* Botão Fechar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 rounded-full bg-black/60 text-neutral-400 hover:text-white border border-neutral-800 hover:border-[#C5A059]/40 transition-all cursor-pointer"
          title="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Cabeçalho Máfia Elegante */}
        <div className="p-6 sm:p-8 pb-5 border-b border-neutral-800/80 bg-[#101214]">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#C5A059]/10 border border-[#C5A059]/30 text-[#DFCA95] text-[10px] font-mono font-bold uppercase tracking-widest mb-3">
            <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
            CREDENCIAL DE MEMBRO • ALCATEIA
          </div>

          <h3 className="text-xl sm:text-2xl font-heading font-black text-white uppercase tracking-tight">
            {mode === 'login' && 'ACESSAR MEU ARSENAL'}
            {mode === 'register' && 'CRIAR CONTA DE PRODUTOR'}
            {mode === 'forgot' && 'RECUPERAR CREDENCIAL'}
            {mode === 'reset_password' && 'DEFINIR NOVA SENHA'}
          </h3>

          <p className="text-xs text-neutral-400 mt-1.5 leading-relaxed">
            {contextMessage ||
              (mode === 'login'
                ? 'Entre com seu e-mail e senha para liberar compras e acessar seus downloads vitalícios.'
                : mode === 'register'
                ? 'Cadastre-se em segundos. Todos os softwares adquiridos ficam salvos permanentemente na sua conta.'
                : mode === 'forgot'
                ? 'Enviaremos um link seguro para você redefinir sua senha de acesso.'
                : 'Escolha uma nova senha segura para proteger seu arsenal.')}
          </p>

          {/* Seletor de Abas (Entrar / Criar Acesso) */}
          {(mode === 'login' || mode === 'register') && (
            <div className="grid grid-cols-2 gap-1.5 p-1 mt-5 bg-black/70 border border-neutral-800 rounded-2xl">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                }}
                className={`py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  mode === 'login'
                    ? 'bg-[#F4F1EA] text-[#1C1917] shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                [ ENTRAR ]
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setErrorMsg('');
                }}
                className={`py-2.5 text-xs font-mono font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer ${
                  mode === 'register'
                    ? 'bg-[#F4F1EA] text-[#1C1917] shadow-md'
                    : 'text-neutral-400 hover:text-white'
                }`}
              >
                [ CRIAR CONTA ]
              </button>
            </div>
          )}
        </div>

        {/* Corpo do Formulário */}
        <div className="p-6 sm:p-8 bg-[#0C0E10] bg-carbon">
          {/* Alerta de Erro */}
          {errorMsg && (
            <div className="mb-5 p-3.5 rounded-2xl bg-red-950/50 border border-red-500/40 flex items-start gap-3 text-red-200 text-xs animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{errorMsg}</span>
            </div>
          )}

          {/* Alerta de Sucesso */}
          {successMsg && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3 text-emerald-200 text-xs animate-in fade-in duration-150">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <span className="leading-relaxed">{successMsg}</span>
            </div>
          )}

          {/* MODO 1: LOGIN */}
          {mode === 'login' && (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1.5 font-bold">
                  SEU E-MAIL DE ACESSO
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#121518] border border-neutral-800 text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-neutral-600"
                    placeholder="produtor@estudio.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest font-bold">
                    SENHA
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className="text-[11px] font-mono text-[#DFCA95] hover:text-white underline underline-offset-4 transition-colors cursor-pointer"
                  >
                    Esqueci minha senha
                  </button>
                </div>

                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#121518] border border-neutral-800 text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-12 focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-neutral-600"
                    placeholder="••••••••"
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-[#DFCA95] transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Manter conectado */}
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-neutral-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-neutral-700 bg-neutral-900 text-[#C5A059] focus:ring-0 accent-[#C5A059] w-3.5 h-3.5"
                  />
                  <span>Manter sessão ativa neste dispositivo</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-4 px-6 rounded-2xl bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono font-black text-xs uppercase tracking-widest shadow-[0_6px_25px_rgba(197,160,89,0.25)] transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
                    <span>AUTENTICANDO...</span>
                  </>
                ) : (
                  <>
                    <span>[ ACESSAR CONTA AGORA ]</span>
                    <ArrowRight className="w-4 h-4 text-amber-800" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-neutral-400 pt-2">
                Ainda não faz parte da Alcateia?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setErrorMsg('');
                  }}
                  className="text-[#DFCA95] font-bold hover:underline cursor-pointer"
                >
                  Criar acesso rápido
                </button>
              </p>
            </form>
          )}

          {/* MODO 2: CADASTRO */}
          {mode === 'register' && (
            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1.5 font-bold">
                  NOME OU NOME ARTÍSTICO (PRODUTOR)
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#121518] border border-neutral-800 text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-neutral-600"
                    placeholder="Ex: Metro Boomin / Studio X"
                    autoComplete="name"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1.5 font-bold">
                  SEU MELHOR E-MAIL
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#121518] border border-neutral-800 text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-neutral-600"
                    placeholder="seu@email.com"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1.5 font-bold">
                  CRIE UMA SENHA (MÍN. 6 CARACTERES)
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#121518] border border-neutral-800 text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-12 focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-neutral-600"
                    placeholder="Crie sua senha segura"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-[#DFCA95] transition-colors cursor-pointer"
                    title={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Medidor de Força de Senha */}
                {password.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1 h-1">
                      {[1, 2, 3, 4].map((lvl) => (
                        <div
                          key={lvl}
                          className={`flex-1 rounded-full transition-all ${
                            strength.score >= lvl ? strength.color : 'bg-neutral-800'
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-mono">
                      <span className="text-neutral-500">Nível de segurança:</span>
                      <span className={`font-bold ${strength.textColor}`}>{strength.label}</span>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1.5 font-bold">
                  CONFIRME SUA SENHA
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full bg-[#121518] border text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-12 focus:outline-none transition-colors placeholder:text-neutral-600 ${
                      confirmPassword.length > 0
                        ? password === confirmPassword
                          ? 'border-emerald-500/60 focus:border-emerald-500'
                          : 'border-red-500/60 focus:border-red-500'
                        : 'border-neutral-800 focus:border-[#C5A059]'
                    }`}
                    placeholder="Repita a senha criada"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-[#DFCA95] transition-colors cursor-pointer"
                    title={showConfirmPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword.length > 0 && password !== confirmPassword && (
                  <span className="block text-[10px] font-mono text-red-400 mt-1">
                    As senhas ainda não coincidem.
                  </span>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-4 px-6 rounded-2xl bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono font-black text-xs uppercase tracking-widest shadow-[0_6px_25px_rgba(197,160,89,0.25)] transition-all flex items-center justify-center gap-2 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
                    <span>CRIANDO CREDENCIAL...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 text-amber-800" />
                    <span>[ FINALIZAR CADASTRO & ENTRAR ]</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* MODO 3: ESQUECI MINHA SENHA */}
          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1.5 font-bold">
                  E-MAIL CADASTRADO NA ALCATEIA
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-[#121518] border border-neutral-800 text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-4 focus:outline-none focus:border-[#C5A059] transition-colors placeholder:text-neutral-600"
                    placeholder="seu@email.com"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
                    <span>ENVIANDO INSTRUÇÕES...</span>
                  </>
                ) : (
                  <span>[ ENVIAR LINK DE RECUPERAÇÃO ]</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                className="w-full py-2.5 text-xs font-mono text-neutral-400 hover:text-white flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                Voltar para o Login
              </button>
            </form>
          )}

          {/* MODO 4: REDEFINIR NOVA SENHA (PASSWORD RECOVERY) */}
          {mode === 'reset_password' && (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1.5 font-bold">
                  DIGITE SUA NOVA SENHA
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-[#121518] border border-neutral-800 text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-12 focus:outline-none focus:border-[#C5A059] transition-colors"
                    placeholder="Nova senha (mín. 6 dígitos)"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-[#DFCA95] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-mono uppercase text-neutral-400 tracking-widest mb-1.5 font-bold">
                  CONFIRME A NOVA SENHA
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-neutral-500 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-[#121518] border border-neutral-800 text-white font-mono text-xs rounded-xl py-3.5 pl-11 pr-12 focus:outline-none focus:border-[#C5A059] transition-colors"
                    placeholder="Repita a nova senha"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1.5 text-neutral-400 hover:text-[#DFCA95] cursor-pointer"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 px-6 rounded-2xl bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono font-black text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-amber-800" />
                    <span>SALVANDO...</span>
                  </>
                ) : (
                  <span>[ ATUALIZAR MINHA SENHA ]</span>
                )}
              </button>
            </form>
          )}

          {/* Rodapé de Segurança */}
          <div className="mt-6 pt-4 border-t border-neutral-800/80 flex items-center justify-between text-[10px] font-mono text-neutral-500">
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#C5A059]" />
              Criptografia SSL 256-Bit
            </span>
            <span className="text-[#C5A059]">Acesso Vitalício Garantido</span>
          </div>
        </div>
      </div>
    </div>
  );
};
