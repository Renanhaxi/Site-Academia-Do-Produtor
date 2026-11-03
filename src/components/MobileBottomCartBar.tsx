import React from 'react';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { Produto } from '../data/produtos';

interface MobileBottomCartBarProps {
  cartItems: Produto[];
  onOpenCart: () => void;
}

export const MobileBottomCartBar: React.FC<MobileBottomCartBarProps> = ({
  cartItems,
  onOpenCart,
}) => {
  if (cartItems.length === 0) return null;

  const parsePrice = (precoStr: string) => {
    const numbers = precoStr.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numbers) || 0;
  };

  const valorOriginal = cartItems.reduce((acc, curr) => acc + parsePrice(curr.preco), 0);
  let percentualDesconto = 0;
  if (cartItems.length === 2) percentualDesconto = 0.10;
  if (cartItems.length >= 3) percentualDesconto = 0.20;

  const valorTotal = valorOriginal * (1 - percentualDesconto);
  const totalFormatado = `R$ ${valorTotal.toFixed(2).replace('.', ',')}`;

  return (
    <div 
      className="sm:hidden fixed left-3 right-3 z-45 animate-in slide-in-from-bottom-5 duration-300"
      style={{ bottom: 'max(1rem, env(safe-area-inset-bottom, 1rem))' }}
    >
      <div 
        onClick={onOpenCart}
        className="w-full bg-stone-900 border border-amber-800/60 rounded-2xl p-3 shadow-[0_12px_30px_rgba(0,0,0,0.5)] flex items-center justify-between gap-3 cursor-pointer active:scale-[0.98] transition-transform"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-stone-950 border border-amber-800/40 flex items-center justify-center text-amber-500 flex-shrink-0 relative">
            <ShoppingBag className="w-5 h-5" />
            <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-amber-600 text-stone-950 font-mono font-black text-[10px] flex items-center justify-center shadow-md">
              {cartItems.length}
            </span>
          </div>

          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono text-[#DFCA95] font-bold uppercase tracking-wider">
                {cartItems.length === 1 ? '1 ITEM NO RACK' : `${cartItems.length} ITENS NO RACK`}
              </span>
              {percentualDesconto > 0 && (
                <span className="text-[9px] font-mono bg-amber-950/60 text-[#DFCA95] px-1.5 py-0.2 rounded font-black border border-amber-800/40">
                  -{(percentualDesconto * 100).toFixed(0)}%
                </span>
              )}
            </div>
            <span className="text-base font-mono font-black text-stone-100 tracking-tight">
              {totalFormatado}
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onOpenCart();
          }}
          className="px-4 py-2.5 rounded-xl bg-[#F4F1EA] text-[#1C1917] hover:bg-white font-heading font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-md flex-shrink-0"
        >
          <span>FINALIZAR</span>
          <ArrowRight className="w-3.5 h-3.5 text-amber-800" />
        </button>
      </div>
    </div>
  );
};
