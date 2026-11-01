import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// =====================================================
// CONFIGURAÇÕES E CREDENCIAIS
// =====================================================
const LIVEPIX_OAUTH_URL = "https://oauth.livepix.gg/oauth2/token";
const LIVEPIX_API_URL = "https://api.livepix.gg";

// Credenciais LivePix padrão
const LIVEPIX_CLIENT_ID = "2f27ff00-c78e-40a5-8861-2acf41bc72ab";
const LIVEPIX_CLIENT_SECRET = "9h/kA6Qwd5iTJBTDRoVljn/O+oPCgIe/nfBY0zOTfmlwP00H9REnXBh5YFWj0Nb+YPs/Y0lagoB/VWIAHCOFpH29G/BFqlU9qRHOYGhjt5b7UAKqA7osGeK5jBRX/RMNWN9mEBBd68E960ABq8LZV88JJCYUld7W5k/tSW4HuV8";

// Chave da API do Resend
const RESEND_API_KEY = "re_9FXwyccz_DuK7xwi4DDktc6FZHHNZYkva";

// =====================================================
// AUTENTICAÇÃO E BUSCA NO LIVEPIX
// =====================================================
async function getLivePixReadToken(clientId: string, clientSecret: string): Promise<string> {
  try {
    const params = new URLSearchParams();
    params.append("grant_type", "client_credentials");
    params.append("client_id", clientId);
    params.append("client_secret", clientSecret);
    params.append("scope", "payments:read messages:read");

    const response = await fetch(LIVEPIX_OAUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
    });

    if (response.ok) {
      const tokenData = await response.json();
      return tokenData.access_token;
    }
    console.warn("⚠️ Falha ao obter token com escopos específicos. Tentando escopo padrão...");
  } catch (err) {
    console.warn("⚠️ Exceção ao obter token com escopo específico:", err);
  }

  // Fallback: escopo padrão (sem scope na requisição)
  const paramsFallback = new URLSearchParams();
  paramsFallback.append("grant_type", "client_credentials");
  paramsFallback.append("client_id", clientId);
  paramsFallback.append("client_secret", clientSecret);

  const responseFallback = await fetch(LIVEPIX_OAUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: paramsFallback.toString(),
  });

  if (!responseFallback.ok) {
    const err = await responseFallback.text();
    throw new Error(`Erro crítico ao obter token LivePix OAuth: ${err}`);
  }

  const tokenData = await responseFallback.json();
  return tokenData.access_token;
}

async function getLivePixResource(token: string, id: string, type: string) {
  const isMessage = type.toLowerCase() === 'message';
  const url = isMessage
    ? `${LIVEPIX_API_URL}/v2/messages/${id}`
    : `${LIVEPIX_API_URL}/v2/payments/${id}`;
  
  console.log(`🌐 Buscando detalhes em: ${url}`);
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`,
      "User-Agent": "alcateia-catalogo/1.0"
    }
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Erro na API LivePix (${type}): ${err}`);
  }

  const result = await response.json();
  return result;
}

