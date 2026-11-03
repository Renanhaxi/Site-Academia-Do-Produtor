import React, { useState, useEffect } from 'react';
import { X, Settings, Phone, MessageSquare, Check, Save, Link, Upload, Plus, XCircle, Loader2, ClipboardList, CheckCircle2, Clock } from 'lucide-react';
import { CONFIG_GLOBAL, Produto, categoriasDisponiveis, produtos } from '../data/produtos';
import { Package, Trash, Edit2, Star, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../utils/supabaseClient';

interface AdminQuickEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
}

export const AdminQuickEditModal: React.FC<AdminQuickEditModalProps> = ({
  isOpen,
  onClose,
  accentColor
}) => {
  if (!isOpen) return null;

  const [numeroWhatsapp, setNumeroWhatsapp] = useState(() => {
    return localStorage.getItem('ALCATEIA_WHATSAPP') || CONFIG_GLOBAL.whatsappNumero;
  });

  const [mensagemSaudacao, setMensagemSaudacao] = useState(() => {
    return localStorage.getItem('ALCATEIA_MSG') || CONFIG_GLOBAL.mensagemPadrao;
  });

  const [bannerImg, setBannerImg] = useState(() => {
    return localStorage.getItem('ALCATEIA_BANNER_IMG') || CONFIG_GLOBAL.bannerImagemUrl || '';
  });

  const [bannerLink, setBannerLink] = useState(() => {
    return localStorage.getItem('ALCATEIA_BANNER_LINK') || CONFIG_GLOBAL.bannerLinkUrl || '';
  });

  const [isUploadingBanner, setIsUploadingBanner] = useState(false);
  
  const [feedbackImagens, setFeedbackImagens] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('ALCATEIA_FEEDBACKS');
      return stored ? JSON.parse(stored) : (CONFIG_GLOBAL.feedbackImagens || []);
    } catch {
      return CONFIG_GLOBAL.feedbackImagens || [];
    }
  });
  const [novoFeedbackUrl, setNovoFeedbackUrl] = useState('');
  const [isUploadingFeedback, setIsUploadingFeedback] = useState(false);

  const [salvo, setSalvo] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState<'config' | 'produtos' | 'pedidos' | 'cupons'>('config');

  const [listaProdutos, setListaProdutos] = useState<Produto[]>([]);
  const [listaCupons, setListaCupons] = useState<any[]>([]);

  // Estados do cadastro de cupons
  const [codigoCupom, setCodigoCupom] = useState('');
  const [descontoCupom, setDescontoCupom] = useState('');

  const carregarCupons = async () => {
    try {
      const { data, error } = await supabase.from('cupons').select('*').order('id', { ascending: true });
      if (data && !error) setListaCupons(data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSalvarCupom = async (e: React.FormEvent) => {
    e.preventDefault();
    const cod = codigoCupom.trim().toUpperCase();
    const desc = parseFloat(descontoCupom) || 0;
    if (!cod || desc <= 0) return;

    try {
      const { error } = await supabase.from('cupons').insert([{
        codigo: cod,
        desconto_percentual: desc / 100
      }]);

      if (error) throw error;
      alert(`Cupom ${cod} cadastrado com sucesso!`);
      setCodigoCupom('');
      setDescontoCupom('');
      carregarCupons();
    } catch (err: any) {
      alert("Erro ao cadastrar cupom: " + err.message);
    }
  };

  const handleDeletarCupom = async (id: number) => {
    if (confirm("Deseja remover este cupom?")) {
      try {
        const { error } = await supabase.from('cupons').delete().eq('id', id);
        if (error) throw error;
        carregarCupons();
      } catch (err: any) {
        alert("Erro ao deletar cupom: " + err.message);
      }
    }
  };

  interface Pedido { id: string; status: string; valor_total: number; email_cliente?: string; produto_ids: number[]; created_at: string; }
  const [listaPedidos, setListaPedidos] = useState<Pedido[]>([]);
  const [loadingPedidos, setLoadingPedidos] = useState(false);
  const [aprovando, setAprovando] = useState<string | null>(null);

  const carregarPedidos = async () => {
    setLoadingPedidos(true);
    try {
      const { data, error } = await supabase.from('pedidos').select('*').order('created_at', { ascending: false }).limit(50);
      if (data && !error) setListaPedidos(data);
    } catch(e) { console.error('Erro pedidos:', e); } finally { setLoadingPedidos(false); }
  };

  const handleAprovarPedido = async (pedidoId: string) => {
    setAprovando(pedidoId);
    try {
      const { error } = await supabase.from('pedidos').update({ status: 'pago' }).eq('id', pedidoId);
      if (error) throw error;
      await carregarPedidos();
      alert('✅ Pedido aprovado! O cliente já recebeu os links de download.');
    } catch(e: any) { alert('Erro ao aprovar: ' + e.message); } finally { setAprovando(null); }
  };

  const carregarProdutosSupabase = async () => {
    try {
      const { data, error } = await supabase
        .from('solutions')
        .select('*')
        .order('id', { ascending: true });

      if (error) {
        console.error("Erro Supabase:", error);
        alert("Erro de conexão com o banco de dados Supabase: " + error.message);
        return;
      }

      if (data) {
        // SE O BANCO ESTIVER VAZIO, INSERIR OS PRODUTOS INICIAIS AUTOMATICAMENTE
        if (data.length === 0) {
          const produtosParaInserir = produtos.map(p => ({
            nome: p.nome,
            preco: parseFloat(p.preco.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            preco_promocional: parseFloat(p.preco.replace(/[^\d,]/g, '').replace(',', '.')) || 0,
            categoria: p.categoria,
            descricao: p.desc,
            imagem: p.imagem,
            galeria: p.galeria || [],
            estrelas: p.estrelas || 5.0
          }));
          
          await supabase.from('solutions').insert(produtosParaInserir);
          
          // Buscar novamente após inserir
          const { data: newData } = await supabase.from('solutions').select('*').order('id', { ascending: true });
          if (newData) {
            const formatMoney = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
            const mapped: Produto[] = newData.map((sol: any) => ({
              id: sol.id,
              nome: sol.nome || "Solução",
              preco: formatMoney(sol.preco_promocional || sol.preco || 0),
              precoAntigo: formatMoney(sol.preco || 0),
              imagem: sol.imagem || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
              desc: sol.descricao || "",
              categoria: sol.categoria || "Geral",
              estrelas: sol.estrelas || 5.0,
              galeria: sol.galeria || [],
              visivel: sol.visivel !== false
            }));
            setListaProdutos(mapped);
          }
          return;
        }

        const formatMoney = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
        const mapped: Produto[] = data.map((sol: any) => ({
          id: sol.id,
          nome: sol.nome || "Solução",
          preco: formatMoney(sol.preco_promocional || sol.preco || 0),
          precoAntigo: formatMoney(sol.preco || 0),
          imagem: sol.imagem || "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
          desc: sol.descricao || "",
          categoria: sol.categoria || "Geral",
          estrelas: sol.estrelas || 5.0,
          galeria: sol.galeria || [],
          visivel: sol.visivel !== false
        }));
        setListaProdutos(mapped);
      }
    } catch (err) {
      console.error("Erro ao carregar soluções no painel:", err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      carregarProdutosSupabase();
    }
  }, [isOpen]);

  const handleToggleVisibilidade = async (id: number, visivelAtual: boolean) => {
    try {
      const { error } = await supabase.from('solutions').update({ visivel: !visivelAtual }).eq('id', id);
      if (error) throw error;
      await carregarProdutosSupabase();
      window.dispatchEvent(new Event('produtosAtualizados'));
    } catch (err: any) {
      alert("Erro ao alterar visibilidade: " + err.message);
    }
  };

  // Estados do CRUD de Produtos
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nomeProduto, setNomeProduto] = useState('');
  const [precoProduto, setPrecoProduto] = useState('');
  const [categoriaProduto, setCategoriaProduto] = useState('DAWs (Softwares)');
  const [descProduto, setDescProduto] = useState('');
  const [imagemProduto, setImagemProduto] = useState('');
  const [galeriaProduto, setGaleriaProduto] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isOrderBump, setIsOrderBump] = useState(false);

  const limparFormulario = () => {
    setEditandoId(null);
    setNomeProduto('');
    setPrecoProduto('');
    setCategoriaProduto('DAWs (Softwares)');
    setDescProduto('');
    setImagemProduto('');
    setGaleriaProduto([]);
    setIsOrderBump(false);
  };

  const uploadImagem = async (file: File): Promise<string | null> => {
    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, file);

      if (uploadError) {
        throw uploadError;
      }

      const { data } = supabase.storage.from('produtos').getPublicUrl(fileName);
      return data.publicUrl;
    } catch (error: any) {
      alert("Erro ao fazer upload da imagem: " + error.message);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const handleUploadPrincipal = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const url = await uploadImagem(file);
    if (url) setImagemProduto(url);
  };

  const handleUploadGaleria = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const files = Array.from(e.target.files);
    
    // Upload de múltiplos arquivos
    for (const file of files) {
      const url = await uploadImagem(file);
      if (url) {
        setGaleriaProduto(prev => [...prev, url]);
      }
    }
  };

  const handleRemoverImagemGaleria = (index: number) => {
    setGaleriaProduto(prev => prev.filter((_, i) => i !== index));
  };

  const handleSalvarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nomeProduto || !precoProduto || !descProduto) return;

    // Parse preco
    const numPreco = parseFloat(precoProduto.replace(/[^\d,]/g, '').replace(',', '.')) || 0;

    const payload = {
      nome: nomeProduto,
      preco: numPreco,
      preco_promocional: numPreco,
      categoria: categoriaProduto,
      descricao: descProduto,
      imagem: imagemProduto || 'https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop',
      galeria: galeriaProduto,
      is_orderbump: isOrderBump
    };

    try {
      if (editandoId !== null) {
        const { error } = await supabase
          .from('solutions')
          .update(payload)
          .eq('id', editandoId);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('solutions')
          .insert([payload]);

        if (error) throw error;
      }

      // Dispara evento de atualização e recarrega
      window.dispatchEvent(new Event('produtosAtualizados'));
      carregarProdutosSupabase();
      limparFormulario();
    } catch (err: any) {
      alert("Erro ao salvar produto no Supabase: " + err.message);
    }
  };

  const handleEditarProduto = (p: Produto) => {
    setEditandoId(p.id);
    setNomeProduto(p.nome);
    setPrecoProduto(p.preco);
    setCategoriaProduto(p.categoria);
    setDescProduto(p.desc);
    setImagemProduto(p.imagem);
    setGaleriaProduto(p.galeria || []);
    
    // Busca link e orderbump se houver localmente na lista original
    setIsOrderBump(false);
    supabase.from('solutions').select('is_orderbump').eq('id', p.id).single().then(({ data }) => {
      if (data?.is_orderbump) setIsOrderBump(true);
    });
  };

  const handleRemoverProduto = async (id: number) => {
    if (confirm("Tem certeza que deseja deletar este produto do Supabase?")) {
      try {
        const { error } = await supabase
          .from('solutions')
          .delete()
          .eq('id', id);

        if (error) throw error;

        window.dispatchEvent(new Event('produtosAtualizados'));
        carregarProdutosSupabase();
      } catch (err: any) {
        alert("Erro ao remover produto: " + err.message);
      }
    }
  };

  const getAccentBg = () => {
    if (accentColor === 'scarlett' || accentColor === 'red') return 'bg-[#E52E2E] hover:bg-[#C61F1F]';
    if (accentColor === 'emerald') return 'bg-emerald-600 hover:bg-emerald-500';
    return 'bg-[#E52E2E] hover:bg-[#C61F1F]';
  };

  const getAccentText = () => {
    if (accentColor === 'scarlett' || accentColor === 'red') return 'text-[#E52E2E]';
    if (accentColor === 'emerald') return 'text-emerald-400';
    return 'text-[#E52E2E]';
  };

  const handleSalvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const whatsappSalvo = numeroWhatsapp.replace(/\D/g, '');
    localStorage.setItem('ALCATEIA_WHATSAPP', whatsappSalvo);
    localStorage.setItem('ALCATEIA_MSG', mensagemSaudacao);
    localStorage.setItem('ALCATEIA_BANNER_IMG', bannerImg);
    localStorage.setItem('ALCATEIA_BANNER_LINK', bannerLink);
    localStorage.setItem('ALCATEIA_FEEDBACKS', JSON.stringify(feedbackImagens));
    
    // Atualiza a constante em tempo de execução
    CONFIG_GLOBAL.whatsappNumero = whatsappSalvo;
    CONFIG_GLOBAL.mensagemPadrao = mensagemSaudacao;
    CONFIG_GLOBAL.bannerImagemUrl = bannerImg;
    CONFIG_GLOBAL.bannerLinkUrl = bannerLink;
    CONFIG_GLOBAL.feedbackImagens = feedbackImagens;

    // Dispara evento para atualizar o banner e depoimentos em tempo real no frontend
    window.dispatchEvent(new Event('configuracoesAtualizadas'));

    setSalvo(true);
    setTimeout(() => setSalvo(false), 2500);

    // Persistir globalmente no Supabase para todos os aparelhos
    try {
      const keys = [
        { chave: 'ALCATEIA_WHATSAPP', valor: whatsappSalvo },
        { chave: 'ALCATEIA_MSG', valor: mensagemSaudacao },
        { chave: 'ALCATEIA_BANNER_IMG', valor: bannerImg },
        { chave: 'ALCATEIA_BANNER_LINK', valor: bannerLink },
        { chave: 'ALCATEIA_FEEDBACKS', valor: JSON.stringify(feedbackImagens) }
      ];
      
      for (const item of keys) {
        await supabase.from('configuracoes').upsert(item, { onConflict: 'chave' });
      }
    } catch (err) {
      console.error("Erro ao sincronizar configurações no Supabase:", err);
    }
  };

  // Removido handleCopiarJSON e jsonExemplo

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-white/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-2xl bg-white border border-neutral-200 rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div className="p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-3">
            <div className={`p-3 rounded-2xl bg-white border border-neutral-200 text-black`}>
              <Settings className="w-6 h-6 animate-spin duration-3000" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-black font-heading">
                Configurações do Arsenal de Produtores
              </h3>
              <span className="text-xs text-neutral-500 font-medium">
                Edição em tempo real de WhatsApp & Dados
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2.5 rounded-full bg-white text-neutral-500 hover:text-black border border-neutral-200 transition-all hover:scale-105"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas de navegação */}
        <div className="flex border-b border-neutral-200 bg-neutral-50">
          <button onClick={() => setAbaAtiva('config')} className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${ abaAtiva === 'config' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black' }`}>
            <Settings className="w-3 h-3 inline mr-1" />Config
          </button>
          <button onClick={() => setAbaAtiva('produtos')} className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${ abaAtiva === 'produtos' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black' }`}>
            <Package className="w-3 h-3 inline mr-1" />Produtos
          </button>
          <button onClick={() => { setAbaAtiva('cupons'); carregarCupons(); }} className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${ abaAtiva === 'cupons' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black' }`}>
            <Settings className="w-3 h-3 inline mr-1" />Cupons
          </button>
          <button onClick={() => { setAbaAtiva('pedidos'); carregarPedidos(); }} className={`flex-1 py-3 text-xs font-mono font-bold uppercase tracking-widest transition-colors ${ abaAtiva === 'pedidos' ? 'text-black border-b-2 border-black' : 'text-neutral-500 hover:text-black' }`}>
            <ClipboardList className="w-3 h-3 inline mr-1" />Pedidos
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-8 flex-1 bg-white text-black">

          {/* ===== ABA CUPONS ===== */}
          {abaAtiva === 'cupons' && (
            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-6">
              <h4 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-black" />
                Gerenciar Cupons de Influencers / Parceiros
              </h4>

              <form onSubmit={handleSalvarCupom} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Código do Cupom</label>
                    <input 
                      type="text" 
                      value={codigoCupom} 
                      onChange={e => setCodigoCupom(e.target.value)} 
                      placeholder="EX: PARCEIRO15" 
                      required 
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-black focus:border-black outline-none uppercase font-mono" 
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Desconto (%)</label>
                    <input 
                      type="number" 
                      value={descontoCupom} 
                      onChange={e => setDescontoCupom(e.target.value)} 
                      placeholder="Ex: 15" 
                      required 
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-black focus:border-black outline-none font-mono" 
                    />
                  </div>
                </div>
                <button type="submit" className="w-full py-2.5 rounded-xl font-bold text-sm text-white bg-black hover:bg-neutral-850 transition-all shadow-md cursor-pointer uppercase tracking-wider">
                  Adicionar Cupom
                </button>
              </form>

              <div className="pt-4 border-t border-neutral-200">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-3">Cupons Cadastrados ({listaCupons.length})</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {listaCupons.map(cp => (
                    <div key={cp.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-black uppercase font-mono">{cp.codigo}</span>
                        <span className="text-xs text-neutral-500">{(cp.desconto_percentual * 100).toFixed(0)}% de Desconto Extra</span>
                      </div>
                      <button onClick={() => handleDeletarCupom(cp.id)} className="p-1.5 rounded-lg bg-neutral-50 text-neutral-500 hover:text-red-650 border border-neutral-200 transition-all cursor-pointer">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ===== ABA PEDIDOS ===== */}
          {abaAtiva === 'pedidos' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                  <ClipboardList className="w-4 h-4 text-black" />
                  Pedidos Recebidos
                </h4>
                <button onClick={carregarPedidos} className="text-[10px] font-mono text-neutral-500 hover:text-black transition-colors uppercase tracking-widest border border-neutral-200 px-2 py-1 rounded-lg">
                  Atualizar
                </button>
              </div>
              <p className="text-neutral-500 text-xs">Após receber o PIX no celular, clique em <strong className="text-black">[ APROVAR ]</strong> para liberar os arquivos ao cliente automaticamente.</p>

              {loadingPedidos ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 text-black animate-spin" />
                </div>
              ) : listaPedidos.length === 0 ? (
                <div className="text-center py-8 text-neutral-600 font-mono text-xs uppercase tracking-widest">
                  Nenhum pedido encontrado ainda.
                </div>
              ) : (
                <div className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                  {listaPedidos.map(pedido => (
                    <div key={pedido.id} className={`p-4 rounded-xl border ${ pedido.status === 'pago' ? 'border-emerald-200 bg-emerald-50' : 'border-neutral-200 bg-white' } flex flex-col sm:flex-row items-start sm:items-center gap-3 justify-between`}>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {pedido.status === 'pago'
                            ? <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                            : <Clock className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                          <span className={`text-xs font-mono font-bold uppercase ${ pedido.status === 'pago' ? 'text-emerald-700' : 'text-yellow-700' }`}>
                            {pedido.status === 'pago' ? 'PAGO ✓' : 'AGUARDANDO PIX'}
                          </span>
                        </div>
                        <p className="text-black font-bold text-sm">R$ {Number(pedido.valor_total).toFixed(2).replace('.', ',')}</p>
                        <p className="text-neutral-500 font-mono text-[10px] truncate">{pedido.email_cliente || 'Email não informado'}</p>
                        <p className="text-neutral-700 font-mono text-[10px]">{new Date(pedido.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                      {pedido.status !== 'pago' && (
                        <button
                          onClick={() => handleAprovarPedido(pedido.id)}
                          disabled={aprovando === pedido.id}
                          className="w-full sm:w-auto flex-shrink-0 px-5 py-2.5 rounded-xl bg-black hover:bg-neutral-800 text-white font-bold text-xs uppercase tracking-widest transition-colors disabled:opacity-50 flex items-center gap-2 justify-center cursor-pointer"
                        >
                          {aprovando === pedido.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                          {aprovando === pedido.id ? 'Aprovando...' : '[ APROVAR ]'}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ===== ABA CONFIG ===== */}
          {abaAtiva === 'config' && (
            <form onSubmit={handleSalvarConfig} className="space-y-4 bg-neutral-50 p-5 rounded-2xl border border-neutral-200">
              <h4 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                <Phone className="w-4 h-4 text-black" />
                1. Configurações de Atendimento & Checkout
              </h4>
              <p className="text-neutral-500 text-xs">
                Configure o número do WhatsApp comercial e o banner promocional da loja.
              </p>
              
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500">+55</span>
                <input
                  type="text"
                  value={numeroWhatsapp}
                  onChange={(e) => setNumeroWhatsapp(e.target.value)}
                  placeholder="DDD + Número WhatsApp..."
                  className="w-full bg-white border border-neutral-200 rounded-xl pl-12 pr-4 py-3 text-sm text-black focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-neutral-800 uppercase mb-2 flex items-center gap-1.5">
                  <MessageSquare className="w-4 h-4 text-black" />
                  Mensagem Padrão do Checkout:
                </label>
                <textarea
                  value={mensagemSaudacao}
                  onChange={(e) => setMensagemSaudacao(e.target.value)}
                  rows={3}
                  className="w-full bg-white border border-neutral-200 rounded-xl p-3 text-xs text-black focus:outline-none focus:border-black font-sans leading-relaxed"
                />
                <span className="block text-[11px] text-neutral-500 mt-1">Variáveis disponíveis: [Nome do Produto], [Preço].</span>
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-neutral-800 uppercase mb-2 flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-black" />
                  Imagem do Banner Promocional:
                </label>
                <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                  {bannerImg && (
                    <img src={bannerImg} alt="Banner Preview" className="w-20 h-10 rounded-lg object-cover border border-neutral-200 flex-shrink-0 bg-neutral-900" />
                  )}
                  <div className="flex-1 w-full relative group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={async (e) => {
                        if (!e.target.files || e.target.files.length === 0) return;
                        setIsUploadingBanner(true);
                        const url = await uploadImagem(e.target.files[0]);
                        if (url) setBannerImg(url);
                        setIsUploadingBanner(false);
                      }} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    <div className="w-full bg-white border border-dashed border-neutral-200 group-hover:border-black rounded-xl px-4 py-2.5 text-xs text-neutral-500 flex items-center justify-center gap-2 transition-all">
                      {isUploadingBanner ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Upload className="w-4 h-4 text-black" />}
                      <span>{isUploadingBanner ? 'Enviando...' : 'Fazer Upload do Banner'}</span>
                    </div>
                  </div>
                </div>
                <input
                  type="text"
                  value={bannerImg}
                  onChange={(e) => setBannerImg(e.target.value)}
                  placeholder="Ou insira a URL da imagem do banner..."
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2 mt-2 text-xs text-black focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div className="pt-2">
                <label className="block text-xs font-bold text-neutral-800 uppercase mb-2 flex items-center gap-1.5">
                  <Link className="w-4 h-4 text-black" />
                  Link de Destino do Banner:
                </label>
                <input
                  type="text"
                  value={bannerLink}
                  onChange={(e) => setBannerLink(e.target.value)}
                  placeholder="URL para redirecionar ao clicar (WhatsApp, etc)..."
                  className="w-full bg-white border border-neutral-200 rounded-xl px-4 py-2.5 text-xs text-black focus:outline-none focus:border-black font-mono"
                />
              </div>

              <div className="pt-4 border-t border-neutral-200 mt-4">
                <label className="block text-xs font-bold text-neutral-800 uppercase mb-2 flex items-center gap-1.5">
                  <Star className="w-4 h-4 text-black" />
                  2. Prints de Feedback do WhatsApp (Verticais):
                </label>
                
                {/* List of current feedbacks */}
                {feedbackImagens.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-3 bg-white border border-neutral-200 rounded-xl p-3 max-h-48 overflow-y-auto">
                    {feedbackImagens.map((img, idx) => (
                      <div key={idx} className="relative group rounded-lg overflow-hidden border border-neutral-200 bg-neutral-900 aspect-[9/16]">
                        <img src={img} alt="Feedback" className="w-full h-full object-contain" />
                        <button 
                          type="button"
                          onClick={() => {
                            const filtrado = feedbackImagens.filter((_, i) => i !== idx);
                            setFeedbackImagens(filtrado);
                          }}
                          className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold cursor-pointer hover:bg-red-750 transition-colors shadow-md animate-in zoom-in-50"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-neutral-500 text-xs italic mb-3">Nenhum print cadastrado.</p>
                )}

                {/* Upload or add URL */}
                <div className="flex flex-col gap-2">
                  <div className="relative group">
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={async (e) => {
                        if (!e.target.files || e.target.files.length === 0) return;
                        setIsUploadingFeedback(true);
                        const url = await uploadImagem(e.target.files[0]);
                        if (url) {
                          setFeedbackImagens(prev => [...prev, url]);
                        }
                        setIsUploadingFeedback(false);
                      }} 
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                    />
                    <div className="w-full bg-white border border-dashed border-neutral-200 group-hover:border-black rounded-xl px-4 py-2.5 text-xs text-neutral-500 flex items-center justify-center gap-2 transition-all">
                      {isUploadingFeedback ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Upload className="w-4 h-4 text-black" />}
                      <span>{isUploadingFeedback ? 'Enviando print...' : 'Upload de Novo Print de WhatsApp'}</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={novoFeedbackUrl}
                      onChange={(e) => setNovoFeedbackUrl(e.target.value)}
                      placeholder="Ou cole a URL direta de uma imagem..." 
                      className="flex-1 bg-white border border-neutral-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-black font-mono"
                    />
                    <button 
                      type="button"
                      onClick={() => {
                        if (!novoFeedbackUrl.trim()) return;
                        setFeedbackImagens(prev => [...prev, novoFeedbackUrl.trim()]);
                        setNovoFeedbackUrl('');
                      }}
                      className="bg-black text-white hover:bg-neutral-800 font-bold px-4 py-2 rounded-xl text-xs uppercase cursor-pointer transition-all"
                    >
                      Adicionar
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                className={`w-full py-3 rounded-xl font-bold text-sm text-white bg-black hover:bg-neutral-800 transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer`}
              >
                {salvo ? <Check className="w-5 h-5 text-white" /> : <Save className="w-5 h-5" />}
                <span>{salvo ? 'Configurações Salvas!' : 'Salvar Configurações no Navegador'}</span>
              </button>
            </form>
          )}

          {/* ===== ABA PRODUTOS ===== */}
          {abaAtiva === 'produtos' && (
            <div className="bg-neutral-50 p-5 rounded-2xl border border-neutral-200 space-y-6">
              <h4 className="text-sm font-bold text-black uppercase tracking-wider flex items-center gap-2">
                <Package className="w-4 h-4 text-black" />
                2. Gerenciar Produtos
              </h4>

              <form onSubmit={handleSalvarProduto} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Nome do Produto</label>
                    <input type="text" value={nomeProduto} onChange={e => setNomeProduto(e.target.value)} required className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-black focus:border-black outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Preço</label>
                    <input type="text" value={precoProduto} onChange={e => setPrecoProduto(e.target.value)} placeholder="Ex: R$ 97,00" required className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-black focus:border-black outline-none" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Categoria</label>
                    <select value={categoriaProduto} onChange={e => setCategoriaProduto(e.target.value)} className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-black focus:border-black outline-none">
                      {categoriasDisponiveis.filter(c => c !== 'Todos').map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-2">Imagem de Capa do Produto</label>
                    <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                      {imagemProduto && (
                        <img src={imagemProduto} alt="Capa" className="w-16 h-16 rounded-xl object-cover border border-neutral-200 flex-shrink-0" />
                      )}
                      <div className="flex-1 w-full relative group">
                        <input type="file" accept="image/*" onChange={handleUploadPrincipal} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className={`w-full bg-white border border-dashed border-neutral-200 group-hover:border-black rounded-xl px-4 py-3 text-sm text-neutral-500 flex items-center justify-center gap-2 transition-all ${isUploading ? 'opacity-50' : ''}`}>
                          {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-black" /> : <Upload className="w-4 h-4 text-black" />}
                          <span>{isUploading ? 'Enviando...' : (imagemProduto ? 'Alterar Imagem de Capa' : 'Fazer Upload da Capa')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-2 flex items-center gap-2">
                      Galeria de Imagens Extras
                      <span className="text-[9px] bg-black/10 text-black px-1.5 py-0.5 rounded-full font-mono">NOVO</span>
                    </label>
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 mb-3">
                      {galeriaProduto.map((img, index) => (
                        <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-neutral-200 group">
                          <img src={img} alt={`Galeria ${index}`} className="w-full h-full object-cover" />
                          <button type="button" onClick={() => handleRemoverImagemGaleria(index)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                            <XCircle className="w-6 h-6 text-red-500" />
                          </button>
                        </div>
                      ))}
                      <div className="relative aspect-square rounded-lg border border-dashed border-neutral-200 hover:border-black flex items-center justify-center bg-white transition-colors overflow-hidden">
                        <input type="file" accept="image/*" multiple onChange={handleUploadGaleria} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <Plus className="w-6 h-6 text-neutral-400" />
                      </div>
                    </div>
                    <p className="text-[10px] text-neutral-500">Selecione múltiplas imagens para criar o carrossel do produto.</p>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Aparecer no Order Bump do Carrinho?</label>
                    <select 
                      value={isOrderBump ? 'sim' : 'nao'} 
                      onChange={e => setIsOrderBump(e.target.value === 'sim')}
                      className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-black focus:border-black outline-none"
                    >
                      <option value="nao">Não</option>
                      <option value="sim">Sim (Ofertar este produto ao finalizar a compra)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Descrição Curta</label>
                    <textarea value={descProduto} onChange={e => setDescProduto(e.target.value)} required rows={2} className="w-full bg-white border border-neutral-200 rounded-xl px-3 py-2 text-sm text-black focus:border-black outline-none"></textarea>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className={`flex-1 py-2 rounded-xl font-bold text-sm text-white bg-black hover:bg-neutral-800 transition-all shadow-lg cursor-pointer`}>
                    {editandoId !== null ? 'Salvar Edição' : 'Adicionar Produto'}
                  </button>
                  {editandoId !== null && (
                    <button type="button" onClick={limparFormulario} className="px-4 py-2 rounded-xl font-bold text-sm text-neutral-600 bg-white border border-neutral-200 hover:text-black transition-all cursor-pointer">
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="pt-4 border-t border-neutral-200">
                <span className="text-xs font-bold text-neutral-500 uppercase tracking-wider block mb-3">Produtos Ativos ({listaProdutos.length})</span>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                  {listaProdutos.map(p => (
                    <div key={p.id} className="flex items-center justify-between p-3 rounded-xl bg-white border border-neutral-200">
                      <div className="flex flex-col">
                        <span className="text-sm font-bold text-black">{p.nome}</span>
                        <span className="text-xs text-neutral-500">{p.preco} • {p.categoria}</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          type="button"
                          onClick={() => handleToggleVisibilidade(p.id, p.visivel !== false)} 
                          className="p-1.5 rounded-lg bg-neutral-50 text-neutral-500 hover:text-black border border-neutral-200 transition-all cursor-pointer"
                          title={p.visivel !== false ? "Ocultar Produto" : "Mostrar Produto"}
                        >
                          {p.visivel !== false ? <Eye className="w-4 h-4 text-black" /> : <EyeOff className="w-4 h-4 text-neutral-400" />}
                        </button>
                        <button onClick={() => handleEditarProduto(p)} className="p-1.5 rounded-lg bg-neutral-50 text-neutral-500 hover:text-black border border-neutral-200 transition-all cursor-pointer">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleRemoverProduto(p.id)} className="p-1.5 rounded-lg bg-neutral-50 text-neutral-500 hover:text-red-600 border border-neutral-200 transition-all cursor-pointer">
                          <Trash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="p-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-white hover:bg-neutral-50 border border-neutral-200 font-bold text-sm text-black transition-all cursor-pointer"
          >
            Fechar Configurações
          </button>
        </div>

      </div>
    </div>
  );
};
