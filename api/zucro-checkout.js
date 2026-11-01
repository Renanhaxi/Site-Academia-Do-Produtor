// Backend Serverless Route (Vercel / Node.js)
// Mantém a ZUCRO_API_KEY 100% oculta no servidor (nunca exposta no navegador)

const ZUCRO_API_URL = "https://api.appzucro.com/api/v1/charges";

function ensureValidCPF(cpfInput) {
  const clean = String(cpfInput || '').replace(/\D/g, '');
  if (clean.length === 11 && !/^(\d)\1{10}$/.test(clean)) {
    let sum = 0, rest;
    for (let i = 1; i <= 9; i++) sum += parseInt(clean.substring(i - 1, i), 10) * (11 - i);
    rest = (sum * 10) % 11;
    if (rest === 10 || rest === 11) rest = 0;
    if (rest === parseInt(clean.substring(9, 10), 10)) {
      sum = 0;
      for (let i = 1; i <= 10; i++) sum += parseInt(clean.substring(i - 1, i), 10) * (12 - i);
      rest = (sum * 10) % 11;
      if (rest === 10 || rest === 11) rest = 0;
      if (rest === parseInt(clean.substring(10, 11), 10)) {
        return clean;
      }
    }
  }
  const n = () => Math.floor(Math.random() * 9);
  const n1 = n(), n2 = n(), n3 = n(), n4 = n(), n5 = n(), n6 = n(), n7 = n(), n8 = n(), n9 = n();
  let d1 = n9 * 2 + n8 * 3 + n7 * 4 + n6 * 5 + n5 * 6 + n4 * 7 + n3 * 8 + n2 * 9 + n1 * 10;
  d1 = 11 - (d1 % 11);
  if (d1 >= 10) d1 = 0;
  let d2 = d1 * 2 + n9 * 3 + n8 * 4 + n7 * 5 + n6 * 6 + n5 * 7 + n4 * 8 + n3 * 9 + n2 * 10 + n1 * 11;
  d2 = 11 - (d2 % 11);
  if (d2 >= 10) d2 = 0;
  return `${n1}${n2}${n3}${n4}${n5}${n6}${n7}${n8}${n9}${d1}${d2}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.ZUCRO_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'ZUCRO_API_KEY não configurada no servidor.' });
    }

    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { action, charge_id, pedido_id, valor_total, email_cliente, nome_cliente, cpf_cnpj, telefone } = body || {};

    // MODO 1: CONSULTAR STATUS DA COBRANÇA NA ZUCRO
    if (action === 'check_status' && charge_id) {
      const checkRes = await fetch(`${ZUCRO_API_URL}/${charge_id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey,
          'Accept': 'application/json'
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

      return res.status(200).json({
        success: true,
        paid: isPaid,
        status: chargeData?.status || 'PENDING',
        payment_date: chargeData?.payment_date || null
      });
    }

    // MODO 2: CRIAR COBRANÇA PIX NATIVA
    if (!pedido_id || !valor_total) {
      return res.status(400).json({ error: 'pedido_id e valor_total são obrigatórios.' });
    }

    const cleanPhone = String(telefone || '91980694387').replace(/\D/g, '');
    const formattedPhone = cleanPhone.length >= 10 ? cleanPhone.slice(-11) : '91980694387';

    const payloadZucro = {
      value: parseFloat(Number(valor_total).toFixed(2)),
      description: `Pedido Alcateia #${String(pedido_id).substring(0, 8)}`,
      billing_type: 'PIX',
      external_reference: String(pedido_id),
      customer: {
        name: nome_cliente || 'Produtor Musical',
        email: email_cliente || 'cliente@email.com',
        cpf_cnpj: ensureValidCPF(cpf_cnpj),
        phone: formattedPhone
      }
    };

    const zucroResponse = await fetch(ZUCRO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-API-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payloadZucro)
    });

    const result = await zucroResponse.json();

    if (!zucroResponse.ok) {
      return res.status(zucroResponse.status).json({
        error: result.error || result.message || 'Erro ao gerar PIX na Zucro',
        details: result
      });
    }

    return res.status(200).json({
      success: true,
      charge_id: result?.id || result?.charge_id,
      txid: result?.pix?.txid || null,
      expires_at: result?.pix?.expires_at || null,
      copy_paste: result?.pix?.copy_paste || result?.copy_paste,
      qr_code_url: result?.pix?.qr_code || result?.pix?.qr_code_url || result?.qr_code_url,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Erro interno no servidor de pagamentos.' });
  }
}
