export interface Produto {
  id: number;
  nome: string;
  preco: string;
  precoAntigo?: string;
  imagem: string;
  desc: string;
  categoria: string;
  tag?: string;
  estrelas?: number;
  detalhes?: string[];
  galeria?: string[];
  visivel?: boolean;
  is_orderbump?: boolean;
  sistema_operacional?: 'windows' | 'mac' | 'ambos';
  link_entrega?: string;
  tem_video?: boolean;
  video_url?: string;
  tem_audio?: boolean;
  audio_url?: string;
  reviews?: {
    id: string;
    autor: string;
    funcao: string;
    nota: number;
    comentario: string;
    sistema: 'windows' | 'mac';
    data: string;
  }[];
}

export const CONFIG_GLOBAL = {
  whatsappNumero: "5591980694387",
  telegramComunidadeUrl: "https://t.me/arsenaldoprodutor",
  mensagemPadrao: "Olá! Montei meu carrinho no catálogo À La Carte do Arsenal de Produtores Musicais. Quero dar andamento no pagamento e receber meu acesso!",
  bannerImagemUrl: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=1200&auto=format&fit=crop",
  bannerLinkUrl: "https://wa.me/5591980694387?text=Quero%20entrar%20gratuitamente%20na%20Incubadora%20de%20Produtores!",
  feedbackImagens: [
    "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614741118887-7a4ee193a5fa?q=80&w=600&auto=format&fit=crop"
  ]
};

export const categoriasDisponiveis = [
  'Todos',
  'Daws',
  'Mixagem',
  'Vocal',
  'Efeitos',
  'Instrumentos',
  'Utilitários'
];

