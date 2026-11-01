import React, { useState, useEffect } from 'react';
import { X, Check, Star, ShieldCheck, Sparkles, Tag, ArrowRight, Zap, Download, Headphones, Cpu, Lock, Award } from 'lucide-react';
import { Produto } from '../data/produtos';

interface ProductModalProps {
  produto: Produto | null;
  isOpen: boolean;
  onClose: () => void;
  accentColor: string;
  onAddToCart: (produto: Produto) => void;
  isInCart: boolean;
  isCartOpen?: boolean;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  produto,
  isOpen,
  onClose,
  onAddToCart,
  isInCart,
  isCartOpen
}) => {
  if (!isOpen || !produto) return null;

  const [activeImage, setActiveImage] = useState<string>(produto.imagem || '');

  useEffect(() => {
    if (produto) {
      setActiveImage(produto.imagem);
    }
  }, [produto]);

  const parsePrice = (precoStr: string) => {
    const numbers = precoStr.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numbers) || 0;
  };

  const precoAtualNum = parsePrice(produto.preco);
  const precoAntigoNum = produto.precoAntigo ? parsePrice(produto.precoAntigo) : 0;
  const precoAncoraReal = precoAntigoNum > precoAtualNum 
    ? produto.precoAntigo 
    : `R$ ${(precoAtualNum > 0 ? (precoAtualNum * 2.8).toFixed(2) : '197.00').replace('.', ',')}`;

  const economiaCalculada = precoAntigoNum > precoAtualNum
    ? (precoAntigoNum - precoAtualNum).toFixed(2).replace('.', ',')
    : (precoAtualNum > 0 ? (precoAtualNum * 1.8).toFixed(2).replace('.', ',') : '130,00');

  const percentualDesconto = precoAntigoNum > precoAtualNum && precoAntigoNum > 0
    ? Math.round(((precoAntigoNum - precoAtualNum) / precoAntigoNum) * 100)
    : 65;

  const osCompativelTexto = produto.sistema_operacional === 'windows'
    ? 'Windows 10 / 11 (64-bit VST & VST3)'
    : produto.sistema_operacional === 'mac'
    ? 'macOS Sonoma / Ventura / Monterey (Apple Silicon M1-M4 & Intel)'
    : 'Windows 10/11 + macOS (Apple Silicon M1-M4 & Intel)';

  const precoFormatadoSemQuebra = produto.preco.replace(/\s/g, '\u00A0');
  const precoAntigoFormatadoSemQuebra = precoAncoraReal.replace(/\s/g, '\u00A0');

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      
      {/* Modal Container com Textura Fibra de Carbono */}
      <div 
        className="relative w-full max-w-4xl bg-carbon border border-neutral-800 rounded-3xl overflow-y-auto md:overflow-hidden shadow-[0_25px_60px_rgba(0,0,0,0.8)] flex flex-col md:flex-row my-auto max-h-[92dvh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top subtle golden highlight */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/40 to-transparent pointer-events-none z-30" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-40 p-2.5 rounded-full bg-black/70 hover:bg-[#F4F1EA] text-neutral-400 hover:text-[#1C1917] border border-neutral-700 transition-all hover:scale-105 cursor-pointer backdrop-blur-sm shadow-md"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Coluna Esquerda: Showcase Visual & Galeria */}
        <div className="w-full md:w-5/12 bg-[#101214] relative flex flex-col items-center justify-between border-b md:border-b-0 md:border-r border-neutral-800 p-6">
          
          {/* Tag de Categoria e Desconto em Ouro/Carbono */}
          <div className="w-full flex items-center justify-between z-20 mb-4">
            <span className="px-3 py-1 bg-black/85 border border-neutral-700/80 rounded-full text-[10px] font-mono font-bold text-neutral-300 flex items-center gap-1.5 backdrop-blur-md">
              <Tag className="w-3 h-3 text-[#C5A059]" />
              {produto.categoria}
            </span>
            <span className="px-2.5 py-1 bg-[#C5A059]/15 text-[#DFCA95] border border-[#C5A059]/40 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider">
              -{percentualDesconto}% OFF
            </span>
          </div>

          {/* Imagem Principal com Efeito Studio */}
          <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-[#181818] border border-neutral-800 flex items-center justify-center group">
            <img
              src={activeImage}
              alt={produto.nome}
              className="w-full h-full object-cover opacity-95 group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
            
            <div className="absolute bottom-3 left-3 bg-black/80 border border-neutral-700/80 px-2.5 py-1 rounded-lg backdrop-blur-md text-[10px] font-mono font-bold text-neutral-300">
              MOD {produto.id} • ARQUIVO ORIGINAL
            </div>
          </div>

          {/* Galeria de Miniaturas */}
          {produto.galeria && produto.galeria.length > 0 && (
            <div className="w-full mt-4 pt-4 border-t border-neutral-800/80 flex gap-2 overflow-x-auto scrollbar-thin">
              <button
                onClick={() => setActiveImage(produto.imagem)}
                className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                  activeImage === produto.imagem ? 'border-[#DFCA95] scale-105 shadow-md' : 'border-neutral-800 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={produto.imagem} alt="Capa" className="w-full h-full object-cover" />
              </button>
              {produto.galeria.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveImage(img)}
                  className={`w-14 h-14 rounded-xl overflow-hidden border-2 flex-shrink-0 transition-all cursor-pointer ${
                    activeImage === img ? 'border-[#DFCA95] scale-105 shadow-md' : 'border-neutral-800 opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={img} alt={`Galeria ${idx}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}

          {/* Trust Seal Lateral */}
          <div className="w-full mt-4 p-3 bg-black/40 border border-neutral-800/60 rounded-xl flex items-center justify-between text-[10px] font-mono text-neutral-400">
            <span className="flex items-center gap-1.5 font-bold text-neutral-200">
              <ShieldCheck className="w-3.5 h-3.5 text-[#C5A059]" />
              100% SEGURO & TESTADO
            </span>
            <span className="text-[#C5A059] font-bold">VITALÍCIO</span>
          </div>
        </div>

        {/* Coluna Direita: Conteúdo, Oferta & Conversão */}
        <div className="w-full md:w-7/12 p-6 sm:p-8 flex flex-col justify-between overflow-y-auto bg-[#0C0E10] bg-carbon">
          
          <div>
            {/* Rating & Social Proof */}
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center text-[#C5A059] gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-3.5 h-3.5 fill-current text-[#C5A059]" />
                ))}
              </div>
              <span className="text-xs font-mono font-bold text-neutral-300">
                5.0 (48+ Produtores)
              </span>
              <span className="ml-auto text-[10px] font-mono font-bold bg-[#C5A059]/15 text-[#DFCA95] border border-[#C5A059]/30 px-2 py-0.5 rounded-full">
                DISPONÍVEL AGORA
              </span>
            </div>

            {/* Título do Produto */}
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight uppercase leading-tight mt-1 mb-3 font-heading">
              {produto.nome}
            </h2>

            {/* Caixa de Oferta - Layout Responsivo em Fibra de Carbono Sutil */}
            <div className="p-4 sm:p-5 bg-[#121518] bg-carbon-subtle rounded-2xl border border-neutral-800 hover:border-[#C5A059]/40 mb-5 relative overflow-hidden transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                
                {/* Lado Esquerdo: Preços */}
                <div className="flex flex-col min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-mono text-neutral-500 line-through whitespace-nowrap">
                      de {precoAntigoFormatadoSemQuebra}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-[#DFCA95] bg-[#C5A059]/15 border border-[#C5A059]/30 px-2 py-0.5 rounded whitespace-nowrap">
                      ECONOMIA DE R$&nbsp;{economiaCalculada}
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-3xl sm:text-4xl font-mono font-black text-white tracking-tight whitespace-nowrap">
                      {precoFormatadoSemQuebra}
                    </span>
                    <span className="text-xs font-mono text-neutral-400 whitespace-nowrap">
                      à vista ou parcelado
                    </span>
                  </div>
                </div>

                {/* Lado Direito: Status de Entrega */}
                <div className="flex flex-col sm:items-end text-[11px] font-mono text-neutral-400 border-t sm:border-t-0 pt-3 sm:pt-0 border-neutral-800 whitespace-nowrap">
                  <span className="text-[#C5A059] font-bold flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-[#C5A059] fill-[#C5A059]" />
                    ACESSO IMEDIATO
                  </span>
                  <span className="text-neutral-500 mt-0.5">
                    Vitalício • Sem mensalidades
                  </span>
                </div>

              </div>
            </div>

            {/* Compatibilidade de Hardware & Sistema */}
            <div className="mb-5 p-3.5 bg-stone-950 rounded-xl border border-stone-800 flex items-start gap-3">
              <Cpu className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="block text-[10px] font-mono font-bold uppercase tracking-widest text-stone-400 mb-0.5">
                  PLATAFORMA & COMPATIBILIDADE:
                </span>
                <span className="text-xs font-mono font-bold text-stone-200 leading-relaxed">
                  {osCompativelTexto}
                </span>
              </div>
            </div>

            {/* Descrição Principal */}
            <p className="text-stone-300 text-xs sm:text-sm leading-relaxed mb-6 font-normal">
              {produto.desc}
            </p>

            {/* Grid Visual de Benefícios Inclusos */}
            <div className="mb-6 space-y-3">
              <h4 className="text-xs font-mono font-black uppercase tracking-wider text-stone-200 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                O QUE ESTÁ INCLUSO NESTE PACOTE:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[
                  { icon: Download, title: "Software Completo", desc: "Build estável, ativado e pronto para uso" },
                  { icon: Headphones, title: "Suporte Técnico VIP", desc: "Acompanhamento direto na instalação" },
                  { icon: Zap, title: "Instalação Assistida", desc: "Suporte remoto AnyDesk caso necessite" },
                  { icon: Lock, title: "Acesso Vitalício", desc: "Links permanentes para baixar quando quiser" },
                ].map((beneficio, i) => {
                  const Icon = beneficio.icon;
                  return (
                    <div key={i} className="p-2.5 bg-stone-950 border border-stone-800 rounded-xl flex items-center gap-2.5">
                      <div className="p-1.5 bg-stone-900 rounded-lg text-amber-500 flex-shrink-0">
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="block text-xs font-bold text-stone-200 leading-tight">{beneficio.title}</span>
                        <span className="text-[10px] text-stone-400 font-mono leading-tight">{beneficio.desc}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Garantia Incondicional 7 Dias */}
            <div className="p-3.5 bg-stone-950 rounded-2xl border border-stone-800 mb-6 flex items-center gap-3.5">
              <div className="p-2.5 bg-amber-950/60 rounded-xl text-amber-500 flex-shrink-0 border border-amber-800/40">
                <Award className="w-6 h-6" />
              </div>
              <div className="text-xs text-stone-300">
                <span className="font-bold text-stone-100 block uppercase tracking-wider text-[11px]">
                  Garantia Incondicional de 7 Dias
                </span>
                Satisfação 100% garantida ou devolvemos o valor no mesmo dia.
              </div>
            </div>

          </div>

          {/* Botão de Compra / Adicionar ao Carrinho */}
          <div className="pt-4 border-t border-stone-800 space-y-2">
            <button
              onClick={() => {
                if (!isInCart) {
                  onAddToCart(produto);
                }
                onClose();
                if (!isCartOpen) {
                  setTimeout(() => {
                    const cartBtn = document.querySelector('button[title="Carrinho"], button[class*="ShoppingBag"]');
                    if (cartBtn) (cartBtn as HTMLButtonElement).click();
                  }, 150);
                }
              }}
              className="w-full min-h-[48px] py-3.5 sm:py-4 px-4 sm:px-6 rounded-2xl font-mono font-black text-xs sm:text-sm text-[#1C1917] bg-[#F4F1EA] hover:bg-white shadow-[0_4px_25px_rgba(146,64,14,0.3)] transition-all flex items-center justify-center gap-2 sm:gap-3 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-center leading-snug"
            >
              <span>{isInCart ? '[ PRODUTO JÁ NO RACK - IR PARA CHECKOUT ]' : `[ ADICIONAR AO MEU RACK - ${precoFormatadoSemQuebra} ]`}</span>
              <ArrowRight className="w-4 h-4 flex-shrink-0 text-amber-800" />
            </button>

            <p className="text-center text-[10px] font-mono text-stone-500 uppercase tracking-wider">
              🔒 Checkout 100% Seguro & Acesso Imediato
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
