import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Sparkles,
  Cpu,
  Monitor,
  FileText,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Produto,
  produtos as catalogoCaixas3D,
  CAIXAS_3D_POR_ID,
  isImagemAntigaOuPlaceholder,
} from '../data/produtos';
import { supabase } from '../utils/supabaseClient';
import {
  detectUserOS,
  getTrafficAttribution,
  trackAlcateiaEvent,
  fetchMediaMetaMapFromSupabase,
  mapSupabaseRowToProduto,
} from '../utils/alcateiaStore';

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

  // Etapas do Checkout Express (Rack -> Terminal PIX Zucro)
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
  const [showDscPreviewOnPix, setShowDscPreviewOnPix] = useState(true);

  const userOS = useMemo(() => detectUserOS(), []);

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

  // Motor Server-Authoritative Zucro (Via Supabase RPC / Edge Function / Backend Route)
  const invokeZucroBackend = useCallback(async (payload: Record<string, any>) => {
    // Canal 1: Função RPC nativa no Postgres do Supabase (SECURITY DEFINER)
    try {
      const { data: rpcData, error: rpcErr } = await supabase.rpc('zucro_checkout', {
        payload,
      });
      if (!rpcErr && rpcData && (rpcData.success || rpcData.copy_paste || rpcData.paid !== undefined)) {
        return rpcData;
      }
    } catch {
      // Prossegue para o Canal 2
    }

    // Canal 2: Supabase Edge Function (zucro-checkout)
    try {
      const { data: fnData, error: fnErr } = await supabase.functions.invoke('zucro-checkout', {
        body: payload,
      });
      if (!fnErr && fnData && (fnData.success || fnData.copy_paste || fnData.paid !== undefined)) {
        return fnData;
      }
    } catch {
      // Prossegue para o Canal 3
    }

    // Canal 3: Rota Serverless (/api/zucro-checkout)
    try {
      const response = await fetch('/api/zucro-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const json = await response.json().catch(() => null);
        if (json && (json.success || json.copy_paste || json.paid !== undefined)) {
          return json;
        }
      }
    } catch {
      // Falha de rede
    }

    return null;
  }, []);

  // Dispara a liberação imediata do pedido e notifica o painel Admin em tempo real
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

    trackAlcateiaEvent('Purchase', {
      order_id: activeOrderId,
      content_ids: cartItems.map((i) => i.id),
      num_items: cartItems.length,
    });

    localStorage.removeItem('ARSENAL_CART');
    localStorage.removeItem('ALCATEIA_CART');
    if (onCheckoutSuccess) onCheckoutSuccess();
  }, [activeOrderId, cartItems, onCheckoutSuccess]);

  // Escuta em Tempo Real (Supabase Realtime) quando o Webhook da Zucro aprova o pedido
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
            trackAlcateiaEvent('Purchase', {
              order_id: activeOrderId,
              content_ids: cartItems.map((i) => i.id),
            });
            localStorage.removeItem('ARSENAL_CART');
    localStorage.removeItem('ALCATEIA_CART');
            if (onCheckoutSuccess) onCheckoutSuccess();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [checkoutStep, activeOrderId, cartItems, onCheckoutSuccess]);

  // Verificação ativa de compensação a cada 4 segundos na Zucro
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
        // Continua monitorando
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [checkoutStep, activeChargeId, activeOrderId, invokeZucroBackend, triggerPaymentApproved]);

  if (!isOpen) return null;

  // Normaliza itens com suas Caixas 3D e descrições (DSC)
  const normalizedCartItems: Produto[] = cartItems.map((item) => {
    const box = CAIXAS_3D_POR_ID[item.id];
    if (box && isImagemAntigaOuPlaceholder(item.imagem)) {
      return {
        ...item,
        nome: item.nome || box.nome,
        preco: item.preco || box.preco,
        imagem: box.imagem,
        categoria: item.categoria || box.categoria,
        desc: item.desc || box.desc,
      };
    }
    return {
      ...item,
      desc: item.desc || box?.desc || 'Licença vitalícia 64-bit com instalador guiado e suporte incluso.',
    };
  });

  const parsePrice = (precoStr: string) => {
    const numbers = precoStr.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numbers) || 0;
  };

  const valorOriginal = normalizedCartItems.reduce((acc, curr) => acc + parsePrice(curr.preco), 0);

  let percentualDesconto = 0;
  if (normalizedCartItems.length === 2) percentualDesconto = 0.1;
  if (normalizedCartItems.length >= 3) percentualDesconto = 0.2;

  const descontoTotal = Math.min(percentualDesconto + couponDiscount, 0.8);
  const valorTotal = Math.max(valorOriginal * (1 - descontoTotal), 5.0);
  const valorEconomizado = Math.max(valorOriginal - valorTotal, 0);
  const totalFormatado = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;
  const originalFormatado = `R$ ${valorOriginal.toFixed(2).replace('.', ',')}`;
  const economiaFormatada = `R$ ${valorEconomizado.toFixed(2).replace('.', ',')}`;

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
    } catch {
      setCouponMessage({ type: 'err', text: 'Erro ao validar cupom no servidor.' });
    }
  };

  // Gera a Cobrança PIX Oficial na Zucro e registra telemetria para o Admin Command Center
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
        'Produtor Arsenal';
      const ids = normalizedCartItems.map((i) => i.id);
      const attr = getTrafficAttribution();
      const referral = localStorage.getItem('alcateia_referral') || attr.utm_source || 'direto';

      const eventId = trackAlcateiaEvent('InitiateCheckout', {
        value: valorTotal,
        currency: 'BRL',
        content_ids: ids,
        num_items: ids.length,
      });

      const detalhesValores = normalizedCartItems.map((item) => {
        const precoBase = parsePrice(item.preco);
        const precoComDesconto = precoBase * (1 - descontoTotal);
        return {
          id: item.id,
          nome: item.nome,
          categoria: item.categoria,
          desc: item.desc,
          sistema_operacional: item.sistema_operacional || 'ambos',
          preco_original: precoBase,
          preco_pago: precoComDesconto,
          atribuicao: {
            utm_source: attr.utm_source,
            utm_medium: attr.utm_medium,
            utm_campaign: attr.utm_campaign,
            fbp: attr.fbp,
            fbc: attr.fbc,
            event_id: eventId,
            sistema_cliente: userOS,
          },
        };
      });

      // 1. Registra o pedido no Supabase (dispara alerta em Tempo Real no Admin Command Center)
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
        'arsenal_carrinho_pendente',
        JSON.stringify({ pedidoId, ids })
      );
      localStorage.setItem(
        'alcateia_carrinho_pendente',
        JSON.stringify({ pedidoId, ids })
      );

      // 2. Aciona o Gateway Zucro
      const zucroData = await invokeZucroBackend({
        action: 'create',
        pedido_id: pedidoId,
        valor_total: valorTotal,
        email_cliente: email,
        nome_cliente: nomeAutomatico,
      });

      if (zucroData && (zucroData.copy_paste || zucroData.qr_code_url)) {
        setPixCopyPaste(zucroData.copy_paste || null);
        setPixQrCodeUrl(zucroData.qr_code_url || null);
        setActiveChargeId(zucroData.charge_id || null);
        setActiveTxid(zucroData.txid || null);
        setCheckoutStep('pix_payment');
      } else {
        setPaymentFeedback({
          type: 'err',
          text: 'Não foi possível gerar a chave PIX na Zucro neste instante. Verifique sua conexão e tente novamente.',
        });
      }
    } catch (err: any) {
      console.error('Erro ao iniciar checkout Zucro:', err);
      setPaymentFeedback({
        type: 'err',
        text: 'Erro ao comunicar com o gateway Zucro. Tente novamente em instantes.',
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
        } catch {}
      }

      if (activeOrderId) {
        const { data } = await supabase
          .from('pedidos')
          .select('status')
          .eq('id', activeOrderId)
          .maybeSingle();

        if (data && (data.status === 'pago' || data.status === 'aprovado' || data.status === 'liberado')) {
          localStorage.removeItem('ARSENAL_CART');
    localStorage.removeItem('ALCATEIA_CART');
          if (onCheckoutSuccess) onCheckoutSuccess();
          return;
        }
      }

      setPaymentFeedback({
        type: 'info',
        text: 'Radar Bancário ativo: Assim que você concluir o PIX no aplicativo do seu banco, a Zucro confirma e libera seus links automaticamente nesta tela!',
      });
    } catch {
      setPaymentFeedback({
        type: 'err',
        text: 'Nossa verificação automática continua ativa em segundo plano.',
      });
    } finally {
      setCheckingPayment(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-stretch sm:items-center justify-center p-0 sm:p-4 bg-black/90 backdrop-blur-md animate-fade-in touch-none overscroll-none"
      onClick={onClose}
    >
      {/* No Mobile: Preenche 100% da tela toda (w-full h-[100dvh] max-h-[100dvh] rounded-none). No Desktop: Modal centralizado */}
      <div
        className={`relative w-full sm:max-w-xl rounded-none sm:rounded-3xl border-0 sm:border shadow-[0_0_70px_rgba(0,0,0,0.95)] overflow-hidden flex flex-col h-[100dvh] max-h-[100dvh] sm:h-auto sm:max-h-[92vh] touch-auto overscroll-contain modal-body-scroll transition-colors duration-300 ${
          checkoutStep === 'pix_payment'
            ? 'bg-[#090B0E] sm:border-[#C5A059]/40 text-white'
            : 'bg-[#F4F1EA] sm:border-stone-300 text-[#1C1917]'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Barra Superior de Destaque */}
        <div
          className={`h-1.5 w-full flex-shrink-0 ${
            checkoutStep === 'pix_payment'
              ? 'bg-gradient-to-r from-emerald-600 via-[#C5A059] to-emerald-600'
              : 'bg-gradient-to-r from-[#78350F] via-[#C5A059] to-[#78350F]'
          }`}
        />

        {/* Modal Header */}
        <div
          className={`px-4 sm:px-6 py-3.5 border-b flex items-center justify-between flex-shrink-0 ${
            checkoutStep === 'pix_payment'
              ? 'bg-[#0F1318] border-neutral-800'
              : 'bg-[#EBE6DC] border-stone-300'
          }`}
        >
          <div className="flex items-center gap-3">
            {checkoutStep === 'pix_payment' ? (
              <button
                onClick={() => setCheckoutStep('cart')}
                className="p-2.5 rounded-xl bg-neutral-900 border border-neutral-700 text-[#DFCA95] hover:bg-neutral-800 transition-colors cursor-pointer"
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
              <h3
                className={`text-base sm:text-lg font-heading font-black uppercase tracking-tight flex items-center gap-2 ${
                  checkoutStep === 'pix_payment' ? 'text-white' : 'text-[#1C1917]'
                }`}
              >
                {checkoutStep === 'cart' ? 'MEU RACK DE ESTÚDIO' : 'TERMINAL PIX ZUCRO'}
              </h3>
              <span
                className={`text-[10px] font-mono tracking-widest uppercase font-bold block ${
                  checkoutStep === 'pix_payment' ? 'text-emerald-400' : 'text-stone-600'
                }`}
              >
                {checkoutStep === 'cart'
                  ? `${normalizedCartItems.length} ${normalizedCartItems.length === 1 ? 'MÓDULO SELECIONADO' : 'MÓDULOS SELECIONADOS'} • SISTEMA ${userOS === 'mac' ? 'MACOS' : 'WINDOWS'}`
                  : 'CONEXÃO BANCÁRIA CRIPTOGRAFADA • LIBERAÇÃO AUTOMÁTICA'}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2.5 rounded-xl transition-colors cursor-pointer ${
              checkoutStep === 'pix_payment'
                ? 'bg-neutral-900 text-neutral-400 hover:text-white border border-neutral-800'
                : 'hover:bg-stone-300 text-stone-700 hover:text-[#1C1917]'
            }`}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Barra de Progresso Direta (2 Passos Rápidos) */}
        {normalizedCartItems.length > 0 && (
          <div className="bg-[#12151A] px-5 py-2.5 border-b border-neutral-800 flex items-center justify-between text-[10px] font-mono uppercase tracking-wider flex-shrink-0">
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
              <span>01. Rack & Oferta</span>
            </div>

            <div className="flex-1 mx-3 h-[1px] bg-neutral-800" />

            <div
              className={`flex items-center gap-2 ${
                checkoutStep === 'pix_payment' ? 'text-emerald-400 font-bold' : 'text-neutral-500'
              }`}
            >
              <span
                className={`w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-black ${
                  checkoutStep === 'pix_payment'
                    ? 'bg-emerald-500 text-black'
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
            ETAPA 2: TELA DE ESPERA DE PAGAMENTO PIX (TEMA STEALTH STUDIO CARBON & EMERALD)
           ===================================================================== */}
        {checkoutStep === 'pix_payment' ? (
          <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 bg-gradient-to-b from-[#0B0E14] via-[#090B0E] to-[#060709] overscroll-contain modal-body-scroll">
            {/* Resumo da Licença Conectada + Cronômetro */}
            <div className="p-3.5 rounded-2xl bg-[#11161F] text-white border border-emerald-500/30 flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex-shrink-0">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[9px] font-mono uppercase tracking-widest text-neutral-400">
                    LICENÇA VINCULADA AO E-MAIL:
                  </span>
                  <span className="block text-xs font-mono font-bold text-emerald-300 truncate">
                    {userSession?.user?.email}
                  </span>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <span className="block text-base sm:text-lg font-mono font-black text-white leading-none">
                  {totalFormatado}
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-mono text-[#DFCA95] mt-1">
                  <Clock className="w-3 h-3" /> Expira em {formatTimer(secondsLeft)}
                </span>
              </div>
            </div>

            {/* ÁREA DE PREVIEW DE DSC NA PÁGINA DE PAGAMENTO (DESCRIÇÃO TÉCNICA + DESCONTO DOS MÓDULOS) */}
            <div className="rounded-2xl bg-[#11161F] border border-neutral-800 overflow-hidden">
              <button
                type="button"
                onClick={() => setShowDscPreviewOnPix((prev) => !prev)}
                className="w-full px-4 py-3 flex items-center justify-between text-left bg-[#151B26] hover:bg-[#1A212E] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#C5A059]" />
                  <span className="text-[11px] font-mono font-bold text-[#DFCA95] uppercase tracking-wider">
                    PREVIEW DE DSC DO PEDIDO ({normalizedCartItems.length}{' '}
                    {normalizedCartItems.length === 1 ? 'ITEM' : 'ITENS'})
                  </span>
                  {descontoTotal > 0 && (
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[9px] font-mono font-bold uppercase">
                      ECONOMIA DE {economiaFormatada}
                    </span>
                  )}
                </div>
                {showDscPreviewOnPix ? (
                  <ChevronUp className="w-4 h-4 text-neutral-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-neutral-400" />
                )}
              </button>

              {showDscPreviewOnPix && (
                <div className="p-3.5 space-y-2.5 divide-y divide-neutral-800/80 max-h-48 overflow-y-auto">
                  {normalizedCartItems.map((item) => {
                    const precoItemBase = parsePrice(item.preco);
                    const precoItemFinal = precoItemBase * (1 - descontoTotal);
                    return (
                      <div key={item.id} className="pt-2.5 first:pt-0 flex items-start gap-3">
                        <img
                          src={item.imagem}
                          alt={item.nome}
                          className="w-11 h-11 rounded-lg object-contain bg-black p-1 border border-neutral-800 flex-shrink-0"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <h5 className="text-xs font-bold text-white uppercase truncate">
                              {item.nome}
                            </h5>
                            <div className="text-right flex-shrink-0">
                              {descontoTotal > 0 && (
                                <span className="text-[10px] font-mono text-neutral-500 line-through mr-1.5">
                                  {item.preco}
                                </span>
                              )}
                              <span className="text-xs font-mono font-bold text-emerald-400">
                                R$ {precoItemFinal.toFixed(2).replace('.', ',')}
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                            {item.desc}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-mono text-[#C5A059] uppercase font-bold">
                              {item.categoria}
                            </span>
                            <span className="text-neutral-600">•</span>
                            <span className="text-[9px] font-mono text-neutral-300 uppercase">
                              {item.sistema_operacional === 'mac'
                                ? 'Compatível: macOS'
                                : item.sistema_operacional === 'windows'
                                ? 'Compatível: Windows'
                                : 'Compatível: Windows & macOS'}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Card Principal do Terminal PIX Zucro (Fundo Escuro Tecnológico com Pulso Esmeralda) */}
            <div className="bg-[#0F141C] border border-emerald-500/30 rounded-3xl p-5 sm:p-6 text-center space-y-4 shadow-[0_0_50px_rgba(16,185,129,0.08)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />

              {/* Status Radar Ativo */}
              <div className="flex items-center justify-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/50 border border-emerald-500/40 max-w-fit mx-auto">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-emerald-300 text-[10px] font-mono font-bold uppercase tracking-widest">
                  AGUARDANDO CONFIRMAÇÃO PIX • LIBERAÇÃO EM 3 SEGUNDOS
                </span>
              </div>

              <div>
                <h4 className="text-base sm:text-lg font-heading font-black text-white uppercase tracking-tight">
                  ESCANEIE O QR CODE OU COPIE O CÓDIGO PIX
                </h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">
                  Assim que o pagamento é confirmado pela Zucro, seus links abrem automaticamente nesta tela.
                </p>
              </div>

              {/* Moldura de Alto Contraste do QR Code Oficial da Zucro */}
              {(pixQrCodeUrl || pixCopyPaste) && (
                <div className="relative p-4 bg-white rounded-2xl max-w-[215px] mx-auto shadow-[0_0_40px_rgba(16,185,129,0.2)] border-2 border-emerald-400 flex flex-col items-center justify-center">
                  <img
                    src={
                      pixQrCodeUrl &&
                      (pixQrCodeUrl.startsWith('data:image') || pixQrCodeUrl.startsWith('http'))
                        ? pixQrCodeUrl
                        : `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                            pixCopyPaste || ''
                          )}`
                    }
                    alt="QR Code PIX Oficial Zucro"
                    className="w-44 h-44 object-contain"
                  />

                  <div className="mt-2 flex items-center gap-1.5 text-[9px] font-mono font-black text-[#090B0E] uppercase tracking-wider bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-300">
                    <ShieldCheck className="w-3 h-3 text-emerald-600" />
                    <span>PIX OFICIAL BANCO CENTRAL</span>
                  </div>
                </div>
              )}

              {/* Caixa Pix Copia e Cola */}
              {pixCopyPaste && (
                <div className="space-y-2.5 pt-1 text-left">
                  <div className="p-3 rounded-xl bg-[#07090D] border border-neutral-800 relative group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-[9px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                        CÓDIGO PIX COPIA E COLA:
                      </span>
                      {activeTxid && (
                        <span className="text-[9px] font-mono text-neutral-500">
                          ID: {activeTxid.slice(0, 10)}
                        </span>
                      )}
                    </div>
                    <p className="font-mono text-[10px] text-neutral-300 break-all line-clamp-2 select-all leading-relaxed">
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
                        ? 'bg-emerald-400 text-black shadow-[0_0_25px_rgba(16,185,129,0.5)]'
                        : 'bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-500 hover:brightness-110 text-[#060709] shadow-[0_6px_25px_rgba(16,185,129,0.3)]'
                    }`}
                  >
                    {copiedPix ? (
                      <>
                        <Check className="w-4 h-4 stroke-[3]" />
                        <span>CÓDIGO PIX COPIADO! COLE NO APP DO SEU BANCO</span>
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
                <div className="p-2.5 rounded-xl bg-[#141A24] border border-neutral-800">
                  <span className="text-[9px] font-mono font-black text-[#DFCA95] block">
                    01. APP DO BANCO
                  </span>
                  <span className="text-[10px] text-neutral-300 leading-tight block mt-0.5">
                    Abra a área PIX do seu banco.
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#141A24] border border-neutral-800">
                  <span className="text-[9px] font-mono font-black text-[#DFCA95] block">
                    02. PAGUE O PIX
                  </span>
                  <span className="text-[10px] text-neutral-300 leading-tight block mt-0.5">
                    Use QR Code ou Pix Copia e Cola.
                  </span>
                </div>
                <div className="p-2.5 rounded-xl bg-[#141A24] border border-emerald-500/30">
                  <span className="text-[9px] font-mono font-black text-emerald-400 block">
                    03. LIBERAÇÃO
                  </span>
                  <span className="text-[10px] text-neutral-300 leading-tight block mt-0.5">
                    Seus arquivos abrem aqui na hora!
                  </span>
                </div>
              </div>
            </div>

            {/* Feedback de Verificação Interna */}
            {paymentFeedback && (
              <div
                className={`p-3.5 rounded-2xl border flex items-start gap-2.5 text-xs font-mono ${
                  paymentFeedback.type === 'ok'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : paymentFeedback.type === 'err'
                    ? 'bg-red-950/40 border-red-500/40 text-red-200'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
                <span>{paymentFeedback.text}</span>
              </div>
            )}

            {/* Verificação Manual & Painel de Acessos */}
            <div className="p-4 rounded-2xl bg-[#11161F] border border-neutral-800 space-y-2.5">
              <button
                type="button"
                onClick={handleVerifyPaymentStatus}
                disabled={checkingPayment}
                className="w-full py-3.5 px-4 rounded-xl bg-[#1A2230] hover:bg-neutral-800 text-white border border-neutral-700 font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                {checkingPayment ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                    <span>CONSULTANDO COMPENSAÇÃO NA ZUCRO...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>[ JÁ PAGUEI — VERIFICAR E DESTRAVAR DOWNLOADS ]</span>
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
                  className="w-full py-2 text-[11px] font-mono font-bold text-neutral-400 hover:text-white uppercase tracking-wider underline underline-offset-4 cursor-pointer"
                >
                  Abrir "Meus Acessos & Downloads" →
                </button>
              )}
            </div>
          </div>
        ) : (
          /* =====================================================================
              ETAPA 1: RACK DE PLUGINS + PREVIEW DSC + ORDER BUMP INTELIGENTE POR SISTEMA
             ===================================================================== */
          <>
            <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 overscroll-contain modal-body-scroll">
              {normalizedCartItems.length === 0 ? (
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
                        {normalizedCartItems.length === 1 && '🔥 Adicione +1 item para ganhar 10% OFF no Combo!'}
                        {normalizedCartItems.length === 2 && '⚡ 10% OFF Ativo! +1 item libera 20% OFF no Rack!'}
                        {normalizedCartItems.length >= 3 && '👑 COMBO MÁXIMO: 20% OFF DESBLOQUEADO NO SEU RACK!'}
                      </span>
                      <span className="text-neutral-400 font-bold">
                        {Math.min(normalizedCartItems.length, 3)}/3
                      </span>
                    </div>
                    <div className="w-full h-2 bg-neutral-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-700 via-[#C5A059] to-[#DFCA95] transition-all duration-500"
                        style={{ width: `${Math.min((normalizedCartItems.length / 3) * 100, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Itens Adicionados com Preview de DSC (Descrição + Sistema) */}
                  <div className="space-y-3">
                    {normalizedCartItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3.5 p-3.5 rounded-2xl bg-carbon border border-neutral-800 hover:border-[#C5A059]/50 shadow-sm transition-colors"
                      >
                        <img
                          src={item.imagem}
                          alt={item.nome}
                          onClick={() => {
                            onClose();
                            onOpenDetails(item);
                          }}
                          className="w-16 h-16 rounded-xl object-contain bg-[#0B0D0E] p-1 flex-shrink-0 border border-neutral-800 cursor-pointer hover:opacity-80 transition-opacity"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono tracking-widest uppercase text-[#C5A059] font-bold">
                              {item.categoria}
                            </span>
                            <span className="text-neutral-600">•</span>
                            <span className="text-[9px] font-mono text-emerald-400 uppercase">
                              {item.sistema_operacional === 'mac'
                                ? 'macOS'
                                : item.sistema_operacional === 'windows'
                                ? 'Windows'
                                : 'Win & Mac'}
                            </span>
                          </div>
                          <h4
                            onClick={() => {
                              onClose();
                              onOpenDetails(item);
                            }}
                            className="text-xs sm:text-sm font-bold text-white uppercase tracking-tight truncate cursor-pointer hover:text-[#DFCA95] transition-colors"
                          >
                            {item.nome}
                          </h4>
                          {/* Preview de DSC direto no item */}
                          <p className="text-[11px] text-neutral-400 line-clamp-2 mt-0.5 leading-snug">
                            {item.desc}
                          </p>
                          <span className="block text-sm font-mono font-bold text-stone-100 mt-1">
                            {item.preco}
                          </span>
                        </div>
                        <button
                          onClick={() => onRemoveItem(item.id)}
                          title="Remover item"
                          className="p-2 rounded-full text-stone-400 bg-black/60 border border-neutral-800 hover:text-red-400 hover:border-red-400 transition-colors cursor-pointer flex-shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Order Bump com Inteligência baseada no Sistema do Usuário e Sinergia de Categorias */}
                  <OrderBumpSection
                    cartItems={normalizedCartItems}
                    userOS={userOS}
                    onAddItem={(prod) => {
                      trackAlcateiaEvent('AddToCart', {
                        content_ids: [prod.id],
                        content_name: prod.nome,
                        source: 'smart_order_bump',
                      });
                      onAddItem(prod);
                    }}
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
            {normalizedCartItems.length > 0 && (
              <div className="border-t border-stone-300 flex flex-col bg-[#EBE6DC] flex-shrink-0">
                {/* Resumo de Valores */}
                <div className="px-4 sm:px-6 pt-3.5 pb-2.5 flex items-end justify-between">
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
                      -{(descontoTotal * 100).toFixed(0)}% OFF ({economiaFormatada})
                    </span>
                  )}
                </div>

                {/* Cupom de Parceiro */}
                <div className="px-4 sm:px-6 pb-2.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      placeholder="CUPOM DE DESCONTO (OPCIONAL)"
                      disabled={!!appliedCoupon}
                      className="flex-1 min-w-0 bg-[#FAF8F5] border border-stone-300 rounded-xl px-3 py-2 text-xs text-[#1C1917] focus:outline-none focus:border-amber-700 font-mono uppercase"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={!!appliedCoupon}
                      className="px-4 py-2 bg-[#1C1917] text-[#DFCA95] text-xs font-mono font-bold uppercase tracking-wider rounded-xl hover:bg-[#78350F] transition-colors disabled:bg-stone-300 disabled:text-stone-500 cursor-pointer"
                    >
                      {appliedCoupon ? 'APLICADO' : 'APLICAR'}
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

                {/* BLOCO DE E-MAIL VINCULADO */}
                <div className="px-4 sm:px-6 pb-3">
                  {userSession?.user ? (
                    <div className="p-2.5 rounded-xl bg-emerald-950/10 border border-emerald-700/30 flex items-center justify-between text-xs">
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
                    <div className="p-3 rounded-2xl bg-carbon text-white border border-neutral-800 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <Lock className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                        <div className="text-[11px] leading-tight">
                          <span className="font-bold text-[#DFCA95] block uppercase font-mono">
                            Vincule seu E-mail para Entrega
                          </span>
                          <span className="text-neutral-400">
                            Seus downloads ficam salvos vitaliciamente na sua conta.
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

                {/* Botão Principal de Ação (1-Click para o QR Code PIX Zucro) */}
                <button
                  onClick={handleGeneratePixCharge}
                  disabled={isProcessingPIX}
                  className="w-full min-h-[58px] bg-[#1C1917] text-[#F4F1EA] font-heading font-black uppercase tracking-widest text-xs py-4 sm:py-5 border-t border-amber-800/40 hover:bg-[#78350F] hover:shadow-[0_0_20px_rgba(146,64,14,0.35)] transition-all flex items-center justify-center disabled:opacity-50 cursor-pointer pb-safe"
                >
                  {isProcessingPIX ? (
                    <span className="flex items-center gap-2 text-[#DFCA95]">
                      <Loader2 className="w-4 h-4 animate-spin" /> GERANDO QR CODE PIX NA ZUCRO...
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

/* ============================================================================
   MOTOR DE RECOMENDAÇÃO DE ORDER BUMP BASEADO NO SISTEMA DO USUÁRIO + AFINIDADE
   ============================================================================ */
const OrderBumpSection: React.FC<{
  cartItems: Produto[];
  userOS: 'windows' | 'mac';
  onAddItem: (produto: Produto) => void;
  onOpenDetails: (produto: Produto) => void;
}> = ({ cartItems, userOS, onAddItem, onOpenDetails }) => {
  const [catalogoCompleto, setCatalogoCompleto] = useState<Produto[]>(catalogoCaixas3D);

  useEffect(() => {
    const fetchBumps = async () => {
      try {
        const [solRes, mediaMeta] = await Promise.all([
          supabase.from('solutions').select('*').eq('visivel', true),
          fetchMediaMetaMapFromSupabase(),
        ]);

        if (solRes.data && solRes.data.length > 0) {
          const mapped = solRes.data.map((sol: any) => mapSupabaseRowToProduto(sol, mediaMeta));
          setCatalogoCompleto(mapped);
        }
      } catch {
        setCatalogoCompleto(catalogoCaixas3D.filter((p) => p.visivel !== false));
      }
    };
    fetchBumps();
  }, [cartItems]);

  const recomendacoesInteligentes = useMemo(() => {
    // 1. Filtra produtos que não estão no carrinho e que são compatíveis com o Sistema Operacional do Usuário
    const disponiveisCompativeis = catalogoCompleto.filter((item) => {
      if (item.visivel === false) return false;
      const jaNoCarrinho = cartItems.some(
        (cart) => cart.id === item.id || cart.nome.toLowerCase() === item.nome.toLowerCase()
      );
      if (jaNoCarrinho) return false;

      const sysItem = item.sistema_operacional || 'ambos';
      return sysItem === 'ambos' || sysItem === userOS;
    });

    // 2. Identifica categorias presentes no carrinho para recomendar complementos sinérgicos
    const categoriasNoCarrinho = new Set(cartItems.map((c) => c.categoria.toLowerCase()));
    const temDaw =
      categoriasNoCarrinho.has('daws') || categoriasNoCarrinho.has('daws (softwares)');
    const temMix = categoriasNoCarrinho.has('mixagem');
    const temVocal = categoriasNoCarrinho.has('vocal');

    // Pontuação de afinidade por produto
    const scored = disponiveisCompativeis.map((item) => {
      let score = 0;
      const cat = item.categoria.toLowerCase();

      // Prioridade máxima para produtos marcados pelo Admin como Order Bump
      if (item.is_orderbump) score += 50;

      // Compatibilidade nativa com o sistema detectado
      if (item.sistema_operacional === userOS || item.sistema_operacional === 'ambos') {
        score += 20;
      }

      // Inteligência de Cross-Sell por Categoria
      if (temDaw && (cat === 'mixagem' || cat === 'vocal' || cat === 'instrumentos')) {
        score += 35;
      } else if (temVocal && (cat === 'mixagem' || cat === 'efeitos')) {
        score += 35;
      } else if (temMix && (cat === 'vocal' || cat === 'efeitos' || cat === 'instrumentos')) {
        score += 30;
      } else if (!categoriasNoCarrinho.has(cat)) {
        score += 25;
      }

      // Motivo personalizado da recomendação
      let motivo = `100% Compatível com seu ${userOS === 'mac' ? 'macOS' : 'Windows'}`;
      if (temDaw && cat === 'mixagem') {
        motivo = 'Complemento cirúrgico de Mixagem para sua DAW';
      } else if (temDaw && cat === 'vocal') {
        motivo = 'Afinação profissional de voz para sua DAW';
      } else if (temVocal && cat === 'mixagem') {
        motivo = 'Equalização e ambiência ideal para seus vocais';
      }

      return { item, score, motivo };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, 2);
  }, [catalogoCompleto, cartItems, userOS]);

  if (recomendacoesInteligentes.length === 0) return null;

  const proximoDesconto = cartItems.length === 1 ? '10% OFF' : '20% OFF';

  return (
    <div className="mt-4 pt-4 border-t border-stone-300">
      <div className="flex items-center justify-between gap-2 mb-2.5 flex-wrap">
        <h4 className="text-[11px] font-bold text-[#1C1917] uppercase tracking-wider flex items-center gap-1.5 font-mono">
          <Sparkles className="w-3.5 h-3.5 text-amber-700" />
          <span>RECOMENDADO PARA SEU SISTEMA ({userOS === 'mac' ? 'MACOS' : 'WINDOWS'})</span>
        </h4>
        <span className="text-[9px] font-mono font-bold bg-[#1C1917] text-[#DFCA95] px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1">
          {userOS === 'mac' ? <Cpu className="w-3 h-3" /> : <Monitor className="w-3 h-3" />}
          DESTRAVA {proximoDesconto} NO COMBO
        </span>
      </div>

      <div className="space-y-2.5">
        {recomendacoesInteligentes.map(({ item, motivo }) => (
          <div
            key={item.id}
            className="p-3.5 rounded-2xl border-2 border-amber-700/40 bg-[#EBE6DC] hover:border-amber-700 transition-all flex items-center justify-between gap-3 shadow-sm"
          >
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={item.imagem}
                alt={item.nome}
                onClick={() => onOpenDetails(item)}
                className="w-13 h-13 rounded-xl object-contain bg-[#1C1917] p-1 border border-stone-300 cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0"
              />
              <div className="min-w-0">
                <span className="inline-block text-[9px] font-mono font-bold text-emerald-800 bg-emerald-500/15 px-1.5 py-0.5 rounded uppercase mb-0.5">
                  ✓ {motivo}
                </span>
                <h5
                  onClick={() => onOpenDetails(item)}
                  className="text-xs font-bold text-[#1C1917] uppercase leading-tight cursor-pointer hover:text-amber-800 transition-colors line-clamp-1"
                >
                  {item.nome}
                </h5>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs font-mono font-black text-amber-900">
                    {item.preco}
                  </span>
                  {item.precoAntigo && item.precoAntigo !== item.preco && (
                    <span className="text-[10px] font-mono text-stone-500 line-through">
                      {item.precoAntigo}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onAddItem(item)}
              className="px-3.5 py-2.5 rounded-xl bg-[#1C1917] hover:bg-[#78350F] text-[#DFCA95] font-mono text-[10px] font-black uppercase tracking-wider flex-shrink-0 transition-colors cursor-pointer shadow-sm"
            >
              + ADICIONAR
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