export const produtos: Produto[] = [
  {
    id: 1,
    nome: "Ableton Live Suite 12.3",
    preco: "R$ 67,00",
    precoAntigo: "R$ 67,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_1_1793504622311.jpg",
    galeria: [
      "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/gal_1_1_1793570684610.png",
      "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/gal_1_2_1793570686837.jpg",
      "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/gal_1_3_1793570688350.png"
    ],
    desc: "A DAW líder de mercado para performance ao vivo, arranjo rápido e composição eletrônica.",
    categoria: "Daws",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: true,
    sistema_operacional: "ambos",
    link_entrega: ""
  },
  {
    id: 2,
    nome: "Apple Logic Pro X V10.7.8 macOS",
    preco: "R$ 97,00",
    precoAntigo: "R$ 197,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_2_1793504626744.png",
    galeria: [],
    desc: "Estúdio de produção completo e exclusivo para usuários Mac, ideal para gravação e mixagem de alto nível.",
    categoria: "Daws",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "mac",
    link_entrega: "https://drive.google.com/file/d/1ckKgsEYBLDF1wgte8Bkhc-nzv_sy70tp/view?usp=drivesdk"
  },
  {
    id: 3,
    nome: "FL Studio 25.2.4 Premium",
    preco: "R$ 67,00",
    precoAntigo: "R$ 147,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_3_1793504629833.png",
    galeria: [],
    desc: "A versão mais recente da DAW favorita dos beatmakers, com piano roll imbatível e fluxo ágil.",
    categoria: "Daws",
    tag: "Mais Vendido",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: true,
    sistema_operacional: "ambos",
    link_entrega: "https://drive.google.com/file/d/1XKl2-mPt0XRTNh2_qn0-ifS463YD1EwS/view?usp=drivesdk"
  },
  {
    id: 4,
    nome: "PreSonus - Studio One Pro 7 v7.0.0",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_4_1793504634968.png",
    galeria: [],
    desc: "Ambiente de produção moderno com fluxo integrado de composição, mixagem e masterização nativa.",
    categoria: "Daws",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1ETZl5M2F1Rql6ruAaAgWnBTqCDVsN94K/view?usp=drivesdk"
  },
  {
    id: 5,
    nome: "Steinberg Cubase Pro 15 v15.0.6",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_5_1793504641202.png",
    galeria: [],
    desc: "O padrão da indústria fonográfica mundial para gravação, edição cirúrgica e trilhas sonoras.",
    categoria: "Daws",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/135tAIOWyLyyy8zbYl0a-RibbzAKU6RID/view?usp=drivesdk"
  },
  {
    id: 6,
    nome: "FabFilter - Total Bundle v2026.1",
    preco: "R$ 27,00",
    precoAntigo: "R$ 67,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_6_1793504644432.png",
    galeria: [],
    desc: "A suíte cirúrgica de compressores, limiters e equalizadores dinâmicos indispensável em qualquer sessão.",
    categoria: "Mixagem",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: true,
    sistema_operacional: "ambos",
    link_entrega: "https://drive.google.com/file/d/1mKK8egZDC4Z_vUPgneiSU9nbRYW6tTLX/view?usp=drivesdk"
  },
  {
    id: 7,
    nome: "Plugin Alliance - MEGA Bundle Effects 2024.12",
    preco: "R$ 47,00",
    precoAntigo: "R$ 47,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_7_1793504650661.png",
    galeria: [],
    desc: "Coleção massiva com emulações de consoles analógicos lendários e processadores de sinal premium.",
    categoria: "Mixagem",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/17b5QnmYzcyXyv24vBtFsZjaj9TKVvdrg/view?usp=drivesdk"
  },
  {
    id: 8,
    nome: "Slate Digital Virtual Mix Rack Complete v2.6.4.0",
    preco: "R$ 67,00",
    precoAntigo: "R$ 67,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_8_1793504654461.png",
    galeria: [],
    desc: "Rack de mistura analógica modular para recriar cadeias de sinal clássicas em um único canal.",
    categoria: "Mixagem",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: ""
  },
  {
    id: 9,
    nome: "ValhallaDSP - Plugins Bundle",
    preco: "R$ 67,00",
    precoAntigo: "R$ 127,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_9_1793504657852.png",
    galeria: [],
    desc: "Os reverbs e delays espaciais mais cobiçados do mercado, ideais para criar texturas imersivas.",
    categoria: "Mixagem",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: true,
    sistema_operacional: "ambos",
    link_entrega: "https://drive.google.com/file/d/1u11tvRD76EYU6D_pQaBjW2dWs1D9WXTo/view?usp=drivesdk"
  },
  {
    id: 10,
    nome: "Waves 16 Ultimate",
    preco: "R$ 37,00",
    precoAntigo: "R$ 97,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_10_1793504663873.png",
    galeria: [],
    desc: "A maior e mais tradicional coleção de plugins de processamento de áudio profissional do mundo.",
    categoria: "Mixagem",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "ambos",
    link_entrega: "https://drive.google.com/file/d/1K2SEQXIvzL3LnAGt62GfT0q_aDSsf-4R/view?usp=drivesdk"
  },
  {
    id: 11,
    nome: "Antares - Auto-Tune Pro v11.0.0",
    preco: "R$ 97,00",
    precoAntigo: "R$ 197,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_11_1793504666333.png",
    galeria: [],
    desc: "O corretor de tom padrão da indústria para afinação em tempo real e o efeito marcante do Trap.",
    categoria: "Vocal",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: true,
    sistema_operacional: "ambos",
    link_entrega: "https://drive.google.com/file/d/1E7ZeET_Z776LQitNIBiTrByr_R3R3P5X/view?usp=drivesdk"
  },
  {
    id: 12,
    nome: "Antares Auto-Tune Pro X v10.3.1",
    preco: "R$ 67,00",
    precoAntigo: "R$ 67,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_12_1793504670603.png",
    galeria: [],
    desc: "Edição avançada e ultra veloz do lendário afinador, otimizada para fluxos de trabalho modernos.",
    categoria: "Vocal",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1U4xGymt65YuzLbfHACDG0sLSImqDwoKK/view?usp=drivesdk"
  },
  {
    id: 13,
    nome: "Celemony - Melodyne 5 Studio v5.4.2.006",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_13_1793504674154.png",
    galeria: [],
    desc: "Edição melódica e polifônica nota por nota, permitindo correções invisíveis com perfeição natural.",
    categoria: "Vocal",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1U4xGymt65YuzLbfHACDG0sLSImqDwoKK/view?usp=drivesdk"
  },
  {
    id: 14,
    nome: "iZotope - Nectar 4 Advanced v4.0.1",
    preco: "R$ 47,00",
    precoAntigo: "R$ 47,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_14_1793504680890.png",
    galeria: [],
    desc: "Suíte completa dedicada ao tratamento de vozes com assistente de IA, compressores e harmônicos.",
    categoria: "Vocal",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/11S7Z1VxCizo-K5RmvRRhWoUoT7Rafl5I/view?usp=drivesdk"
  },
  {
    id: 15,
    nome: "Synchro Arts - VocAlign 6 Pro v6.1.18",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_15_1793504684999.png",
    galeria: [],
    desc: "Alinhamento de tempo instantâneo de dobras e backing vocals, essencial para coros e tracks limpas.",
    categoria: "Vocal",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1eWEOUopB2aUpRzznHuZSNzK7crj3sABs/view?usp=drivesdk"
  },
  {
    id: 16,
    nome: "BABY Audio - Transit 2 v1.0.0",
    preco: "R$ 37,00",
    precoAntigo: "R$ 37,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_16_1793504689503.png",
    galeria: [],
    desc: "Plugin definitivo para transições criativas, sweeps, risers e drops monumentais com controle macro.",
    categoria: "Efeitos",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1hwBqXeYdV67gfV0AbEUwGSJM_08kPd1B/view?usp=drivesdk"
  },
  {
    id: 17,
    nome: "Cableguys - ShaperBox v3.5.2",
    preco: "R$ 97,00",
    precoAntigo: "R$ 97,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_17_1793504693569.png",
    galeria: [],
    desc: "Modulação rítmica multibanda para efeitos de sidechain, pan, glitches e desenho de áudio criativo.",
    categoria: "Efeitos",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1r8rVWgHLZ6KDlelp-n8DBTa6HOVeIr3y/view?usp=drivesdk"
  },
  {
    id: 18,
    nome: "SoundToys v5.0.1.1",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_18_1793504698616.png",
    galeria: [],
    desc: "Efeitos lendários cheios de caráter, saturação quente e delays analógicos com cor vintage.",
    categoria: "Efeitos",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1r3Fpx_nGg2MA8ngyJ31G7e6TSBxKH2yc/view?usp=drivesdk"
  },
  {
    id: 19,
    nome: "XLN Audio RC-20 Retro Color v1.2.6.2",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_19_1793504702597.png",
    galeria: [],
    desc: "O queridinho dos produtores para adicionar calor, poeira, instabilidade e textura de vinil.",
    categoria: "Efeitos",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1PIdYWLn03EhWKTraIcbfO7sGWVGhbVIV/view?usp=drivesdk"
  },
  {
    id: 20,
    nome: "Arturia - Pigments v7.0.0",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_20_1793504708576.png",
    galeria: [],
    desc: "Sintetizador polimórfico de última geração combinando síntese wavetable, analógica e amostragem.",
    categoria: "Instrumentos",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/11babOcFLvOxnJB6IqE05xcqE16bqUAig/view?usp=drivesdk"
  },
  {
    id: 21,
    nome: "LennarDigital - Sylenth1 v2.21",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_21_1793504712984.png",
    galeria: [],
    desc: "Sintetizador analógico virtual clássico reverenciado por seus leads afiados e sub-basses potentes.",
    categoria: "Instrumentos",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: ""
  },
  {
    id: 22,
    nome: "Native Instruments - Kontakt 8 v8.8.0",
    preco: "R$ 67,00",
    precoAntigo: "R$ 67,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_22_1793504718021.png",
    galeria: [],
    desc: "O maior sampler do mundo, plataforma para as bibliotecas mais realistas de orquestras e instrumentos.",
    categoria: "Instrumentos",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1U4t_VAMyYTctI9jg4IxAU3983P6UnZgo/view?usp=drivesdk"
  },
  {
    id: 23,
    nome: "reFX - Nexus 5 v5.1.3",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_23_1793504723258.png",
    galeria: [],
    desc: "Sintetizador rompler focado em produção em massa com timbres prontos de alta qualidade para hits.",
    categoria: "Instrumentos",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1lDpdWUj640ZpLuQ6y7bOVzYUljq92F5Q/view?usp=drivesdk"
  },
  {
    id: 24,
    nome: "Spectrasonics Omnisphere v3.0.0d",
    preco: "R$ 47,00",
    precoAntigo: "R$ 47,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_24_1793504728336.png",
    galeria: [],
    desc: "O sintetizador mais poderoso e versátil do mercado fonográfico, com infinitas possibilidades de texturas.",
    categoria: "Instrumentos",
    estrelas: 5.0,
    visivel: false,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: ""
  },
  {
    id: 25,
    nome: "Xfer - Serum 2 v2.0.16",
    preco: "R$ 27,00",
    precoAntigo: "R$ 27,00",
    imagem: "https://mcabymkxorqcbijvdfvp.supabase.co/storage/v1/object/public/produtos/box_25_1793504732053.png",
    galeria: [],
    desc: "O rei da síntese wavetable moderna, ideal para criar timbres do completo zero com resposta visual.",
    categoria: "Instrumentos",
    estrelas: 5.0,
    visivel: true,
    is_orderbump: false,
    sistema_operacional: "windows",
    link_entrega: "https://drive.google.com/file/d/1P5pguaNzda3hQZXXN0xUDxYAPjrixUEd/view?usp=drivesdk"
  }
];