// =====================================================
// EXECUÇÃO DO WEBHOOK
// =====================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const payload = await req.json();
    console.log("🔥 Webhook LivePix RECEBIDO:", JSON.stringify(payload));

    // Salvar nos logs do banco de dados para depuração e análise
    try {
      await supabaseClient.from('webhook_logs').insert([{ payload }]);
    } catch (logErr) {
      console.warn("⚠️ Não foi possível salvar log do webhook na tabela:", logErr);
    }

    const resourceId = payload?.resource?.id || payload?.id;
    let resourceType = payload?.resource?.type || payload?.type || '';

    if (!resourceId) {
      console.log("ℹ️ Webhook sem ID de recurso. Ignorando.");
      return new Response(JSON.stringify({ ok: true, info: 'sem ID' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Obter credenciais dinâmicas ou estáticas
    const CLIENT_ID = LIVEPIX_CLIENT_ID;
    const CLIENT_SECRET = LIVEPIX_CLIENT_SECRET;
    const RESEND_KEY = Deno.env.get('RESEND_API_KEY') || RESEND_API_KEY;
    const EMAIL_SENDER = Deno.env.get('EMAIL_SENDER') || 'Alcateia dos Produtores <onboarding@resend.dev>';

    console.log(`🔑 Obtendo token de leitura do LivePix...`);
    const token = await getLivePixReadToken(CLIENT_ID, CLIENT_SECRET);

    let details: any = null;
    let fetchError: any = null;

    // Se temos o tipo informado no webhook, tenta ele primeiro
    if (resourceType) {
      try {
        details = await getLivePixResource(token, resourceId, resourceType);
      } catch (err) {
        console.warn(`⚠️ Falha ao buscar como ${resourceType}, tentará o outro tipo...`, err);
        fetchError = err;
      }
    }

    // Se falhou ou não tinha tipo, tenta o outro tipo (message/payment)
    if (!details) {
      const alternativeType = resourceType === 'message' ? 'payment' : 'message';
      try {
        details = await getLivePixResource(token, resourceId, alternativeType);
        resourceType = alternativeType;
      } catch (err) {
        console.error(`❌ Falha crítica ao buscar recurso do LivePix em ambos os tipos:`, err);
        throw fetchError || err;
      }
    }

    const reference = details?.data?.reference || details?.reference || '';
    const messageText = details?.data?.message || details?.message || '';

    console.log(`🔍 Dados obtidos - Reference: "${reference}" | Message: "${messageText}"`);

    // Procurar por UUID de pedido no reference ou no corpo da mensagem
    const uuidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    let pedidoId: string | null = null;

    const refMatch = reference.match(uuidRegex);
    if (refMatch) {
      pedidoId = refMatch[0];
    } else {
      const msgMatch = messageText.match(uuidRegex);
      if (msgMatch) {
        pedidoId = msgMatch[0];
      }
    }

    if (!pedidoId) {
      console.log("ℹ️ Nenhum UUID de pedido (pedido_id) encontrado no payload do LivePix. Ignorando.");
      return new Response(JSON.stringify({ ok: true, info: 'pedido_id não encontrado' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    console.log(`🎯 Pedido ID identificado com sucesso: ${pedidoId}`);

    // 1. Buscar o pedido no Supabase
    const { data: pedido, error: fetchOrderError } = await supabaseClient
      .from('pedidos')
      .select('*')
      .eq('id', pedidoId)
      .single();

    if (fetchOrderError || !pedido) {
      console.error("❌ Pedido não encontrado no banco de dados:", fetchOrderError);
      throw new Error(`Pedido ${pedidoId} não encontrado no banco.`);
    }

    // 2. Se o pedido já estiver pago, ignora para não reenviar e-mail
    if (pedido.status === 'pago') {
      console.log(`ℹ️ Pedido ${pedidoId} já está marcado como pago. Encerrando para evitar reenvio.`);
      return new Response(JSON.stringify({ ok: true, status: 'já pago' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // 3. Atualizar status para 'pago' (dispara realtime)
    const { error: updateError } = await supabaseClient
      .from('pedidos')
      .update({ status: 'pago', updated_at: new Date().toISOString() })
      .eq('id', pedidoId);

    if (updateError) {
      console.error("❌ Erro ao atualizar status do pedido:", updateError);
      throw updateError;
    }
    console.log(`✅ Pedido ${pedidoId} atualizado para status 'pago'!`);

    // 4. Carregar os produtos e os links de entrega
    const produtoIds = pedido.produto_ids || [];
    let produtos: any[] = [];
    if (produtoIds.length > 0) {
      const { data: dataProdutos, error: fetchProdutosError } = await supabaseClient
        .from('solutions')
        .select('id, nome, link_entrega')
        .in('id', produtoIds);
      
      if (fetchProdutosError) {
        console.error("❌ Erro ao buscar produtos correspondentes:", fetchProdutosError);
      } else {
        produtos = dataProdutos || [];
      }
    }

    // 5. Montar HTML do e-mail
    const productsHtml = produtos.map(p => `
      <div style="background-color: #0A0D0C; border: 1px solid #1A201E; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
        <div style="font-size: 16px; color: #F5F5F5; font-weight: bold; margin-bottom: 10px; text-transform: uppercase;">${p.nome}</div>
        ${p.link_entrega ? `
          <a href="${p.link_entrega}" style="display: inline-block; background-color: #E52E2E; color: #FFFFFF !important; text-decoration: none; padding: 10px 20px; border-radius: 4px; font-weight: bold; font-size: 13px; text-transform: uppercase; letter-spacing: 1px; margin-top: 5px;" target="_blank">Fazer Download</a>
        ` : `
          <div style="font-size: 12px; color: #E52E2E; font-weight: bold; text-transform: uppercase;">Link indisponível. Entre em contato com o suporte.</div>
        `}
      </div>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            background-color: #0A0D0C;
            color: #F5F5F5;
            font-family: 'Courier New', Courier, monospace;
            margin: 0;
            padding: 0;
          }
        </style>
      </head>
      <body style="background-color: #0A0D0C; color: #F5F5F5; font-family: sans-serif; margin: 0; padding: 0;">
        <div style="max-width: 600px; margin: 40px auto; background-color: #0D1110; border: 1px solid #1A201E; border-radius: 12px; overflow: hidden;">
          <div style="background-color: #0A0D0C; padding: 30px; border-bottom: 2px solid #E52E2E; text-align: center;">
            <h1 style="color: #E52E2E; margin: 0; font-size: 24px; letter-spacing: 2px; text-transform: uppercase; font-family: monospace;">Alcateia dos Produtores</h1>
          </div>
          <div style="padding: 40px 30px;">
            <div style="font-size: 18px; color: #F5F5F5; margin-bottom: 20px; font-weight: bold; font-family: monospace;">SEU ACESSO ESTÁ LIBERADO!</div>
            <div style="font-size: 12px; color: #888; border-bottom: 1px solid #1A201E; padding-bottom: 15px; margin-bottom: 25px; font-family: monospace; text-transform: uppercase;">
              PEDIDO: ${pedidoId}<br>
              E-MAIL: ${pedido.email_cliente}<br>
              DATA: ${new Date().toLocaleDateString('pt-BR')}
            </div>
            
            <p style="font-size: 14px; color: #BBB; line-height: 1.6; margin-bottom: 25px;">
              Seu pagamento via Pix foi verificado e aprovado automaticamente. Abaixo estão os links exclusivos para realizar o download das suas ferramentas:
            </p>

            ${productsHtml}

            <div style="background-color: rgba(229, 46, 46, 0.05); border: 1px dashed rgba(229, 46, 46, 0.3); border-radius: 8px; padding: 20px; margin-top: 30px; text-align: center;">
              <div style="color: #E52E2E; font-weight: bold; font-size: 14px; margin-bottom: 8px; text-transform: uppercase; font-family: monospace;">[ SUPORTE VIP & INSTALAÇÃO ]</div>
              <div style="font-size: 12px; color: #BBB; line-height: 1.5; margin-bottom: 15px;">
                Se precisar de suporte para instalação ou ativação de qualquer item, nossa equipe técnica pode realizar o procedimento remotamente via AnyDesk com total segurança.
              </div>
              <a href="https://wa.me/5591980694387?text=Ol%C3%A1%2C%20preciso%20de%20ajuda%20com%20a%20instala%C3%A7%C3%A3o%20do%20meu%20pedido%20${pedidoId}" style="display: inline-block; border: 1px solid #E52E2E; color: #E52E2E !important; text-decoration: none; padding: 8px 15px; border-radius: 4px; font-size: 11px; font-weight: bold; text-transform: uppercase; font-family: monospace;">Solicitar Suporte WhatsApp</a>
            </div>
          </div>
          <div style="background-color: #0A0D0C; padding: 20px; text-align: center; font-size: 10px; color: #555; border-top: 1px solid #1A201E; font-family: monospace; text-transform: uppercase;">
            Alcateia dos Produtores &copy; ${new Date().getFullYear()} - Todos os direitos reservados.
          </div>
        </div>
      </body>
      </html>
    `;

    // 6. Enviar e-mail usando a API do Resend
    console.log(`✉️ Enviando e-mail para ${pedido.email_cliente} usando Resend...`);
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_KEY}`,
        'User-Agent': 'alcateia-catalogo/1.0'
      },
      body: JSON.stringify({
        from: EMAIL_SENDER,
        to: [pedido.email_cliente],
        subject: `Alcateia dos Produtores - Acesso Liberado (Pedido #${pedidoId.substring(0, 8)})`,
        html: emailHtml
      })
    });

    const resendData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.warn("⚠️ Falha ao enviar para o e-mail do cliente. Verificando sandbox do Resend...", JSON.stringify(resendData));
      
      // Detecção de sandbox do Resend
      const isSandboxError = 
        resendData?.message?.toLowerCase().includes("verified") || 
        resendData?.message?.toLowerCase().includes("sandbox") ||
        resendData?.message?.toLowerCase().includes("onboarding") ||
        resendResponse.status === 400 || 
        resendResponse.status === 403;

      if (isSandboxError) {
        console.log("🔄 Sandbox do Resend detectado. Enviando cópia de segurança para o e-mail verificado (renantonyel020@gmail.com)...");
        
        const fallbackResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${RESEND_KEY}`,
            'User-Agent': 'alcateia-catalogo/1.0'
          },
          body: JSON.stringify({
            from: 'Alcateia dos Produtores <onboarding@resend.dev>',
            to: ['renantonyel020@gmail.com'],
            subject: `[TESTE - SANDBOX] Alcateia dos Produtores - Acesso Liberado (Destinatário: ${pedido.email_cliente})`,
            html: emailHtml
          })
        });
        
        if (fallbackResponse.ok) {
          console.log("✅ Cópia de teste enviada com sucesso para renantonyel020@gmail.com!");
        } else {
          console.error("❌ Falha crítica ao enviar e-mail de fallback:", await fallbackResponse.text());
        }
      } else {
        throw new Error(`Erro ao enviar e-mail via Resend: ${JSON.stringify(resendData)}`);
      }
    } else {
      console.log("✅ E-mail enviado com sucesso para o cliente!", resendData);
    }

    return new Response(JSON.stringify({ ok: true, pedido_liberado: pedidoId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    console.error("💥 Erro crítico no processamento do webhook:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
