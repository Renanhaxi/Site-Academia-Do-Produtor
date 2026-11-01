import { createClient } from '@supabase/supabase-js';
import https from 'https';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://mcabymkxorqcbijvdfvp.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_OjDhrZqqFIP0_UgojaPBdg_EgK-zr2r';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Função auxiliar para baixar imagem via buffer
function downloadImageBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadImageBuffer(res.headers.location).then(resolve).catch(reject);
      }
      const data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => resolve(Buffer.concat(data)));
    }).on('error', reject);
  });
}

async function uploadImages() {
  console.log("🚀 Iniciando migração de imagens para o Supabase Storage...");

  // Buscar produtos cadastrados na tabela solutions
  const { data: produtos, error } = await supabase.from('solutions').select('id, nome, imagem');

  if (error || !produtos) {
    console.error("Erro ao buscar produtos:", error);
    return;
  }

  console.log(`📦 Encontrados ${produtos.length} produtos para processar.`);

  for (const prod of produtos) {
    if (!prod.imagem || prod.imagem.includes('supabase.co')) {
      console.log(`⏩ Produto #${prod.id} (${prod.nome}) já está no Supabase ou sem imagem.`);
      continue;
    }

    try {
      console.log(`⏳ Baixando imagem do produto #${prod.id} (${prod.nome})...`);
      const buffer = await downloadImageBuffer(prod.imagem);
      const fileName = `produto_${prod.id}_${Date.now()}.jpg`;

      // Upload para o bucket 'produtos' no Supabase
      const { error: uploadError } = await supabase.storage
        .from('produtos')
        .upload(fileName, buffer, {
          contentType: 'image/jpeg',
          upsert: true
        });

      if (uploadError) {
        console.error(`❌ Erro no upload do produto #${prod.id}:`, uploadError.message);
        continue;
      }

      // Obter URL pública
      const { data: publicData } = supabase.storage
        .from('produtos')
        .getPublicUrl(fileName);

      const novaUrl = publicData.publicUrl;
      console.log(`✅ Upload concluído! Nova URL: ${novaUrl}`);

      // Atualizar no banco de dados
      await supabase
        .from('solutions')
        .update({ imagem: novaUrl })
        .eq('id', prod.id);

      console.log(`💾 Banco atualizado para produto #${prod.id}!`);
    } catch (err) {
      console.error(`💥 Falha ao processar produto #${prod.id}:`, err.message);
    }
  }

  console.log("✨ Processo de migração de imagens finalizado!");
}

uploadImages();
