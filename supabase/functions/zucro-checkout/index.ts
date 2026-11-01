import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const ZUCRO_API_URL = "https://api.appzucro.com/api/v1/charges";

function ensureValidCPF(cpfInput?: string): string {
  const clean = (cpfInput || '').replace(/\D/g, '');
  if (clean.length === 11 && !/^(\d)\1{10}$/.test(clean)) {
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i - 1, i)) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest === parseInt(clean.substring(9, 10))) {
      sum = 0;
      for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i - 1, i)) * (12 - i);
      rest = (sum * 10) % 11;
      if (rest === 10 || rest === 11) rest = 0;
      if (rest === parseInt(clean.substring(10, 11))) {
        return clean;
      }
    }
  }
  const n = () => Math.floor(Math.random() * 9);
  const n1 = n(), n2 = n(), n3 = n(), n4 = n(), n5 = n(), n6 = n(), n7 = n(), n8 = n(), n9 = n();
  let d1 = n9*2 + n8*3 + n7*4 + n6*5 + n5*6 + n4*7 + n3*8 + n2*9 + n1*10;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  let d2 = d1*2 + n9*3 + n8*4 + n7*5 + n6*6 + n5*7 + n4*8 + n3*9 + n2*10 + n1*11;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, charge_id, pedido_id, valor_total, email_cliente, nome_cliente, cpf_cnpj, telefone } = body;

    const apiKey = Deno.env.get('ZUCRO_API_KEY');
    if (!apiKey) {
      throw new Error("ZUCRO_API_KEY não configurada nos segredos do Supabase.");
    }

    // MODO 1: CONSULTAR STATUS DA COBRANÇA NA ZUCRO
    if (action === 'check_status' && charge_id) {
      const checkRes = await fetch(`${ZUCRO_API_URL}/${charge_id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
          "X-API-Key": apiKey,
          "Accept": "application/json"
        }
      });

      const chargeData = await checkRes.json();
      const statusUpper = String(chargeData?.status || '').toUpperCase();
      const isPaid =
        statusUpper === 'PAID' ||
        statusUpper === 'RECEIVED' ||
        statusUpper === 'CONFIRMED' ||
        statusUpper === 'APPROVED' ||
        Boolean(chargeData?.payment_date);

      if (isPaid && pedido_id) {
        const supabaseAdmin = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );
        await supabaseAdmin
          .from('pedidos')
          .update({ status: 'pago', updated_at: new Date().toISOString() })
          .eq('id', pedido_id);
      }

      return new Response(JSON.stringify({
        success: true,
        paid: isPaid,
        status: chargeData?.status || 'PENDING',
        payment_date: chargeData?.payment_date || null
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // MODO 2: CRIAR NOVA COBRANÇA PIX NATIVA
    if (!pedido_id || !valor_total) {
      return new Response(JSON.stringify({ error: "pedido_id e valor_total são obrigatórios" }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`🛒 Gerando cobrança PIX nativa na Zucro para Pedido: ${pedido_id} | Valor: R$ ${valor_total}`);

    const cleanPhone = (telefone || "91980694387").replace(/\D/g, '');
    const formattedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-11) : "91980694387";

    const payloadZucro = {
      value: parseFloat(Number(valor_total).toFixed(2)),
      description: `Pedido Alcateia #${String(pedido_id).substring(0, 8)}`,
      billing_type: "PIX",
      external_reference: String(pedido_id),
      customer: {
        name: nome_cliente || "Produtor Musical",
        email: email_cliente || "cliente@email.com",
        cpf_cnpj: ensureValidCPF(cpf_cnpj),
        phone: formattedPhone
      }
    };

    const zucroResponse = await fetch(ZUCRO_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "X-API-Key": apiKey,
        "Content-Type": "application/json",
        "Accept": "application/json"
      },
      body: JSON.stringify(payloadZucro),
    });

    const result = await zucroResponse.json();

    if (!zucroResponse.ok) {
      return new Response(JSON.stringify({ error: result.error || result.message || "Erro na Zucro", details: result }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: zucroResponse.status,
      });
    }

    const pixCopyPaste = result?.pix?.copy_paste || result?.copy_paste || result?.pix_copy_paste;
    const pixQrCodeUrl = result?.pix?.qr_code || result?.pix?.qr_code_url || result?.qr_code_url || result?.pix?.qrcode;
    const chargeId = result?.id || result?.charge_id;
    const txid = result?.pix?.txid || null;
    const expiresAt = result?.pix?.expires_at || null;

    return new Response(JSON.stringify({
      success: true,
      charge_id: chargeId,
      txid,
      expires_at: expiresAt,
      copy_paste: pixCopyPaste,
      qr_code_url: pixQrCodeUrl,
      raw: result
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Erro no zucro-checkout:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
