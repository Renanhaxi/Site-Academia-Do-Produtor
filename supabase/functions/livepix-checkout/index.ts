import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// CREDENCIAIS LIVEPIX (API OFICIAL)
// =====================================================
const LIVEPIX_CLIENT_ID = "2f27ff00-c78e-40a5-8861-2acf41bc72ab";
const LIVEPIX_CLIENT_SECRET = "9h/kA6Qwd5iTJBTDRoVljn/O+oPCgIe/nfBY0zOTfmlwP00H9REnXBh5YFWj0Nb+YPs/Y0lagoB/VWIAHCOFpH29G/BFqlU9qRHOYGhjt5b7UAKqA7osGeK5jBRX/RMNWN9mEBBd68E960ABq8LZV88JJCYUld7W5k/tSW4HuV8";
const LIVEPIX_OAUTH_URL = "https://oauth.livepix.gg/oauth2/token";
const LIVEPIX_API_URL = "https://api.livepix.gg";

// =====================================================
// STEP 1: Obter Token de Acesso via OAuth2
// =====================================================
async function getLivePixToken(): Promise<string> {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", LIVEPIX_CLIENT_ID);
  params.append("client_secret", LIVEPIX_CLIENT_SECRET);
  params.append("scope", "payments:write");

  const response = await fetch(LIVEPIX_OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro ao obter token LivePix: ${err}`);
  }

  const tokenData = await response.json();
  console.log("✅ Token obtido com sucesso!");
  return tokenData.access_token;
}

// =====================================================
// STEP 2: Criar Cobrança PIX no LivePix
// =====================================================
async function createLivePixPayment(
  token: string, 
  valorEmCentavos: number, 
  pedidoId: string
): Promise<{ checkoutUrl: string; paymentId: string }> {
  
  const response = await fetch(`${LIVEPIX_API_URL}/v2/payments`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: valorEmCentavos,
      currency: "BRL",
      reference: pedidoId, // ESTE é o campo que volta no webhook!
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro ao criar pagamento LivePix: ${err}`);
  }

  const paymentData = await response.json();
  console.log("✅ Pagamento criado:", JSON.stringify(paymentData));

  // A resposta do LivePix tem diferentes formatos dependendo da versão
  const checkoutUrl = 
    paymentData?.checkoutUrl || 
    paymentData?.checkout_url || 
    paymentData?.url ||
    paymentData?.data?.checkoutUrl ||
    paymentData?.data?.url ||
    `https://livepix.gg/alcateiadeprodutores?amount=${valorEmCentavos}`;

  const paymentId = paymentData?.id || paymentData?.data?.id || pedidoId;

  return { checkoutUrl, paymentId };
}

// =====================================================
// HANDLER PRINCIPAL
// =====================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const body = await req.json();
    const { pedido_id, valor_total } = body;

    if (!pedido_id || !valor_total) {
      return new Response(JSON.stringify({ error: 'pedido_id e valor_total são obrigatórios' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    console.log(`🛒 Criando pagamento para pedido ${pedido_id} | Valor: R$ ${valor_total}`);

    // Converter valor para centavos (LivePix usa centavos)
    const valorEmCentavos = Math.round(parseFloat(valor_total) * 100);

    // Step 1: Obter token OAuth
    const token = await getLivePixToken();

    // Step 2: Criar cobrança com o ID do pedido como reference
    const { checkoutUrl, paymentId } = await createLivePixPayment(token, valorEmCentavos, pedido_id);

    console.log(`✅ Checkout criado! URL: ${checkoutUrl}`);

    return new Response(JSON.stringify({ 
      success: true, 
      checkout_url: checkoutUrl,
      payment_id: paymentId
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("💥 Erro no livepix-checkout:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
