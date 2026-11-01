import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  Loader2,
  Lock,
  ShieldCheck,
  QrCode,
  Copy,
  Check,
  ArrowLeft,
  CheckCircle2,
  UserCheck,
  Clock,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Produto, CONFIG_GLOBAL } from '../data/produtos';
import { supabase } from '../utils/supabaseClient';

interface ExpressCartModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: Produto[];
  onRemoveItem: (id: number) => void;
  onAddItem: (produto: Produto) => void;
  onOpenDetails: (produto: Produto) => void;
  accentColor: string;
  userSession?: any;
  onRequireAuth?: () => void;
  onCheckoutSuccess?: () => void;
  onOpenDashboard?: () => void;
}

type CheckoutStep = 'cart' | 'pix_payment';

export const ExpressCartModal: React.FC<ExpressCartModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onAddItem,
  onOpenDetails,
  userSession,
  onRequireAuth,
  onCheckoutSuccess,
  onOpenDashboard,
}) => {
  const [isProcessingPIX, setIsProcessingPIX] = useState(false);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Etapas do Checkout Express (Direto: Rack -> Terminal PIX)
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeChargeId, setActiveChargeId] = useState<string | null>(null);
  const [activeTxid, setActiveTxid] = useState<string | null>(null);
  const [pixCopyPaste, setPixCopyPaste] = useState<string | null>(null);
  const [pixQrCodeUrl, setPixQrCodeUrl] = useState<string | null>(null);
  const [copiedPix, setCopiedPix] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [paymentFeedback, setPaymentFeedback] = useState<{ type: 'info' | 'ok' | 'err'; text: string } | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(3600);

  // Resetar para a etapa do carrinho quando fechar
  useEffect(() => {
    if (!isOpen) {
      setCheckoutStep('cart');
      setPaymentFeedback(null);
    }
  }, [isOpen]);

  // Cronômetro regressivo na tela do PIX
  useEffect(() => {
    if (checkoutStep !== 'pix_payment') return;
    setSecondsLeft(3600);
    const timer = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [checkoutStep]);

  // Chamador híbrido seguro (Supabase Edge Function + Backend Serverless Route)
  const invokeZucroBackend = useCallback(async (payload: Record<string, any>) => {
    // 1. Tenta via Supabase Edge Function (se publicada no projeto)
    try {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('zucro-checkout', {
        body: payload,
      });
      if (!fnErr && fnData && (fnData.success || fnData.copy_paste || fnData.paid !== undefined)) {
        return fnData;
      }
    } catch {
      // Silencioso: aciona rota serverless backend
    }

    // 2. Aciona a rota backend (/api/zucro-checkout) que lê a ZUCRO_API_KEY no servidor
    const response = await fetch('/api/zucro-checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(errBody.error || 'Erro ao comunicar com o gateway PIX.');
    }

    return await response.json();
  }, []);

  // Finalização unificada quando o pagamento é confirmado
  const triggerPaymentApproved = useCallback(async () => {
    if (activeOrderId) {
      try {
        await supabase
          .from('pedidos')
          .update({ status: 'pago', updated_at: new Date().toISOString() })
          .eq('id', activeOrderId);
      } catch (e) {
        console.warn('Aviso ao sincronizar status:', e);
      }
    }
    localStorage.removeItem('ALCATEIA_CART');
    if (onCheckoutSuccess) onCheckoutSuccess();
  }, [activeOrderId, onCheckoutSuccess]);

  // Motor 1: Monitoramento em tempo real (Supabase Realtime) na tabela pedidos
  useEffect(() => {
    if (checkoutStep !== 'pix_payment' || !activeOrderId) return;

    const channel = supabase
      .channel(`checkout_pedido_${activeOrderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'pedidos',
          filter: `id=eq.${activeOrderId}`,
        },
        (payload) => {
          const novoStatus = payload.new?.status;
          if (novoStatus === 'pago' || novoStatus === 'aprovado' || novoStatus === 'liberado') {
            localStorage.removeItem('ALCATEIA_CART');
            if (onCheckoutSuccess) onCheckoutSuccess();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkoutStep, activeOrderId, onCheckoutSuccess]);

  // Motor 2: Radar Ativo de Compensação na Zucro a cada 5 segundos
  useEffect(() => {
    if (checkoutStep !== 'pix_payment' || !activeChargeId) return;

    const interval = setInterval(async () => {
      try {
        const res = await invokeZucroBackend({
          action: 'check_status',
          charge_id: activeChargeId,
          pedido_id: activeOrderId,
        });
        if (res?.paid) {
          clearInterval(interval);
          await triggerPaymentApproved();
        }
      } catch {
        // Continua escutando no próximo ciclo
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [checkoutStep, activeChargeId, activeOrderId, invokeZucroBackend, triggerPaymentApproved]);

  if (!isOpen) return null;

  const parsePrice = (precoStr: string) => {
    const numbers = precoStr.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numbers) || 0;
  };

  const valorOriginal = cartItems.reduce((acc, curr) => acc + parsePrice(curr.preco), 0);

  let percentualDesconto = 0;
  if (cartItems.length === 2) percentualDesconto = 0.1;
  if (cartItems.length >= 3) percentualDesconto = 0.2;

  const descontoTotal = Math.min(percentualDesconto + couponDiscount, 0.8);
  const valorTotal = valorOriginal * (1 - descontoTotal);
  const totalFormatado = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
  const originalFormatado = `R$ ${valorOriginal.toFixed(2).replace('.', ',')}`;

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleApplyCoupon = async () => {
    const code = couponCode.trim().toUpperCase();
    if (!code) return;
    setCouponMessage(null);

    try {
      const { data, error } = await supabase
        .from('cupons')
        .select('*')
        .eq('codigo', code)
        .maybeSingle();

      if (error) {
        setCouponMessage({ type: 'err', text: 'Erro técnico ao validar o cupom.' });
        return;
      }

      if (data && data.ativo !== false) {
        const desconto = Number(data.desconto_percentual || 0);
        setCouponDiscount(desconto);
        setAppliedCoupon(code);
        setCouponMessage({
          type: 'ok',
          text: `Cupom ${code} aplicado! +${(desconto * 100).toFixed(0)}% OFF adicionado.`,
        });
      } else {
        setCouponMessage({ type: 'err', text: 'Cupom inválido ou expirado.' });
      }
    } catch (err) {
      console.error(err);
      setCouponMessage({ type: 'err', text: 'Erro ao validar cupom no servidor.' });
    }
  };

  // Gera a Cobrança PIX Oficial na Zucro em 1 Clique (Usando apenas o E-mail autenticado!)
  const handleGeneratePixCharge = async () => {
    if (!userSession?.user) {
      if (onRequireAuth) onRequireAuth();
      return;
    }

    setIsProcessingPIX(true);
    setPaymentFeedback(null);

    try {
      const email = userSession.user.email;
      const userId = userSession.user.id;
      const nomeAutomatico =
        userSession.user.user_metadata?.full_name ||
        userSession.user.user_metadata?.name ||
        email.split('@')[0] ||
        'Produtor Alcateia';
      const ids = cartItems.map((i) => i.id);
      const referral = localStorage.getItem('alcateia_referral') || 'padrao';

      const detalhesValores = cartItems.map((item) => {
        const precoBase = parsePrice(item.preco);
        const precoComDesconto = precoBase * (1 - descontoTotal);
        return {
          id: item.id,
          nome: item.nome,
          preco_original: precoBase,
          preco_pago: precoComDesconto,
        };
      });

      // 1. Registra o pedido vinculado exclusivamente ao user_id e email no Supabase
      const { data: novoPedido, error } = await supabase
        .from('pedidos')
        .insert([
          {
            status: 'pendente_pix',
            produto_ids: ids,
            valor_total: valorTotal,
            detalhe_valores: detalhesValores,
            user_id: userId,
            email_cliente: email,
            email_cliente_referencia: referral,
            cupom_aplicado: appliedCoupon || 'NENHUM',
          },
        ])
        .select('id')
        .single();

      if (error) {
        console.warn('Aviso ao registrar pedido no Supabase:', error);
      }

      const pedidoId = novoPedido?.id || `ped_${Date.now()}`;
      setActiveOrderId(pedidoId);

      // Grava os itens pendentes para o modal de entrega automática
      localStorage.setItem(
        'alcateia_carrinho_pendente',
        JSON.stringify({ pedidoId, ids })
      );

      // 2. Aciona o Backend Zucro usando apenas o e-mail (o servidor cuida dos parâmetros técnicos)
      const zucroData = await invokeZucroBackend({
        action: 'create',
        pedido_id: pedidoId,
        valor_total: valorTotal,
        email_cliente: email,
        nome_cliente: nomeAutomatico,
      });

      setPixCopyPaste(zucroData?.copy_paste || null);
      setPixQrCodeUrl(zucroData?.qr_code_url || null);
      setActiveChargeId(zucroData?.charge_id || null);
      setActiveTxid(zucroData?.txid || null);
      setCheckoutStep('pix_payment');
    } catch (err: any) {
      console.error('Erro ao iniciar checkout PIX:', err);
      setPaymentFeedback({
        type: 'err',
        text: err.message || 'Não foi possível gerar o QR Code agora. Tente novamente.',
      });
    } finally {
      setIsProcessingPIX(false);
    }
  };

  // Verifica manualmente na Zucro e no Supabase se o pedido já consta como pago
  const handleVerifyPaymentStatus = async () => {
    if (!activeOrderId && !activeChargeId) return;
    setCheckingPayment(true);
    setPaymentFeedback(null);

    try {
      // 1. Consulta direta na Zucro API via backend
      if (activeChargeId) {
        try {
          const checkZucro = await invokeZucroBackend({
            action: 'check_status',
            charge_id: activeChargeId,
            pedido_id: activeOrderId,
          });
          if (checkZucro?.paid) {
            await triggerPaymentApproved();
            return;
          }
        } catch {
          // Segue para checagem no banco
        }
      }

      // 2. Consulta na tabela pedidos do Supabase
      if (activeOrderId) {
        const { data } = await supabase
          .from('pedidos')
          .select('status')
          .eq('id', activeOrderId)
          .maybeSingle();

        if (data && (data.status === 'pago' || data.status === 'aprovado' || data.status === 'liberado')) {
          localStorage.removeItem('ALCATEIA_CART');
          if (onCheckoutSuccess) onCheckoutSuccess();
          return;
        }
      }

      setPaymentFeedback({
        type: 'info',
        text: 'Aguardando confirmação bancária... Assim que concluir o PIX no seu banco, seus links destravam automaticamente nesta tela!',
      });
    } catch (e) {
      console.error(e);
      setPaymentFeedback({
        type: 'err',
        text: 'Erro ao consultar status. Nossa verificação automática continua ativa em segundo plano.',
      });
    } finally {
      setCheckingPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-[#F4F1EA] border-t sm:border border-stone-300 shadow-[0_-15px_60px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col max-h-[94vh] sm:max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior Dourada "Máfia Elegante" */}
        <div className="h-1 w-full bg-gradient-to-r from-[#78350F] via-[#C5A059] to-[#78350F]" />

        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-300 flex items-center justify-between bg-[#EBE6DC]">
          <div className="flex items-center gap-3">
            {checkoutStep === 'pix_payment' ? (
              <button
                onClick={() => setCheckoutStep('cart')}
                className="p-2.5 rounded-xl bg-[#1C1917] text-[#DFCA95] hover:bg-stone-800 transition-colors cursor-pointer"
                title="Voltar ao Rack"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <div className="p-2.5 rounded-xl bg-[#1C1917] border border-amber-800/40 text-[#C5A059] shadow-sm">
                <ShoppingBag className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-base sm:text-lg font-heading font-black uppercase text-[#1C1917] tracking-tight flex items-center gap-2">
                {checkoutStep === 'cart' ? 'ARSENAL EXPRESS' : 'TERMINAL PIX OFICIAL'}
              </h3>
              <span className="text-[10px] text-stone-600 font-mono tracking-widest uppercase font-bold block">
                {checkoutStep === 'cart'
                  ? `ITENS NO RACK: ${cartItems.length}`
                  : 'LIBERAÇÃO AUTOMÁTICA VINCULADA AO E-MAIL'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-stone-300 text-stone-600 hover:text-[#1C1917] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progresso Direta (2 Passos Rápidos: Rack -> PIX Instantâneo) */}
        {cartItems.length > 0 && (
          <div className="bg-[#14171A] px-6 py-2.5 border-b border-neutral-800 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider">
            <div
              className={`flex items-center gap-2 ${
                checkoutStep === 'cart' ? 'text-[#DFCA95] font-bold' : 'text-emerald-400'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                  checkoutStep === 'cart'
                    ? 'bg-[#C5A059] text-black'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                }`}
              >
                {checkoutStep === 'cart' ? '1' : '✓'}
              </span>
              <span>01. Revisão do Rack</span>
            </div>

            <div className="flex-1 mx-4 h-[1px] bg-neutral-800" />

            <div
              className={`flex items-center gap-2 ${
                checkoutStep === 'pix_payment' ? 'text-[#DFCA95] font-bold' : 'text-neutral-500'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                  checkoutStep === 'pix_payment'
                    ? 'bg-[#C5A059] text-black'
                    : 'bg-neutral-800 text-neutral-500'
                }`}
              >
                2
              </span>
              <span>02. PIX & Download Imediato</span>
            </div>
          </div>
        )}

        {/* =====================================================================
            ETAPA 2: TERMINAL DE PAGAMENTO PIX NATIVO (100% NO SITE, SÓ COM E-MAIL)
           ===================================================================== */}
        {checkoutStep === 'pix_payment' ? (
          <div className="p-5 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-[#F4F1EA]">
            {/* Resumo da Licença Conectada + Cronômetro */}
            <div className="p-3.5 rounded-2xl bg-carbon text-white border border-neutral-800 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-mono uppercase tracking-widest text-neutral-400">
                    LICENÇA VINCULADA AO E-MAIL:
                  </span>
                  <span className="block text-xs font-mono font-bold text-[#DFCA95] truncate">
                    {userSession?.user?.email}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="block text-base sm:text-lg font-mono font-black text-white leading-none">
                  {totalFormatado}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-amber-400 mt-1">
                  <Clock className="w-3 h-3" /> Expira em {formatTimer(secondsLeft)}
                </span>
              </div>
            </div>

            {/* Card Principal do Terminal PIX */}
            <div className="bg-carbon border border-neutral-800 rounded-3xl p-5 sm:p-6 text-center space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent" />

              {/* Status Radar Ativo */}
              <div className="flex items-center justify-between gap-2 px-3 py-1.5 rounded-full bg-[#14171A] border border-[#C5A059]/30 max-w-fit mx-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-[#DFCA95] text-[10px] font-mono font-bold uppercase tracking-widest">
                  RADAR BANCÁRIO ATIVO • LIBERAÇÃO AUTOMÁTICA
                </span>
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-heading font-black text-white uppercase tracking-tight">
                  ESCANEIE O QR CODE OU USE O COPIA E COLA
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Assim que o pagamento for confirmado, seus downloads abrem automaticamente aqui.
                </p>
              </div>

              {/* Moldura Luxo do QR Code Oficial (Base64 da Zucro) */}
              <div className="relative p-4 bg-white rounded-2xl max-w-[215px] mx-auto shadow-[0_0_35px_rgba(197,160,89,0.2)] border-2 border-[#C5A059] flex flex-col items-center justify-center">
                {/* Cantoneiras Douradas */}
                <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-[#C5A059] rounded-tl-md" />
                <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-[#C5A059] rounded-tr-md" />
                <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-[#C5A059] rounded-bl-md" />
                <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-[#C5A059] rounded-br-md" />

                <img
                  src={
                    pixQrCodeUrl &&
                    (pixQrCodeUrl.startsWith('data:image') || pixQrCodeUrl.startsWith('http'))
                      ? pixQrCodeUrl
                      : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                          pixCopyPaste || CONFIG_GLOBAL.livepixUrl
                        )}`
                  }
                  alt="QR Code PIX Oficial Zucro"
                  className="w-44 h-44 object-contain"
                />

                <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono font-black text-[#1C1917] uppercase tracking-wider bg-stone-100 px-2.5 py-0.5 rounded-full border border-stone-300">
                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                  <span>PIX OFICIAL BANCO CENTRAL</span>
                </div>
              </div>

              {/* Caixa Pix Copia e Cola */}
              {pixCopyPaste && (
                <div className="space-y-2.5 pt-1 text-left">
                  <div className="p-3 rounded-xl bg-[#0B0D0E] border border-neutral-800 relative group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-[#C5A059] font-bold">
                        CÓDIGO PIX COPIA E COLA (EMV):
                      </span>
                      {activeTxid && (
                        <span className="text-[9px] font-mono text-neutral-500">
                          ID: {activeTxid.slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-stone-300 break-all line-clamp-2 select-all leading-relaxed">
                      {pixCopyPaste}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(pixCopyPaste);
                      setCopiedPix(true);
                      setTimeout(() => setCopiedPix(false), 3000);
                    }}
                    className={`w-full py-4 px-5 rounded-2xl font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-lg ${
                      copiedPix
                        ? 'bg-emerald-500 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                        : 'bg-gradient-to-r from-[#DFCA95] via-[#C5A059] to-[#DFCA95] hover:brightness-110 text-[#1C1917] shadow-[0_6px_25px_rgba(197,160,89,0.35)]'
                    }`}
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>CÓDIGO PIX COPIADO! COLE NO APP DO BANCO</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>[ COPIAR CÓDIGO PIX COPIA E COLA ]</span>
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Instruções Rápidas em 3 Passos */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-neutral-800/80 text-left">
                <div className="p-2.5 rounded-xl bg-[#14171A] border border-neutral-800/80">
                  <span className="text-[9px] font-mono font-black text-[#C5A059] block">
                    01. BANCO
                  </span>
                  <span className="text-[10px] text-neutral-300 leading-tight block mt-0.5">
                    Abra o app do seu banco preferido.
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#14171A] border border-neutral-800/80">
                  <span className="text-[9px] font-mono font-black text-[#C5A059] block">
                    02. PIX
                  </span>
                  <span className="text-[10px] text-neutral-300 leading-tight block mt-0.5">
                    Escolha QR Code ou Pix Copia e Cola.
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#14171A] border border-neutral-800/80">
                  <span className="text-[9px] font-mono font-black text-emerald-400 block">
                    03. ACESSO
                  </span>
                  <span className="text-[10px] text-neutral-300 leading-tight block mt-0.5">
                    O download abre aqui na mesma hora!
                  </span>
                </div>
              </div>
            </div>

            {/* Feedback de Verificação Interna */}
            {paymentFeedback && (
              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-mono ${
                  paymentFeedback.type === 'ok'
                    ? 'bg-emerald-950/20 border-emerald-600/40 text-emerald-900'
                    : paymentFeedback.type === 'err'
                    ? 'bg-red-950/15 border-red-600/40 text-red-900'
                    : 'bg-amber-950/15 border-amber-700/40 text-stone-800'
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-800" />
                <span>{paymentFeedback.text}</span>
              </div>
            )}

            {/* Verificação Manual & Painel de Acessos */}
            <div className="p-4 rounded-2xl bg-[#EBE6DC] border border-stone-300 space-y-2.5">
              <button
                type="button"
                onClick={handleVerifyPaymentStatus}
                disabled={checkingPayment}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1C1917] hover:bg-[#78350F] text-[#F4F1EA] font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {checkingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-[#DFCA95]" />
                    <span>CONSULTANDO COMPENSAÇÃO NO BANCO CENTRAL...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>[ JÁ PAGUEI — DESTRAVAR MEUS DOWNLOADS AGORA ]</span>
                  </>
                )}
              </button>

              {onOpenDashboard && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenDashboard();
                  }}
                  className="w-full py-2 text-[11px] font-mono font-bold text-stone-700 hover:text-[#1C1917] uppercase tracking-wider underline underline-offset-4 cursor-pointer"
                >
                  Abrir "Meus Acessos & Downloads" →
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =====================================================================
              ETAPA 1: RACK DE PLUGINS + ORDER BUMP + CUPOM (1-CLICK PARA PIX)
             ===================================================================== */
          <>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain">
              {cartItems.length === 0 ? (
                <div className="text-center py-12">
                  <ShoppingBag className="w-16 h-16 text-stone-400 mx-auto mb-4" />
                  <h4 className="text-lg font-black text-stone-600 font-sans uppercase mb-1">
                    SEU RACK ESTÁ VAZIO
                  </h4>
                  <p className="text-stone-500 text-xs font-sans uppercase tracking-widest max-w-sm mx-auto mb-6">
                    EXPLORE O ARSENAL E ADICIONE SOFTWARES AO SEU ESTÚDIO.
                  </p>
                  <button
                    onClick={onClose}
                    className="px-6 py-3 rounded-full font-bold font-sans text-xs uppercase tracking-widest text-[#F4F1EA] bg-[#1C1917] hover:bg-[#78350F] transition-colors shadow-md cursor-pointer"
                  >
                    [ EXPLORAR CATÁLOGO ]
                  </button>
                </div>
              ) : (
                <>
                  {/* Barra de Progresso do Desconto Progressivo */}
                  <div className="bg-carbon border border-neutral-800 rounded-2xl p-4 text-white">
                    <div className="flex items-center justify-between text-[11px] font-mono mb-2">
                      <span className="text-[#DFCA95] font-bold uppercase">
                        {cartItems.length === 1 && '🔥 Falta 1 item para ganhar 10% OFF!'}
                        {cartItems.length === 2 && '⚡ 10% OFF Ativo! +1 item libera 20% OFF!'}
                        {cartItems.length >= 3 && '👑 COMBO MÁXIMO: 20% OFF DESBLOQUEADO!'}
                      </span>
                      <span className="text-neutral-400 font-bold">
                        {Math.min(cartItems.length, 3)}/3
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-700 via-[#C5A059] to-[#DFCA95] transition-all duration-500"
                        style={{ width: `${Math.min((cartItems.length / 3) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Itens Adicionados */}
                  <div className="space-y-3">
                    {cartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-4 p-3.5 rounded-2xl bg-carbon border border-neutral-800 hover:border-[#C5A059]/50 shadow-sm transition-colors"
                      >
                        <img
                          src={item.imagem}
                          alt={item.nome}
                          onClick={() => {
                            onClose();
                            onOpenDetails(item);
                          }}
                          className="w-16 h-16 rounded-xl object-cover flex-shrink-0 border border-neutral-800 cursor-pointer hover:opacity-80 transition-opacity"
                        />
                        <div className="flex-1 min-w-0">
                          <h4
                            onClick={() => {
                              onClose();
                              onOpenDetails(item);
                            }}
                            className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight truncate cursor-pointer hover:text-[#DFCA95] transition-colors"
                          >
                            {item.nome}
                          </h4>
                          <span className="text-[10px] font-mono tracking-widest uppercase text-[#C5A059] font-bold">
                            {item.categoria}
                          </span>
                          <span className="block text-sm font-mono font-bold text-stone-100 mt-0.5">
                            {item.preco}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          title="Remover item"
                          className="p-2.5 rounded-full text-stone-400 bg-black/60 border border-neutral-800 hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Order Bump Inteligente */}
                  <OrderBumpSection
                    cartItems={cartItems}
                    onAddItem={onAddItem}
                    onOpenDetails={(p) => {
                      onClose();
                      onOpenDetails(p);
                    }}
                  />

                  {paymentFeedback && (
                    <div className="p-3.5 rounded-2xl bg-red-950/10 border border-red-600/40 text-red-900 text-xs font-mono flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-700" />
                      <span>{paymentFeedback.text}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer: Cupom + Verificação de Login Obrigatório + Botão Direto PIX */}
            {cartItems.length > 0 && (
              <div className="border-t border-stone-300 flex flex-col bg-[#EBE6DC]">
                {/* Resumo de Valores */}
                <div className="px-5 sm:px-6 pt-4 pb-3 flex items-end justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase font-bold tracking-widest text-stone-600 block">
                      INVESTIMENTO TOTAL:
                    </span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl sm:text-3xl font-black text-[#1C1917] font-mono tracking-tight">
                        {totalFormatado}
                      </span>
                      {descontoTotal > 0 && (
                        <span className="text-xs text-stone-500 line-through font-mono">
                          {originalFormatado}
                        </span>
                      )}
                    </div>
                  </div>

                  {descontoTotal > 0 && (
                    <span className="text-[10px] font-mono px-2.5 py-1 bg-[#1C1917] text-[#DFCA95] border border-amber-800/40 rounded-full uppercase tracking-wider font-bold">
                      -{(descontoTotal * 100).toFixed(0)}% OFF APLICADO
                    </span>
                  )}
                </div>

                {/* Cupom de Parceiro */}
                <div className="px-5 sm:px-6 pb-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="CUPOM DE PARCEIRO (OPCIONAL)"
                      disabled={!!appliedCoupon}
                      className="flex-1 min-w-0 bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-amber-700 font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!!appliedCoupon}
                      className="px-4 py-2 bg-[#1C1917] text-[#DFCA95] text-xs font-mono font-bold uppercase tracking-wider rounded-xl hover:bg-[#78350F] transition-colors disabled:bg-stone-300 disabled:text-stone-500 cursor-pointer"
                    >
                      {appliedCoupon ? 'APLICADO' : 'USAR'}
                    </button>
                  </div>
                  {couponMessage && (
                    <span
                      className={`block text-[10px] font-mono mt-1 font-bold ${
                        couponMessage.type === 'ok' ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {couponMessage.text}
                    </span>
                  )}
                </div>

                {/* BLOCO DE E-MAIL VINCULADO (SEM PEDIR CPF OU TELEFONE) */}
                <div className="px-5 sm:px-6 pb-3">
                  {userSession?.user ? (
                    <div className="p-3 rounded-xl bg-emerald-950/10 border border-emerald-700/30 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <ShieldCheck className="w-4 h-4 text-emerald-700 flex-shrink-0" />
                        <span className="font-mono text-[11px] text-stone-800 truncate">
                          Entrega vinculada a: <strong>{userSession.user.email}</strong>
                        </span>
                      </div>
                      <span className="text-[9px] font-mono font-bold uppercase text-emerald-800 bg-emerald-500/20 px-2 py-0.5 rounded flex-shrink-0">
                        PRONTO
                      </span>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-2xl bg-carbon text-white border border-neutral-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Lock className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                        <div className="text-[11px] leading-tight">
                          <span className="font-bold text-[#DFCA95] block uppercase font-mono">
                            Apenas seu E-mail é Necessário
                          </span>
                          <span className="text-neutral-400">
                            Seus downloads e suporte VIP ficam vinculados ao seu e-mail.
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onRequireAuth}
                        className="px-3.5 py-2 rounded-xl bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono font-black text-[10px] uppercase tracking-wider flex-shrink-0 cursor-pointer"
                      >
                        Entrar / Criar
                      </button>
                    </div>
                  )}
                </div>

                {/* Botão Principal de Ação (1-Click para o QR Code PIX) */}
                <button
                  onClick={handleGeneratePixCharge}
                  disabled={isProcessingPIX}
                  className="w-full min-h-[58px] bg-[#1C1917] text-[#F4F1EA] font-heading font-black uppercase tracking-widest text-xs py-4 sm:py-5 border-t border-amber-800/40 hover:bg-[#78350F] hover:shadow-[0_0_20px_rgba(146,64,14,0.35)] transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer pb-[max(1.25rem,env(safe-area-inset-bottom))]"
                >
                  {isProcessingPIX ? (
                    <span className="flex items-center gap-2 text-[#DFCA95]">
                      <Loader2 className="w-4 h-4 animate-spin" /> GERANDO QR CODE PIX...
                    </span>
                  ) : userSession?.user ? (
                    <span className="flex items-center gap-2 text-[#DFCA95]">
                      <QrCode className="w-4 h-4 text-[#C5A059]" />
                      <span>[ GERAR PIX NO SITE — LIBERAÇÃO IMEDIATA ]</span>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2 text-[#DFCA95]">
                      <Lock className="w-4 h-4 text-[#C5A059]" />
                      <span>[ INFORMAR E-MAIL E GERAR PIX ]</span>
                    </span>
                  )}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

const OrderBumpSection: React.FC<{
  cartItems: Produto[];
  onAddItem: (produto: Produto) => void;
  onOpenDetails: (produto: Produto) => void;
}> = ({ cartItems, onAddItem, onOpenDetails }) => {
  const [itemsBump, setItemsBump] = React.useState<any[]>([]);

  const osPredominante = React.useMemo(() => {
    const temMac = cartItems.some(
      (i) => i.sistema_operacional === 'mac' || i.nome.toLowerCase().includes('mac')
    );
    const temWin = cartItems.some(
      (i) => i.sistema_operacional === 'windows' || i.nome.toLowerCase().includes('windows')
    );
    if (temMac && !temWin) return 'mac';
    if (temWin && !temMac) return 'windows';
    if (
      typeof navigator !== 'undefined' &&
      /Mac|Macintosh|iPhone|iPad/i.test(navigator.userAgent)
    )
      return 'mac';
    return 'windows';
  }, [cartItems]);

  React.useEffect(() => {
    const fetchBumps = async () => {
      try {
        const { data } = await supabase.from('solutions').select('*').eq('is_orderbump', true);
        if (data) setItemsBump(data);
      } catch (e) {
        console.error(e);
      }
    };
    fetchBumps();
  }, [cartItems]);

  const bumpsDisponiveis = React.useMemo(() => {
    const disponiveis = itemsBump.filter(
      (item) =>
        !cartItems.some(
          (cart) => cart.id === item.id || cart.nome.toLowerCase() === item.nome.toLowerCase()
        )
    );
    return disponiveis.sort((a, b) => {
      const aMatch = a.sistema_operacional === osPredominante ? -1 : 1;
      const bMatch = b.sistema_operacional === osPredominante ? -1 : 1;
      return aMatch - bMatch;
    });
  }, [itemsBump, cartItems, osPredominante]);

  const jaTemInstalacao = cartItems.some(
    (item) =>
      item.nome.toLowerCase().includes('instalação') ||
      item.nome.toLowerCase().includes('instalacao') ||
      item.nome.toLowerCase().includes('suporte') ||
      item.nome.toLowerCase().includes('engenharia')
  );

  const sugestoesFallback: Produto[] = React.useMemo(() => {
    if (bumpsDisponiveis.length > 0) return [];

    if (!jaTemInstalacao) {
      if (osPredominante === 'mac') {
        return [
          {
            id: 9901,
            nome: 'Instalação Remota VIP macOS (AnyDesk & Liberação)',
            preco: 'R$ 29,90',
            precoAntigo: 'R$ 59,90',
            imagem:
              'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?q=80&w=400&auto=format&fit=crop',
            desc: 'Nossa equipe técnica realiza toda a instalação e configuração de permissões no seu Mac via AnyDesk com total segurança.',
            categoria: 'Serviços VIP',
            sistema_operacional: 'mac',
          },
        ];
      } else {
        return [
          {
            id: 9902,
            nome: 'Instalação Remota VIP Windows (AnyDesk)',
            preco: 'R$ 29,90',
            precoAntigo: 'R$ 49,90',
            imagem:
              'https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400&auto=format&fit=crop',
            desc: 'Instalação express sem complicações no seu Windows realizada remotamente pela equipe técnica da Alcateia.',
            categoria: 'Serviços VIP',
            sistema_operacional: 'windows',
          },
        ];
      }
    } else {
      return [
        {
          id: 9903,
          nome: 'Super Pack de Presets & Cenas de Mixagem Gold',
          preco: 'R$ 19,90',
          precoAntigo: 'R$ 39,90',
          imagem:
            'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=400&auto=format&fit=crop',
          desc: 'Coleção exclusiva com mais de 150 presets de voz e instrumentos para acelerar suas produções.',
          categoria: 'Vocal',
          sistema_operacional: 'ambos',
        },
      ];
    }
  }, [jaTemInstalacao, osPredominante, bumpsDisponiveis]);

  const listaParaExibir = bumpsDisponiveis.length > 0 ? bumpsDisponiveis : sugestoesFallback;

  if (listaParaExibir.length === 0) return null;

  return (
    <div className="mt-4 pt-4 border-t border-stone-300">
      <div className="flex items-center justify-between mb-2.5">
        <h4 className="text-[11px] font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5 font-mono">
          🚀 UPGRADE RECOMENDADO ({osPredominante.toUpperCase()})
        </h4>
        <span className="text-[9px] font-mono font-bold bg-amber-500/15 text-amber-800 px-2 py-0.5 rounded uppercase">
          {jaTemInstalacao ? 'OFERTA EXTRA' : 'SUPORTE EXPRESS'}
        </span>
      </div>

      <div className="space-y-2.5">
        {listaParaExibir.slice(0, 2).map((item) => {
          const formatMoney = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
          const formattedPrice =
            typeof item.preco === 'string'
              ? item.preco
              : formatMoney(item.preco_promocional || item.preco || 0);

          const mappedItem: Produto = {
            id: item.id,
            nome: item.nome,
            preco: formattedPrice,
            precoAntigo: item.precoAntigo || formatMoney(item.preco || 0),
            imagem: item.imagem,
            desc: item.desc || item.descricao || '',
            categoria: item.categoria || 'Soluções',
            galeria: item.galeria || [],
            estrelas: item.estrelas || 5.0,
            sistema_operacional: item.sistema_operacional || 'ambos',
          };

          return (
            <div
              key={item.id}
              className="p-3.5 rounded-2xl border border-amber-700/30 bg-[#EBE6DC] flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <img
                  src={item.imagem}
                  alt={item.nome}
                  onClick={() => onOpenDetails(mappedItem)}
                  className="w-12 h-12 rounded-xl object-cover border border-stone-300 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
                />
                <div className="min-w-0">
                  <h5
                    onClick={() => onOpenDetails(mappedItem)}
                    className="text-xs font-bold text-[#1C1917] uppercase leading-tight cursor-pointer hover:text-amber-800 transition-colors line-clamp-2"
                  >
                    {item.nome}
                  </h5>
                  <span className="text-xs font-mono font-bold text-amber-900 mt-0.5 block">
                    {formattedPrice}
                  </span>
                </div>
              </div>
              <button
                onClick={() => onAddItem(mappedItem)}
                className="px-3 py-2 bg-[#1C1917] hover:bg-[#78350F] text-[#DFCA95] rounded-xl text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer shadow-sm transition-all flex-shrink-0"
              >
                + Incluir
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
