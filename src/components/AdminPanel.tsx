import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Lock,
  ArrowLeft,
  BarChart3,
  PackageSearch,
  Users,
  DollarSign,
  LogOut,
  Eye,
  EyeOff,
  Image,
  Plus,
  Trash2,
  Upload,
  CheckCircle2,
  Clock,
  ExternalLink,
  Loader2,
  Sparkles,
  Volume2,
  VolumeX,
  Video,
  Radio,
  Activity,
  Copy,
  Check,
  Search,
  Globe,
  Megaphone,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  RefreshCw,
  Tag,
} from 'lucide-react';
import {
  CONFIG_GLOBAL,
  produtos as catalogoCaixas3D,
  CAIXAS_3D_POR_ID,
  isImagemAntigaOuPlaceholder,
} from '../data/produtos';
import {
  ProductMediaMeta,
  AdsAndIntegrationsConfig,
  DEFAULT_ADS_CONFIG,
  fetchMediaMetaMapFromSupabase,
  saveProductMediaMeta,
  fetchAdsConfigFromSupabase,
  saveAdsConfigToSupabase,
  playAdminSaleSound,
} from '../utils/alcateiaStore';

interface AdminPanelProps {
  onClose?: () => void;
}

export const ADMIN_EMAILS = [
  'renantonyel020@gmail.com',
  'admin@arsenaldoprodutor.store',
  'renan@arsenaldoprodutor.store',
  'arsenaldoprodutor@gmail.com',
];

export const isUserAdmin = (sess: any): boolean => {
  const userEmail = sess?.user?.email?.toLowerCase().trim();
  if (!userEmail) return false;
  return ADMIN_EMAILS.some((adm) => adm.toLowerCase() === userEmail);
};

