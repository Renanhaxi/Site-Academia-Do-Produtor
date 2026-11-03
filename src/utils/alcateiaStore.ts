import { supabase } from './supabaseClient';
import { Produto, produtos as catalogoBase, CAIXAS_3D_POR_ID, isImagemAntigaOuPlaceholder } from '../data/produtos';

export interface ProductReview {
  id: string;
  autor: string;
  funcao: string;
  nota: number;
  comentario: string;
  sistema: 'windows' | 'mac';
  data: string;
}

export interface ProductMediaMeta {
  tem_video: boolean;
  video_url: string;
  tem_audio: boolean;
  audio_url: string;
  reviews?: ProductReview[];
}

export interface AdsAndIntegrationsConfig {
  metaPixelId: string;
  metaCapiToken: string;
  metaEnabled: boolean;
  googleAdsId: string;
  googleConversionLabel: string;
  googleEnabled: boolean;
  tiktokPixelId: string;
  tiktokEnabled: boolean;
  instagramUrl: string;
  youtubeUrl: string;
  whatsappNumero: string;
  soundAlertEnabled: boolean;
}

export interface TrafficAttribution {
  utm_source: string;
  utm_medium: string;
  utm_campaign: string;
  utm_content: string;
  fbclid: string;
  gclid: string;
  fbp: string;
  fbc: string;
  sistema_detectado: 'windows' | 'mac';
  landing_timestamp: string;
}

const MEDIA_META_STORAGE_KEY = 'ALCATEIA_MEDIA_META';
const ADS_CONFIG_STORAGE_KEY = 'ALCATEIA_ADS_CONFIG';
const ATTRIBUTION_STORAGE_KEY = 'ALCATEIA_TRAFFIC_ATTR';

export const DEFAULT_ADS_CONFIG: AdsAndIntegrationsConfig = {
  metaPixelId: '',
  metaCapiToken: '',
  metaEnabled: false,
  googleAdsId: '',
  googleConversionLabel: '',
  googleEnabled: false,
  tiktokPixelId: '',
  tiktokEnabled: false,
  instagramUrl: 'https://instagram.com',
  youtubeUrl: 'https://youtube.com',
  whatsappNumero: '5591980694387',
  soundAlertEnabled: true,
};

/**
 * Detecta automaticamente o sistema operacional do visitante (Windows vs Mac)
 */
export function detectUserOS(): 'windows' | 'mac' {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return 'windows';
  const ua = (navigator.userAgent || '').toLowerCase();
  const platform = ((navigator as any).userAgentData?.platform || navigator.platform || '').toLowerCase();
  if (
    ua.includes('macintosh') ||
    ua.includes('mac os') ||
    platform.includes('mac') ||
    ua.includes('iphone') ||
    ua.includes('ipad')
  ) {
    return 'mac';
  }
  return 'windows';
}

/**
 * Captura parâmetros de tráfego (UTMs, Instagram, YouTube, Meta Ads, Google Ads)
 */
