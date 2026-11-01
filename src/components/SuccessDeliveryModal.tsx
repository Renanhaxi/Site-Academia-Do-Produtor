import React, { useEffect, useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { X, CheckCircle, Download, MessageSquare, Loader2 } from 'lucide-react';
import { CONFIG_GLOBAL } from '../data/produtos';

interface SuccessDeliveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface SolucaoDelivery {
  id: number;
  nome: string;
  link_entrega: string;
  categoria: string;
}

export const SuccessDeliveryModal: React.FC<SuccessDeliveryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [solucoes, setSolucoes] = useState<SolucaoDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const pendentes = localStorage.getItem('alcateia_carrinho_pendente');
    let pedidoData: { pedidoId: string, ids: number[] } | null = null;
    
    try {
      if (pendentes) {
        const parsed = JSON.parse(pendentes);
        // Retrocompatibilidade caso o storage antigo ainda tenha só o array de IDs
        if (Array.isArray(parsed)) {
          pedidoData = { pedidoId: 'simulado', ids: parsed };
        } else {
          pedidoData = parsed;
        }
      }
    } catch(e) {}

    if (!pedidoData || !pedidoData.ids || pedidoData.ids.length === 0) {
       setHasError(true);
       setIsLoading(false);
       return;
    }

    const { ids, pedidoId } = pedidoData;

    const fetchDeliveryLinks = async () => {
      try {
        const { data, error } = await supabase
          .from('solutions')
          .select('id, nome, link_entrega, categoria')
          .in('id', ids);

        if (error) {
          console.error("Erro ao buscar soluções no Supabase:", error);
          setHasError(true);
        } else if (data) {
          setSolucoes(data);
          if (data.length === 0) {
            setHasError(true);
          } else {
            localStorage.removeItem('alcateia_carrinho_pendente');
          }
        }
      } catch (err) {
        console.error("Exceção na busca:", err);
        setHasError(true);
      } finally {
        setIsLoading(false);
      }
    };

    if (pedidoId && pedidoId !== 'simulado') {
      setIsLoading(true);

      // 1. Primeiro verifica o status ATUAL no banco
      const checkCurrentStatus = async () => {
        const { data, error } = await supabase
          .from('pedidos')
          .select('status')
          .eq('id', pedidoId)
          .single();
          
        if (data && data.status === 'pago') {
          console.log("PIX já estava pago no banco! Puxando arquivos...");
          fetchDeliveryLinks();
          return true;
        }
        return false;
      };

      // 2. Assina o Realtime para aguardar mudanças futuras
      const channel = supabase
        .channel(`pedido_${pedidoId}`)
        .on('postgres_changes', { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'pedidos', 
          filter: `id=eq.${pedidoId}` 
        }, (payload) => {
          if (payload.new.status === 'pago') {
             console.log("PIX Aprovado via Webhook/Admin! Puxando arquivos...");
             fetchDeliveryLinks();
             supabase.removeChannel(channel);
          }
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            console.log("Aguardando confirmação do PIX em tempo real...");
            // Verifica logo após assinar para evitar race conditions
            const isAlreadyPaid = await checkCurrentStatus();
            if (isAlreadyPaid) {
               supabase.removeChannel(channel);
            }
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    } else {
      // Executa direto para testes simulados
      fetchDeliveryLinks();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleWhatsAppSupport = () => {
    const msg = "Olá! Minha compra foi aprovada, mas tive um problema ao acessar os links de entrega. Podem me ajudar a liberar meu acesso?";
    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/${CONFIG_GLOBAL.whatsappNumero}?text=${encodedMsg}`, '_blank');
  };

  const handleWhatsAppAnyDesk = () => {
    const msg = "Olá! Já realizei minha compra e gostaria de agendar a instalação via AnyDesk do meu pacote VIP!";
    const encodedMsg = encodeURIComponent(msg);
    window.open(`https://wa.me/${CONFIG_GLOBAL.whatsappNumero}?text=${encodedMsg}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#0A0D0C]/80 backdrop-blur-md animate-in fade-in duration-300">
      <div 
        className="relative w-full max-w-2xl bg-[#0D1110] border border-[#1A201E] rounded-3xl overflow-hidden shadow-2xl flex flex-col my-auto max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Cyber Studio */}
        <div className="p-6 border-b border-[#1A201E] flex items-center justify-between bg-[#0A0D0C]">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[#E52E2E]/10 border border-[#E52E2E]/20 text-[#E52E2E]">
              <CheckCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-[#F5F5F5] uppercase font-mono tracking-widest">
                TRANSAÇÃO_APROVADA
              </h3>
              <span className="text-[10px] text-neutral-500 font-mono tracking-[0.2em] uppercase">
                STATUS: ACESSO_LIBERADO
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-3 bg-[#0A0D0C] text-neutral-500 hover:text-white border border-[#1A201E] transition-colors hover:border-[#E52E2E]/50 rounded-xl"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 overflow-y-auto flex-1 bg-[#0D1110] space-y-8">
          <div className="text-center mb-8">
            <h4 className="text-lg font-bold font-mono text-[#F5F5F5] uppercase tracking-[0.2em] mb-2">
              ARSENAL_PRONTO
            </h4>
            <p className="text-neutral-500 font-mono text-[10px] uppercase tracking-widest max-w-md mx-auto">
              SISTEMA ATUALIZADO. ARQUIVOS DISPONÍVEIS PARA DOWNLOAD IMEDIATO.
            </p>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-6 text-center px-4">
              <div className="p-4 rounded-full bg-[#0D1110] border border-[#1A201E]">
                <Loader2 className="w-8 h-8 text-[#E52E2E] animate-spin" />
              </div>
              <div>
                <h4 className="text-lg font-bold font-mono text-[#F5F5F5] uppercase tracking-widest mb-2">AGUARDANDO DOAÇÃO (LIVEPIX)</h4>
                <p className="text-neutral-500 font-mono text-xs max-w-sm mx-auto uppercase tracking-widest leading-relaxed">
                  A página do LivePix foi aberta em uma nova aba. Faça a sua doação lá e mantenha esta tela aberta. 
                  <br/><br/>
                  Assim que o administrador confirmar o recebimento do PIX, seus links de download aparecerão aqui automaticamente.
                </p>
              </div>
            </div>
          ) : hasError ? (
            <div className="text-center py-12 px-6 border border-[#1A201E] bg-[#0A0D0C] rounded-2xl">
              <X className="w-12 h-12 text-[#E52E2E]/50 mx-auto mb-4" />
              <h4 className="text-lg font-bold font-mono text-[#F5F5F5] uppercase tracking-widest mb-2">
                FALHA_NA_LOCALIZAÇÃO
              </h4>
              <p className="text-neutral-500 font-mono text-xs mb-6 max-w-sm mx-auto uppercase tracking-widest">
                NÃO FOI POSSÍVEL RECUPERAR OS LINKS NO SERVIDOR. ACIONE O SUPORTE PARA LIBERAÇÃO MANUAL.
              </p>
              <button
                onClick={handleWhatsAppSupport}
                className="px-6 py-4 font-mono font-bold text-[10px] text-white bg-[#E52E2E] hover:bg-[#C61F1F] transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-2 mx-auto rounded-full"
              >
                <MessageSquare className="w-4 h-4" />
                [ SUPORTE ]
              </button>
            </div>
          ) : (
            <div className="space-y-12">
              
              {/* Banner informativo sobre envio de email */}
              <div className="bg-[#E52E2E]/10 border border-[#E52E2E]/30 rounded-2xl p-5 text-[#F5F5F5] font-mono text-xs leading-relaxed space-y-2">
                <div className="flex items-center gap-2 text-[#E52E2E] font-bold uppercase tracking-wider">
                  <CheckCircle className="w-5 h-5 flex-shrink-0" />
                  <span>ENTREGA AUTOMÁTICA ENVIADA</span>
                </div>
                <p className="text-neutral-300">
                  Um e-mail detalhado contendo todos os seus links de download e instruções foi enviado para a sua caixa de entrada.
                </p>
                <div className="p-3 bg-[#0A0D0C] border border-[#1A201E] rounded-xl text-[11px] text-neutral-400 text-center uppercase tracking-wide">
                  👉 Por favor, verifique também sua pasta de <strong className="text-[#E52E2E]">Spam</strong> ou <strong className="text-[#E52E2E]">Lixo Eletrônico</strong>.
                </div>
              </div>

              {/* Recibo JSONB Fake/Visual */}
              <div className="bg-[#0A0D0C] border border-[#1A201E] p-6 rounded-2xl">
                 <div className="text-[#F5F5F5] font-mono text-[10px] uppercase tracking-[0.2em] border-b border-[#1A201E] pb-2 mb-4 flex justify-between">
                    <span>[ DESCRIÇÃO_ITEM ]</span>
                    <span>[ STATUS ]</span>
                 </div>
                 {solucoes.map(sol => (
                    <div key={'log-'+sol.id} className="flex items-center justify-between font-mono text-xs text-neutral-400 py-1.5 border-b border-neutral-900 border-dashed">
                      <span className="truncate pr-4">{sol.nome}</span>
                      <span className="text-[#F5F5F5] font-bold tracking-widest">[OK]</span>
                    </div>
                 ))}
                 <div className="pt-4 flex justify-between text-[#F5F5F5] font-mono text-xs font-bold uppercase tracking-widest">
                    <span>TRANSAÇÃO</span>
                    <span>APROVADA</span>
                 </div>
              </div>

              {Object.entries(
                solucoes.reduce((acc, sol) => {
                  if (!acc[sol.categoria]) acc[sol.categoria] = [];
                  acc[sol.categoria].push(sol);
                  return acc;
                }, {} as Record<string, typeof solucoes>)
              ).map(([categoria, items]) => (
                <div key={categoria} className="space-y-4">
                  <h4 className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-[0.2em] border-b border-neutral-900 pb-2">
                    {categoria}
                  </h4>
                  {items.map((sol) => (
                    <div key={sol.id} className="p-6 border border-[#1A201E] bg-[#0A0D0C] hover:border-[#E52E2E]/50 transition-colors flex flex-col lg:flex-row items-center gap-4 justify-between group rounded-2xl">
                      <div className="flex-1 text-center lg:text-left">
                        <h5 className="text-sm font-bold font-mono text-[#F5F5F5] uppercase tracking-widest">
                          {sol.nome}
                        </h5>
                        <span className="text-[10px] text-neutral-500 uppercase font-mono tracking-[0.2em]">
                          MOD: {sol.id}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                        {sol.id === 26 ? (
                          <button
                            onClick={handleWhatsAppAnyDesk}
                            className="w-full sm:w-auto px-6 py-4 font-mono font-bold text-[10px] text-white bg-[#E52E2E] hover:bg-[#C61F1F] transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-2 rounded-full shadow-[0_0_15px_rgba(229,46,46,0.2)]"
                          >
                            <MessageSquare className="w-4 h-4" />
                            [ AGENDAR ]
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => window.open('https://youtube.com', '_blank')}
                              className="w-full sm:w-auto px-6 py-4 font-mono font-bold text-[10px] text-neutral-400 hover:text-[#F5F5F5] bg-[#0D1110] border border-[#1A201E] hover:border-[#E52E2E]/50 transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-2 rounded-full"
                            >
                              [ MANUAL ]
                            </button>
                            <a
                              href={sol.link_entrega || '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="w-full sm:w-auto px-6 py-4 font-mono font-bold text-[10px] text-white bg-[#E52E2E] hover:bg-[#C61F1F] transition-colors uppercase tracking-[0.2em] flex items-center justify-center gap-2 rounded-full shadow-[0_0_15px_rgba(229,46,46,0.2)]"
                            >
                              <Download className="w-4 h-4" />
                              [ DOWNLOAD ]
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1A201E] bg-[#0A0D0C] text-center rounded-b-3xl">
          <p className="text-[10px] text-neutral-600 font-mono uppercase tracking-[0.2em]">
            SISTEMA OPERACIONAL PROTEGIDO. CONEXÃO ESTÁVEL REQUERIDA.
          </p>
        </div>
      </div>
    </div>
  );
};