export const CAIXAS_3D_POR_ID: Record<number, Produto> = produtos.reduce((acc, p) => {
  acc[p.id] = p;
  return acc;
}, {} as Record<number, Produto>);

export const isImagemAntigaOuPlaceholder = (url?: string | null): boolean => {
  if (!url) return true;
  return (
    url.includes('images.unsplash.com') ||
    url.includes('zecadtglxvblzrihrorn.supabase.co')
  );
};

export const beneficiosArsenal = [
  { id: 1, titulo: "Liberação Automática Imediata", texto: "Assim que o pagamento via PIX é confirmado no site, seus links de download em alta velocidade são destravados automaticamente no seu painel 'Meus Acessos'." },
  { id: 2, titulo: "0% Vírus & Estabilidade Máxima", texto: "Todos os softwares do acervo são rigorosamente testados no campo de batalha antes da entrega. Desempenho puro para sessões críticas." },
  { id: 3, titulo: "Suporte e Instalação VIP (Opcional)", texto: "Precisa de ajuda técnica avançada? Oferecemos um serviço premium de instalação remota via AnyDesk para configurar seu ambiente de forma impecável." }
];
export const beneficiosAlcateia = beneficiosArsenal;

export const depoimentos = [
  { 
    id: 1, 
    nome: "Lucas Albuquerque (LKS)", 
    texto: "O catálogo do Arsenal de Produtores salvou meu estúdio! A estabilidade das builds é absurda, e a instalação VIP via AnyDesk foi feita na hora. Recomendo de olhos fechados.",
    foto: "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?q=80&w=200&auto=format&fit=crop",
    funcao: "Trap Beatmaker & Producer"
  },
  { 
    id: 2, 
    nome: "Beatriz Senna", 
    texto: "Ter ferramentas estáveis e seguras é essencial para o meu workflow diário com clientes de peso. Os racks e presets do Arsenal de Produtores rodam limpos, sem travamentos.",
    foto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop",
    funcao: "Engenheira de Mix / Master"
  },
  { 
    id: 3, 
    nome: "DJ Marcos 'Drop'", 
    texto: "Comprei de madrugada, paguei no PIX e os links já abriram na hora na minha conta. O melhor acervo para produtor musical disparado.",
    foto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=200&auto=format&fit=crop",
    funcao: "Beatmaker & Sound Designer"
  }
];