export function captureTrafficAttribution(): TrafficAttribution {
  const sys = detectUserOS();
  if (typeof window === 'undefined') {
    return {
      utm_source: 'direto',
      utm_medium: 'organico',
      utm_campaign: 'catalogo',
      utm_content: '',
      fbclid: '',
      gclid: '',
      fbp: '',
      fbc: '',
      sistema_detectado: sys,
      landing_timestamp: new Date().toISOString(),
    };
  }

  try {
    const params = new URLSearchParams(window.location.search);
    const existingRaw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    const existing: Partial<TrafficAttribution> = existingRaw ? JSON.parse(existingRaw) : {};

    const refHost = document.referrer ? new URL(document.referrer).hostname.toLowerCase() : '';
    let inferredSource = existing.utm_source || 'direto';
    if (refHost.includes('instagram')) inferredSource = 'instagram';
    else if (refHost.includes('youtube') || refHost.includes('youtu.be')) inferredSource = 'youtube';
    else if (refHost.includes('facebook') || refHost.includes('fb.com')) inferredSource = 'facebook';
    else if (refHost.includes('google')) inferredSource = 'google';
    else if (refHost.includes('tiktok')) inferredSource = 'tiktok';

    const utm_source = params.get('utm_source') || params.get('ref') || inferredSource;
    const utm_medium = params.get('utm_medium') || existing.utm_medium || (utm_source === 'direto' ? 'acesso_direto' : 'social');
    const utm_campaign = params.get('utm_campaign') || existing.utm_campaign || 'catalogo_principal';
    const utm_content = params.get('utm_content') || existing.utm_content || '';
    const fbclid = params.get('fbclid') || existing.fbclid || '';
    const gclid = params.get('gclid') || existing.gclid || '';

    // Cookies do Meta Pixel (_fbp / _fbc)
    const cookies = document.cookie.split(';').reduce((acc, c) => {
      const [k, v] = c.trim().split('=');
      if (k && v) acc[k] = v;
      return acc;
    }, {} as Record<string, string>);

    const fbp = cookies['_fbp'] || existing.fbp || `fb.1.${Date.now()}.${Math.floor(Math.random() * 1000000000)}`;
    const fbc = cookies['_fbc'] || (fbclid ? `fb.1.${Date.now()}.${fbclid}` : existing.fbc || '');

    const attr: TrafficAttribution = {
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      fbclid,
      gclid,
      fbp,
      fbc,
      sistema_detectado: sys,
      landing_timestamp: existing.landing_timestamp || new Date().toISOString(),
    };

    localStorage.setItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(attr));
    return attr;
  } catch {
    return {
      utm_source: 'direto',
      utm_medium: 'acesso_direto',
      utm_campaign: 'catalogo',
      utm_content: '',
      fbclid: '',
      gclid: '',
      fbp: '',
      fbc: '',
      sistema_detectado: sys,
      landing_timestamp: new Date().toISOString(),
    };
  }
}

