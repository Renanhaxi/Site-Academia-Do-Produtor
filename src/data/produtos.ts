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
}

export const CONFIG_GLOBAL = {
  whatsappNumero: "5591980694387", // Insira o número oficial da Alcateia aqui
  telegramComunidadeUrl: "https://t.me/arsenaldoprodutor", // Link oficial da Irmandade no Telegram
  mensagemPadrao: "Olá! Montei meu carrinho no catálogo À La Carte da Alcateia. Quero dar andamento no pagamento e receber meu acesso!",
  livepixUrl: "https://livepix.gg/alcateiadeprodutores", // Link da sua página de recebimentos do LivePix
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
  'DAWs (Softwares)',
  'Mixagem',
  'Vocal',
  'Efeitos',
  'Instrumentos',
  'Serviços VIP',
  'Testes'
];

export const produtos: Produto[] = [
  // 🎛️ CATEGORIA 1: DAWs (Softwares) - R$ 67,00
  {
    id: 1,
    nome: "Ableton Live Suite 12.3",
    preco: "R$ 67,00",
    imagem: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop",
    desc: "Build profissional para manipulação cirúrgica de áudio, warping e live performance. Estabilidade de ponta para o seu fluxo.",
    categoria: "DAWs (Softwares)",
    estrelas: 4.9
  },
  {
    id: 2,
    nome: "Apple Logic Pro X v10.7.8 macOS",
    preco: "R$ 67,00",
    imagem: "https://images.unsplash.com/photo-1514790193030-c89d266d5a9d?q=80&w=600&auto=format&fit=crop",
    desc: "Ambiente completo otimizado para ecossistema Apple. Roda perfeitamente em Intel e Apple Silicon (M1/M2/M3).",
    categoria: "DAWs (Softwares)",
    estrelas: 5.0
  },
  {
    id: 3,
    nome: "FL Studio 25.2.4 Premium",
    preco: "R$ 67,00",
    imagem: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop",
    desc: "A build mais estável do software mais querido pelos beatmakers de Trap e Funk do mundo. Sem travamentos.",
    categoria: "DAWs (Softwares)",
    tag: "Mais Vendido",
    estrelas: 4.9
  },
  {
    id: 4,
    nome: "PreSonus Studio One Pro 7 v7.0.0",
    preco: "R$ 67,00",
    imagem: "https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop",
    desc: "Workflow moderno unificado para gravação, arranjo, mixagem e masterização de alta velocidade.",
    categoria: "DAWs (Softwares)",
    estrelas: 4.8
  },
  {
    id: 5,
    nome: "Steinberg Cubase Pro 15 v15.0.6",
    preco: "R$ 67,00",
    imagem: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop",
    desc: "Mecanismo de áudio cirúrgico de altíssima fidelidade, preferido por grandes estúdios e compositores.",
    categoria: "DAWs (Softwares)",
    estrelas: 4.9
  },

  // 🎚️ CATEGORIA 2: MIXAGEM - R$ 47,00
  {
    id: 6,
    nome: "FabFilter Total Bundle v2026.1",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1484755560693-a4074577af3a?q=80&w=600&auto=format&fit=crop",
    desc: "A suíte cirúrgica essencial contendo o lendário Pro-Q 3, Pro-C 2 e Pro-L 2 para máxima clareza acústica.",
    categoria: "Mixagem",
    tag: "Essencial",
    estrelas: 5.0
  },
  {
    id: 7,
    nome: "Plugin Alliance MEGA Bundle Effects 2024.12",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1516280440614-37939bbacd6a?q=80&w=600&auto=format&fit=crop",
    desc: "Acesso total a emulações analógicas lendárias, compressores de boutique e consoles icônicos.",
    categoria: "Mixagem",
    estrelas: 4.8
  },
  {
    id: 8,
    nome: "Slate Digital Virtual Mix Rack Complete v2.6.4.0",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop",
    desc: "O rack de canais definitivo. Crie cadeias de sinal analógico vintage customizadas em segundos.",
    categoria: "Mixagem",
    estrelas: 4.9
  },
  {
    id: 9,
    nome: "ValhallaDSP Plugins Bundle",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=600&auto=format&fit=crop",
    desc: "A coleção de reverbs e delays espaciais mais aclamada do planeta para criar ambiências tridimensionais gigantes.",
    categoria: "Mixagem",
    estrelas: 5.0
  },
  {
    id: 10,
    nome: "Waves 16 Ultimate Suite",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=600&auto=format&fit=crop",
    desc: "O maior e mais completo pacote de processadores de sinal da história da indústria fonográfica mundial.",
    categoria: "Mixagem",
    estrelas: 4.9
  },

  // 🎤 CATEGORIA 3: VOCAL - R$ 47,00
  {
    id: 11,
    nome: "Antares Auto-Tune Pro v11.0.0",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1525417071002-5ee4e6bb44f7?q=80&w=600&auto=format&fit=crop",
    desc: "O padrão da indústria para afinação de voz moderna e o efeito marcante do Trap e do Funk.",
    categoria: "Vocal",
    tag: "Elite",
    estrelas: 5.0
  },
  {
    id: 12,
    nome: "Antares Auto-Tune Pro X v10.3.1",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?q=80&w=600&auto=format&fit=crop",
    desc: "Edição gráfica avançada e resposta cirúrgica otimizada para sessões dinâmicas de estúdio.",
    categoria: "Vocal",
    estrelas: 4.8
  },
  {
    id: 13,
    nome: "Celemony Melodyne 5 Studio v5.4.2.006",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop",
    desc: "Correção milimétrica de afinação, tempo e formantes nota por nota, mantendo a naturalidade orgânica.",
    categoria: "Vocal",
    estrelas: 4.9
  },
  {
    id: 14,
    nome: "iZotope Nectar 4 Advanced v4.0.1",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1487180142328-054b783fc471?q=80&w=600&auto=format&fit=crop",
    desc: "A suíte assistida por IA inteligente focada inteiramente em cadeias de tratamento, brilho e compressão vocal.",
    categoria: "Vocal",
    estrelas: 4.9
  },
  {
    id: 15,
    nome: "Synchro Arts VocAlign 6 Pro v6.1.18",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=600&auto=format&fit=crop",
    desc: "Alinhamento instantâneo de tempo e pitch para dobras, coro e backing vocals comerciais perfeitos.",
    categoria: "Vocal",
    estrelas: 5.0
  },

  // ⚡ CATEGORIA 4: EFEITOS - R$ 47,00
  {
    id: 16,
    nome: "BABY Audio Transit 2 v1.0.0",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=600&auto=format&fit=crop",
    desc: "O plugin definitivo para transições, drops e subidas dinâmicas avassaladoras em suas produções.",
    categoria: "Efeitos",
    estrelas: 4.8
  },
  {
    id: 17,
    nome: "Cableguys ShaperBox v3.5.2",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1543185377-b75671bfc454?q=80&w=600&auto=format&fit=crop",
    desc: "Modulação rítmica cirúrgica de volume, sidechain, tempo e filtros. Criatividade sem limites.",
    categoria: "Efeitos",
    estrelas: 4.9
  },
  {
    id: 18,
    nome: "SoundToys v5.0.1.1 Bundle",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop",
    desc: "A coleção analógica de saturação, delays e efeitos criativos que dão a cor quente de fita às tracks.",
    categoria: "Efeitos",
    estrelas: 5.0
  },
  {
    id: 19,
    nome: "XLN Audio RC-20 Retro Color v1.2.6.2",
    preco: "R$ 47,00",
    imagem: "https://images.unsplash.com/photo-1518911710364-17ec553bde5d?q=80&w=600&auto=format&fit=crop",
    desc: "Adicione calor, poeira, textura de vinil e o caráter vintage analógico imediato a qualquer sample.",
    categoria: "Efeitos",
    tag: "Essencial",
    estrelas: 4.9
  },

  // 🎹 CATEGORIA 5: INSTRUMENTOS (VSTIS PESADOS) - R$ 57,00
  {
    id: 20,
    nome: "Arturia Pigments v7.0.0",
    preco: "R$ 57,00",
    imagem: "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?q=80&w=600&auto=format&fit=crop",
    desc: "Sintetizador polimórfico de última geração com texturas sonoras e modulações visuais vibrantes.",
    categoria: "Instrumentos",
    estrelas: 4.9
  },
  {
    id: 21,
    nome: "LennarDigital Sylenth1 v2.21",
    preco: "R$ 57,00",
    imagem: "https://images.unsplash.com/photo-1552422535-c45813c61732?q=80&w=600&auto=format&fit=crop",
    desc: "Clássico analógico virtual de alta definição. Timbre limpo, cristalino e baixíssimo consumo de CPU.",
    categoria: "Instrumentos",
    estrelas: 4.8
  },
  {
    id: 22,
    nome: "Native Instruments Kontakt 8 v8.8.0",
    preco: "R$ 57,00",
    imagem: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop",
    desc: "O maior ecossistema de samplers do planeta. Build destravada para hospedar qualquer livraria externa.",
    categoria: "Instrumentos",
    tag: "Poderoso",
    estrelas: 5.0
  },
  {
    id: 23,
    nome: "reFX Nexus 5 v5.1.3",
    preco: "R$ 57,00",
    imagem: "https://images.unsplash.com/photo-1459305272254-33a7d593a851?q=80&w=600&auto=format&fit=crop",
    desc: "Estação de presets prontos de altíssimo padrão comercial para hits instantâneos de rádio e pistas.",
    categoria: "Instrumentos",
    estrelas: 4.9
  },
  {
    id: 24,
    nome: "Spectrasonics Omnisphere v3.0.0d",
    preco: "R$ 57,00",
    imagem: "https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=600&auto=format&fit=crop",
    desc: "O gigante da síntese sonora. Atmosferas cinematográficas e timbres absurdos com livraria completa.",
    categoria: "Instrumentos",
    estrelas: 5.0
  },
  {
    id: 25,
    nome: "Xfer Serum 2 v2.0.16",
    preco: "R$ 57,00",
    imagem: "https://images.unsplash.com/photo-1471478331149-c72f17e33c73?q=80&w=600&auto=format&fit=crop",
    desc: "O sintetizador wavetable mais popular do mundo. Edição e criação cirúrgica de timbres agressivos.",
    categoria: "Instrumentos",
    estrelas: 4.9
  },

  // 🚀 CATEGORIA 6: SERVIÇOS VIP (AVULSO ADMNISTRATIVO) - R$ 100,00
  {
    id: 26,
    nome: "Serviço de Engenharia de Estúdio (Instalação via AnyDesk)",
    preco: "R$ 100,00",
    imagem: "https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop",
    desc: "Nossa equipe sênior entra de forma segura na sua máquina, resolve as travas e instala suas ferramentas deixando tudo 100% pronto para rodar na sua DAW.",
    categoria: "Serviços VIP",
    tag: "Exclusivo VIP",
    estrelas: 5.0
  },

  // 🧪 CATEGORIA 7: TESTE - R$ 1,00
  {
    id: 99,
    nome: "Produto de Teste (Sandbox)",
    preco: "R$ 1,00",
    imagem: "https://images.unsplash.com/photo-1614064641913-6b7140414c71?q=80&w=600&auto=format&fit=crop",
    desc: "Produto voltado exclusivamente para testar as transações do LivePix e automação do Supabase.",
    categoria: "Testes",
    tag: "Apenas Teste",
    estrelas: 5.0
  }
];

