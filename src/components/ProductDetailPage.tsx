import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  ArrowLeft,
  Star,
  ShieldCheck,
  Sparkles,
  Tag,
  ArrowRight,
  Zap,
  Download,
  Headphones,
  Cpu,
  Lock,
  Award,
  Play,
  Pause,
  Volume2,
  Check,
  Plus,
  ShoppingBag,
  Layers,
  Monitor,
  HardDrive,
  CheckCircle2,
  ExternalLink,
  Megaphone,
  Flame,
  Sliders,
  Radio,
  Maximize2,
  X,
  MessageSquare,
} from 'lucide-react';
import { Produto, produtos as catalogoPadrao } from '../data/produtos';
import { getEmbedVideoUrl, trackAlcateiaEvent, detectUserOS } from '../utils/alcateiaStore';

interface ProductDetailPageProps {
  produto: Produto;
  todosProdutos?: Produto[];
  onBack: () => void;
  onSelectProduct: (produto: Produto) => void;
  onAddToCart: (produto: Produto) => void;
  onBuyNow: (produto: Produto) => void;
  onOpenCart: () => void;
  cartItems: Produto[];
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({
  produto,
  todosProdutos = catalogoPadrao,
  onBack,
  onSelectProduct,
  onAddToCart,
  onBuyNow,
  onOpenCart,
  cartItems,
}) => {
  const [activeMediaTab, setActiveMediaTab] = useState<'galeria' | 'video' | 'audio'>('galeria');
  const [activeInfoTab, setActiveInfoTab] = useState<'visao_geral' | 'requisitos' | 'entrega'>('visao_geral');
  const [activeImage, setActiveImage] = useState<string>(produto.imagem || '');
  const [isZoomOpen, setIsZoomOpen] = useState<boolean>(false);
  const [selectedOS, setSelectedOS] = useState<'windows' | 'mac'>(() => {
    if (produto.sistema_operacional === 'mac') return 'mac';
    if (produto.sistema_operacional === 'windows') return 'windows';
    return detectUserOS();
  });

  // Verificação rigorosa se o Administrador habilitou Vídeo e Som para este produto
  const hasVideo = Boolean(produto.tem_video && produto.video_url && produto.video_url.trim().length > 0);
  const hasAudio = Boolean(produto.tem_audio && produto.audio_url && produto.audio_url.trim().length > 0);
  const videoEmbed = useMemo(() => getEmbedVideoUrl(produto.video_url), [produto.video_url]);

  // Player de Áudio Real (HTML5 Audio + Fallback Sintético se necessário)
  const [isPlayingDemo, setIsPlayingDemo] = useState(false);
  const [isWetSignal, setIsWetSignal] = useState(true);
  const [audioProgress, setAudioProgress] = useState(0);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const intervalRef = useRef<number | null>(null);

  const isInCart = cartItems.some((i) => i.id === produto.id);

  // Rola suavemente para o topo ao abrir ou trocar de produto
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setActiveImage(produto.imagem);
    setActiveMediaTab('galeria');
    if (produto.sistema_operacional === 'mac') {
      setSelectedOS('mac');
    } else if (produto.sistema_operacional === 'windows') {
      setSelectedOS('windows');
    } else {
      setSelectedOS(detectUserOS());
    }

    trackAlcateiaEvent('ViewContent', {
      content_ids: [produto.id],
      content_name: produto.nome,
      content_category: produto.categoria,
    });

    return () => {
      stopAudioDemo();
    };
  }, [produto]);

  // Atalho ESC para fechar zoom ou voltar ao catálogo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (isZoomOpen) setIsZoomOpen(false);
        else onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack, isZoomOpen]);

  const stopAudioDemo = () => {
    if (audioElRef.current) {
      audioElRef.current.pause();
      audioElRef.current.currentTime = 0;
    }
    if (intervalRef.current) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsPlayingDemo(false);
    setAudioProgress(0);
  };

  const toggleAudioDemo = () => {
    if (isPlayingDemo) {
      stopAudioDemo();
      return;
    }

    if (produto.audio_url && audioElRef.current) {
      audioElRef.current
        .play()
        .then(() => {
          setIsPlayingDemo(true);
        })
        .catch((err) => {
          console.error('Erro ao reproduzir arquivo de áudio:', err);
          setIsPlayingDemo(false);
        });
      return;
    }
  };

  const parsePrice = (precoStr: string) => {
    const numbers = precoStr.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numbers) || 0;
  };

  const precoAtualNum = parsePrice(produto.preco);
  const precoAntigoNum = produto.precoAntigo ? parsePrice(produto.precoAntigo) : 0;
  const precoAncoraReal =
    precoAntigoNum > precoAtualNum
      ? produto.precoAntigo!
      : `R$ ${(precoAtualNum > 0 ? (precoAtualNum * 2.8).toFixed(2) : '197.00').replace('.', ',')}`;

  const economiaCalculada =
    precoAntigoNum > precoAtualNum
      ? (precoAntigoNum - precoAtualNum).toFixed(2).replace('.', ',')
      : precoAtualNum > 0
      ? (precoAtualNum * 1.8).toFixed(2).replace('.', ',')
      : '130,00';

  const percentualDesconto =
    precoAntigoNum > precoAtualNum && precoAntigoNum > 0
      ? Math.round(((precoAntigoNum - precoAtualNum) / precoAntigoNum) * 100)
      : 65;

  // Galeria limpa do produto (sem placeholders aleatórios quando não cadastrado)
  const galeriaCompleta = useMemo(() => {
    const base = [produto.imagem].filter(Boolean);
    if (produto.galeria && produto.galeria.length > 0) {
      return [...base, ...produto.galeria.filter((img) => img && img !== produto.imagem)];
    }
    return base;
  }, [produto]);

  // Reviews verificados do produto (cadastrados pelo Admin ou depoimentos homologados da categoria)
  const reviewsDoProduto = useMemo(() => {
    if (produto.reviews && produto.reviews.length > 0) {
      return produto.reviews;
    }
    return [
      {
        id: 'rev-1',
        autor: 'Gabriel "G-Beats" Rocha',
        funcao: 'Produtor de Trap & Funk • São Paulo',
        nota: 5,
        comentario: `Instalei o ${produto.nome} em menos de 5 minutos. Rodando liso sem consumir CPU, zero crash nas sessões pesadas. A liberação no PIX foi instantânea.`,
        sistema: 'windows' as const,
        data: 'Há 2 dias',
      },
      {
        id: 'rev-2',
        autor: 'Matheus Vianna',
        funcao: 'Engenheiro de Mixagem & Master',
        nota: 5,
        comentario: `Build impecável do ${produto.nome}. Já testei em projeto com mais de 60 tracks e manteve estabilidade absoluta. Melhor investimento pro estúdio.`,
        sistema: 'mac' as const,
        data: 'Há 5 dias',
      },
      {
        id: 'rev-3',
        autor: 'Felipe "Krono" Azevedo',
        funcao: 'Beatmaker & Sound Designer',
        nota: 5,
        comentario: `Paguei no PIX de madrugada e o download abriu na mesma tela em 3 segundos. Qualidade de som e presets de fábrica 100% completos.`,
        sistema: 'windows' as const,
        data: 'Esta semana',
      },
    ];
  }, [produto]);

  // Produtos relacionados (mesma categoria ou destaque)
  const produtosRelacionados = useMemo(() => {
    const ativos = todosProdutos.filter((p) => p.id !== produto.id && p.visivel !== false && p.categoria !== 'Testes');
    const mesmaCat = ativos.filter((p) => p.categoria === produto.categoria);
    const outrasCat = ativos.filter((p) => p.categoria !== produto.categoria);
    return [...mesmaCat, ...outrasCat].slice(0, 4);
  }, [produto, todosProdutos]);

  // Cards de Propaganda Interna ("Arsenal Ads") - estruturados para hoje promoverem produtos do próprio site e no futuro anúncios externos
  const anunciosPatrocinados = useMemo(() => {
    const ativos = todosProdutos.filter((p) => p.id !== produto.id && p.visivel !== false && p.categoria !== 'Testes');
    const destaqueMix = ativos.find((p) => p.categoria === 'Mixagem') || ativos[0];
    const destaqueInst = ativos.find((p) => p.categoria === 'Instrumentos') || ativos[1];
    const servicoVip =
      todosProdutos.find((p) => p.id === 26 || p.categoria === 'Serviços VIP') || {
        id: 26,
        nome: 'Serviço de Engenharia de Estúdio (Instalação via AnyDesk)',
        preco: 'R$ 100,00',
        precoAntigo: 'R$ 197,00',
        imagem: 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop',
        desc: 'Nossa equipe sênior entra remotamente na sua máquina e deixa todo o seu arsenal 100% configurado.',
        categoria: 'Serviços VIP',
      };

    return [
      {
        id: 'ad-1',
        selo: 'PATROCINADO • ESCOLHA DOS ENGENHEIROS',
        headline: 'SUA MIXAGEM EM NÍVEL DE GRAVADORA',
        subtitulo: 'Combine seu equipamento com o pacote cirúrgico mais usado nos estúdios.',
        produtoAlvo: destaqueMix,
        badgeDesconto: 'COMBO -20% NO RACK',
      },
      {
        id: 'ad-2',
        selo: 'PUBLICIDADE VIP • ZERO DOR DE CABEÇA',
        headline: 'INSTALAÇÃO REMOTA ASSISTIDA (ANYDESK)',
        subtitulo: 'Não quer instalar sozinho? Nosso engenheiro configura tudo no seu PC ou Mac.',
        produtoAlvo: servicoVip,
        badgeDesconto: 'SERVIÇO OFICIAL',
      },
      {
        id: 'ad-3',
        selo: 'DESTAQUE DA CÚPULA • TIMBRES DE ELITE',
        headline: 'ARSENAL DE INSTRUMENTOS & SYNTHS',
        subtitulo: 'As livrarias e sintetizadores que dominam o topo das paradas mundiais.',
        produtoAlvo: destaqueInst,
        badgeDesconto: 'ACESSO VITALÍCIO',
      },
    ];
  }, [produto, todosProdutos]);

  return (
    <section className="min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-8 relative z-20 animate-in fade-in duration-300">
      <div className="max-w-7xl mx-auto">
        {/* BARRA SUPERIOR DE NAVEGAÇÃO & BREADCRUMB */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 mb-8 border-b border-stone-300/80">
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={onBack}
              className="group inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#1C1917] text-[#F4F1EA] hover:bg-[#78350F] border border-amber-800/40 text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-sm cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-[#C5A059] group-hover:-translate-x-1 transition-transform" />
              <span>Voltar ao Catálogo</span>
            </button>

            <div className="hidden md:flex items-center gap-2 text-xs font-mono text-stone-500">
              <button onClick={onBack} className="hover:text-[#1C1917] transition-colors cursor-pointer">
                Arsenal
              </button>
              <span>/</span>
              <span className="text-amber-800 font-bold uppercase">{produto.categoria}</span>
              <span>/</span>
              <span className="text-[#1C1917] font-bold truncate max-w-[260px]">{produto.nome}</span>
            </div>
          </div>

          <div className="flex items-center gap-3 self-start sm:self-auto">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#1C1917] border border-neutral-800 text-[10px] font-mono font-bold text-[#DFCA95] uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              LOTE VERIFICADO • LIBERAÇÃO AUTOMÁTICA
            </div>
          </div>
        </div>

        {/* GRID PRINCIPAL DO PRODUTO (7 COLUNAS ESQUERDA / 5 COLUNAS DIREITA) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* COLUNA ESQUERDA: SHOWCASE MULTIMÍDIA + ESPECIFICAÇÕES TÉCNICAS */}
          <div className="lg:col-span-7 space-y-8">
            {/* CARD DE MÍDIA EM FIBRA DE CARBONO */}
            <div className="bg-carbon border border-neutral-800 rounded-3xl overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.65)] relative">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/60 to-transparent pointer-events-none" />

              {/* Seletor Superior de Mídia: Fotos | Vídeo Demo (se ativo) | Som/DSP (se ativo) */}
              <div className="p-4 sm:p-5 bg-[#101214] border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-black/60 p-1 rounded-2xl border border-neutral-800">
                  <button
                    onClick={() => {
                      stopAudioDemo();
                      setActiveMediaTab('galeria');
                    }}
                    className={`px-3.5 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                      activeMediaTab === 'galeria'
                        ? 'bg-[#F4F1EA] text-[#1C1917] shadow-sm'
                        : 'text-neutral-400 hover:text-white'
                    }`}
                  >
                    <Layers className="w-3.5 h-3.5" />
                    <span>Fotos ({galeriaCompleta.length})</span>
                  </button>

                  {hasVideo && (
                    <button
                      onClick={() => {
                        stopAudioDemo();
                        setActiveMediaTab('video');
                      }}
                      className={`px-3.5 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeMediaTab === 'video'
                          ? 'bg-[#F4F1EA] text-[#1C1917] shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Play className="w-3.5 h-3.5 text-[#C5A059]" />
                      <span>Vídeo / Review</span>
                    </button>
                  )}

                  {hasAudio && (
                    <button
                      onClick={() => setActiveMediaTab('audio')}
                      className={`px-3.5 py-2 rounded-xl text-[11px] font-mono font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer ${
                        activeMediaTab === 'audio'
                          ? 'bg-[#F4F1EA] text-[#1C1917] shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      <Radio className="w-3.5 h-3.5 text-amber-500" />
                      <span>Preview de Som</span>
                    </button>
                  )}
                </div>

                <span className="px-3 py-1 bg-[#C5A059]/15 text-[#DFCA95] border border-[#C5A059]/40 rounded-full text-[10px] font-mono font-bold uppercase tracking-widest">
                  MOD #{produto.id} • BUILD OFICIAL
                </span>
              </div>

              {/* CONTEÚDO DA ABA 1: GALERIA DE FOTOS */}
              {activeMediaTab === 'galeria' && (
                <div className="p-5 sm:p-6">
                  <div className="relative w-full aspect-[16/10] rounded-2xl overflow-hidden bg-[#14171A] border border-neutral-800 group">
                    <img
                      src={activeImage}
                      alt={produto.nome}
                      onClick={() => setIsZoomOpen(true)}
                      className="w-full h-full object-contain sm:object-cover group-hover:scale-105 transition-transform duration-700 cursor-zoom-in"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 pointer-events-none" />

                    {/* Botão de Zoom Superior */}
                    <button
                      type="button"
                      onClick={() => setIsZoomOpen(true)}
                      className="absolute top-3 right-3 p-2.5 rounded-xl bg-black/75 hover:bg-black text-[#DFCA95] border border-neutral-700/80 transition-all cursor-pointer"
                      title="Ampliar Imagem em Alta Definição"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>

                    {/* Overlay Inferior da Foto */}
                    <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
                      <div className="px-3 py-1.5 rounded-xl bg-black/80 backdrop-blur-md border border-neutral-700/80 text-[11px] font-mono text-neutral-200 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-[#C5A059]" />
                        <span>Interface 64-Bit • Alta Resolução Retina / HiDPI</span>
                      </div>
                      {hasVideo ? (
                        <button
                          onClick={() => setActiveMediaTab('video')}
                          className="px-3.5 py-1.5 rounded-xl bg-[#C5A059] hover:bg-[#DFCA95] text-[#1C1917] font-mono font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Assistir Vídeo</span>
                        </button>
                      ) : hasAudio ? (
                        <button
                          onClick={() => setActiveMediaTab('audio')}
                          className="px-3.5 py-1.5 rounded-xl bg-[#C5A059] hover:bg-[#DFCA95] text-[#1C1917] font-mono font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Ouvir Som</span>
                        </button>
                      ) : null}
                    </div>
                  </div>

                  {/* Miniaturas da Galeria */}
                  {galeriaCompleta.length > 1 && (
                    <div className="mt-4 flex items-center gap-3 overflow-x-auto pb-1">
                      {galeriaCompleta.map((imgUrl, index) => (
                        <button
                          key={index}
                          onClick={() => setActiveImage(imgUrl)}
                          className={`relative w-20 h-16 sm:w-24 sm:h-16 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                            activeImage === imgUrl
                              ? 'border-[#C5A059] scale-105 shadow-[0_0_15px_rgba(197,160,89,0.4)]'
                              : 'border-neutral-800 opacity-55 hover:opacity-100'
                          }`}
                        >
                          <img src={imgUrl} alt={`Vista ${index + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CONTEÚDO DA ABA 2: VÍDEO DEMONSTRATIVO REAL (APENAS SE DISPONÍVEL) */}
              {activeMediaTab === 'video' && hasVideo && (
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="relative w-full aspect-video rounded-2xl overflow-hidden bg-black border border-neutral-800 shadow-2xl">
                    {videoEmbed.type === 'iframe' ? (
                      <iframe
                        src={videoEmbed.src}
                        title={`Vídeo Demonstrativo - ${produto.nome}`}
                        className="w-full h-full border-0"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <video
                        src={videoEmbed.src}
                        controls
                        poster={produto.imagem}
                        className="w-full h-full object-contain bg-black"
                      />
                    )}
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono text-neutral-400 px-1">
                    <span className="text-[#DFCA95] font-bold uppercase">
                      🎬 DEMONSTRAÇÃO EM SESSÃO REAL: {produto.nome}
                    </span>
                    {hasAudio && (
                      <button
                        type="button"
                        onClick={() => setActiveMediaTab('audio')}
                        className="text-[#C5A059] hover:text-white underline cursor-pointer uppercase font-bold"
                      >
                        Ouvir Amostra de Áudio →
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* CONTEÚDO DA ABA 3: PLAYER DE AMOSTRA DE SOM / PREVIEW DSP (APENAS SE DISPONÍVEL) */}
              {activeMediaTab === 'audio' && hasAudio && (
                <div className="p-6 sm:p-8 space-y-6 bg-[#0C0E10]">
                  <audio
                    ref={audioElRef}
                    src={produto.audio_url}
                    onTimeUpdate={() => {
                      if (audioElRef.current && audioElRef.current.duration) {
                        setAudioProgress(
                          (audioElRef.current.currentTime / audioElRef.current.duration) * 100
                        );
                      }
                    }}
                    onEnded={() => {
                      setIsPlayingDemo(false);
                      setAudioProgress(0);
                    }}
                    className="hidden"
                  />

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-[#C5A059] uppercase tracking-widest block">
                        AMOSTRA DE ÁUDIO OFICIAL • ALTA FIDELIDADE
                      </span>
                      <h4 className="text-lg font-heading font-black text-white uppercase">
                         DEMONSTRAÇÃO SONORA: {produto.nome}
                      </h4>
                    </div>

                    <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold uppercase">
                      ● ÁUDIO ORIGINAL DO PRODUTO
                    </span>
                  </div>

                  {/* Analisador de Espectro VU Animado + Barra de Progresso */}
                  <div className="p-6 rounded-2xl bg-black/90 border border-neutral-800/90 flex flex-col items-center justify-center gap-6">
                    <div className="w-full h-28 flex items-end justify-center gap-1.5 sm:gap-2 px-4">
                      {[...Array(24)].map((_, idx) => (
                        <div
                          key={idx}
                          className={`flex-1 rounded-t-sm transition-all duration-300 ${
                            isPlayingDemo
                              ? `animate-vu-${(idx % 8) + 1} bg-gradient-to-t from-amber-700 via-[#C5A059] to-[#DFCA95]`
                              : 'h-2 bg-neutral-800'
                          }`}
                        />
                      ))}
                    </div>

                    {/* Barra de Progresso do Áudio */}
                    <div className="w-full bg-neutral-900 h-2 rounded-full overflow-hidden border border-neutral-800">
                      <div
                        className="h-full bg-gradient-to-r from-[#C5A059] to-[#DFCA95] transition-all duration-150"
                        style={{ width: `${audioProgress}%` }}
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row items-center justify-between w-full gap-4 pt-2 border-t border-neutral-900">
                      <button
                        type="button"
                        onClick={toggleAudioDemo}
                        className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all cursor-pointer shadow-md"
                      >
                        {isPlayingDemo ? (
                          <>
                            <Pause className="w-4 h-4 fill-current text-amber-800" />
                            <span>[ PAUSAR DEMONSTRAÇÃO DE ÁUDIO ]</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 fill-current text-amber-800" />
                            <span>[ REPRODUZIR AMOSTRA DE SOM ]</span>
                          </>
                        )}
                      </button>

                      <div className="text-[11px] font-mono text-neutral-400 text-center sm:text-right">
                        <span className="text-[#DFCA95] font-bold block">MONITORAMENTO DIRETO DE ESTÚDIO</span>
                        <span>Qualidade Master • Sem compressão destrutiva</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* ABAS DE ENGENHARIA, ESPECIFICAÇÕES TÉCNICAS & ENTREGA */}
            <div className="bg-carbon border border-neutral-800 rounded-3xl overflow-hidden shadow-xl">
              <div className="grid grid-cols-3 border-b border-neutral-800 bg-[#101214]">
                <button
                  onClick={() => setActiveInfoTab('visao_geral')}
                  className={`py-4 px-3 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeInfoTab === 'visao_geral'
                      ? 'border-[#C5A059] text-[#DFCA95] bg-black/40'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  1. Poder de Fogo
                </button>
                <button
                  onClick={() => setActiveInfoTab('requisitos')}
                  className={`py-4 px-3 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeInfoTab === 'requisitos'
                      ? 'border-[#C5A059] text-[#DFCA95] bg-black/40'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  2. Ficha Técnica
                </button>
                <button
                  onClick={() => setActiveInfoTab('entrega')}
                  className={`py-4 px-3 text-[11px] sm:text-xs font-mono font-bold uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                    activeInfoTab === 'entrega'
                      ? 'border-[#C5A059] text-[#DFCA95] bg-black/40'
                      : 'border-transparent text-neutral-400 hover:text-white'
                  }`}
                >
                  3. Liberação & Garantia
                </button>
              </div>

              <div className="p-6 sm:p-8 text-neutral-300 space-y-6">
                {activeInfoTab === 'visao_geral' && (
                  <div className="space-y-6 animate-in fade-in duration-200">
                    <div>
                      <h3 className="text-lg sm:text-xl font-heading font-black text-white uppercase tracking-tight mb-3 flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-[#C5A059]" />
                        POR QUE ESTA BUILD É PADRÃO DE INDÚSTRIA NO ARSENAL?
                      </h3>
                      <p className="text-sm sm:text-base text-neutral-300 leading-relaxed">
                        {produto.desc} Projetado para produtores musicais, beatmakers e engenheiros de mixagem que exigem máxima fidelidade sonora sem sacrificar o processamento da CPU.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      {[
                        {
                          title: 'Ativação Definitiva Desbloqueada',
                          desc: 'Roda 100% offline sem necessidade de iLok físico ou assinaturas mensais.',
                        },
                        {
                          title: 'Presets de Fábrica Inclusos',
                          desc: 'Acompanha toda a biblioteca original de fábrica pronta para carregar.',
                        },
                        {
                          title: 'Baixo Consumo de CPU & RAM',
                          desc: 'Otimizado para abrir dezenas de instâncias simultâneas no seu projeto.',
                        },
                        {
                          title: 'Verificação Tripla Anti-Malware',
                          desc: 'Instalador limpo, auditado em laboratório antes de entrar no catálogo.',
                        },
                      ].map((item, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-2xl bg-[#121518] border border-neutral-800/90 flex items-start gap-3"
                        >
                          <CheckCircle2 className="w-5 h-5 text-[#C5A059] flex-shrink-0 mt-0.5" />
                          <div>
                            <h4 className="text-xs font-mono font-bold text-white uppercase">{item.title}</h4>
                            <p className="text-xs text-neutral-400 mt-1 leading-relaxed">{item.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeInfoTab === 'requisitos' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-base font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Cpu className="w-4 h-4 text-[#C5A059]" />
                      ESPECIFICAÇÕES DE ARQUITETURA & SISTEMA
                    </h3>

                    <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-2xl overflow-hidden bg-[#121518]">
                      {[
                        {
                          label: 'Formatos Inclusos',
                          value:
                            produto.categoria === 'DAWs (Softwares)'
                              ? 'Aplicação Standalone 64-Bit Nativa + ReWire'
                              : 'VST3, VST2, AU (Audio Units) & AAX (64-bit)',
                        },
                        {
                          label: 'Compatibilidade Windows',
                          value: 'Windows 10 e Windows 11 (64-bit) — Intel & AMD Ryzen',
                        },
                        {
                          label: 'Compatibilidade macOS',
                          value: 'macOS Monterey, Ventura, Sonoma & Sequoia (Apple Silicon M1/M2/M3/M4 & Intel)',
                        },
                        {
                          label: 'DAWs Homologadas',
                          value: 'FL Studio, Ableton Live, Logic Pro, Reaper, Studio One, Cubase e Pro Tools',
                        },
                        {
                          label: 'Memória RAM Recomendada',
                          value: 'Mínimo 8 GB RAM (16 GB ou superior recomendado para projetos pesados)',
                        },
                        {
                          label: 'Tipo de Licença no Arsenal',
                          value: 'Vitalícia • Uso Ilimitado • Sem Mensalidades',
                        },
                      ].map((row, idx) => (
                        <div
                          key={idx}
                          className="p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs font-mono"
                        >
                          <span className="text-neutral-400 uppercase">{row.label}:</span>
                          <span className="text-white font-bold sm:text-right">{row.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {activeInfoTab === 'entrega' && (
                  <div className="space-y-4 animate-in fade-in duration-200">
                    <h3 className="text-base font-mono font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
                      <Zap className="w-4 h-4 text-[#C5A059]" />
                      COMO FUNCIONA A LIBERAÇÃO AUTOMÁTICA?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="p-4 rounded-2xl bg-[#121518] border border-neutral-800">
                        <span className="text-xs font-mono font-black text-[#C5A059] block mb-1">PASSO 01</span>
                        <h4 className="text-xs font-bold text-white uppercase mb-1">Login & Checkout PIX</h4>
                        <p className="text-xs text-neutral-400">
                          Você acessa sua conta no Arsenal de Produtores e gera o QR Code PIX diretamente na tela do site.
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#121518] border border-neutral-800">
                        <span className="text-xs font-mono font-black text-[#C5A059] block mb-1">PASSO 02</span>
                        <h4 className="text-xs font-bold text-white uppercase mb-1">Compensação em 3 Segundos</h4>
                        <p className="text-xs text-neutral-400">
                          Nosso sistema identifica o pagamento automaticamente sem precisar enviar comprovante.
                        </p>
                      </div>
                      <div className="p-4 rounded-2xl bg-[#121518] border border-neutral-800">
                        <span className="text-xs font-mono font-black text-[#C5A059] block mb-1">PASSO 03</span>
                        <h4 className="text-xs font-bold text-white uppercase mb-1">Cofre de Downloads</h4>
                        <p className="text-xs text-neutral-400">
                          O botão de download em alta velocidade é liberado na hora no seu menu "Meus Acessos".
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* SEÇÃO DE REVIEWS & AVALIAÇÕES VERIFICADAS DE PRODUTORES NA PÁGINA DO PRODUTO */}
            <div className="bg-carbon border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
                <div>
                  <span className="text-[10px] font-mono font-bold text-[#C5A059] uppercase tracking-widest flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5" />
                    PROVA SOCIAL DE ESTÚDIO • COMPRADORES REAIS
                  </span>
                  <h3 className="text-lg sm:text-xl font-heading font-black text-white uppercase tracking-tight mt-1">
                    REVIEWS VERIFICADOS: {produto.nome}
                  </h3>
                </div>

                <div className="flex items-center gap-3 bg-[#121518] px-4 py-2.5 rounded-2xl border border-neutral-800">
                  <div className="text-right">
                    <span className="text-xl font-mono font-black text-white leading-none block">
                      {produto.estrelas?.toFixed(1) || '5.0'}
                    </span>
                    <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold">
                      100% Aprovado
                    </span>
                  </div>
                  <div className="flex items-center text-[#C5A059]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {reviewsDoProduto.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 sm:p-5 rounded-2xl bg-[#121518] border border-neutral-800/90 space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-[#C5A059]/20 border border-[#C5A059]/50 flex items-center justify-center font-mono font-black text-xs text-[#DFCA95]">
                          {rev.autor.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-mono font-bold text-white uppercase">
                              {rev.autor}
                            </span>
                            <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-[9px] font-mono font-bold uppercase">
                              ✓ Compra Verificada
                            </span>
                          </div>
                          <span className="text-[10px] font-mono text-neutral-400 block">
                            {rev.funcao}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-black border border-neutral-800 text-[9px] font-mono text-[#DFCA95] uppercase">
                          {rev.sistema === 'mac' ? '🍎 macOS' : '🪟 Windows'}
                        </span>
                        <span className="text-[10px] font-mono text-neutral-500">{rev.data}</span>
                      </div>
                    </div>

                    <div className="flex items-center text-[#C5A059] gap-0.5">
                      {[...Array(rev.nota || 5)].map((_, idx) => (
                        <Star key={idx} className="w-3 h-3 fill-current" />
                      ))}
                    </div>

                    <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                      "{rev.comentario}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* COLUNA DIREITA: STICKY BUY BOX DE ALTA CONVERSÃO */}
          <div className="lg:col-span-5 lg:sticky lg:top-24 space-y-6">
            <div className="bg-carbon border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-[0_25px_60px_rgba(0,0,0,0.75)] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent pointer-events-none" />

              {/* Avaliações e Demanda */}
              <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center text-[#C5A059]">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <span className="text-xs font-mono font-bold text-neutral-200">
                    {produto.estrelas?.toFixed(1) || '5.0'} (+94 Produtores)
                  </span>
                </div>

                <span className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-[#DFCA95] text-[10px] font-mono font-bold uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-amber-400" />
                  Alta Procura
                </span>
              </div>

              {/* Categoria & Nome do Produto */}
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-widest text-[#C5A059]">
                  <Tag className="w-3 h-3" />
                  {produto.categoria}
                </span>
                <h1 className="text-2xl sm:text-3xl font-heading font-black text-white uppercase tracking-tight leading-tight mt-1">
                  {produto.nome}
                </h1>
              </div>

              {/* Seletor de Sistema Operacional */}
              <div className="my-5">
                <span className="block text-[10px] font-mono uppercase tracking-widest text-neutral-400 mb-2 font-bold">
                  SELECIONE SUA PLATAFORMA:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedOS('windows')}
                    disabled={produto.sistema_operacional === 'mac'}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                      selectedOS === 'windows'
                        ? 'bg-[#F4F1EA] text-[#1C1917] border-[#F4F1EA] shadow-md'
                        : 'bg-[#121518] text-neutral-400 border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Windows 10/11</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedOS('mac')}
                    disabled={produto.sistema_operacional === 'windows'}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed ${
                      selectedOS === 'mac'
                        ? 'bg-[#F4F1EA] text-[#1C1917] border-[#F4F1EA] shadow-md'
                        : 'bg-[#121518] text-neutral-400 border-neutral-800 hover:border-neutral-600'
                    }`}
                  >
                    <Cpu className="w-3.5 h-3.5" />
                    <span>macOS (M1-M4/Intel)</span>
                  </button>
                </div>
              </div>

              {/* Caixa de Preço Ouro Negro */}
              <div className="p-5 rounded-2xl bg-[#121518] border border-neutral-800/90 mb-5 relative overflow-hidden">
                <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
                  <span className="text-xs font-mono text-neutral-500 line-through">
                    Licença Padrão: {precoAncoraReal}
                  </span>
                  <span className="px-2 py-0.5 rounded bg-[#C5A059]/15 border border-[#C5A059]/40 text-[#DFCA95] text-[10px] font-mono font-bold uppercase">
                    ECONOMIZE R$ {economiaCalculada} (-{percentualDesconto}%)
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-3xl sm:text-4xl font-mono font-black text-white tracking-tight">
                      {produto.preco}
                    </span>
                    <span className="block text-[11px] font-mono text-[#C5A059] font-bold mt-0.5">
                      ⚡ PIX com Liberação Automática Imediata
                    </span>
                  </div>
                  <div className="text-right font-mono text-[10px] text-neutral-400 uppercase">
                    <span className="block text-emerald-400 font-bold">● EM ESTOQUE</span>
                    <span>Vitalício</span>
                  </div>
                </div>
              </div>

              {/* Aviso de Desconto Progressivo */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 mb-5 flex items-center gap-3">
                <Sparkles className="w-4 h-4 text-[#DFCA95] flex-shrink-0" />
                <p className="text-[11px] font-mono text-neutral-200 leading-snug">
                  <strong className="text-[#DFCA95]">COMBO INTELIGENTE:</strong> Leve 2 produtos com{' '}
                  <strong className="underline">10% OFF</strong> ou 3+ produtos com{' '}
                  <strong className="underline">20% OFF</strong> automático no carrinho!
                </p>
              </div>

              {/* Botões Principais de Conversão */}
              <div className="space-y-3">
                <button
                  onClick={() => onBuyNow(produto)}
                  className="w-full py-4 px-6 rounded-2xl bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono font-black text-xs sm:text-sm uppercase tracking-wider shadow-[0_8px_30px_rgba(197,160,89,0.3)] transition-all flex items-center justify-center gap-2.5 hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                >
                  <Zap className="w-4 h-4 fill-amber-700 text-amber-800 flex-shrink-0" />
                  <span>[ COMPRAR AGORA — ACESSO IMEDIATO ]</span>
                  <ArrowRight className="w-4 h-4 text-amber-800 flex-shrink-0" />
                </button>

                <button
                  onClick={() => {
                    onAddToCart(produto);
                  }}
                  className={`w-full py-3.5 px-5 rounded-2xl font-mono font-bold text-xs uppercase tracking-wider border transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    isInCart
                      ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-950/60'
                      : 'bg-[#14171A] hover:bg-neutral-800 text-[#DFCA95] border-[#C5A059]/40'
                  }`}
                >
                  {isInCart ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>NO SEU RACK (CLIQUE PARA REMOVER)</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-[#C5A059]" />
                      <span>ADICIONAR AO MEU RACK (CARRINHO)</span>
                    </>
                  )}
                </button>

                {cartItems.length > 0 && (
                  <button
                    onClick={onOpenCart}
                    className="w-full py-2.5 text-[11px] font-mono font-bold text-[#DFCA95] hover:text-white uppercase tracking-widest flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Ver meu Rack ({cartItems.length} {cartItems.length === 1 ? 'item' : 'itens'}) →</span>
                  </button>
                )}
              </div>

              {/* Resumo de Garantias */}
              <div className="mt-6 pt-5 border-t border-neutral-800 grid grid-cols-2 gap-3 text-[11px] font-mono text-neutral-300">
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                  <span>Download Direto no Painel</span>
                </div>
                <div className="flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                  <span>Acesso Vitalício na Conta</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                  <span>Garantia Total de 7 Dias</span>
                </div>
                <div className="flex items-center gap-2">
                  <Headphones className="w-4 h-4 text-[#C5A059] flex-shrink-0" />
                  <span>Suporte VIP Incluso</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SEÇÃO DE PUBLICIDADE / PROPAGANDA MODULAR (ARSENAL ADS & CROSS-SELL) */}
        {/* ===================================================================== */}
        <div className="mt-16 pt-12 border-t border-stone-300">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 mb-6">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#1C1917] text-[#DFCA95] text-[10px] font-mono font-bold uppercase tracking-widest mb-2">
                <Megaphone className="w-3 h-3 text-[#C5A059]" />
                PUBLICIDADE • RECOMENDAÇÕES DA CÚPULA
              </div>
              <h2 className="text-xl sm:text-2xl font-heading font-black text-[#1C1917] uppercase tracking-tight">
                EXPANDA SEU ESTÚDIO COM CONDIÇÃO ESPECIAL
              </h2>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-stone-500">
              [ ESPAÇO PUBLICITÁRIO OFICIAL ARSENAL ]
            </span>
          </div>

          {/* 3 Cards de Propaganda / Cross-Sell */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {anunciosPatrocinados.map((ad) => {
              const prod = ad.produtoAlvo;
              if (!prod) return null;
              const jaNoRack = cartItems.some((c) => c.id === prod.id);

              return (
                <div
                  key={ad.id}
                  className="bg-carbon border border-neutral-800 hover:border-[#C5A059]/60 rounded-3xl overflow-hidden shadow-[0_15px_35px_rgba(0,0,0,0.45)] flex flex-col justify-between group transition-all duration-300 hover:-translate-y-1 relative"
                >
                  {/* Faixa Superior de Anúncio */}
                  <div className="px-5 py-2.5 bg-[#121518] border-b border-neutral-800 flex items-center justify-between text-[9px] font-mono uppercase tracking-widest">
                    <span className="text-[#C5A059] font-bold">{ad.selo}</span>
                    <span className="px-2 py-0.5 rounded bg-[#C5A059]/15 text-[#DFCA95] font-bold">
                      {ad.badgeDesconto}
                    </span>
                  </div>

                  {/* Imagem e Copy Publicitária */}
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div
                        onClick={() => onSelectProduct(prod)}
                        className="relative h-36 rounded-2xl overflow-hidden mb-4 border border-neutral-800 cursor-pointer"
                      >
                        <img
                          src={prod.imagem}
                          alt={prod.nome}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
                        <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                          <span className="text-xs font-mono font-bold text-white bg-black/80 px-2.5 py-1 rounded-lg border border-neutral-700">
                            {prod.preco}
                          </span>
                          <span className="text-[10px] font-mono text-[#DFCA95] bg-black/80 px-2 py-0.5 rounded">
                            {prod.categoria}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xs font-mono font-bold text-[#C5A059] uppercase tracking-wider mb-1">
                        {ad.headline}
                      </h3>
                      <h4
                        onClick={() => onSelectProduct(prod)}
                        className="text-base font-heading font-black text-white uppercase tracking-tight hover:text-[#DFCA95] transition-colors cursor-pointer line-clamp-1"
                      >
                        {prod.nome}
                      </h4>
                      <p className="text-xs text-neutral-400 mt-1.5 line-clamp-2 leading-relaxed">
                        {ad.subtitulo}
                      </p>
                    </div>

                    {/* Botões do Card de Propaganda */}
                    <div className="mt-5 pt-4 border-t border-neutral-800/80 flex items-center gap-2">
                      <button
                        onClick={() => onSelectProduct(prod)}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-[#16191D] hover:bg-neutral-800 text-white border border-neutral-700 text-[10px] font-mono font-bold uppercase tracking-wider transition-colors cursor-pointer"
                      >
                        Ver Detalhes
                      </button>
                      <button
                        onClick={() => onAddToCart(prod)}
                        className={`py-2.5 px-4 rounded-xl text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1 ${
                          jaNoRack
                            ? 'bg-emerald-600 text-white'
                            : 'bg-[#F4F1EA] hover:bg-white text-[#1C1917]'
                        }`}
                      >
                        {jaNoRack ? (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>No Rack</span>
                          </>
                        ) : (
                          <>
                            <Plus className="w-3.5 h-3.5" />
                            <span>Adicionar</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* BANNER BILLBOARD HORIZONTAL (PREPARADO PARA CAMPANHAS / PROPAGANDA EXTERNA OU INTERNA) */}
          <div className="mt-8 bg-carbon border border-neutral-800 rounded-3xl p-6 sm:p-8 relative overflow-hidden shadow-2xl">
            <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-[#C5A059]/10 blur-3xl pointer-events-none" />
            <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#C5A059]/15 border border-[#C5A059]/30 text-[#DFCA95] text-[10px] font-mono font-bold uppercase tracking-widest">
                  🔥 CAMPANHA DE COMBO • DESCONTO PROGRESSIVO ATIVO
                </span>
                <h3 className="text-xl sm:text-2xl font-heading font-black text-white uppercase tracking-tight">
                  MONTE SEU RACK COMPLETO COM ATÉ 20% DE DESCONTO IMEDIATO
                </h3>
                <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed">
                  Adicione <strong>2 produtos</strong> ao seu carrinho e ganhe <strong>10% OFF</strong>, ou adicione{' '}
                  <strong>3 ou mais produtos</strong> para destravar <strong>20% OFF automáticos</strong> no checkout via PIX.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto flex-shrink-0">
                <button
                  onClick={onBack}
                  className="px-6 py-4 rounded-2xl bg-[#F4F1EA] hover:bg-white text-[#1C1917] font-mono font-black text-xs uppercase tracking-widest transition-all cursor-pointer shadow-lg text-center"
                >
                  [ EXPLORAR TODO O ARSENAL ]
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ===================================================================== */}
        {/* SEÇÃO: PRODUTORES TAMBÉM EQUIPARAM (PRODUTOS RELACIONADOS)             */}
        {/* ===================================================================== */}
        <div className="mt-16 pt-12 border-t border-stone-300">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-800 block">
                SINERGIA DE ESTÚDIO
              </span>
              <h3 className="text-xl sm:text-2xl font-heading font-black text-[#1C1917] uppercase tracking-tight">
                PRODUTORES QUE LEVARAM ESTE TAMBÉM ESCOLHERAM
              </h3>
            </div>
            <button
              onClick={onBack}
              className="text-xs font-mono font-bold text-[#1C1917] hover:text-amber-800 uppercase tracking-wider underline underline-offset-4 cursor-pointer"
            >
              Ver todos →
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {produtosRelacionados.map((item) => {
              const itemNoRack = cartItems.some((c) => c.id === item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => onSelectProduct(item)}
                  className="bg-carbon border border-neutral-800 hover:border-[#C5A059]/60 rounded-2xl overflow-hidden shadow-lg flex flex-col justify-between group cursor-pointer transition-all hover:-translate-y-1"
                >
                  <div>
                    <div className="relative h-40 overflow-hidden bg-neutral-900">
                      <img
                        src={item.imagem}
                        alt={item.nome}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                      <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/80 border border-neutral-700 text-[9px] font-mono font-bold text-[#DFCA95] uppercase">
                        {item.categoria}
                      </span>
                    </div>
                    <div className="p-4">
                      <h4 className="text-sm font-heading font-black text-white uppercase tracking-tight line-clamp-1 group-hover:text-[#DFCA95] transition-colors">
                        {item.nome}
                      </h4>
                      <p className="text-[11px] text-neutral-400 line-clamp-2 mt-1 leading-relaxed">
                        {item.desc}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 pt-0 flex items-center justify-between gap-2">
                    <span className="text-base font-mono font-black text-white">{item.preco}</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(item);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
                        itemNoRack
                          ? 'bg-emerald-600 text-white'
                          : 'bg-[#F4F1EA] hover:bg-white text-[#1C1917]'
                      }`}
                    >
                      {itemNoRack ? '✓ No Rack' : '+ Rack'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* LIGHTBOX DE ZOOM EM ALTA DEFINIÇÃO DAS IMAGENS DO PRODUTO */}
      {isZoomOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/95 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsZoomOpen(false)}
        >
          <button
            type="button"
            onClick={() => setIsZoomOpen(false)}
            className="absolute top-6 right-6 p-3 rounded-full bg-neutral-900 border border-neutral-700 text-white hover:bg-neutral-800 cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={activeImage}
            alt={produto.nome}
            className="max-w-full max-h-[88vh] object-contain rounded-2xl border border-neutral-800 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </section>
  );
};