export function getTrafficAttribution(): TrafficAttribution {
  try {
    const raw = localStorage.getItem(ATTRIBUTION_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return captureTrafficAttribution();
}

/**
 * Carrega e sincroniza configurações de mídias por produto (tem_video, video_url, tem_audio, audio_url)
 */
export function getLocalMediaMetaMap(): Record<number, ProductMediaMeta> {
  try {
    const raw = localStorage.getItem(MEDIA_META_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export async function fetchMediaMetaMapFromSupabase(): Promise<Record<number, ProductMediaMeta>> {
  try {
    const { data } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', MEDIA_META_STORAGE_KEY)
      .maybeSingle();

    if (data?.valor) {
      const parsed = JSON.parse(data.valor);
      localStorage.setItem(MEDIA_META_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch {}
  return getLocalMediaMetaMap();
}

export async function saveProductMediaMeta(
  productId: number,
  meta: Partial<ProductMediaMeta>
): Promise<Record<number, ProductMediaMeta>> {
  const current = await fetchMediaMetaMapFromSupabase();
  const existing = current[productId] || {
    tem_video: false,
    video_url: '',
    tem_audio: false,
    audio_url: '',
  };
  const updated: Record<number, ProductMediaMeta> = {
    ...current,
    [productId]: {
      ...existing,
      ...meta,
    },
  };

  localStorage.setItem(MEDIA_META_STORAGE_KEY, JSON.stringify(updated));

  try {
    await supabase
      .from('configuracoes')
      .upsert(
        { chave: MEDIA_META_STORAGE_KEY, valor: JSON.stringify(updated) },
        { onConflict: 'chave' }
      );
  } catch (e) {
    console.warn('Aviso ao salvar metadados de mídia em configuracoes:', e);
  }

  // Tenta atualizar também na tabela solutions caso as colunas já existam no banco
  try {
    const updateCols: Record<string, any> = {};
    if (meta.tem_video !== undefined) updateCols.tem_video = meta.tem_video;
    if (meta.video_url !== undefined) updateCols.video_url = meta.video_url;
    if (meta.tem_audio !== undefined) updateCols.tem_audio = meta.tem_audio;
    if (meta.audio_url !== undefined) updateCols.audio_url = meta.audio_url;
    if (Object.keys(updateCols).length > 0) {
      await supabase.from('solutions').update(updateCols).eq('id', productId);
    }
  } catch {}

  window.dispatchEvent(new Event('produtosAtualizados'));
  return updated;
}

/**
 * Carrega e salva configurações de Pixels, Tráfego Pago e Links Oficiais (Instagram/YouTube)
 */
export function getLocalAdsConfig(): AdsAndIntegrationsConfig {
  try {
    const raw = localStorage.getItem(ADS_CONFIG_STORAGE_KEY);
    if (raw) return { ...DEFAULT_ADS_CONFIG, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_ADS_CONFIG;
}

export async function fetchAdsConfigFromSupabase(): Promise<AdsAndIntegrationsConfig> {
  try {
    const { data } = await supabase
      .from('configuracoes')
      .select('valor')
      .eq('chave', ADS_CONFIG_STORAGE_KEY)
      .maybeSingle();

    if (data?.valor) {
      const parsed = { ...DEFAULT_ADS_CONFIG, ...JSON.parse(data.valor) };
      localStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(parsed));
      return parsed;
    }
  } catch {}
  return getLocalAdsConfig();
}

export async function saveAdsConfigToSupabase(
  config: Partial<AdsAndIntegrationsConfig>
): Promise<AdsAndIntegrationsConfig> {
  const merged = { ...getLocalAdsConfig(), ...config };
  localStorage.setItem(ADS_CONFIG_STORAGE_KEY, JSON.stringify(merged));

  try {
    await supabase
      .from('configuracoes')
      .upsert(
        { chave: ADS_CONFIG_STORAGE_KEY, valor: JSON.stringify(merged) },
        { onConflict: 'chave' }
      );
  } catch (e) {
    console.warn('Aviso ao salvar config de ads:', e);
  }

  window.dispatchEvent(new Event('configuracoesAtualizadas'));
  return merged;
}

/**
 * Dispara eventos de conversão pré-moldados (Meta Pixel, Google Ads, TikTok e telemetria interna)
 */
export function trackAlcateiaEvent(
  eventName: 'PageView' | 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase',
  data?: Record<string, any>
) {
  const eventId = `evt_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  const config = getLocalAdsConfig();

  try {
    // 1. Disparo para Meta Pixel se estiver ativo
    if (config.metaEnabled && config.metaPixelId && typeof window !== 'undefined') {
      const fbq = (window as any).fbq;
      if (typeof fbq === 'function') {
        fbq('track', eventName, data || {}, { eventID: eventId });
      }
    }

    // 2. Disparo para Google Ads / YouTube se estiver ativo
    if (config.googleEnabled && config.googleAdsId && typeof window !== 'undefined') {
      const gtag = (window as any).gtag;
      if (typeof gtag === 'function') {
        gtag('event', eventName, {
          send_to: config.googleConversionLabel
            ? `${config.googleAdsId}/${config.googleConversionLabel}`
            : config.googleAdsId,
          ...data,
        });
      }
    }
  } catch {}

  return eventId;
}

/**
 * Converte qualquer link de vídeo (YouTube watch, youtu.be, shorts, Vimeo) em URL de embed limpa
 */
export function getEmbedVideoUrl(url?: string): { type: 'iframe' | 'video' | 'none'; src: string } {
  if (!url || !url.trim()) return { type: 'none', src: '' };
  const clean = url.trim();

  // YouTube
  const ytMatch = clean.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'iframe',
      src: `https://www.youtube.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
    };
  }

  // Vimeo
  const vimeoMatch = clean.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch && vimeoMatch[1]) {
    return {
      type: 'iframe',
      src: `https://player.vimeo.com/video/${vimeoMatch[1]}`,
    };
  }

  // Arquivo direto (.mp4, .webm, .mov ou Supabase Storage)
  return {
    type: 'video',
    src: clean,
  };
}

/**
 * Toca alerta sonoro de venda aprovada no painel do Administrador ("Cha-Ching" / Studio Harmonics)
 */
export function playAdminSaleSound() {
  const cfg = getLocalAdsConfig();
  if (cfg.soundAlertEnabled === false) return;

  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const notes = [587.33, 880, 1174.66, 1760]; // D5, A5, D6, A6 (acorde brilhante de confirmação)
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx % 2 === 0 ? 'triangle' : 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.08);

      gain.gain.setValueAtTime(0.001, now + idx * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.22, now + idx * 0.08 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.55);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + idx * 0.08);
      osc.stop(now + idx * 0.08 + 0.6);
    });
  } catch {}
}

/**
 * Unifica produtos do Supabase com metadados de mídia (Vídeo/Áudio) e Caixas 3D
 */
export function mapSupabaseRowToProduto(
  sol: any,
  mediaMetaMap: Record<number, ProductMediaMeta>
): Produto {
  const formatMoney = (v: number) => `R$ ${Number(v || 0).toFixed(2).replace('.', ',')}`;
  const boxFallback = CAIXAS_3D_POR_ID[sol.id];
  const usarBox = isImagemAntigaOuPlaceholder(sol.imagem) && boxFallback;
  const meta = mediaMetaMap[sol.id];

  const galeriaLimpa =
    Array.isArray(sol.galeria) && sol.galeria.length > 0
      ? sol.galeria.map((g: string, idx: number) =>
          isImagemAntigaOuPlaceholder(g) && boxFallback?.galeria?.[idx]
            ? boxFallback.galeria[idx]
            : g
        )
      : boxFallback?.galeria || [];

  const precoBase = Number(sol.preco || 0);
  const precoPromo = Number(sol.preco_promocional || sol.preco || 0);

  const videoUrl = sol.video_url ?? meta?.video_url ?? boxFallback?.video_url ?? '';
  const audioUrl = sol.audio_url ?? meta?.audio_url ?? boxFallback?.audio_url ?? '';

  const temVideo =
    sol.tem_video !== undefined
      ? Boolean(sol.tem_video && videoUrl)
      : meta?.tem_video !== undefined
      ? Boolean(meta.tem_video && videoUrl)
      : Boolean(boxFallback?.tem_video && videoUrl);

  const temAudio =
    sol.tem_audio !== undefined
      ? Boolean(sol.tem_audio && audioUrl)
      : meta?.tem_audio !== undefined
      ? Boolean(meta.tem_audio && audioUrl)
      : Boolean(boxFallback?.tem_audio && audioUrl);

  return {
    id: sol.id,
    nome: usarBox ? boxFallback.nome : sol.nome || boxFallback?.nome || 'Produto',
    preco:
      precoPromo > 0
        ? formatMoney(precoPromo)
        : boxFallback?.preco || formatMoney(47),
    precoAntigo:
      precoBase > precoPromo
        ? formatMoney(precoBase)
        : boxFallback?.precoAntigo || formatMoney(precoPromo * 1.6),
    imagem: usarBox
      ? boxFallback.imagem
      : sol.imagem || boxFallback?.imagem || '',
    desc: usarBox ? boxFallback.desc : sol.descricao || boxFallback?.desc || '',
    categoria: usarBox
      ? boxFallback.categoria
      : sol.categoria || boxFallback?.categoria || 'Geral',
    galeria: galeriaLimpa,
    tag: sol.tag || (sol.id === 3 ? 'Mais Vendido' : undefined),
    estrelas: Number(sol.estrelas || 5.0),
    visivel: sol.visivel !== false,
    is_orderbump: Boolean(sol.is_orderbump),
    sistema_operacional: sol.sistema_operacional || boxFallback?.sistema_operacional || 'ambos',
    link_entrega: sol.link_entrega || boxFallback?.link_entrega || '',
    tem_video: temVideo,
    video_url: videoUrl,
    tem_audio: temAudio,
    audio_url: audioUrl,
    reviews: sol.reviews || meta?.reviews || boxFallback?.reviews || [],
  };
}

export function getCatalogWithMediaFallback(): Produto[] {
  const mediaMetaMap = getLocalMediaMetaMap();
  return catalogoBase.map((p) => {
    const meta = mediaMetaMap[p.id];
    const videoUrl = meta?.video_url ?? p.video_url ?? '';
    const audioUrl = meta?.audio_url ?? p.audio_url ?? '';
    return {
      ...p,
      tem_video: meta?.tem_video !== undefined ? Boolean(meta.tem_video && videoUrl) : Boolean(p.tem_video && videoUrl),
      video_url: videoUrl,
      tem_audio: meta?.tem_audio !== undefined ? Boolean(meta.tem_audio && audioUrl) : Boolean(p.tem_audio && audioUrl),
      audio_url: audioUrl,
      reviews: meta?.reviews || p.reviews || [],
    };
  });
}

// Alias de Rebranding para Arsenal de Produtores Musicais
export const trackArsenalEvent = trackAlcateiaEvent;
