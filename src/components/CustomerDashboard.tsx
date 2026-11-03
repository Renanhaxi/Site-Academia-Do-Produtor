import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Download,
  Package,
  RefreshCw,
  LogOut,
  ArrowLeft,
  ExternalLink,
  HelpCircle,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { CONFIG_GLOBAL } from '../data/produtos';

interface CustomerDashboardProps {
  onClose: () => void;
}

export const CustomerDashboard: React.FC<CustomerDashboardProps> = ({ onClose }) => {
  const [pedidos, setPedidos] = useState<any[]>([]);
  const [produtosMap, setProdutosMap] = useState<Record<number, any>>({});
  const [loading, setLoading] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      setUserEmail(session.user.email || null);

      const { data: pedidosData, error } = await supabase
        .from('pedidos')
        .select('*')
        .or(`user_id.eq.${session.user.id},email_cliente.eq.${session.user.email}`)
        .in('status', ['pago', 'aprovado', 'liberado', 'pendente_pix'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      const loadedPedidos = pedidosData || [];
      setPedidos(loadedPedidos);

      const allProductIds: number[] = [];
      loadedPedidos.forEach((p) => {
        if (Array.isArray(p.produto_ids)) {
          p.produto_ids.forEach((id: number) => {
            if (!allProductIds.includes(id)) allProductIds.push(id);
          });
        }
      });

      if (allProductIds.length > 0) {
        const { data: solsData } = await supabase
          .from('solutions')
          .select('id, nome, link_entrega, categoria, imagem')
          .in('id', allProductIds);

        if (solsData) {
          const map: Record<number, any> = {};
          solsData.forEach((s) => {
            map[s.id] = s;
          });
          setProdutosMap(map);
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados do cliente', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
  };

  const whatsappNum =
    localStorage.getItem('ARSENAL_WHATSAPP') ||
    localStorage.getItem('ALCATEIA_WHATSAPP') ||
    CONFIG_GLOBAL.whatsappNumero;

  return (
    <div className="fixed inset-0 z-60 bg-[#0A0C0E]/95 backdrop-blur-md overflow-y-auto pt-20 pb-12 px-4 sm:px-6 flex flex-col items-center animate-in fade-in duration-200">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        {/* Header Máfia Elegante */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-carbon p-6 border border-neutral-800 rounded-3xl shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/60 to-transparent" />
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#DFCA95] text-[10px] font-mono font-bold uppercase tracking-widest mb-2">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              COFRE DE LICENÇAS VITALÍCIAS
            </div>
            <h2 className="text-2xl font-heading font-black text-white uppercase tracking-tight flex items-center gap-2">
              <Package className="text-[#C5A059] w-6 h-6" />
              MEUS ACESSOS & DOWNLOADS
            </h2>
            <p className="text-xs text-neutral-400 font-mono tracking-wider mt-1 uppercase">
              {userEmail ? `MEMBRO AUTENTICADO: ${userEmail}` : 'CARREGANDO PERFIL...'}
            </p>
          </div>
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              onClick={fetchUserData}
              className="p-3 bg-[#14171A] text-neutral-300 hover:text-[#DFCA95] rounded-xl transition-colors border border-neutral-800 hover:border-[#C5A059]/40 flex-1 sm:flex-none flex justify-center cursor-pointer"
              title="Atualizar status de pedidos"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={handleLogout}
              className="px-4 py-3 bg-red-950/30 text-red-400 hover:bg-red-900/50 hover:text-white rounded-xl transition-colors border border-red-800/30 flex-1 sm:flex-none flex items-center justify-center gap-1.5 text-xs font-mono font-bold uppercase cursor-pointer"
              title="Encerrar sessão"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
            <button
              onClick={onClose}
              className="px-5 py-3 bg-[#F4F1EA] text-[#1C1917] font-mono font-black text-xs uppercase tracking-wider rounded-xl hover:bg-white transition-colors flex items-center justify-center gap-2 flex-1 sm:flex-none cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Catálogo</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 w-full bg-carbon border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
              <RefreshCw className="w-8 h-8 animate-spin mb-4 text-[#C5A059]" />
              <p className="text-xs font-mono tracking-widest uppercase">
                Sincronizando seu cofre de licenças no servidor...
              </p>
            </div>
          ) : pedidos.length === 0 ? (
            <div className="text-center py-16">
              <Package className="w-16 h-16 text-neutral-700 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-white font-heading uppercase mb-2">
                NENHUM SOFTWARE ADQUIRIDO AINDA
              </h3>
              <p className="text-neutral-400 text-xs font-mono uppercase tracking-widest max-w-md mx-auto leading-relaxed">
                Explore o catálogo do Arsenal de Produtores, escolha seus plugins ou DAWs e realize o checkout via PIX para liberação automática aqui no seu painel.
              </p>
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-3.5 bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono text-xs uppercase tracking-widest font-black rounded-xl transition-colors cursor-pointer"
                >
                  [ EXPLORAR O CATÁLOGO ]
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {pedidos.map((pedido) => {
                const isLiberado = ['pago', 'aprovado', 'liberado'].includes(pedido.status);
                const itensPedido = (pedido.produto_ids || []).map((id: number) => {
                  const detalhe = pedido.detalhe_valores?.find((d: any) => d.id === id);
                  const solucao = produtosMap[id];
                  return {
                    id,
                    nome: solucao?.nome || detalhe?.nome || `Produto #${id}`,
                    link_entrega: solucao?.link_entrega || '',
                    categoria: solucao?.categoria || 'Solução',
                    imagem: solucao?.imagem || '',
                  };
                });

                return (
                  <div
                    key={pedido.id}
                    className="bg-[#101214] border border-neutral-800 rounded-2xl p-6 flex flex-col gap-5 relative overflow-hidden"
                  >
                    <div
                      className={`absolute top-0 left-0 w-1.5 h-full ${
                        isLiberado ? 'bg-emerald-500' : 'bg-[#C5A059]'
                      }`}
                    />

                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-neutral-800 pb-4">
                      <div>
                        <span className="text-[10px] text-neutral-500 font-mono tracking-widest uppercase">
                          PEDIDO #{pedido.id.substring(0, 8)} •{' '}
                          {new Date(pedido.created_at).toLocaleDateString('pt-BR')}
                        </span>
                        <h4 className="text-base font-bold text-white uppercase mt-0.5">
                          {itensPedido.length > 1
                            ? `Pacote com ${itensPedido.length} Ferramentas`
                            : itensPedido[0]?.nome || 'Item do Catálogo'}
                        </h4>
                      </div>
                      {isLiberado ? (
                        <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          ACESSO LIBERADO
                        </span>
                      ) : (
                        <span className="bg-amber-500/10 text-[#DFCA95] border border-amber-500/30 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-[#C5A059]" />
                          AGUARDANDO COMPENSAÇÃO PIX
                        </span>
                      )}
                    </div>

                    <div className="grid gap-3 grid-cols-1">
                      {itensPedido.map((item: any) => (
                        <div
                          key={item.id}
                          className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#16191D] p-4 rounded-xl border border-neutral-800"
                        >
                          <div className="flex items-center gap-3">
                            {item.imagem && (
                              <img
                                src={item.imagem}
                                alt={item.nome}
                                className="w-11 h-11 rounded-lg object-cover border border-neutral-700 flex-shrink-0"
                              />
                            )}
                            <div>
                              <span className="text-sm font-bold text-white uppercase block">
                                {item.nome}
                              </span>
                              <span className="text-[10px] text-[#C5A059] font-mono uppercase">
                                {item.categoria}
                              </span>
                            </div>
                          </div>

                          {isLiberado ? (
                            item.link_entrega ? (
                              <a
                                href={item.link_entrega}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono text-xs uppercase tracking-wider font-black rounded-xl transition-all shadow-md flex-shrink-0"
                              >
                                <Download className="w-4 h-4 text-amber-800" />
                                Baixar Instalador
                              </a>
                            ) : (
                              <a
                                href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(
                                  `Olá! Meu pedido #${pedido.id.substring(0, 8)} (${
                                    item.nome
                                  }) consta aprovado. Podem me enviar o link atualizado?`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[11px] text-[#DFCA95] font-mono uppercase border border-[#C5A059]/40 bg-[#C5A059]/10 px-4 py-2 rounded-xl flex-shrink-0 hover:bg-[#C5A059]/20"
                              >
                                Solicitar Link no Suporte
                              </a>
                            )
                          ) : (
                            <span className="text-[11px] text-neutral-400 font-mono uppercase px-3 py-1.5 rounded-lg bg-black/50 border border-neutral-800">
                              Liberação automática pós-PIX
                            </span>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Bloco de Abrir Chamado VIP (Exclusivo para pedidos já pagos/liberados) */}
                    {isLiberado && (
                      <div className="bg-black/40 border border-dashed border-neutral-800 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
                        <div className="flex items-center gap-3">
                          <HelpCircle className="w-5 h-5 text-[#C5A059] flex-shrink-0 hidden sm:block" />
                          <div>
                            <div className="text-xs font-bold text-white uppercase font-mono">
                              Central de Chamados VIP (Exclusivo Membros)
                            </div>
                            <div className="text-[11px] text-neutral-400">
                              Precisa de auxílio na instalação ou ativação? Abra um chamado com o protocolo do seu pedido.
                            </div>
                          </div>
                        </div>
                        <a
                          href={`https://wa.me/${whatsappNum}?text=${encodeURIComponent(
                            `[CHAMADO VIP #${pedido.id.substring(0, 8)}] Olá! Sou membro com compra aprovada (${userEmail}) e gostaria de abrir um chamado de suporte técnico.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-[#14171A] border border-[#C5A059]/40 hover:border-[#C5A059] text-[#DFCA95] font-mono text-[10px] uppercase font-bold rounded-xl transition-colors flex-shrink-0"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          [ ABRIR CHAMADO DE SUPORTE ]
                        </a>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
