import React, { useState, useEffect } from 'react';
import { ShoppingBag, UserCheck, LogIn, ArrowLeft } from 'lucide-react';

interface NavbarProps {
  onOpenAdmin: () => void;
  onOpenCart: () => void;
  onOpenAuth: () => void;
  onOpenDashboard?: () => void;
  userSession?: any;
  cartCount: number;
  activeProductView?: boolean;
  onBackToCatalog?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenAdmin,
  onOpenCart,
  onOpenAuth,
  onOpenDashboard,
  userSession,
  cartCount,
  activeProductView,
  onBackToCatalog,
}) => {
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);
  const [showRecBlink, setShowRecBlink] = useState(false);

  useEffect(() => {
    if (cartCount > 0) {
      setShowRecBlink(true);
      const timer = setTimeout(() => {
        setShowRecBlink(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [cartCount]);

  const handleNavClick = (href: string) => {
    if (activeProductView && onBackToCatalog) {
      onBackToCatalog();
      setTimeout(() => {
        const elem = document.querySelector(href);
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const elem = document.querySelector(href);
    if (elem) {
      elem.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLogoClick = (e: React.MouseEvent) => {
    e.preventDefault();
    handleNavClick('#inicio');

    const currentTime = new Date().getTime();
    if (currentTime - lastClickTime < 500) {
      const newCount = clickCount + 1;
      setClickCount(newCount);
      if (newCount === 4) {
        onOpenAdmin();
        setClickCount(0);
      }
    } else {
      setClickCount(1);
    }
    setLastClickTime(currentTime);
  };

  return (
    <header className="fixed top-4 left-0 right-0 z-50 pointer-events-none">
      <div className="pointer-events-auto bg-[#F4F1EA]/90 backdrop-blur-md border border-stone-300 hover:border-amber-700/60 rounded-full px-3 py-2 sm:px-6 sm:py-2.5 max-w-max mx-auto flex gap-2 sm:gap-5 items-center shadow-[0_10px_30px_rgba(28,25,23,0.12)] overflow-hidden max-w-[96vw] transition-all">
        {/* Botão Voltar rápido quando dentro da página de produto */}
        {activeProductView && onBackToCatalog && (
          <button
            onClick={onBackToCatalog}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1C1917] text-[#DFCA95] border border-amber-700/40 hover:bg-stone-800 text-[10px] sm:text-xs font-mono font-bold uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
            title="Voltar ao Catálogo"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-[#C5A059]" />
            <span className="hidden xs:inline">Catálogo</span>
          </button>
        )}

        <button
          onClick={handleLogoClick}
          className="flex items-center justify-center sm:mr-1 hover:opacity-90 transition-opacity flex-shrink-0 cursor-pointer"
        >
          <img
            src="/logo-arsenal-brand.png"
            alt="Arsenal do Produtor"
            className="h-7 sm:h-8 w-auto object-contain filter drop-shadow-sm"
          />
        </button>

        {/* Links de Navegação */}
        <button
          onClick={() => handleNavClick('#inicio')}
          className="text-[10px] sm:text-xs font-heading font-bold text-stone-700 hover:text-[#92400E] transition-colors hidden md:block uppercase tracking-wider cursor-pointer"
        >
          Início
        </button>

        <button
          onClick={() => handleNavClick('#catalogo')}
          className="text-[10px] sm:text-xs font-heading font-bold text-stone-700 hover:text-[#92400E] transition-colors hidden sm:block uppercase tracking-wider cursor-pointer"
        >
          Arsenal
        </button>

        <button
          onClick={() => handleNavClick('#como-comprar')}
          className="text-[10px] sm:text-xs font-heading font-bold text-stone-700 hover:text-[#92400E] transition-colors hidden lg:block uppercase tracking-wider cursor-pointer"
        >
          Como Funciona
        </button>

        {/* Botão de Autenticação / Painel do Produtor */}
        {userSession ? (
          <button
            onClick={onOpenDashboard}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-stone-200/90 hover:bg-stone-300/90 border border-stone-300 text-[#1C1917] font-heading font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
            title="Acessar meus downloads e licenças"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
            <UserCheck className="w-3.5 h-3.5 text-amber-800" />
            <span className="hidden sm:inline">Meus Acessos</span>
          </button>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-full bg-stone-200/80 hover:bg-stone-300/90 border border-stone-300 text-[#1C1917] font-heading font-bold text-[10px] sm:text-xs uppercase tracking-wider transition-all cursor-pointer flex-shrink-0"
            title="Entrar ou Criar Conta"
          >
            <LogIn className="w-3.5 h-3.5 text-amber-800" />
            <span>Entrar</span>
          </button>
        )}

        {/* Botão do Carrinho */}
        <button
          onClick={onOpenCart}
          title="Carrinho"
          className={`flex items-center gap-1.5 font-heading font-bold text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-full transition-all cursor-pointer flex-shrink-0 ${
            showRecBlink
              ? 'bg-[#1C1917] text-[#DFCA95] border border-amber-700 shadow-[0_0_15px_rgba(146,64,14,0.4)]'
              : 'bg-[#1C1917] text-[#F4F1EA] hover:bg-[#78350F] border border-amber-800/40 hover:border-amber-700 hover:shadow-[0_0_15px_rgba(146,64,14,0.3)]'
          }`}
        >
          {showRecBlink ? (
            <>
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-[#F4F1EA] rounded-full animate-rec-blink" />
              <span>REC</span>
            </>
          ) : (
            <>
              <ShoppingBag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" />
              <span className="hidden sm:inline">Rack</span>
            </>
          )}
          {cartCount > 0 && (
            <span
              className={`px-1.5 py-0.5 rounded-full text-[9px] sm:text-[10px] ml-0.5 font-mono font-bold ${
                showRecBlink
                  ? 'bg-[#F4F1EA] text-[#1C1917]'
                  : 'bg-stone-800 text-[#DFCA95] border border-amber-700/40'
              }`}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};