export const beneficiosAlcateia = [
  { id: 1, titulo: "Liberação Automática Imediata", texto: "Assim que o pagamento via PIX é confirmado no site, seus links de download em alta velocidade são destravados automaticamente no seu painel 'Meus Acessos'." },
  { id: 2, titulo: "0% Vírus & Estabilidade Máxima", texto: "Todos os softwares do acervo são rigorosamente testados no campo de batalha antes da entrega. Desempenho puro para sessões críticas." },
  { id: 3, titulo: "Suporte e Instalação VIP (Opcional)", texto: "Precisa de ajuda técnica avançada? Oferecemos um serviço premium de instalação remota via AnyDesk para configurar seu ambiente de forma impecável." }
];

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

export const faqAlcateia = [
  { id: 1, pergunta: "Como recebo meus acessos?", resposta: "Tudo acontece dentro do próprio site! Ao criar sua conta e finalizar o pagamento via PIX, o sistema identifica a aprovação em segundos e libera automaticamente os botões de download em 'Meus Acessos'." },
  { id: 2, pergunta: "Por que preciso criar uma conta para comprar?", resposta: "Para sua total segurança. Com sua conta no Arsenal de Produtores, suas licenças ficam vinculadas ao seu perfil de forma vitalícia. Se formatar o PC ou trocar de máquina no futuro, basta fazer login e baixar novamente." },
  { id: 3, pergunta: "Os arquivos são 100% seguros?", resposta: "Sim. Todos os nossos arquivos passam por verificação tripla antivírus e são testados ativamente em computadores reais de produção antes de serem liberados no catálogo." },
  { id: 4, pergunta: "Como funciona o serviço de Instalação VIP?", resposta: "O serviço de Instalação VIP é um adicional opcional. Agendamos um horário flexível e nossos técnicos entram de forma remota via AnyDesk para configurar os softwares no seu sistema de forma impecável." },
  { id: 5, pergunta: "Qual é a política de garantia e suporte?", resposta: "Oferecemos garantia incondicional de 7 dias e suporte técnico completo. Se qualquer ferramenta apresentar incompatibilidade insolúvel no seu sistema, devolvemos seu investimento integralmente." }
];

export const atualizarProdutos = (novosProdutos: Produto[]) => {
  localStorage.setItem('ALCATEIA_PRODUTOS', JSON.stringify(novosProdutos));
  window.dispatchEvent(new Event('produtosAtualizados'));
};

