import React, { useState, useRef } from 'react';
import { Produto } from '../data/produtos';
import { Check, Plus, Zap, Sparkles, ArrowUpRight } from 'lucide-react';

interface ProductCardProps {
  produto: Produto;
  onAddToCart: (produto: Produto) => void;
  onOpenDetails: (produto: Produto) => void;
  isInCart?: boolean;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  produto, 
  onAddToCart, 
  onOpenDetails,
  isInCart 
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);

  // Detecção de tela de toque para evitar 3D pesado e travamentos no mobile
  const isTouchDevice = typeof window !== 'undefined' && (
    window.matchMedia('(pointer: coarse)').matches || window.innerWidth < 768
  );

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || !cardRef.current) return;
    const card = cardRef.current;
    const box = card.getBoundingClientRect();
    
    const x = e.clientX - box.left - box.width / 2;
    const y = e.clientY - box.top - box.height / 2;
    
    const rotateY = (x / (box.width / 2)) * 8;
    const rotateX = -(y / (box.height / 2)) * 8;
    
    setCoords({ x: rotateX, y: rotateY });
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (!isTouchDevice) {
      setIsHovered(false);
      setCoords({ x: 0, y: 0 });
    }
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddToCart(produto);
    
    setIsFlashing(true);
    setTimeout(() => {
      setIsFlashing(false);
    }, 1000);
  };

  const parsePrice = (precoStr: string) => {
    const numbers = precoStr.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numbers) || 0;
  };

  // Preço âncora e desconto visual monocromático
  const precoAtualNum = parsePrice(produto.preco);
  const precoAntigoNum = produto.precoAntigo ? parsePrice(produto.precoAntigo) : 0;
  const precoAncoraReal = precoAntigoNum > precoAtualNum 
    ? produto.precoAntigo 
    : `R$ ${(precoAtualNum > 0 ? (precoAtualNum * 2.8).toFixed(2) : '197.00').replace('.', ',')}`;

  const percentualDesconto = precoAntigoNum > precoAtualNum && precoAntigoNum > 0
    ? Math.round(((precoAntigoNum - precoAtualNum) / precoAntigoNum) * 100)
    : 65;

  const boxStyles3d = !isTouchDevice ? {
    transform: isHovered 
      ? `rotateX(${coords.x}deg) rotateY(${coords.y}deg) scale(1.03)` 
      : 'rotateX(0deg) rotateY(0deg) scale(1)',
    transition: isHovered ? 'transform 0.1s ease-out, box-shadow 0.1s ease-out' : 'transform 0.4s ease-in-out, box-shadow 0.4s ease-in-out',
    transformStyle: 'preserve-3d',
    boxShadow: isHovered 
      ? `${-coords.y * 1.5}px ${coords.x * 1.5}px 25px rgba(0,0,0,0.5), 0 0 20px rgba(255,255,255,0.05)` 
      : '0 8px 16px rgba(0,0,0,0.4)'
  } as React.CSSProperties : undefined;

  const osLabel = produto.sistema_operacional === 'windows' 
    ? 'WIN' 
    : produto.sistema_operacional === 'mac' 
    ? 'MAC' 
    : 'WIN / MAC';

  const precoFormatadoSemQuebra = produto.preco.replace(/\s/g, '\u00A0');
  const precoAntigoFormatadoSemQuebra = precoAncoraReal.replace(/\s/g, '\u00A0');

  return (
    <div 
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`bg-carbon border border-neutral-850 hover:border-[#C5A059]/60 rounded-3xl p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden h-full group transition-all duration-300 shadow-[0_10px_30px_rgba(0,0,0,0.4)] hover:shadow-[0_20px_40px_rgba(197,160,89,0.15)] ${
        isFlashing ? 'animate-console-flash z-20 ring-2 ring-[#C5A059]' : ''
      }`}
      style={!isTouchDevice ? { perspective: '1000px' } : undefined}
    >
      {/* Top subtle golden highlight */}
      <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059]/30 to-transparent pointer-events-none" />

      <div>
        {/* 3D Box Mockup (Product Image) */}
        <div 
          onClick={() => onOpenDetails(produto)}
          style={boxStyles3d}
          className="w-full aspect-square bg-[#141618] border border-neutral-800 rounded-2xl flex items-center justify-center cursor-pointer mb-5 overflow-hidden relative group-hover:border-[#C5A059]/40 transition-colors"
        >
          {/* Soft edge shade & shine */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/10 z-10 pointer-events-none" />
          
          {/* Mockup spine (Left vertical depth line with gold metallic glint) */}
          <div className="absolute left-0 top-0 bottom-0 w-[4px] bg-[#C5A059]/30 group-hover:bg-[#C5A059]/80 z-20 transition-colors pointer-events-none" />
          
          {/* Main image */}
          <img 
            src={produto.imagem} 
            alt={produto.nome} 
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-500"
          />

          {/* Tag Top Left: MOD & OS (Carbon & Gold) */}
          <div className="absolute top-3 left-3 text-[9px] font-mono text-neutral-300 bg-black/85 border border-neutral-700/80 px-2 py-1 rounded-md backdrop-blur-md tracking-wider z-20 font-bold flex items-center gap-1.5 shadow-sm">
            <span className="text-neutral-400">MOD {produto.id}</span>
            <span className="text-[#C5A059]">•</span>
            <span className="text-white font-extrabold">{osLabel}</span>
          </div>

          {/* Tag Top Right: Discount Pill com Acabamento Dourado */}
          <div className="absolute top-3 right-3 text-[9px] font-mono font-bold text-[#DFCA95] bg-black/85 border border-[#C5A059]/50 px-2 py-1 rounded-md backdrop-blur-md tracking-wider z-20 uppercase shadow-sm">
            -{percentualDesconto}% OFF
          </div>

          {/* Hover Details Quick Overlay */}
          <div className="absolute inset-0 bg-black/45 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 flex items-center justify-center pointer-events-none">
            <div className="bg-white text-black py-2 px-4 rounded-full font-heading text-xs font-bold uppercase tracking-wider shadow-2xl transform translate-y-2 group-hover:translate-y-0 transition-transform flex items-center gap-1.5 border border-[#C5A059]/40">
              <span>VER DETALHES</span>
              <ArrowUpRight className="w-3.5 h-3.5 text-[#C5A059]" />
            </div>
          </div>
        </div>

        {/* Informações do Produto */}
        <div className="flex flex-col z-10">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[#A88438] text-[10px] font-mono tracking-widest uppercase font-bold">
              {produto.categoria || 'SOFTWARE'}
            </span>
            <span className="text-[10px] font-mono text-neutral-300 font-bold tracking-wider flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059] animate-pulse shadow-[0_0_6px_#C5A059]" />
              DISPONÍVEL
            </span>
          </div>

          <h3 
            onClick={() => onOpenDetails(produto)}
            className="text-white text-base sm:text-lg font-heading font-bold mt-0.5 cursor-pointer hover:text-[#DFCA95] transition-colors leading-snug line-clamp-2 uppercase tracking-tight"
          >
            {produto.nome}
          </h3>

          <p className="text-xs text-neutral-400 mt-2 line-clamp-2 leading-relaxed font-normal font-sans">
            {produto.desc || 'Ferramenta de alta performance para fluxo de produção profissional.'}
          </p>

          {/* Badges de Benefícios com Acabamento Dourado */}
          <div className="space-y-1.5 mt-4 pt-3 border-t border-neutral-900">
            <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-300">
              <Zap className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0" />
              <span>Download Imediato & Acesso Vitalício</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-300">
              <Sparkles className="w-3.5 h-3.5 text-[#C5A059] flex-shrink-0" />
              <span>Instalação Assistida & Suporte VIP</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer do Card com Preço Alinhado e Botão de Ação */}
      <div className="flex items-center justify-between mt-5 pt-4 border-t border-neutral-900 z-10 gap-2">
        <div className="flex flex-col min-w-0 justify-center">
          <span className="text-[10px] text-neutral-500 line-through font-mono font-medium leading-none mb-1 whitespace-nowrap">
            de {precoAntigoFormatadoSemQuebra}
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="text-base sm:text-lg font-mono font-black text-white tracking-tight whitespace-nowrap">
              {precoFormatadoSemQuebra}
            </span>
            <span className="text-[9px] font-mono text-[#A88438] font-bold uppercase whitespace-nowrap">
              PIX / CARTÃO
            </span>
          </div>
        </div>

        <button
          onClick={handleAddToCart}
          title={isInCart ? "Remover do carrinho" : "Adicionar ao Carrinho"}
          className={`min-h-[44px] py-2.5 px-3.5 sm:px-4 rounded-xl font-heading text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md flex-shrink-0 whitespace-nowrap active:scale-95 ${
            isInCart 
            ? 'bg-neutral-900 text-[#C5A059] border border-[#C5A059]/60 hover:bg-neutral-800' 
            : 'bg-white text-black hover:bg-[#FAF9F5] border border-transparent hover:border-[#C5A059]/60 hover:shadow-[0_0_15px_rgba(197,160,89,0.25)] hover:scale-[1.03]'
          }`}
        >
          {isInCart ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#C5A059]" />
              <span>NO RACK</span>
            </>
          ) : (
            <>
              <Plus className="w-3.5 h-3.5" />
              <span>ADICIONAR</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
