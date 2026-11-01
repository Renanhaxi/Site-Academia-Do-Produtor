import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Lock, ArrowLeft, BarChart3, PackageSearch, Users, DollarSign, LogOut, Eye, EyeOff, Image, Plus, Trash2, Upload, CheckCircle2, Clock, Filter, ExternalLink, Loader2, Sparkles, Link } from 'lucide-react';
import { CONFIG_GLOBAL } from '../data/produtos';

interface AdminPanelProps {
  onClose?: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('renantonyel020@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [activeTab, setActiveTab] = useState<'metrics' | 'pedidos' | 'catalog' | 'coupons' | 'feedbacks'>('metrics');

  // Notificação Visual Flutuante (Toast Confirmation)
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const notificarSucesso = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Métricas avançadas
  const [metrics, setMetrics] = useState({
    faturamento: 0,
    ticketMedio: 0,
    totalPagos: 0,
    totalPendentes: 0,
    taxaConversao: 0,
    origens: [] as { origem: string; total: number; valor: number }[]
  });

  // Tabela de Pedidos
  const [pedidosLista, setPedidosLista] = useState<any[]>([]);
  const [pedidosFilter, setPedidosFilter] = useState<'todos' | 'pago' | 'pendente_whatsapp'>('todos');
  const [atualizandoPedidoId, setAtualizandoPedidoId] = useState<string | null>(null);

  // Catálogo e Cupons
  const [solucoes, setSolucoes] = useState<any[]>([]);
  const [cupons, setCupons] = useState<any[]>([]);

  // Gestão de Feedbacks / Depoimentos
  const [feedbackImagens, setFeedbackImagens] = useState<string[]>([]);
  const [novoFeedbackUrl, setNovoFeedbackUrl] = useState('');
  const [isUploadingFeedback, setIsUploadingFeedback] = useState(false);

  useEffect(() => {
    // Trata hash de redirecionamento (tokens do Supabase Magic Link ou Password Reset)
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
      if (window.location.hash.includes('type=recovery')) {
        setIsRecoverySession(true);
      }
      // Limpa a URL para evitar tela em branco no SPA
      setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname);
      }, 500);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) carregarDados();
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) carregarDados();
    });

    return () => subscription.unsubscribe();
  }, []);

  const carregarDados = async () => {
    // 1. Carregar Pedidos e Métricas Financeiras
    const { data: pedidos } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false });
    if (pedidos) {
      setPedidosLista(pedidos);
      const pagos = pedidos.filter(p => p.status === 'pago' || p.status === 'aprovado' || p.status === 'liberado');
      const pendentes = pedidos.filter(p => p.status === 'pendente_whatsapp');
      
      const faturamentoTotal = pagos.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
      const totalPedidosGeral = pedidos.length;
      const taxa = totalPedidosGeral > 0 ? (pagos.length / totalPedidosGeral) * 100 : 0;
      const ticket = pagos.length > 0 ? faturamentoTotal / pagos.length : 0;

      // Agrupamento por Origem / Indicação
      const mapaOrigens: Record<string, { total: number; valor: number }> = {};
      pagos.forEach(p => {
        const orig = p.email_cliente_referencia || 'Direto (Catálogo)';
        if (!mapaOrigens[orig]) mapaOrigens[orig] = { total: 0, valor: 0 };
        mapaOrigens[orig].total += 1;
        mapaOrigens[orig].valor += Number(p.valor_total || 0);
      });

      const listaOrigens = Object.keys(mapaOrigens).map(k => ({
        origem: k,
        total: mapaOrigens[k].total,
        valor: mapaOrigens[k].valor
      })).sort((a, b) => b.valor - a.valor);

      setMetrics({
        faturamento: faturamentoTotal,
        totalPagos: pagos.length,
        totalPendentes: pendentes.length,
        ticketMedio: ticket,
        taxaConversao: taxa,
        origens: listaOrigens
      });
    }

    // 2. Carregar Soluções
    const { data: sols } = await supabase.from('solutions').select('*').order('id', { ascending: true });
    if (sols) setSolucoes(sols);

    // 3. Carregar Cupons
    const { data: cps } = await supabase.from('cupons').select('*').order('id', { ascending: true });
    if (cps) setCupons(cps);

    // 4. Carregar Configurações de Feedbacks
    const { data: configs } = await supabase.from('configuracoes').select('valor').eq('chave', 'ALCATEIA_FEEDBACKS').single();
    if (configs && configs.valor) {
      try {
        setFeedbackImagens(JSON.parse(configs.valor));
      } catch (e) {
        setFeedbackImagens(CONFIG_GLOBAL.feedbackImagens);
      }
    } else {
      setFeedbackImagens(CONFIG_GLOBAL.feedbackImagens);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {}
    setSession(null);
    if (onClose) onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const cleanEmail = email.trim();

    // Atalho com senha mestre para acesso imediato garantido
    if (password === 'alcateia2026' || password === 'admin2026') {
      setSession({ user: { email: cleanEmail || 'renantonyel020@gmail.com' } });
      carregarDados();
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
    if (error) {
      alert("Erro ao entrar: " + error.message + "\n\nVocê também pode usar a senha padrão 'alcateia2026' para acesso instantâneo.");
    }
    setIsLoading(false);
  };

  const handleSendPasswordReset = async () => {
    if (!email.trim()) {
      alert("Por favor, informe seu e-mail de administrador!");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/alcateia-admin'
    });
    if (error) {
      alert("Erro ao enviar e-mail: " + error.message);
    } else {
      setResetSent(true);
    }
    setIsLoading(false);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSenha || novaSenha.length < 6) {
      alert("A nova senha deve ter pelo menos 6 caracteres!");
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (!error) {
      alert("✅ Senha alterada com sucesso! Você já está autenticado.");
      setIsRecoverySession(false);
    } else {
      alert("Erro ao alterar senha: " + error.message);
    }
    setIsLoading(false);
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-neutral-50 border border-neutral-200 p-8 rounded-2xl shadow-2xl">
          <div className="flex items-center gap-3 mb-6 justify-center">
            <Lock className="w-6 h-6 text-black" />
            <h2 className="text-2xl font-black font-mono tracking-widest text-black uppercase">SYS.ADMIN</h2>
          </div>

          {isRecoverySession ? (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-mono text-emerald-800 font-bold">
                🔑 DEFINE A SUA NOVA SENHA DE ACESSO
              </div>
              <input
                type="password"
                placeholder="Digite a nova senha (mínimo 6 caracteres)"
                value={novaSenha}
                onChange={e => setNovaSenha(e.target.value)}
                required
                className="w-full bg-white border border-neutral-300 text-black font-mono px-4 py-3 rounded-xl focus:border-black outline-none text-sm"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-black text-white font-mono font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer text-xs disabled:opacity-50"
              >
                {isLoading ? '[ GRAVANDO... ]' : '[ SALVAR NOVA SENHA ]'}
              </button>
            </form>
          ) : resetSent ? (
            <div className="text-center py-6 space-y-4">
              <div className="text-emerald-600 font-mono text-sm font-bold uppercase">✅ LINK DE REDEFINIÇÃO ENVIADO!</div>
              <p className="text-xs text-neutral-600 font-mono leading-relaxed">
                Enviamos um e-mail de redefinição para <strong>{email}</strong>. Abra a mensagem e clique no link para definir sua nova senha.
              </p>
              <button
                type="button"
                onClick={() => setResetSent(false)}
                className="text-xs text-black font-mono underline uppercase font-bold cursor-pointer"
              >
                [ VOLTAR AO LOGIN POR SENHA ]
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1">
                  E-MAIL ADMINISTRATIVO
                </label>
                <input
                  type="email"
                  placeholder="renantonyel020@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full bg-white border border-neutral-300 text-black font-mono px-4 py-3 rounded-xl focus:border-black outline-none transition-colors text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest mb-1">
                  SENHA DE ACESSO
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Sua senha..."
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    className="w-full bg-white border border-neutral-300 text-black font-mono px-4 py-3 rounded-xl focus:border-black outline-none transition-colors text-sm font-bold"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-neutral-400 hover:text-black"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-4 bg-black text-white font-mono font-bold uppercase tracking-[0.2em] rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer text-xs disabled:opacity-50 shadow-md"
              >
                {isLoading ? '[ AUTENTICANDO... ]' : '[ ENTRAR COM SENHA ]'}
              </button>

              <div className="pt-2 text-center border-t border-neutral-200">
                <button
                  type="button"
                  onClick={handleSendPasswordReset}
                  disabled={isLoading}
                  className="text-[11px] text-neutral-500 hover:text-black font-mono uppercase font-bold cursor-pointer transition-colors"
                >
                  Esqueceu a senha? OU quer definir uma nova? Clique aqui 🔑
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  const formatMoney = (v: number) => `R$ ${Number(v).toFixed(2).replace('.', ',')}`;

  const pedidosFiltrados = pedidosLista.filter(p => {
    if (pedidosFilter === 'pago') return p.status === 'pago' || p.status === 'aprovado' || p.status === 'liberado';
    if (pedidosFilter === 'pendente_whatsapp') return p.status === 'pendente_whatsapp';
    return true;
  });

  return (
    <div className="min-h-screen bg-white text-black relative">
      {/* Toast Notification Flutuante */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-neutral-900 text-white border border-emerald-500/60 px-6 py-4 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom duration-300 font-mono text-xs font-bold">
          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Header Admin */}
      <header className="bg-neutral-50 border-b border-neutral-200 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => {
              if (onClose) {
                onClose();
              } else {
                window.location.href = '/';
              }
            }} 
            className="p-2 bg-white border border-neutral-200 rounded-none hover:border-black text-neutral-500 hover:text-black transition-colors cursor-pointer"
            title="Voltar ao Catálogo"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-black font-mono text-black uppercase tracking-widest">Painel de Controle</h1>
            <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-[0.2em] font-bold">Administrador Alcateia</span>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 text-neutral-500 hover:text-black transition-colors text-[10px] font-mono tracking-widest uppercase font-bold cursor-pointer">
          <LogOut className="w-4 h-4" /> [ SAIR ]
        </button>
      </header>

      {/* Tabs NAVEGAÇÃO */}
      <div className="px-6 border-b border-neutral-200 flex gap-6 bg-neutral-50 overflow-x-auto">
        <button
          onClick={() => setActiveTab('metrics')}
          className={`py-4 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2 transition-colors font-bold cursor-pointer whitespace-nowrap ${activeTab === 'metrics' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black'}`}
        >
          <BarChart3 className="w-4 h-4" /> FINANCIAL & METRICS
        </button>

        <button
          onClick={() => setActiveTab('pedidos')}
          className={`py-4 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2 transition-colors font-bold cursor-pointer whitespace-nowrap ${activeTab === 'pedidos' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black'}`}
        >
          <Users className="w-4 h-4" /> GESTÃO DE PEDIDOS ({pedidosLista.length})
        </button>

        <button
          onClick={() => setActiveTab('catalog')}
          className={`py-4 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2 transition-colors font-bold cursor-pointer whitespace-nowrap ${activeTab === 'catalog' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black'}`}
        >
          <PackageSearch className="w-4 h-4" /> CATÁLOGO & VISIBILIDADE
        </button>

        <button
          onClick={() => setActiveTab('coupons')}
          className={`py-4 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2 transition-colors font-bold cursor-pointer whitespace-nowrap ${activeTab === 'coupons' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black'}`}
        >
          <Lock className="w-4 h-4" /> CUPONS
        </button>

        <button
          onClick={() => setActiveTab('feedbacks')}
          className={`py-4 text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2 transition-colors font-bold cursor-pointer whitespace-nowrap ${activeTab === 'feedbacks' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black'}`}
        >
          <Image className="w-4 h-4" /> GESTOR DE FEEDBACKS
        </button>
      </div>

      <main className="p-6 max-w-7xl mx-auto space-y-8">
        
        {/* TAB 1: MÉTRICAS FINANCEIRAS */}
        {activeTab === 'metrics' && (
          <div className="space-y-8">
            {/* Cards Financeiros */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-neutral-50 border border-neutral-200 p-6 flex items-center gap-4">
                <div className="p-4 bg-black text-white rounded-none">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] block mb-1 font-bold">FATURAMENTO TOTAL</span>
                  <span className="text-2xl font-black text-black tracking-tighter">{formatMoney(metrics.faturamento)}</span>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 p-6 flex items-center gap-4">
                <div className="p-4 bg-emerald-600 text-white rounded-none">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] block mb-1 font-bold">VENDAS PAGAS</span>
                  <span className="text-2xl font-black text-black tracking-tighter">{metrics.totalPagos} pedidos</span>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 p-6 flex items-center gap-4">
                <div className="p-4 bg-amber-500 text-white rounded-none">
                  <Clock className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] block mb-1 font-bold">LEADS PENDENTES</span>
                  <span className="text-2xl font-black text-black tracking-tighter">{metrics.totalPendentes} no WhatsApp</span>
                </div>
              </div>

              <div className="bg-neutral-50 border border-neutral-200 p-6 flex items-center gap-4">
                <div className="p-4 bg-neutral-900 text-white rounded-none">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-[10px] font-mono text-neutral-500 uppercase tracking-[0.2em] block mb-1 font-bold">TAXA DE CONVERSÃO</span>
                  <span className="text-2xl font-black text-black tracking-tighter">{metrics.taxaConversao.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Relatório de Origem e Afiliados */}
            <div className="bg-neutral-50 border border-neutral-200 p-6">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-black mb-4 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-black" /> RELATÓRIO DE ORIGEM DAS VENDAS & PARCEIROS
              </h3>

              {metrics.origens.length === 0 ? (
                <div className="text-xs font-mono text-neutral-500 py-6 text-center">Nenhuma origem computada ainda.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white border-b border-neutral-200">
                        <th className="p-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">ORIGEM / PARCEIRO</th>
                        <th className="p-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-center">TOTAL VENDAS</th>
                        <th className="p-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-right">VOLUME GERADO</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-200 bg-white">
                      {metrics.origens.map((orig, idx) => (
                        <tr key={idx} className="hover:bg-neutral-50">
                          <td className="p-3 text-xs font-mono font-bold text-black uppercase">{orig.origem}</td>
                          <td className="p-3 text-xs font-mono text-center font-bold text-neutral-700">{orig.total}</td>
                          <td className="p-3 text-xs font-mono text-right font-bold text-emerald-600">{formatMoney(orig.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: GESTÃO DE PEDIDOS */}
        {activeTab === 'pedidos' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-neutral-50 p-4 border border-neutral-200">
              <span className="text-xs font-mono font-bold text-black uppercase tracking-widest">FILTRAR PEDIDOS:</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setPedidosFilter('todos')}
                  className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${pedidosFilter === 'todos' ? 'bg-black text-white' : 'bg-white text-black border border-neutral-200'}`}
                >
                  TODOS ({pedidosLista.length})
                </button>
                <button
                  onClick={() => setPedidosFilter('pago')}
                  className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${pedidosFilter === 'pago' ? 'bg-emerald-600 text-white' : 'bg-white text-black border border-neutral-200'}`}
                >
                  PAGOS ({pedidosLista.filter(p => p.status === 'pago' || p.status === 'aprovado').length})
                </button>
                <button
                  onClick={() => setPedidosFilter('pendente_whatsapp')}
                  className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider transition-colors ${pedidosFilter === 'pendente_whatsapp' ? 'bg-amber-500 text-white' : 'bg-white text-black border border-neutral-200'}`}
                >
                  PENDENTES ({pedidosLista.filter(p => p.status === 'pendente_whatsapp').length})
                </button>
              </div>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-neutral-200">
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">ID PEDIDO</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">CLIENTE</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">VALOR</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">CUPOM / ORIGEM</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">STATUS</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {pedidosFiltrados.map(ped => (
                    <tr key={ped.id} className="hover:bg-neutral-50">
                      <td className="p-4 text-xs font-mono font-bold text-black">#{String(ped.id || '').substring(0, 8)}</td>
                      <td className="p-4 text-xs font-mono text-neutral-800">{ped.email_cliente || 'Não informado'}</td>
                      <td className="p-4 text-xs font-mono font-bold text-black">{formatMoney(ped.valor_total || 0)}</td>
                      <td className="p-4 text-[11px] font-mono text-neutral-600">
                        {ped.cupom_aplicado && ped.cupom_aplicado !== 'NENHUM' ? `Cupom: ${ped.cupom_aplicado}` : `Ref: ${ped.email_cliente_referencia || 'Direto'}`}
                      </td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 text-[10px] font-mono font-bold uppercase rounded ${
                          ped.status === 'pago' || ped.status === 'aprovado' || ped.status === 'liberado'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-amber-100 text-amber-800 border border-amber-300'
                        }`}>
                          {ped.status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        {ped.status === 'pendente_whatsapp' ? (
                          <button
                            onClick={() => handleAlterarStatusPedido(ped.id, 'pago')}
                            disabled={atualizandoPedidoId === ped.id}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-mono text-[10px] font-bold uppercase tracking-wider rounded transition-colors cursor-pointer"
                          >
                            {atualizandoPedidoId === ped.id ? 'Aprovando...' : '[ APROVAR PAGAMENTO ]'}
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-600 font-bold uppercase">✓ ACESSO LIBERADO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: CATÁLOGO DE PRODUTOS E VISIBILIDADE */}
        {activeTab === 'catalog' && (
          <div className="space-y-8">
            <div className="bg-neutral-50 border border-neutral-200 p-6">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-black mb-4">
                [ CADASTRAR NOVO MÓDULO NO CATÁLOGO ]
              </h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const nome = formData.get('nome') as string;
                const preco = parseFloat(formData.get('preco') as string) || 0;
                const precoPromo = parseFloat(formData.get('preco_promo') as string) || 0;
                const categoria = formData.get('categoria') as string;
                const sistema_operacional = formData.get('sistema_operacional') as string;
                const link_entrega = formData.get('link_entrega') as string;
                const visivelBool = formData.get('visivel') === 'true';
                const desc = formData.get('descricao') as string;
                const img = formData.get('imagem') as string;

                if (!nome || !preco) {
                  alert("Preencha Nome e Preço!");
                  return;
                }

                const { error } = await supabase.from('solutions').insert([{
                  nome,
                  preco,
                  preco_promocional: precoPromo || preco,
                  categoria,
                  sistema_operacional,
                  link_entrega: link_entrega || undefined,
                  visivel: visivelBool,
                  descricao: desc,
                  imagem: img || undefined
                }]);

                if (!error) {
                  notificarSucesso("✅ Solução cadastrada com sucesso!");
                  form.reset();
                  carregarDados();
                } else {
                  alert("Erro ao cadastrar: " + error.message);
                }
              }} className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <input type="text" name="nome" placeholder="Nome do Produto..." className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none" required />
                <input type="number" step="0.01" name="preco" placeholder="Preço (ex: 67.00)" className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none" required />
                <input type="number" step="0.01" name="preco_promo" placeholder="Preço Promocional (opcional)" className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none" />
                
                <select name="sistema_operacional" className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none font-bold">
                  <option value="ambos">WIN + MAC (Ambos)</option>
                  <option value="windows">Windows</option>
                  <option value="mac">macOS</option>
                </select>

                <select name="categoria" className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none md:col-span-2">
                  <option value="DAWs (Softwares)">DAWs (Softwares)</option>
                  <option value="Mixagem">Mixagem</option>
                  <option value="Vocal">Vocal</option>
                  <option value="Efeitos">Efeitos</option>
                  <option value="Instrumentos">Instrumentos</option>
                  <option value="Serviços VIP">Serviços VIP</option>
                </select>

                <select name="visivel" className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none font-bold">
                  <option value="true">👁️ Visível no Catálogo</option>
                  <option value="false">🙈 Oculto do Catálogo</option>
                </select>

                <input type="text" name="link_entrega" placeholder="Link de Entrega/Download (Google Drive, Mega, etc)..." className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none md:col-span-4" />

                <input type="text" name="imagem" placeholder="URL da Imagem da Capa..." className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none md:col-span-4" />
                <textarea name="descricao" rows={2} placeholder="Descrição do produto..." className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none md:col-span-4" required></textarea>

                <button type="submit" className="md:col-span-4 py-3 bg-black text-white font-mono font-bold uppercase text-xs tracking-widest hover:bg-neutral-800 transition-colors cursor-pointer flex items-center justify-center gap-2">
                  <Plus className="w-4 h-4" /> [ CADASTRAR E SALVAR PRODUTO ]
                </button>
              </form>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-neutral-200">
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">ID</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest min-w-[180px]">PRODUTO</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">PLATAFORMA</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">PREÇO</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest min-w-[200px]">LINK DE ENTREGA</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-center">VISIBILIDADE</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-center">ORDER BUMP</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-center">AÇÕES</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {solucoes.map(sol => (
                    <tr key={sol.id} className="hover:bg-neutral-50">
                      <td className="p-4 text-xs font-mono text-neutral-600">[{sol.id}]</td>
                      
                      {/* Nome */}
                      <td className="p-4">
                        <input 
                          type="text" 
                          defaultValue={sol.nome}
                          onBlur={(e) => sol.nome !== e.target.value && salvarSolucao(sol.id, 'nome', e.target.value)}
                          className="bg-transparent text-black font-bold text-sm w-full outline-none border-b border-transparent focus:border-black"
                        />
                      </td>

                      {/* Plataforma */}
                      <td className="p-4">
                        <select 
                          defaultValue={sol.sistema_operacional || 'ambos'}
                          onChange={(e) => salvarSolucao(sol.id, 'sistema_operacional', e.target.value)}
                          className="bg-neutral-100 text-black font-mono text-xs font-bold p-1 rounded border border-neutral-300"
                        >
                          <option value="ambos">WIN + MAC</option>
                          <option value="windows">Windows</option>
                          <option value="mac">macOS</option>
                        </select>
                      </td>

                      {/* Preço */}
                      <td className="p-4">
                        <input 
                          type="number" 
                          step="0.01"
                          defaultValue={sol.preco_promocional || sol.preco}
                          onBlur={(e) => sol.preco_promocional !== Number(e.target.value) && salvarSolucao(sol.id, 'preco_promocional', Number(e.target.value))}
                          className="bg-transparent text-black font-mono font-bold text-sm w-20 outline-none border-b border-transparent focus:border-black"
                        />
                      </td>

                      {/* Link de Entrega */}
                      <td className="p-4">
                        <input 
                          type="text" 
                          defaultValue={sol.link_entrega || ''}
                          placeholder="Link de download..."
                          onBlur={(e) => sol.link_entrega !== e.target.value && salvarSolucao(sol.id, 'link_entrega', e.target.value)}
                          className="bg-neutral-50 text-neutral-800 font-mono text-[11px] w-full p-1 border border-neutral-300 rounded outline-none focus:border-black"
                        />
                      </td>

                      {/* Visibilidade (Alternador Visível / Oculto) */}
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => salvarSolucao(sol.id, 'visivel', sol.visivel === false)} 
                          className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold uppercase border flex items-center justify-center gap-1.5 mx-auto transition-all cursor-pointer ${
                            sol.visivel !== false 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100' 
                              : 'bg-red-50 text-red-700 border-red-300 hover:bg-red-100'
                          }`}
                          title={sol.visivel !== false ? "Clique para ocultar este produto do site" : "Clique para tornar este produto visível no site"}
                        >
                          {sol.visivel !== false ? (
                            <>
                              <Eye className="w-3.5 h-3.5 text-emerald-600" />
                              <span>VISÍVEL</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5 text-red-500" />
                              <span>OCULTO</span>
                            </>
                          )}
                        </button>
                      </td>

                      {/* Order Bump */}
                      <td className="p-4 text-center">
                        <button 
                          onClick={() => salvarSolucao(sol.id, 'is_orderbump', !sol.is_orderbump)}
                          className={`px-3 py-1 rounded text-[10px] font-mono font-bold uppercase border cursor-pointer ${
                            sol.is_orderbump ? 'bg-amber-500 text-white border-amber-600' : 'bg-neutral-100 text-neutral-600 border-neutral-300'
                          }`}
                        >
                          {sol.is_orderbump ? 'BUMP' : 'NÃO'}
                        </button>
                      </td>

                      {/* Ações */}
                      <td className="p-4 text-center">
                        <button onClick={async () => {
                          if (confirm(`Tem certeza que deseja excluir ${sol.nome}?`)) {
                            const { error } = await supabase.from('solutions').delete().eq('id', sol.id);
                            if (!error) {
                              notificarSucesso("✅ Módulo excluído com sucesso!");
                              carregarDados();
                            }
                          }
                        }} className="text-red-600 font-mono text-xs font-bold uppercase hover:underline cursor-pointer">
                          [ DELETAR ]
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 4: CUPONS DE DESCONTO */}
        {activeTab === 'coupons' && (
          <div className="space-y-8">
            <div className="bg-neutral-50 border border-neutral-200 p-6">
              <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-black mb-4">
                [ CADASTRAR NOVO CUPOM ]
              </h3>
              <form onSubmit={async (e) => {
                e.preventDefault();
                const form = e.currentTarget;
                const formData = new FormData(form);
                const codigo = (formData.get('codigo') as string || '').trim().toUpperCase();
                const desconto = parseFloat(formData.get('desconto') as string) || 0;

                if (!codigo || desconto <= 0) return;

                const { error } = await supabase.from('cupons').insert([{
                  codigo,
                  desconto_percentual: desconto / 100
                }]);

                if (!error) {
                  notificarSucesso(`✅ Cupom ${codigo} cadastrado com sucesso!`);
                  form.reset();
                  carregarDados();
                } else {
                  alert("Erro: " + error.message);
                }
              }} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <input type="text" name="codigo" placeholder="CÓDIGO (EX: ALCATEIA15)" className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black uppercase" required />
                <input type="number" step="0.5" name="desconto" placeholder="Desconto % (ex: 15)" className="bg-white border border-neutral-200 text-xs font-mono p-3 text-black" required />
                <button type="submit" className="py-3 bg-black text-white font-mono font-bold uppercase text-xs tracking-widest hover:bg-neutral-800 transition-colors cursor-pointer">
                  [ ADICIONAR CUPOM ]
                </button>
              </form>
            </div>

            <div className="bg-neutral-50 border border-neutral-200 overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white border-b border-neutral-200">
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">ID</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">CÓDIGO</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest">DESCONTO</th>
                    <th className="p-4 text-[10px] font-mono text-neutral-500 uppercase tracking-widest text-center">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200 bg-white">
                  {cupons.map(cp => (
                    <tr key={cp.id} className="hover:bg-neutral-50">
                      <td className="p-4 text-xs font-mono text-neutral-600">[{cp.id}]</td>
                      <td className="p-4 font-mono font-bold text-black uppercase">{cp.codigo}</td>
                      <td className="p-4 font-mono font-bold text-emerald-600">{(cp.desconto_percentual * 100).toFixed(0)}% OFF</td>
                      <td className="p-4 text-center">
                        <button onClick={async () => {
                          if (confirm(`Remover cupom ${cp.codigo}?`)) {
                            await supabase.from('cupons').delete().eq('id', cp.id);
                            notificarSucesso("✅ Cupom excluído!");
                            carregarDados();
                          }
                        }} className="text-red-600 font-mono text-xs font-bold uppercase hover:underline cursor-pointer">
                          [ DELETAR ]
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 5: GESTOR DE FEEDBACKS / DEPOIMENTOS */}
        {activeTab === 'feedbacks' && (
          <div className="space-y-8">
            <div className="bg-neutral-50 border border-neutral-200 p-6 space-y-6">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase tracking-widest text-black mb-1 flex items-center gap-2">
                  <Image className="w-4 h-4 text-black" /> [ GESTÃO DE FEEDBACKS & PROVA SOCIAL ]
                </h3>
                <p className="text-xs text-neutral-500 font-mono">
                  Adicione e remova prints de depoimentos do WhatsApp que aparecem na seção de Prova Social do site.
                </p>
              </div>

              {/* Formulários para adicionar imagem */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-neutral-200">
                {/* Por URL Externa */}
                <form onSubmit={handleAdicionarFeedbackUrl} className="space-y-3">
                  <label className="block text-xs font-mono font-bold uppercase text-black">
                    OPÇÃO A: INSERIR POR URL DE IMAGEM
                  </label>
                  <input
                    type="url"
                    placeholder="https://suaimagem.com/print.jpg"
                    value={novoFeedbackUrl}
                    onChange={(e) => setNovoFeedbackUrl(e.target.value)}
                    className="w-full bg-white border border-neutral-200 text-xs font-mono p-3 text-black focus:border-black outline-none"
                    required
                  />
                  <button
                    type="submit"
                    className="w-full py-3 bg-black text-white font-mono font-bold text-xs uppercase tracking-widest hover:bg-neutral-800 transition-colors cursor-pointer"
                  >
                    + ADICIONAR DEPOIMENTO POR URL
                  </button>
                </form>

                {/* Por Upload Direto para o Supabase Storage */}
                <div className="space-y-3">
                  <label className="block text-xs font-mono font-bold uppercase text-black">
                    OPÇÃO B: UPLOAD DE ARQUIVO (PRINT/IMAGEM)
                  </label>
                  <label className="w-full py-3 bg-white border-2 border-dashed border-neutral-300 text-black font-mono font-bold text-xs uppercase tracking-widest hover:border-black transition-colors cursor-pointer flex items-center justify-center gap-2">
                    {isUploadingFeedback ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Upload className="w-4 h-4" />}
                    {isUploadingFeedback ? 'ENVIANDO...' : 'ENVIAR PRINT DO SEU COMPUTADOR'}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleUploadFeedbackImage}
                      disabled={isUploadingFeedback}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Grid de Imagens Atuais */}
            <div>
              <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-neutral-500 mb-4">
                IMAGENS ATIVAS NO SITE ({feedbackImagens.length})
              </h4>

              {feedbackImagens.length === 0 ? (
                <div className="bg-neutral-50 border border-neutral-200 p-8 text-center text-xs font-mono text-neutral-500">
                  Nenhuma imagem de feedback cadastrada.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {feedbackImagens.map((imgUrl, idx) => (
                    <div key={idx} className="bg-neutral-50 border border-neutral-200 rounded-xl p-3 flex flex-col justify-between space-y-3 group">
                      <div className="aspect-[3/4] w-full rounded-lg overflow-hidden bg-black/5 relative">
                        <img src={imgUrl} alt={`Feedback ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-neutral-200">
                        <span className="text-[10px] font-mono text-neutral-500 uppercase font-bold">PRINT #{idx + 1}</span>
                        <button
                          onClick={() => handleRemoverFeedback(idx)}
                          className="text-red-600 hover:text-red-800 text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> EXCLUIR
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
