import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-webhook-event, x-webhook-secret',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    const webhookEvent = req.headers.get('x-webhook-event') || payload?.event;
    console.log(`🔥 Webhook Zucro RECEBIDO (${webhookEvent}):`, JSON.stringify(payload));

    // 1. Gravar nos logs para auditoria
    try {
      await supabaseClient.from('webhook_logs').insert([{ payload }]);
    } catch (logErr) {
      console.warn("Aviso ao salvar log:", logErr);
    }

    const event = (webhookEvent || payload?.event || payload?.type || '').toLowerCase();
    const data = payload?.data || payload;

    // Verificar se é pagamento recebido
    const isPago = 
      event === 'payment.received' || 
      event.includes('payment') || 
      event.includes('paid') || 
      event.includes('approved') ||
      data?.status === 'paid' ||
      data?.status === 'approved';

    if (!isPago) {
      console.log(`ℹ️ Evento ${event} não é de pagamento recebido. Ignorando.`);
      return new Response(JSON.stringify({ received: true, event }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 2. Extrair identificadores do pedido
    const pedidoId = 
      data?.external_reference || 
      data?.reference_id || 
      data?.metadata?.pedido_id || 
      data?.custom_id || 
      payload?.external_reference;

    const emailCliente = 
      data?.customer?.email || 
      data?.payer?.email || 
      data?.client?.email || 
      payload?.email;

    let query = supabaseClient.from('pedidos').update({
      status: 'pago',
      updated_at: new Date().toISOString()
    });

    if (pedidoId) {
      console.log(`🎯 Atualizando pedido por ID: ${pedidoId}`);
      query = query.eq('id', pedidoId);
    } else if (emailCliente) {
      console.log(`🎯 Atualizando pedido do cliente ${emailCliente}`);
      query = query.eq('email_cliente', emailCliente).in('status', ['pendente_pix', 'pendente_whatsapp']);
    } else {
      console.warn("⚠️ Nenhum pedido_id ou email_cliente encontrado.");
      return new Response(JSON.stringify({ error: "Identificador não encontrado" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { error: updateError } = await query;
    if (updateError) {
      console.error("❌ Erro ao atualizar pedido no Supabase:", updateError);
      throw updateError;
    }

    console.log("✅ Pedido atualizado para 'pago' com sucesso! Realtime disparado no site.");

    return new Response(JSON.stringify({ success: true, message: "Acesso liberado!" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("💥 Erro no zucro-webhook:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