export const faqArsenal = [
  { id: 1, pergunta: "Como recebo meus acessos?", resposta: "Tudo acontece dentro do próprio site! Ao criar sua conta e finalizar o pagamento via PIX, o sistema identifica a aprovação em segundos e libera automaticamente os botões de download em 'Meus Acessos'." },
  { id: 2, pergunta: "Por que preciso criar uma conta para comprar?", resposta: "Para sua total segurança. Com sua conta no Arsenal de Produtores, suas licenças ficam vinculadas ao seu perfil de forma vitalícia. Se formatar o PC ou trocar de máquina no futuro, basta fazer login e baixar novamente." },
  { id: 3, pergunta: "Os arquivos são 100% seguros?", resposta: "Sim. Todos os nossos arquivos passam por verificação tripla antivírus e são testados ativamente em computadores reais de produção antes de serem liberados no catálogo." },
  { id: 4, pergunta: "Como funciona o serviço de Instalação VIP?", resposta: "O serviço de Instalação VIP é um adicional opcional. Agendamos um horário flexível e nossos técnicos entram de forma remota via AnyDesk para configurar os softwares no seu sistema de forma impecável." },
  { id: 5, pergunta: "Qual é a política de garantia e suporte?", resposta: "Oferecemos garantia incondicional de 7 dias e suporte técnico completo. Se qualquer ferramenta apresentar incompatibilidade insolúvel no seu sistema, devolvemos seu investimento integralmente." }
];
export const faqAlcateia = faqArsenal;

export const atualizarProdutos = (novosProdutos: Produto[]) => {
  localStorage.setItem('ARSENAL_PRODUTOS', JSON.stringify(novosProdutos));
  localStorage.setItem('ALCATEIA_PRODUTOS', JSON.stringify(novosProdutos));
  window.dispatchEvent(new Event('produtosAtualizados'));
};