type AdminTab = 'radar' | 'catalog' | 'pedidos' | 'integracoes' | 'coupons';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onClose }) => {
  const [session, setSession] = useState<any>(null);
  const [email, setEmail] = useState('renantonyel020@gmail.com');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [novaSenha, setNovaSenha] = useState('');
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [activeTab, setActiveTab] = useState<AdminTab>('radar');

  // Toast e Alertas em Tempo Real
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [liveSaleBanner, setLiveSaleBanner] = useState<{
    id: string;
    email: string;
    valor: number;
  } | null>(null);
  const [realtimeConnected, setRealtimeConnected] = useState<boolean>(false);

  // Dados Operacionais
  const [pedidosLista, setPedidosLista] = useState<any[]>([]);
  const [pedidosFilter, setPedidosFilter] = useState<'todos' | 'pago' | 'pendente'>('todos');
  const [buscaPedido, setBuscaPedido] = useState('');
  const [atualizandoPedidoId, setAtualizandoPedidoId] = useState<string | null>(null);

  // Catálogo e Mídias
  const [solucoes, setSolucoes] = useState<any[]>([]);
  const [mediaMetaMap, setMediaMetaMap] = useState<Record<number, ProductMediaMeta>>({});
  const [expandedProductId, setExpandedProductId] = useState<number | null>(null);
  const [showNewProductForm, setShowNewProductForm] = useState(false);
  const [buscaProdutoAdmin, setBuscaProdutoAdmin] = useState('');
  const [uploadingMediaKey, setUploadingMediaKey] = useState<string | null>(null);

  // Cupons e Feedbacks
  const [cupons, setCupons] = useState<any[]>([]);
  const [feedbackImagens, setFeedbackImagens] = useState<string[]>([]);
  const [novoFeedbackUrl, setNovoFeedbackUrl] = useState('');
  const [isUploadingFeedback, setIsUploadingFeedback] = useState(false);

  // Configurações de Tráfego, Pixels & Integrações
  const [adsConfig, setAdsConfig] = useState<AdsAndIntegrationsConfig>(DEFAULT_ADS_CONFIG);
  const [copiedLinkKey, setCopiedLinkKey] = useState<string | null>(null);

  const notificarSucesso = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash && window.location.hash.includes('access_token')) {
      if (window.location.hash.includes('type=recovery')) {
        setIsRecoverySession(true);
      }
      setTimeout(() => {
        window.history.replaceState(null, '', window.location.pathname);
      }, 500);
    }

    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s && isUserAdmin(s)) {
        carregarDados();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      if (s && isUserAdmin(s)) {
        carregarDados();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Conexão WebSocket em Tempo Real (Escuta novos pedidos e confirmações de pagamento da Zucro ao vivo!)
  useEffect(() => {
    if (!session || !isUserAdmin(session)) return;

    const channel = supabase
      .channel('admin_command_center_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'pedidos' },
        (payload) => {
          carregarPedidos();

          if (payload.eventType === 'INSERT') {
            notificarSucesso(
              `⚡ Novo PIX Gerado no site: R$ ${Number(payload.new?.valor_total || 0)
                .toFixed(2)
                .replace('.', ',')} (${payload.new?.email_cliente || 'Cliente'})`
            );
          } else if (payload.eventType === 'UPDATE') {
            const st = String(payload.new?.status || '').toLowerCase();
            const oldSt = String(payload.old?.status || '').toLowerCase();
            if (
              (st === 'pago' || st === 'aprovado' || st === 'liberado') &&
              oldSt !== 'pago' &&
              oldSt !== 'aprovado'
            ) {
              playAdminSaleSound();
              setLiveSaleBanner({
                id: String(payload.new?.id || '').substring(0, 8),
                email: payload.new?.email_cliente || 'Produtor',
                valor: Number(payload.new?.valor_total || 0),
              });
              setTimeout(() => setLiveSaleBanner(null), 10000);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'solutions' },
        () => {
          carregarSolucoes();
        }
      )
      .subscribe((status) => {
        setRealtimeConnected(status === 'SUBSCRIBED');
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [session]);

  const carregarPedidos = async () => {
    const { data: pedidos } = await supabase
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });
    if (pedidos) {
      setPedidosLista(pedidos);
    }
  };

  const carregarSolucoes = async () => {
    const [solsRes, metaMap] = await Promise.all([
      supabase.from('solutions').select('*').order('id', { ascending: true }),
      fetchMediaMetaMapFromSupabase(),
    ]);

    setMediaMetaMap(metaMap);

    const sols = solsRes.data;
    if (sols) {
      const temAntigas = sols.length === 0 || sols.some((s: any) => isImagemAntigaOuPlaceholder(s.imagem));
      if (temAntigas) {
        const payloadUpsert = catalogoCaixas3D.map((p) => {
          const precoNum = parseFloat(p.preco.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          return {
            id: p.id,
            nome: p.nome,
            preco: precoNum,
            preco_promocional: precoNum,
            categoria: p.categoria,
            descricao: p.desc,
            imagem: p.imagem,
            galeria: p.galeria || [],
            link_entrega: p.link_entrega || '',
            estrelas: p.estrelas || 5.0,
            visivel: p.visivel !== false,
            is_orderbump: Boolean(p.is_orderbump),
            sistema_operacional: p.sistema_operacional || 'ambos',
          };
        });
        await supabase.from('solutions').upsert(payloadUpsert, { onConflict: 'id' });
        const { data: solsAtualizadas } = await supabase
          .from('solutions')
          .select('*')
          .order('id', { ascending: true });
        if (solsAtualizadas) setSolucoes(solsAtualizadas);
      } else {
        setSolucoes(sols);
      }
    }
  };

  const carregarDados = async () => {
    await Promise.all([
      carregarPedidos(),
      carregarSolucoes(),
      (async () => {
        const { data: cps } = await supabase
          .from('cupons')
          .select('*')
          .order('id', { ascending: true });
        if (cps) setCupons(cps);
      })(),
      (async () => {
        const cfg = await fetchAdsConfigFromSupabase();
        setAdsConfig(cfg);
      })(),
      (async () => {
        const { data: configs } = await supabase
          .from('configuracoes')
          .select('chave, valor')
          .in('chave', ['ARSENAL_FEEDBACKS', 'ALCATEIA_FEEDBACKS']);
        const found =
          configs?.find((c: any) => c.chave === 'ARSENAL_FEEDBACKS') ||
          configs?.find((c: any) => c.chave === 'ALCATEIA_FEEDBACKS');
        if (found?.valor) {
          try {
            setFeedbackImagens(JSON.parse(found.valor));
          } catch {
            setFeedbackImagens(CONFIG_GLOBAL.feedbackImagens);
          }
        } else {
          setFeedbackImagens(CONFIG_GLOBAL.feedbackImagens);
        }
      })(),
    ]);
  };

  // Cálculo automático de KPIs e Origens em Tempo Real
  const metrics = useMemo(() => {
    const pagos = pedidosLista.filter(
      (p) => p.status === 'pago' || p.status === 'aprovado' || p.status === 'liberado'
    );
    const pendentes = pedidosLista.filter(
      (p) => p.status !== 'pago' && p.status !== 'aprovado' && p.status !== 'liberado'
    );

    const faturamentoTotal = pagos.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
    const valorPendente = pendentes.reduce((acc, curr) => acc + Number(curr.valor_total || 0), 0);
    const totalPedidosGeral = pedidosLista.length;
    const taxa = totalPedidosGeral > 0 ? (pagos.length / totalPedidosGeral) * 100 : 0;
    const ticket = pagos.length > 0 ? faturamentoTotal / pagos.length : 0;

    const mapaOrigens: Record<string, { total: number; pagos: number; valor: number }> = {};
    pedidosLista.forEach((p) => {
      const det = Array.isArray(p.detalhe_valores) ? p.detalhe_valores[0] : null;
      const utmSource = det?.atribuicao?.utm_source || p.email_cliente_referencia || 'Direto (Catálogo)';
      const label = String(utmSource).toUpperCase();
      if (!mapaOrigens[label]) mapaOrigens[label] = { total: 0, pagos: 0, valor: 0 };
      mapaOrigens[label].total += 1;
      if (p.status === 'pago' || p.status === 'aprovado' || p.status === 'liberado') {
        mapaOrigens[label].pagos += 1;
        mapaOrigens[label].valor += Number(p.valor_total || 0);
      }
    });

    const origens = Object.keys(mapaOrigens)
      .map((k) => ({
        origem: k,
        total: mapaOrigens[k].total,
        pagos: mapaOrigens[k].pagos,
        valor: mapaOrigens[k].valor,
      }))
      .sort((a, b) => b.valor - a.valor || b.total - a.total);

    return {
      faturamento: faturamentoTotal,
      valorPendente,
      totalPagos: pagos.length,
      totalPendentes: pendentes.length,
      ticketMedio: ticket,
      taxaConversao: taxa,
      origens,
    };
  }, [pedidosLista]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {}
    setSession(null);
    if (onClose) onClose();
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const cleanEmail = email.trim().toLowerCase();
    const isMasterAdminEmail = ADMIN_EMAILS.some((adm) => adm.toLowerCase() === cleanEmail);

    if (
      isMasterAdminEmail &&
      (password === 'arsenal2026' ||
        password === 'arsenalpro2026' ||
        password === 'admin2026' ||
        password === 'alcateia2026')
    ) {
      setSession({ user: { email: cleanEmail } });
      carregarDados();
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: cleanEmail,
      password,
    });
    if (error) {
      alert('Erro ao entrar: ' + error.message);
      setIsLoading(false);
      return;
    }

    if (!data.session || !isUserAdmin(data.session)) {
      alert(
        'Acesso Negado: A conta conectada (' +
          (data.session?.user?.email || cleanEmail) +
          ') não possui privilégios de administrador.'
      );
      await supabase.auth.signOut();
      setSession(null);
      setIsLoading(false);
      return;
    }

    setSession(data.session);
    carregarDados();
    setIsLoading(false);
  };

  const handleResetPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      alert('Digite seu e-mail de administrador primeiro.');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
      redirectTo: window.location.origin + '/arsenal-admin',
    });
    setIsLoading(false);
    if (error) {
      alert('Erro ao enviar e-mail de recuperação: ' + error.message);
    } else {
      setResetSent(true);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaSenha || novaSenha.length < 6) {
      alert('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }
    setIsLoading(true);
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    setIsLoading(false);
    if (error) {
      alert('Erro ao atualizar senha: ' + error.message);
    } else {
      notificarSucesso('✅ Senha atualizada com sucesso!');
      setIsRecoverySession(false);
    }
  };

  // Salvar campo do produto na tabela solutions e propagar em Tempo Real
  const salvarSolucao = async (id: number, campo: string, valor: any) => {
    setSolucoes((prev) => prev.map((item) => (item.id === id ? { ...item, [campo]: valor } : item)));

    const updatePayload: Record<string, any> = { [campo]: valor };
    const { error } = await supabase.from('solutions').update(updatePayload).eq('id', id);

    if (error) {
      alert('Erro ao salvar alteração: ' + error.message);
      carregarSolucoes();
    } else {
      notificarSucesso(`✅ Produto #${id} atualizado ao vivo!`);
      window.dispatchEvent(new Event('produtosAtualizados'));
    }
  };

  // Atualizar tanto Preço Base quanto Preço Promocional com 1 clique
  const salvarPrecoRapido = async (id: number, novoPrecoPromo: number, novoPrecoBase?: number) => {
    const updatePayload: Record<string, any> = {
      preco_promocional: novoPrecoPromo,
    };
    if (novoPrecoBase !== undefined) {
      updatePayload.preco = novoPrecoBase;
    }

    setSolucoes((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatePayload } : item))
    );

    const { error } = await supabase.from('solutions').update(updatePayload).eq('id', id);
    if (!error) {
      notificarSucesso(`💰 Preço do produto #${id} atualizado para R$ ${novoPrecoPromo.toFixed(2).replace('.', ',')}!`);
      window.dispatchEvent(new Event('produtosAtualizados'));
    } else {
      alert('Erro ao atualizar preço: ' + error.message);
    }
  };

  // Upload universal de arquivos (Imagem, Vídeo MP4 ou Áudio MP3/WAV) para o Supabase Storage
  const uploadArquivoStorage = async (
    file: File,
    prefix: string
  ): Promise<string | null> => {
    try {
      const ext = file.name.split('.').pop() || 'bin';
      const fileName = `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('produtos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (err: any) {
      alert('Erro ao enviar arquivo para o Supabase Storage: ' + err.message);
      return null;
    }
  };

  // Atualizar Metadados de Mídia (Vídeo / Áudio) de um Produto
  const handleUpdateProductMedia = async (
    productId: number,
    changes: Partial<ProductMediaMeta>
  ) => {
    const updatedMap = await saveProductMediaMeta(productId, changes);
    setMediaMetaMap(updatedMap);
    notificarSucesso(`🎬 Mídia do produto #${productId} sincronizada com o site!`);
  };

  const handleAlterarStatusPedido = async (id: string, novoStatus: string) => {
    setAtualizandoPedidoId(id);
    const { error } = await supabase
      .from('pedidos')
      .update({ status: novoStatus, updated_at: new Date().toISOString() })
      .eq('id', id);
    setAtualizandoPedidoId(null);

    if (!error) {
      if (novoStatus === 'pago') {
        playAdminSaleSound();
      }
      notificarSucesso(`✅ Pedido #${String(id).substring(0, 8)} atualizado para ${novoStatus.toUpperCase()}!`);
      carregarPedidos();
    } else {
      alert('Erro ao atualizar pedido: ' + error.message);
    }
  };

  // Gestão de Feedbacks (Prova Social)
  const salvarListaFeedbacksNoSupabase = async (novaLista: string[]) => {
    setFeedbackImagens(novaLista);
    localStorage.setItem('ARSENAL_FEEDBACKS', JSON.stringify(novaLista));
    localStorage.setItem('ALCATEIA_FEEDBACKS', JSON.stringify(novaLista));
    CONFIG_GLOBAL.feedbackImagens = novaLista;
    window.dispatchEvent(new Event('configuracoesAtualizadas'));

    const { error } = await supabase
      .from('configuracoes')
      .upsert(
        [
          { chave: 'ARSENAL_FEEDBACKS', valor: JSON.stringify(novaLista) },
          { chave: 'ALCATEIA_FEEDBACKS', valor: JSON.stringify(novaLista) },
        ],
        { onConflict: 'chave' }
      );

    if (!error) {
      notificarSucesso('✅ Prova social atualizada no site!');
    }
  };

  const handleAdicionarFeedbackUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoFeedbackUrl.trim()) return;
    await salvarListaFeedbacksNoSupabase([...feedbackImagens, novoFeedbackUrl.trim()]);
    setNovoFeedbackUrl('');
  };

  const handleUploadFeedbackImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingFeedback(true);
    const url = await uploadArquivoStorage(file, 'feedback');
    setIsUploadingFeedback(false);
    if (url) {
      await salvarListaFeedbacksNoSupabase([...feedbackImagens, url]);
    }
  };

  const handleRemoverFeedback = async (idx: number) => {
    const nova = feedbackImagens.filter((_, i) => i !== idx);
    await salvarListaFeedbacksNoSupabase(nova);
  };

  const formatMoney = (val: number) => `R$ ${Number(val || 0).toFixed(2).replace('.', ',')}`;

  const pedidosFiltrados = useMemo(() => {
    return pedidosLista.filter((p) => {
      const isPago = p.status === 'pago' || p.status === 'aprovado' || p.status === 'liberado';
      if (pedidosFilter === 'pago' && !isPago) return false;
      if (pedidosFilter === 'pendente' && isPago) return false;

      if (buscaPedido.trim()) {
        const q = buscaPedido.toLowerCase();
        const matchId = String(p.id || '').toLowerCase().includes(q);
        const matchEmail = String(p.email_cliente || '').toLowerCase().includes(q);
        return matchId || matchEmail;
      }
      return true;
    });
  }, [pedidosLista, pedidosFilter, buscaPedido]);

  const solucoesFiltradas = useMemo(() => {
    if (!buscaProdutoAdmin.trim()) return solucoes;
    const q = buscaProdutoAdmin.toLowerCase();
    return solucoes.filter(
      (s) =>
        String(s.nome || '').toLowerCase().includes(q) ||
        String(s.categoria || '').toLowerCase().includes(q) ||
        String(s.id).includes(q)
    );
  }, [solucoes, buscaProdutoAdmin]);

  // Tela de Redefinição de Senha
  if (isRecoverySession) {
    return (
      <div className="min-h-screen bg-[#090B0E] text-white flex items-center justify-center p-4 font-mono">
        <form
          onSubmit={handleUpdatePassword}
          className="w-full max-w-md bg-[#11151C] border border-neutral-800 rounded-3xl p-8 space-y-6 shadow-2xl"
        >
          <div className="flex items-center gap-3 text-[#C5A059]">
            <Lock className="w-6 h-6" />
            <h2 className="text-lg font-bold uppercase tracking-wider">Definir Nova Senha Admin</h2>
          </div>
          <input
            type="password"
            placeholder="Digite sua nova senha..."
            value={novaSenha}
            onChange={(e) => setNovaSenha(e.target.value)}
            className="w-full bg-black border border-neutral-800 rounded-xl p-3.5 text-xs text-white outline-none focus:border-[#C5A059]"
            required
          />
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 bg-[#C5A059] text-black font-bold text-xs uppercase rounded-xl hover:bg-[#DFCA95] cursor-pointer"
          >
            {isLoading ? 'SALVANDO...' : 'SALVAR NOVA SENHA'}
          </button>
        </form>
      </div>
    );
  }

  // Tela de Login Blindada do Command Center
  if (!session || !isUserAdmin(session)) {
    return (
      <div className="min-h-screen bg-[#07090C] text-white flex flex-col justify-center items-center p-4 font-mono relative overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[#C5A059]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="w-full max-w-md bg-[#0F1319] border border-neutral-800 rounded-3xl p-8 shadow-[0_25px_70px_rgba(0,0,0,0.85)] relative z-10">
          {onClose && (
            <button
              onClick={onClose}
              className="mb-6 text-neutral-400 hover:text-white flex items-center gap-2 text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#C5A059]" /> [ VOLTAR PARA A LOJA ]
            </button>
          )}

          <div className="flex items-center gap-3 mb-6">
            <div className="p-3 bg-[#C5A059]/15 border border-[#C5A059]/40 rounded-2xl text-[#DFCA95]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase text-white">
                ARSENAL COMMAND CENTER
              </h1>
              <p className="text-[10px] text-[#C5A059] uppercase tracking-widest font-bold">
                TERMINAL EXECUTIVO • ACESSO RESTRITO
              </p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 font-bold">
                E-MAIL DO ADMINISTRADOR
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#090B0E] border border-neutral-800 rounded-xl p-3.5 text-white focus:outline-none focus:border-[#C5A059] text-xs"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] text-neutral-400 uppercase tracking-widest mb-1.5 font-bold">
                CHAVE DE SEGURANÇA / SENHA
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#090B0E] border border-neutral-800 rounded-xl p-3.5 pr-12 text-white focus:outline-none focus:border-[#C5A059] text-xs"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-[#DFCA95] via-[#C5A059] to-[#DFCA95] text-black font-black text-xs uppercase tracking-widest hover:brightness-110 transition-all cursor-pointer shadow-lg"
            >
              {isLoading ? 'AUTENTICANDO...' : '[ ACESSAR COMMAND CENTER ]'}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-neutral-800/80 text-center">
            {resetSent ? (
              <p className="text-[11px] text-emerald-400">
                ✓ Link de redefinição enviado para seu e-mail!
              </p>
            ) : (
              <button
                type="button"
                onClick={handleResetPassword}
                className="text-[11px] text-neutral-400 hover:text-[#DFCA95] underline cursor-pointer"
              >
                Esqueceu a senha? Enviar link de recuperação
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://arsenaldoprodutor.store';
  const webhookUrl = 'https://mcabymkxorqcbijvdfvp.supabase.co/functions/v1/zucro-webhook';

  return (
    <div className="min-h-screen bg-[#080A0E] text-white font-sans pb-20">
      {/* Toast Flutuante */}
      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#11161F] border-2 border-[#C5A059] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span className="text-xs font-mono font-bold">{toastMsg}</span>
        </div>
      )}

      {/* Banner Ao Vivo quando a Zucro Confirma um Pagamento */}
      {liveSaleBanner && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-xl px-4 animate-in fade-in slide-in-from-top-5">
          <div className="p-4 rounded-2xl bg-emerald-950/95 border-2 border-emerald-400 shadow-[0_0_50px_rgba(16,185,129,0.5)] flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-400 text-black font-black">
                <DollarSign className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[10px] font-mono font-black uppercase tracking-widest text-emerald-300 block">
                  🔔 VENDA APROVADA NA ZUCRO • ARQUIVOS LIBERADOS!
                </span>
                <p className="text-sm font-mono font-black text-white">
                  Pedido #{liveSaleBanner.id} • {formatMoney(liveSaleBanner.valor)} ({liveSaleBanner.email})
                </p>
              </div>
            </div>
            <button
              onClick={() => setLiveSaleBanner(null)}
              className="text-emerald-300 hover:text-white text-xs font-mono font-bold cursor-pointer"
            >
              [ OK ]
            </button>
          </div>
        </div>
      )}

      {/* HEADER EXECUTIVO DO COMMAND CENTER */}
      <header className="bg-[#0C0F16] border-b border-neutral-800 sticky top-0 z-30 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {onClose && (
              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[#DFCA95] text-xs font-mono font-bold uppercase flex items-center gap-2 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Ver Loja</span>
              </button>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-heading font-black uppercase tracking-tight text-white">
                  ARSENAL COMMAND CENTER
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                  {realtimeConnected ? 'AO VIVO (REALTIME)' : 'CONECTADO'}
                </span>
              </div>
              <p className="text-[11px] font-mono text-neutral-400">
                Sincronizado com Supabase & Gateway Zucro • Admin: {session?.user?.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Botão para Ligar/Desligar e Testar Som de Venda */}
            <button
              type="button"
              onClick={async () => {
                const next = !adsConfig.soundAlertEnabled;
                const updated = await saveAdsConfigToSupabase({ soundAlertEnabled: next });
                setAdsConfig(updated);
                if (next) playAdminSaleSound();
              }}
              className={`px-3 py-2 rounded-xl border text-[11px] font-mono font-bold uppercase flex items-center gap-1.5 transition-all cursor-pointer ${
                adsConfig.soundAlertEnabled
                  ? 'bg-[#C5A059]/15 border-[#C5A059]/40 text-[#DFCA95]'
                  : 'bg-neutral-900 border-neutral-800 text-neutral-500'
              }`}
              title="Ativar ou silenciar o alerta sonoro quando uma venda for aprovada"
            >
              {adsConfig.soundAlertEnabled ? (
                <>
                  <Volume2 className="w-4 h-4 text-[#C5A059]" />
                  <span className="hidden sm:inline">Alerta Sonoro: ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-4 h-4" />
                  <span className="hidden sm:inline">Alerta Sonoro: OFF</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={carregarDados}
              className="p-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-neutral-300 hover:text-white cursor-pointer"
              title="Atualizar dados agora"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            <button
              onClick={handleLogout}
              className="px-3.5 py-2 rounded-xl bg-red-950/30 hover:bg-red-900/40 border border-red-800/40 text-red-300 text-xs font-mono font-bold uppercase flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sair</span>
            </button>
          </div>
        </div>

        {/* BARRA DE NAVEGAÇÃO EM 5 MÓDULOS CLAROS E AUTOEXPLICATIVOS */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-2 overflow-x-auto border-t border-neutral-800/80 pt-2 pb-2">
          {[
            {
              id: 'radar' as AdminTab,
              label: '1. Radar Ao Vivo & Zucro',
              icon: Activity,
              badge: metrics.totalPagos,
            },
            {
              id: 'catalog' as AdminTab,
              label: '2. Catálogo, Preços & Mídias (Foto/Vídeo/Som)',
              icon: PackageSearch,
              badge: solucoes.length,
            },
            {
              id: 'pedidos' as AdminTab,
              label: '3. Pedidos & Liberações',
              icon: Users,
              badge: pedidosLista.length,
            },
            {
              id: 'integracoes' as AdminTab,
              label: '4. Tráfego, Pixels & Integrações (Ads/Insta/YT)',
              icon: Megaphone,
            },
            {
              id: 'coupons' as AdminTab,
              label: '5. Cupons & Prova Social',
              icon: Tag,
              badge: cupons.length,
            },
          ].map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2.5 rounded-xl font-mono text-xs font-bold uppercase tracking-wider flex items-center gap-2 whitespace-nowrap transition-all cursor-pointer ${
                  active
                    ? 'bg-[#C5A059] text-black shadow-[0_0_20px_rgba(197,160,89,0.3)]'
                    : 'bg-[#11151E] text-neutral-400 hover:text-white border border-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] ${
                      active ? 'bg-black/20 text-black' : 'bg-neutral-800 text-neutral-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DO DASHBOARD */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-8">
        {/* ===================================================================
            ABA 1: RADAR AO VIVO (MÉTRICAS, FEED ZUCRO EM TEMPO REAL & ORIGENS)
           =================================================================== */}
        {activeTab === 'radar' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* Cards Principais de Telemetria */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-3xl bg-[#0F131C] border border-emerald-500/30 shadow-xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                    FATURAMENTO APROVADO (ZUCRO)
                  </span>
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-3xl font-mono font-black text-white block">
                  {formatMoney(metrics.faturamento)}
                </span>
                <span className="text-[11px] font-mono text-neutral-400 mt-2 block">
                  ✓ {metrics.totalPagos} vendas confirmadas e liberadas
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-[#0F131C] border border-neutral-800 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#DFCA95] font-bold">
                    PIX GERADOS (AGUARDANDO)
                  </span>
                  <Clock className="w-5 h-5 text-[#C5A059]" />
                </div>
                <span className="text-3xl font-mono font-black text-white block">
                  {metrics.totalPendentes} pedidos
                </span>
                <span className="text-[11px] font-mono text-amber-400 mt-2 block">
                  Volume em aberto: {formatMoney(metrics.valorPendente)}
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-[#0F131C] border border-neutral-800 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">
                    TICKET MÉDIO POR VENDA
                  </span>
                  <BarChart3 className="w-5 h-5 text-[#C5A059]" />
                </div>
                <span className="text-3xl font-mono font-black text-white block">
                  {formatMoney(metrics.ticketMedio)}
                </span>
                <span className="text-[11px] font-mono text-neutral-400 mt-2 block">
                  Impulsionado pelo Combo + Order Bump
                </span>
              </div>

              <div className="p-6 rounded-3xl bg-[#0F131C] border border-neutral-800 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-neutral-400 font-bold">
                    CONVERSÃO DO CHECKOUT PIX
                  </span>
                  <Activity className="w-5 h-5 text-emerald-400" />
                </div>
                <span className="text-3xl font-mono font-black text-emerald-400 block">
                  {metrics.taxaConversao.toFixed(1)}%
                </span>
                <span className="text-[11px] font-mono text-neutral-400 mt-2 block">
                  De {pedidosLista.length} checkouts iniciados no site
                </span>
              </div>
            </div>

            {/* Grid Duplo: Feed Ao Vivo da Zucro + Origens de Tráfego */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Coluna 7: Retorno Ao Vivo da Zucro & Liberação de Arquivos */}
              <div className="lg:col-span-7 bg-[#0F131C] border border-neutral-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-neutral-800 pb-4 flex-wrap gap-2">
                  <div>
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-emerald-400 block">
                      ⚡ MONITORAMENTO EM TEMPO REAL (ZUCRO ↔ SITE)
                    </span>
                    <h3 className="text-base font-heading font-black text-white uppercase">
                      ÚLTIMAS TRANSAÇÕES & LIBERAÇÕES DE ARQUIVOS
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => playAdminSaleSound()}
                    className="px-3 py-1.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-700 text-[10px] font-mono font-bold text-[#DFCA95] uppercase cursor-pointer"
                  >
                    🔊 Testar Som de Venda
                  </button>
                </div>

                {pedidosLista.length === 0 ? (
                  <div className="p-8 text-center text-xs font-mono text-neutral-500">
                    Nenhum pedido registrado ainda. Assim que um cliente gerar ou pagar um PIX, ele aparece aqui instantaneamente.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                    {pedidosLista.slice(0, 12).map((ped) => {
                      const isPago =
                        ped.status === 'pago' ||
                        ped.status === 'aprovado' ||
                        ped.status === 'liberado';
                      const itens = Array.isArray(ped.detalhe_valores) ? ped.detalhe_valores : [];
                      const nomesItens = itens.map((i: any) => i.nome).filter(Boolean).join(' + ');
                      const atrib = itens[0]?.atribuicao;
                      const sisCliente = atrib?.sistema_cliente || 'windows';
                      const origem = atrib?.utm_source || ped.email_cliente_referencia || 'direto';

                      return (
                        <div
                          key={ped.id}
                          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-all ${
                            isPago
                              ? 'bg-emerald-950/15 border-emerald-500/30'
                              : 'bg-[#141923] border-neutral-800'
                          }`}
                        >
                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`px-2 py-0.5 rounded text-[9px] font-mono font-black uppercase ${
                                  isPago
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                }`}
                              >
                                {isPago ? '✓ PAGO NA ZUCRO • ARQUIVOS LIBERADOS' : '⏳ AGUARDANDO PIX'}
                              </span>
                              <span className="text-[10px] font-mono text-neutral-400">
                                #{String(ped.id || '').substring(0, 8)}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-black border border-neutral-800 text-[9px] font-mono text-[#DFCA95] uppercase">
                                {sisCliente === 'mac' ? '🍎 macOS' : '🪟 Windows'}
                              </span>
                              <span className="px-2 py-0.5 rounded bg-black border border-neutral-800 text-[9px] font-mono text-neutral-300 uppercase">
                                Origem: {origem}
                              </span>
                            </div>

                            <p className="text-xs font-mono font-bold text-white truncate">
                              {ped.email_cliente || 'Cliente'}
                            </p>
                            {nomesItens && (
                              <p className="text-[11px] font-mono text-neutral-400 truncate">
                                📦 {nomesItens}
                              </p>
                            )}
                          </div>

                          <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 flex-shrink-0">
                            <span className="text-base font-mono font-black text-white">
                              {formatMoney(ped.valor_total || 0)}
                            </span>
                            {!isPago && (
                              <button
                                onClick={() => handleAlterarStatusPedido(ped.id, 'pago')}
                                disabled={atualizandoPedidoId === ped.id}
                                className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-[10px] font-bold uppercase cursor-pointer"
                              >
                                {atualizandoPedidoId === ped.id ? '...' : 'Liberar Manual'}
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Coluna 5: Origem do Tráfego (Instagram, YouTube, Ads, Direto) */}
              <div className="lg:col-span-5 bg-[#0F131C] border border-neutral-800 rounded-3xl p-6 space-y-4">
                <div className="border-b border-neutral-800 pb-4">
                  <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C5A059] block">
                    📊 RASTREAMENTO DE CANAIS
                  </span>
                  <h3 className="text-base font-heading font-black text-white uppercase">
                    ORIGEM DOS PEDIDOS (INSTAGRAM / YOUTUBE / ADS)
                  </h3>
                </div>

                {metrics.origens.length === 0 ? (
                  <p className="text-xs font-mono text-neutral-500 py-8 text-center">
                    Nenhuma origem contabilizada ainda.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {metrics.origens.map((orig, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-[#141923] border border-neutral-800 flex items-center justify-between"
                      >
                        <div>
                          <span className="text-xs font-mono font-black text-white uppercase block">
                            {orig.origem}
                          </span>
                          <span className="text-[10px] font-mono text-neutral-400">
                            {orig.total} checkouts • {orig.pagos} pagos
                          </span>
                        </div>
                        <span className="text-sm font-mono font-black text-emerald-400">
                          {formatMoney(orig.valor)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="p-4 rounded-2xl bg-[#141923] border border-[#C5A059]/30 space-y-2 mt-4">
                  <span className="text-[10px] font-mono font-bold text-[#DFCA95] uppercase block">
                    💡 DICA DE TRÁFEGO:
                  </span>
                  <p className="text-xs text-neutral-300 leading-relaxed">
                    Na aba <strong>"4. Tráfego, Pixels & Integrações"</strong> você já tem os links prontos para colocar na Bio do seu Instagram e no YouTube, além dos campos pré-moldados para o Pixel do Facebook/Meta Ads.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 2: CATÁLOGO, PREÇOS FACILITADOS & MÍDIAS (FOTOS, VÍDEOS E SONS)
           =================================================================== */}
        {activeTab === 'catalog' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Barra de Topo do Catálogo */}
            <div className="bg-[#0F131C] border border-neutral-800 rounded-3xl p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C5A059] block">
                  GERENCIADOR CENTRAL DE PRODUTOS E MÍDIAS
                </span>
                <h2 className="text-lg sm:text-xl font-heading font-black text-white uppercase">
                  EDITE PREÇOS, FOTOS, VÍDEOS E SONS EM TEMPO REAL
                </h2>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Ative ou desative Vídeo e Som individualmente em cada produto. Os que estiverem desativados não aparecem na página de exibição.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={buscaProdutoAdmin}
                    onChange={(e) => setBuscaProdutoAdmin(e.target.value)}
                    placeholder="Buscar produto..."
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl pl-9 pr-4 py-2.5 text-xs font-mono text-white focus:border-[#C5A059] outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowNewProductForm((prev) => !prev)}
                  className="px-4 py-2.5 rounded-xl bg-[#C5A059] hover:bg-[#DFCA95] text-black font-mono text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>{showNewProductForm ? 'Fechar Cadastro' : 'Novo Produto'}</span>
                </button>
              </div>
            </div>

            {/* Formulário de Novo Produto (Expansível) */}
            {showNewProductForm && (
              <div className="bg-[#0F131C] border-2 border-[#C5A059]/50 rounded-3xl p-6 space-y-4">
                <h3 className="text-sm font-mono font-bold uppercase text-[#DFCA95]">
                  + CADASTRAR NOVO PRODUTO NO CATÁLOGO
                </h3>
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    const nome = formData.get('nome') as string;
                    const precoPromo = parseFloat(formData.get('preco_promo') as string) || 47;
                    const precoBase = parseFloat(formData.get('preco_base') as string) || precoPromo * 1.5;
                    const categoria = formData.get('categoria') as string;
                    const sistema_operacional = formData.get('sistema_operacional') as string;
                    const link_entrega = formData.get('link_entrega') as string;
                    const descricao = formData.get('descricao') as string;
                    const imagem = formData.get('imagem') as string;

                    const { error } = await supabase.from('solutions').insert([
                      {
                        nome,
                        preco: precoBase,
                        preco_promocional: precoPromo,
                        categoria,
                        sistema_operacional,
                        link_entrega,
                        visivel: true,
                        descricao,
                        imagem:
                          imagem ||
                          'https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_1_1793504622311.jpg',
                      },
                    ]);

                    if (!error) {
                      notificarSucesso('✅ Novo produto adicionado ao catálogo!');
                      form.reset();
                      setShowNewProductForm(false);
                      carregarSolucoes();
                    } else {
                      alert('Erro ao cadastrar: ' + error.message);
                    }
                  }}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4"
                >
                  <input
                    type="text"
                    name="nome"
                    placeholder="Nome do Produto (ex: Pro Tools Studio)"
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white md:col-span-2"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    name="preco_promo"
                    placeholder="Preço de Venda (ex: 67.00)"
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    name="preco_base"
                    placeholder="Preço Antigo Riscado (ex: 147.00)"
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                  />
                  <select
                    name="categoria"
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                  >
                    <option value="Daws">Daws</option>
                    <option value="Mixagem">Mixagem</option>
                    <option value="Vocal">Vocal</option>
                    <option value="Efeitos">Efeitos</option>
                    <option value="Instrumentos">Instrumentos</option>
                    <option value="Serviços VIP">Serviços VIP</option>
                  </select>
                  <select
                    name="sistema_operacional"
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                  >
                    <option value="ambos">Windows + macOS (Ambos)</option>
                    <option value="windows">Apenas Windows</option>
                    <option value="mac">Apenas macOS</option>
                  </select>
                  <input
                    type="text"
                    name="imagem"
                    placeholder="URL da Imagem de Capa (ou suba depois)"
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white md:col-span-2"
                  />
                  <input
                    type="text"
                    name="link_entrega"
                    placeholder="Link de Download (Google Drive, Mega, etc.)"
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white md:col-span-4"
                  />
                  <textarea
                    name="descricao"
                    rows={2}
                    placeholder="Descrição técnica (DSC) do produto..."
                    className="bg-[#080A0E] border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white md:col-span-4"
                    required
                  />
                  <button
                    type="submit"
                    className="md:col-span-4 py-3.5 rounded-xl bg-[#C5A059] text-black font-mono font-black text-xs uppercase tracking-widest hover:bg-[#DFCA95] cursor-pointer"
                  >
                    [ SALVAR E PUBLICAR PRODUTO ]
                  </button>
                </form>
              </div>
            )}

            {/* Lista de Produtos com Edição Facilitada de Preço + Painel de Mídias (Foto, Vídeo, Som) */}
            <div className="space-y-4">
              {solucoesFiltradas.map((sol) => {
                const boxFallback = CAIXAS_3D_POR_ID[sol.id];
                const capaAtual =
                  (!isImagemAntigaOuPlaceholder(sol.imagem) && sol.imagem) ||
                  boxFallback?.imagem ||
                  sol.imagem;
                const meta = mediaMetaMap[sol.id] || {
                  tem_video: Boolean(sol.tem_video),
                  video_url: sol.video_url || '',
                  tem_audio: Boolean(sol.tem_audio),
                  audio_url: sol.audio_url || '',
                };
                const isExpanded = expandedProductId === sol.id;
                const precoVendaAtual = Number(sol.preco_promocional || sol.preco || 0);
                const precoBaseAtual = Number(sol.preco || precoVendaAtual);

                return (
                  <div
                    key={sol.id}
                    className="bg-[#0F131C] border border-neutral-800 hover:border-neutral-700 rounded-3xl overflow-hidden transition-all"
                  >
                    {/* Linha Principal do Produto */}
                    <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Foto + Nome + Categoria + Sistema */}
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <img
                          src={capaAtual}
                          alt={sol.nome}
                          className="w-16 h-16 rounded-2xl object-contain bg-black p-1 border border-neutral-800 flex-shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-neutral-500 font-bold">
                              #{sol.id}
                            </span>
                            <select
                              value={sol.sistema_operacional || 'ambos'}
                              onChange={(e) =>
                                salvarSolucao(sol.id, 'sistema_operacional', e.target.value)
                              }
                              className="bg-black border border-neutral-800 rounded-lg px-2 py-0.5 text-[10px] font-mono font-bold text-[#DFCA95]"
                            >
                              <option value="ambos">🪟 + 🍎 WIN & MAC</option>
                              <option value="windows">🪟 APENAS WINDOWS</option>
                              <option value="mac">🍎 APENAS MACOS</option>
                            </select>

                            {/* Indicadores Visuais de Vídeo e Som */}
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                meta.tem_video && meta.video_url
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                              }`}
                            >
                              🎬 Vídeo: {meta.tem_video && meta.video_url ? 'ATIVO' : 'OCULTO'}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                                meta.tem_audio && meta.audio_url
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : 'bg-neutral-900 text-neutral-500 border border-neutral-800'
                              }`}
                            >
                              🔊 Som: {meta.tem_audio && meta.audio_url ? 'ATIVO' : 'OCULTO'}
                            </span>
                          </div>

                          <input
                            type="text"
                            defaultValue={sol.nome}
                            onBlur={(e) =>
                              sol.nome !== e.target.value &&
                              salvarSolucao(sol.id, 'nome', e.target.value)
                            }
                            className="w-full bg-transparent text-white font-heading font-black text-sm sm:text-base uppercase outline-none border-b border-transparent focus:border-[#C5A059]"
                          />
                        </div>
                      </div>

                      {/* Bloco Central: Edição Facilitada de Preços (Estilo Planilha + Botões de 1 Clique) */}
                      <div className="flex flex-wrap items-center gap-3 bg-[#090B0E] p-3 rounded-2xl border border-neutral-800/90">
                        <div>
                          <label className="block text-[9px] font-mono text-neutral-500 uppercase">
                            PREÇO DE VENDA (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            key={`promo_${sol.id}_${precoVendaAtual}`}
                            defaultValue={precoVendaAtual}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val > 0 && val !== precoVendaAtual) {
                                salvarPrecoRapido(sol.id, val);
                              }
                            }}
                            className="w-24 bg-[#12161F] border border-[#C5A059]/40 rounded-lg px-2.5 py-1.5 text-sm font-mono font-black text-emerald-400 outline-none focus:border-emerald-400"
                          />
                        </div>

                        <div>
                          <label className="block text-[9px] font-mono text-neutral-500 uppercase">
                            PREÇO ANTIGO (ANCORAGEM)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            key={`base_${sol.id}_${precoBaseAtual}`}
                            defaultValue={precoBaseAtual}
                            onBlur={(e) => {
                              const val = Number(e.target.value);
                              if (val > 0 && val !== precoBaseAtual) {
                                salvarSolucao(sol.id, 'preco', val);
                              }
                            }}
                            className="w-24 bg-[#12161F] border border-neutral-800 rounded-lg px-2.5 py-1.5 text-xs font-mono text-neutral-400 outline-none focus:border-[#C5A059]"
                          />
                        </div>

                        {/* Atalhos de Preço Estratégico em 1 Clique */}
                        <div className="flex flex-col gap-1">
                          <span className="text-[8px] font-mono text-neutral-500 uppercase">
                            PREÇO RÁPIDO (1-CLICK):
                          </span>
                          <div className="flex items-center gap-1">
                            {[27, 37, 47, 67, 97].map((preset) => (
                              <button
                                key={preset}
                                type="button"
                                onClick={() => salvarPrecoRapido(sol.id, preset, preset * 2)}
                                className={`px-2 py-1 rounded text-[10px] font-mono font-bold cursor-pointer transition-colors ${
                                  Math.round(precoVendaAtual) === preset
                                    ? 'bg-[#C5A059] text-black'
                                    : 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                                }`}
                              >
                                R${preset}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bloco Direito: Visibilidade, Order Bump & Botão de Mídias */}
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => salvarSolucao(sol.id, 'visivel', sol.visivel === false)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-mono font-bold uppercase border flex items-center gap-1.5 cursor-pointer ${
                            sol.visivel !== false
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }`}
                        >
                          {sol.visivel !== false ? (
                            <>
                              <Eye className="w-3.5 h-3.5" /> Visível
                            </>
                          ) : (
                            <>
                              <EyeOff className="w-3.5 h-3.5" /> Oculto
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => salvarSolucao(sol.id, 'is_orderbump', !sol.is_orderbump)}
                          className={`px-3 py-2 rounded-xl text-[10px] font-mono font-bold uppercase border cursor-pointer ${
                            sol.is_orderbump
                              ? 'bg-amber-500/20 text-[#DFCA95] border-amber-500/40'
                              : 'bg-neutral-900 text-neutral-500 border-neutral-800'
                          }`}
                        >
                          {sol.is_orderbump ? '🚀 Order Bump: SIM' : 'Order Bump: NÃO'}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            setExpandedProductId(isExpanded ? null : sol.id)
                          }
                          className={`px-3.5 py-2 rounded-xl text-[10px] font-mono font-black uppercase flex items-center gap-1.5 cursor-pointer transition-all ${
                            isExpanded
                              ? 'bg-[#F4F1EA] text-black'
                              : 'bg-[#181E2C] hover:bg-neutral-800 text-[#DFCA95] border border-[#C5A059]/40'
                          }`}
                        >
                          <Video className="w-3.5 h-3.5" />
                          <span>Mídias & Detalhes</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Gaveta Expansível de Mídias (Fotos, Vídeo, Som, Descrição DSC e Link de Entrega) */}
                    {isExpanded && (
                      <div className="p-5 sm:p-6 bg-[#0A0D13] border-t border-neutral-800 space-y-6 animate-in fade-in duration-150">
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                          {/* CARD 1: FOTOS (CAPA + GALERIA) */}
                          <div className="p-4 rounded-2xl bg-[#111621] border border-neutral-800 space-y-4">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-mono font-bold text-[#DFCA95] uppercase flex items-center gap-2">
                                <Image className="w-4 h-4 text-[#C5A059]" /> 1. Fotos do Produto
                              </span>
                            </div>

                            <div className="space-y-2">
                              <label className="block text-[10px] font-mono text-neutral-400 uppercase">
                                URL da Imagem Principal (Capa):
                              </label>
                              <input
                                type="text"
                                defaultValue={capaAtual}
                                onBlur={(e) =>
                                  e.target.value && salvarSolucao(sol.id, 'imagem', e.target.value)
                                }
                                className="w-full bg-black border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white"
                              />

                              <label className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 text-xs font-mono font-bold text-[#DFCA95] flex items-center justify-center gap-2 cursor-pointer">
                                {uploadingMediaKey === `img_${sol.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                <span>SUBIR FOTO DO COMPUTADOR</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingMediaKey(`img_${sol.id}`);
                                    const url = await uploadArquivoStorage(file, `prod_${sol.id}_capa`);
                                    setUploadingMediaKey(null);
                                    if (url) salvarSolucao(sol.id, 'imagem', url);
                                  }}
                                />
                              </label>
                            </div>

                            {/* Galeria Extra */}
                            <div className="space-y-2 pt-2 border-t border-neutral-800">
                              <span className="block text-[10px] font-mono text-neutral-400 uppercase">
                                Fotos Extras da Galeria ({Array.isArray(sol.galeria) ? sol.galeria.length : 0}):
                              </span>
                              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                                {(Array.isArray(sol.galeria) ? sol.galeria : []).map(
                                  (gUrl: string, gIdx: number) => (
                                    <div key={gIdx} className="relative w-14 h-14 rounded-lg overflow-hidden border border-neutral-700 flex-shrink-0 group">
                                      <img src={gUrl} alt="" className="w-full h-full object-cover" />
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const nova = (sol.galeria || []).filter(
                                            (_: any, idx: number) => idx !== gIdx
                                          );
                                          salvarSolucao(sol.id, 'galeria', nova);
                                        }}
                                        className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center text-red-400 cursor-pointer"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  )
                                )}
                              </div>

                              <label className="w-full py-2 px-3 rounded-xl bg-black hover:bg-neutral-900 border border-neutral-800 text-[10px] font-mono font-bold text-neutral-300 flex items-center justify-center gap-1.5 cursor-pointer">
                                <Plus className="w-3.5 h-3.5" />
                                <span>Adicionar Fotos na Galeria</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={async (e) => {
                                    const files = Array.from(e.target.files || []);
                                    if (files.length === 0) return;
                                    setUploadingMediaKey(`gal_${sol.id}`);
                                    const novasUrls: string[] = [];
                                    for (const f of files) {
                                      const u = await uploadArquivoStorage(f, `prod_${sol.id}_gal`);
                                      if (u) novasUrls.push(u);
                                    }
                                    setUploadingMediaKey(null);
                                    if (novasUrls.length > 0) {
                                      const atual = Array.isArray(sol.galeria) ? sol.galeria : [];
                                      salvarSolucao(sol.id, 'galeria', [...atual, ...novasUrls]);
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* CARD 2: VÍDEO / REVIEW (COM SELETOR SIM/NÃO) */}
                          <div className="p-4 rounded-2xl bg-[#111621] border border-neutral-800 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold text-[#DFCA95] uppercase flex items-center gap-2">
                                <Video className="w-4 h-4 text-[#C5A059]" /> 2. Vídeo / Review
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateProductMedia(sol.id, {
                                    tem_video: !meta.tem_video,
                                    video_url: meta.video_url,
                                  })
                                }
                                className={`px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase cursor-pointer transition-all ${
                                  meta.tem_video
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {meta.tem_video ? '✓ VÍDEO DISPONÍVEL: SIM' : 'VÍDEO DISPONÍVEL: NÃO'}
                              </button>
                            </div>

                            <p className="text-[11px] text-neutral-400 leading-snug">
                              {meta.tem_video
                                ? '🟢 A aba de Vídeo aparecerá na página deste produto.'
                                : '⚪ Vídeo desativado: a aba de Vídeo NÃO aparecerá na área de exibição deste produto.'}
                            </p>

                            <div className="space-y-2">
                              <label className="block text-[10px] font-mono text-neutral-400 uppercase">
                                Link do Vídeo (YouTube, Vimeo ou MP4 direto):
                              </label>
                              <input
                                type="text"
                                defaultValue={meta.video_url}
                                placeholder="https://www.youtube.com/watch?v=..."
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  handleUpdateProductMedia(sol.id, {
                                    video_url: val,
                                    tem_video: val.length > 0 ? true : meta.tem_video,
                                  });
                                }}
                                className="w-full bg-black border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white"
                              />

                              <label className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 text-xs font-mono font-bold text-[#DFCA95] flex items-center justify-center gap-2 cursor-pointer">
                                {uploadingMediaKey === `vid_${sol.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                <span>SUBIR ARQUIVO DE VÍDEO (.MP4)</span>
                                <input
                                  type="file"
                                  accept="video/mp4,video/webm,video/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingMediaKey(`vid_${sol.id}`);
                                    const url = await uploadArquivoStorage(file, `prod_${sol.id}_video`);
                                    setUploadingMediaKey(null);
                                    if (url) {
                                      handleUpdateProductMedia(sol.id, {
                                        tem_video: true,
                                        video_url: url,
                                      });
                                    }
                                  }}
                                />
                              </label>
                            </div>
                          </div>

                          {/* CARD 3: SOM / PREVIEW DSP (COM SELETOR SIM/NÃO) */}
                          <div className="p-4 rounded-2xl bg-[#111621] border border-neutral-800 space-y-4">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-mono font-bold text-[#DFCA95] uppercase flex items-center gap-2">
                                <Radio className="w-4 h-4 text-[#C5A059]" /> 3. Amostra de Som (Áudio)
                              </span>

                              <button
                                type="button"
                                onClick={() =>
                                  handleUpdateProductMedia(sol.id, {
                                    tem_audio: !meta.tem_audio,
                                    audio_url: meta.audio_url,
                                  })
                                }
                                className={`px-3 py-1 rounded-full text-[10px] font-mono font-black uppercase cursor-pointer transition-all ${
                                  meta.tem_audio
                                    ? 'bg-emerald-500 text-black'
                                    : 'bg-neutral-800 text-neutral-400'
                                }`}
                              >
                                {meta.tem_audio ? '✓ SOM DISPONÍVEL: SIM' : 'SOM DISPONÍVEL: NÃO'}
                              </button>
                            </div>

                            <p className="text-[11px] text-neutral-400 leading-snug">
                              {meta.tem_audio
                                ? '🟢 O player de Preview de Som aparecerá na página deste produto.'
                                : '⚪ Som desativado: a aba de Som NÃO aparecerá na área de exibição deste produto.'}
                            </p>

                            <div className="space-y-2">
                              <label className="block text-[10px] font-mono text-neutral-400 uppercase">
                                URL do Áudio (.MP3 / .WAV):
                              </label>
                              <input
                                type="text"
                                defaultValue={meta.audio_url}
                                placeholder="https://.../sample.mp3"
                                onBlur={(e) => {
                                  const val = e.target.value.trim();
                                  handleUpdateProductMedia(sol.id, {
                                    audio_url: val,
                                    tem_audio: val.length > 0 ? true : meta.tem_audio,
                                  });
                                }}
                                className="w-full bg-black border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white"
                              />

                              <label className="w-full py-2.5 px-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-dashed border-neutral-700 text-xs font-mono font-bold text-[#DFCA95] flex items-center justify-center gap-2 cursor-pointer">
                                {uploadingMediaKey === `aud_${sol.id}` ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Upload className="w-4 h-4" />
                                )}
                                <span>SUBIR ARQUIVO DE SOM (.MP3 / .WAV)</span>
                                <input
                                  type="file"
                                  accept="audio/*"
                                  className="hidden"
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setUploadingMediaKey(`aud_${sol.id}`);
                                    const url = await uploadArquivoStorage(file, `prod_${sol.id}_audio`);
                                    setUploadingMediaKey(null);
                                    if (url) {
                                      handleUpdateProductMedia(sol.id, {
                                        tem_audio: true,
                                        audio_url: url,
                                      });
                                    }
                                  }}
                                />
                              </label>

                              {meta.audio_url && (
                                <audio
                                  src={meta.audio_url}
                                  controls
                                  className="w-full h-8 mt-2"
                                />
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Linha Inferior da Gaveta: Descrição DSC + Link de Entrega + Deletar */}
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 pt-4 border-t border-neutral-800">
                          <div className="md:col-span-5">
                            <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                              Link de Entrega / Download Automático (Google Drive, Mega, etc.):
                            </label>
                            <input
                              type="text"
                              defaultValue={sol.link_entrega || ''}
                              placeholder="Cole o link de download que será liberado após o PIX..."
                              onBlur={(e) =>
                                sol.link_entrega !== e.target.value &&
                                salvarSolucao(sol.id, 'link_entrega', e.target.value)
                              }
                              className="w-full bg-black border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-emerald-300"
                            />
                          </div>

                          <div className="md:col-span-5">
                            <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                              Descrição Técnica (DSC exibida no Produto e no Checkout):
                            </label>
                            <input
                              type="text"
                              defaultValue={sol.descricao || boxFallback?.desc || ''}
                              onBlur={(e) =>
                                sol.descricao !== e.target.value &&
                                salvarSolucao(sol.id, 'descricao', e.target.value)
                              }
                              className="w-full bg-black border border-neutral-800 rounded-xl p-2.5 text-xs font-mono text-white"
                            />
                          </div>

                          <div className="md:col-span-2 flex items-end justify-end">
                            <button
                              type="button"
                              onClick={async () => {
                                if (confirm(`Deseja realmente excluir ${sol.nome}?`)) {
                                  const { error } = await supabase
                                    .from('solutions')
                                    .delete()
                                    .eq('id', sol.id);
                                  if (!error) {
                                    notificarSucesso('✅ Produto removido!');
                                    carregarSolucoes();
                                  }
                                }
                              }}
                              className="w-full py-2.5 px-3 rounded-xl bg-red-950/30 hover:bg-red-900/50 border border-red-800/40 text-red-300 font-mono text-[10px] font-bold uppercase cursor-pointer"
                            >
                              Excluir Produto
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 3: GESTÃO DE PEDIDOS & LIBERAÇÕES (CRM + RETORNO ZUCRO)
           =================================================================== */}
        {activeTab === 'pedidos' && (
          <div className="space-y-6 animate-in fade-in duration-200">
            <div className="bg-[#0F131C] border border-neutral-800 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                {(['todos', 'pago', 'pendente'] as const).map((f) => (
                  <button
                    key={f}
                    onClick={() => setPedidosFilter(f)}
                    className={`px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase cursor-pointer ${
                      pedidosFilter === f
                        ? 'bg-[#C5A059] text-black'
                        : 'bg-black text-neutral-400 border border-neutral-800'
                    }`}
                  >
                    {f === 'todos' && `Todos (${pedidosLista.length})`}
                    {f === 'pago' && `Pagos & Liberados (${metrics.totalPagos})`}
                    {f === 'pendente' && `Aguardando PIX (${metrics.totalPendentes})`}
                  </button>
                ))}
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={buscaPedido}
                  onChange={(e) => setBuscaPedido(e.target.value)}
                  placeholder="Buscar por e-mail ou ID..."
                  className="bg-black border border-neutral-800 rounded-xl pl-9 pr-4 py-2 text-xs font-mono text-white outline-none focus:border-[#C5A059]"
                />
              </div>
            </div>

            <div className="bg-[#0F131C] border border-neutral-800 rounded-3xl overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-neutral-800 bg-[#121722] text-[10px] font-mono text-neutral-400 uppercase tracking-widest">
                    <th className="p-4">PEDIDO / DATA</th>
                    <th className="p-4">CLIENTE</th>
                    <th className="p-4">MÓDULOS / SISTEMA</th>
                    <th className="p-4">ORIGEM / CUPOM</th>
                    <th className="p-4">VALOR</th>
                    <th className="p-4">STATUS ZUCRO</th>
                    <th className="p-4 text-center">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80 text-xs font-mono">
                  {pedidosFiltrados.map((ped) => {
                    const isPago =
                      ped.status === 'pago' ||
                      ped.status === 'aprovado' ||
                      ped.status === 'liberado';
                    const itens = Array.isArray(ped.detalhe_valores) ? ped.detalhe_valores : [];
                    const nomes = itens.map((i: any) => i.nome).filter(Boolean).join(', ');
                    const atrib = itens[0]?.atribuicao;

                    return (
                      <tr key={ped.id} className="hover:bg-[#141A26]">
                        <td className="p-4">
                          <span className="font-bold text-white block">
                            #{String(ped.id || '').substring(0, 8)}
                          </span>
                          <span className="text-[10px] text-neutral-500">
                            {ped.created_at
                              ? new Date(ped.created_at).toLocaleString('pt-BR')
                              : ''}
                          </span>
                        </td>
                        <td className="p-4 text-neutral-200">{ped.email_cliente || '—'}</td>
                        <td className="p-4 max-w-xs">
                          <span className="text-neutral-300 line-clamp-1">
                            {nomes || `${(ped.produto_ids || []).length} item(ns)`}
                          </span>
                          <span className="text-[10px] text-[#DFCA95] block">
                            Sistema: {atrib?.sistema_cliente === 'mac' ? 'macOS' : 'Windows'}
                          </span>
                        </td>
                        <td className="p-4">
                          <span className="text-neutral-300 uppercase block">
                            {atrib?.utm_source || ped.email_cliente_referencia || 'Direto'}
                          </span>
                          {ped.cupom_aplicado && ped.cupom_aplicado !== 'NENHUM' && (
                            <span className="text-[10px] text-emerald-400">
                              Cupom: {ped.cupom_aplicado}
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-bold text-white">
                          {formatMoney(ped.valor_total || 0)}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                              isPago
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {isPago ? '✓ PAGO & LIBERADO' : '⏳ PENDENTE PIX'}
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          {!isPago ? (
                            <button
                              onClick={() => handleAlterarStatusPedido(ped.id, 'pago')}
                              disabled={atualizandoPedidoId === ped.id}
                              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold uppercase cursor-pointer"
                            >
                              {atualizandoPedidoId === ped.id ? '...' : 'Aprovar e Liberar'}
                            </button>
                          ) : (
                            <span className="text-[10px] text-emerald-400 font-bold uppercase">
                              ✓ Entregue no Site
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 4: TRÁFEGO, PIXELS & INTEGRAÇÕES (PRÉ-MOLDADO PARA INSTAGRAM, YOUTUBE & ADS)
           =================================================================== */}
        {activeTab === 'integracoes' && (
          <div className="space-y-8 animate-in fade-in duration-200">
            {/* 1. Links Rastreáveis Prontos para Instagram e YouTube (Para usar agora mesmo!) */}
            <div className="bg-[#0F131C] border border-[#C5A059]/40 rounded-3xl p-6 space-y-5">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-[#C5A059] block">
                  🚀 PRONTO PARA USO IMEDIATO NO ORGÂNICO E TRÁFEGO DIRETO
                </span>
                <h3 className="text-lg font-heading font-black text-white uppercase">
                  LINKS RASTREÁVEIS PARA SEU INSTAGRAM E YOUTUBE
                </h3>
                <p className="text-xs text-neutral-400 mt-1">
                  Copie e coloque esses links na Bio do seu Instagram ou na descrição dos vídeos do YouTube. O painel identificará automaticamente cada venda que vier deles!
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    key: 'insta_bio',
                    title: '📸 Link para a BIO do Instagram',
                    url: `${siteOrigin}/?utm_source=instagram&utm_medium=bio`,
                  },
                  {
                    key: 'insta_stories',
                    title: '📲 Link para STORIES / Direct do Instagram',
                    url: `${siteOrigin}/?utm_source=instagram&utm_medium=stories`,
                  },
                  {
                    key: 'yt_desc',
                    title: '▶️ Link para Descrição de Vídeos do YouTube',
                    url: `${siteOrigin}/?utm_source=youtube&utm_medium=video`,
                  },
                  {
                    key: 'ads_campaign',
                    title: '🎯 Link Padrão para Campanhas de Tráfego Pago (Ads)',
                    url: `${siteOrigin}/?utm_source=meta_ads&utm_medium=cpc&utm_campaign=escala`,
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-2xl bg-[#141A26] border border-neutral-800 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <span className="text-xs font-mono font-bold text-[#DFCA95] block">
                        {item.title}
                      </span>
                      <span className="text-[11px] font-mono text-neutral-400 truncate block mt-0.5">
                        {item.url}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(item.url);
                        setCopiedLinkKey(item.key);
                        setTimeout(() => setCopiedLinkKey(null), 2500);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#C5A059] hover:bg-[#DFCA95] text-black font-mono text-[10px] font-black uppercase flex items-center gap-1.5 flex-shrink-0 cursor-pointer"
                    >
                      {copiedLinkKey === item.key ? (
                        <>
                          <Check className="w-3.5 h-3.5" /> Copiado
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" /> Copiar
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* 2. Estrutura Pré-Moldada de Pixels e APIs de Tráfego (Meta Ads, Google Ads, TikTok) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Card Meta Ads (Facebook & Instagram) */}
              <div className="bg-[#0F131C] border border-neutral-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#C5A059] uppercase font-bold block">
                      ESTRUTURA PRÉ-MOLDADA • TRÁFEGO PAGO
                    </span>
                    <h4 className="text-base font-heading font-black text-white uppercase">
                      META ADS (FACEBOOK & INSTAGRAM PIXEL + CAPI)
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = await saveAdsConfigToSupabase({
                        metaEnabled: !adsConfig.metaEnabled,
                      });
                      setAdsConfig(updated);
                      notificarSucesso(
                        updated.metaEnabled
                          ? '✅ Rastreamento Meta Ads Ativado!'
                          : '⚪ Rastreamento Meta Ads Pausado.'
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-black uppercase cursor-pointer ${
                      adsConfig.metaEnabled
                        ? 'bg-emerald-500 text-black'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {adsConfig.metaEnabled ? '● ATIVO' : '○ DESATIVADO (USAR DEPOIS)'}
                  </button>
                </div>

                <p className="text-xs text-neutral-400">
                  Quando você decidir subir campanhas no Gerenciador de Anúncios, basta colar o ID do Pixel abaixo e ativar a chave acima. Os eventos de <em>ViewContent, AddToCart, InitiateCheckout e Purchase</em> já estão programados!
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                      ID do Pixel da Meta (Ex: 123456789012345):
                    </label>
                    <input
                      type="text"
                      value={adsConfig.metaPixelId}
                      onChange={(e) =>
                        setAdsConfig((prev) => ({ ...prev, metaPixelId: e.target.value }))
                      }
                      placeholder="Cole aqui quando for rodar anúncios..."
                      className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                      Token da API de Conversões (Meta CAPI — Opcional):
                    </label>
                    <input
                      type="password"
                      value={adsConfig.metaCapiToken}
                      onChange={(e) =>
                        setAdsConfig((prev) => ({ ...prev, metaCapiToken: e.target.value }))
                      }
                      placeholder="EAA..."
                      className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Card Google Ads / YouTube Ads */}
              <div className="bg-[#0F131C] border border-neutral-800 rounded-3xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[10px] font-mono text-[#C5A059] uppercase font-bold block">
                      ESTRUTURA PRÉ-MOLDADA • GOOGLE & YOUTUBE
                    </span>
                    <h4 className="text-base font-heading font-black text-white uppercase">
                      GOOGLE ADS & YOUTUBE ADS TAG
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const updated = await saveAdsConfigToSupabase({
                        googleEnabled: !adsConfig.googleEnabled,
                      });
                      setAdsConfig(updated);
                      notificarSucesso(
                        updated.googleEnabled
                          ? '✅ Rastreamento Google/YouTube Ativado!'
                          : '⚪ Rastreamento Google/YouTube Pausado.'
                      );
                    }}
                    className={`px-3 py-1.5 rounded-full text-[10px] font-mono font-black uppercase cursor-pointer ${
                      adsConfig.googleEnabled
                        ? 'bg-emerald-500 text-black'
                        : 'bg-neutral-800 text-neutral-400'
                    }`}
                  >
                    {adsConfig.googleEnabled ? '● ATIVO' : '○ DESATIVADO (USAR DEPOIS)'}
                  </button>
                </div>

                <p className="text-xs text-neutral-400">
                  Estrutura pronta para Google Ads e YouTube Ads. Basta inserir seu ID de Conversão quando iniciar o tráfego pago.
                </p>

                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                      Google Ads Conversion ID (Ex: AW-123456789):
                    </label>
                    <input
                      type="text"
                      value={adsConfig.googleAdsId}
                      onChange={(e) =>
                        setAdsConfig((prev) => ({ ...prev, googleAdsId: e.target.value }))
                      }
                      placeholder="AW-..."
                      className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                      Rótulo de Conversão (Conversion Label — Opcional):
                    </label>
                    <input
                      type="text"
                      value={adsConfig.googleConversionLabel}
                      onChange={(e) =>
                        setAdsConfig((prev) => ({
                          ...prev,
                          googleConversionLabel: e.target.value,
                        }))
                      }
                      placeholder="AbCdEfGhIjKlMnOp..."
                      className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Canais Oficiais (Instagram, YouTube, WhatsApp) & Webhook da Zucro */}
            <div className="bg-[#0F131C] border border-neutral-800 rounded-3xl p-6 space-y-5">
              <h4 className="text-base font-heading font-black text-white uppercase flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#C5A059]" />
                CANAIS OFICIAIS & RETORNO DE WEBHOOK ZUCRO
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                    URL do Instagram Oficial:
                  </label>
                  <input
                    type="text"
                    value={adsConfig.instagramUrl}
                    onChange={(e) =>
                      setAdsConfig((prev) => ({ ...prev, instagramUrl: e.target.value }))
                    }
                    placeholder="https://instagram.com/..."
                    className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                    URL do Canal do YouTube:
                  </label>
                  <input
                    type="text"
                    value={adsConfig.youtubeUrl}
                    onChange={(e) =>
                      setAdsConfig((prev) => ({ ...prev, youtubeUrl: e.target.value }))
                    }
                    placeholder="https://youtube.com/..."
                    className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-mono text-neutral-400 uppercase mb-1">
                    WhatsApp de Suporte:
                  </label>
                  <input
                    type="text"
                    value={adsConfig.whatsappNumero}
                    onChange={(e) =>
                      setAdsConfig((prev) => ({ ...prev, whatsappNumero: e.target.value }))
                    }
                    placeholder="5591980694387"
                    className="w-full bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                  />
                </div>
              </div>

              {/* Endpoint do Webhook da Zucro */}
              <div className="p-4 rounded-2xl bg-[#141A26] border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="min-w-0">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase block">
                    ⚡ URL DE WEBHOOK ZUCRO (RETORNO AUTOMÁTICO DE PAGAMENTO APROVADO):
                  </span>
                  <span className="text-xs font-mono text-neutral-300 break-all">{webhookUrl}</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(webhookUrl);
                    notificarSucesso('✅ URL do Webhook copiada!');
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-[10px] font-black uppercase flex-shrink-0 cursor-pointer"
                >
                  Copiar URL Webhook
                </button>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await saveAdsConfigToSupabase(adsConfig);
                  if (adsConfig.whatsappNumero) {
                    CONFIG_GLOBAL.whatsappNumero = adsConfig.whatsappNumero;
                    localStorage.setItem('ARSENAL_WHATSAPP', adsConfig.whatsappNumero);
                    localStorage.setItem('ALCATEIA_WHATSAPP', adsConfig.whatsappNumero);
                    await supabase
                      .from('configuracoes')
                      .upsert(
                        [
                          { chave: 'ARSENAL_WHATSAPP', valor: adsConfig.whatsappNumero },
                          { chave: 'ALCATEIA_WHATSAPP', valor: adsConfig.whatsappNumero },
                        ],
                        { onConflict: 'chave' }
                      );
                  }
                  notificarSucesso('✅ Configurações de Integrações & Tráfego salvas no Supabase!');
                }}
                className="w-full py-4 rounded-xl bg-gradient-to-r from-[#DFCA95] via-[#C5A059] to-[#DFCA95] text-black font-mono font-black text-xs uppercase tracking-widest hover:brightness-110 cursor-pointer shadow-lg"
              >
                [ SALVAR TODAS AS CONFIGURAÇÕES DE TRÁFEGO E INTEGRAÇÕES ]
              </button>
            </div>
          </div>
        )}

        {/* ===================================================================
            ABA 5: CUPONS DE DESCONTO & PROVA SOCIAL (PRINTS WHATSAPP)
           =================================================================== */}
        {activeTab === 'coupons' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in duration-200">
            {/* Gestão de Cupons */}
            <div className="bg-[#0F131C] border border-neutral-800 rounded-3xl p-6 space-y-6">
              <h3 className="text-base font-heading font-black text-white uppercase">
                🎟️ GERENCIAR CUPONS DE DESCONTO
              </h3>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const formData = new FormData(form);
                  const codigo = ((formData.get('codigo') as string) || '').trim().toUpperCase();
                  const desconto = parseFloat(formData.get('desconto') as string) || 0;
                  if (!codigo || desconto <= 0) return;

                  const { error } = await supabase.from('cupons').insert([
                    {
                      codigo,
                      desconto_percentual: desconto / 100,
                    },
                  ]);
                  if (!error) {
                    notificarSucesso(`✅ Cupom ${codigo} criado!`);
                    form.reset();
                    carregarDados();
                  } else {
                    alert('Erro: ' + error.message);
                  }
                }}
                className="flex flex-col sm:flex-row gap-3"
              >
                <input
                  type="text"
                  name="codigo"
                  placeholder="CÓDIGO (EX: INSTA15)"
                  className="flex-1 bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white uppercase"
                  required
                />
                <input
                  type="number"
                  step="1"
                  name="desconto"
                  placeholder="% OFF (Ex: 15)"
                  className="w-32 bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                  required
                />
                <button
                  type="submit"
                  className="px-5 py-3 rounded-xl bg-[#C5A059] text-black font-mono text-xs font-black uppercase cursor-pointer"
                >
                  + Criar
                </button>
              </form>

              <div className="space-y-2.5">
                {cupons.map((cp) => (
                  <div
                    key={cp.id}
                    className="p-3.5 rounded-2xl bg-[#141A26] border border-neutral-800 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-mono font-black text-white text-sm uppercase">
                        {cp.codigo}
                      </span>
                      <span className="ml-3 px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 font-mono text-xs font-bold">
                        {(cp.desconto_percentual * 100).toFixed(0)}% OFF
                      </span>
                    </div>
                    <button
                      onClick={async () => {
                        await supabase.from('cupons').delete().eq('id', cp.id);
                        notificarSucesso('✅ Cupom removido!');
                        carregarDados();
                      }}
                      className="text-red-400 hover:text-red-300 font-mono text-xs font-bold uppercase cursor-pointer"
                    >
                      Excluir
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Gestão de Feedbacks / Prova Social */}
            <div className="bg-[#0F131C] border border-neutral-800 rounded-3xl p-6 space-y-6">
              <h3 className="text-base font-heading font-black text-white uppercase">
                📸 PRINTS DE PROVA SOCIAL (DEPOIMENTOS)
              </h3>

              <div className="space-y-3">
                <label className="w-full py-3.5 px-4 rounded-2xl bg-[#141A26] hover:bg-neutral-800 border-2 border-dashed border-[#C5A059]/40 text-xs font-mono font-bold text-[#DFCA95] flex items-center justify-center gap-2 cursor-pointer">
                  {isUploadingFeedback ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  <span>
                    {isUploadingFeedback ? 'ENVIANDO PRINT...' : 'SUBIR PRINT DO SEU COMPUTADOR'}
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleUploadFeedbackImage}
                    disabled={isUploadingFeedback}
                    className="hidden"
                  />
                </label>

                <form onSubmit={handleAdicionarFeedbackUrl} className="flex gap-2">
                  <input
                    type="url"
                    value={novoFeedbackUrl}
                    onChange={(e) => setNovoFeedbackUrl(e.target.value)}
                    placeholder="Ou cole a URL da imagem..."
                    className="flex-1 bg-black border border-neutral-800 rounded-xl p-3 text-xs font-mono text-white"
                  />
                  <button
                    type="submit"
                    className="px-4 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-white font-mono text-xs font-bold uppercase cursor-pointer"
                  >
                    Adicionar
                  </button>
                </form>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {feedbackImagens.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-2xl bg-[#141A26] border border-neutral-800 space-y-2"
                  >
                    <img
                      src={imgUrl}
                      alt={`Depoimento ${idx + 1}`}
                      className="w-full h-32 object-cover rounded-xl"
                    />
                    <button
                      onClick={() => handleRemoverFeedback(idx)}
                      className="w-full py-1 text-[10px] font-mono font-bold text-red-400 hover:text-red-300 uppercase cursor-pointer"
                    >
                      Remover
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
