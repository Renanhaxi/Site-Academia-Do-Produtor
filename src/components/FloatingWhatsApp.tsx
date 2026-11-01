import React from 'react';
import { MessageSquare } from 'lucide-react';
import { CONFIG_GLOBAL } from '../data/produtos';

export const FloatingWhatsApp: React.FC = () => {
  const openGeneralWhatsApp = () => {
    const text = encodeURIComponent("Olá! Estou navegando no catálogo do Arsenal do Produtor e gostaria de falar com um atendente VIP.");
    window.open(`https://wa.me/${CONFIG_GLOBAL.whatsappNumero}?text=${text}`, '_blank');
  };

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <div className="relative group">
        
        {/* Pulse effect */}
        <div className="absolute -inset-1 bg-[#E52E2E] rounded-full blur-sm opacity-70 group-hover:opacity-100 animate-pulse transition-opacity duration-300" />

        {/* Notification badge */}
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white border-2 border-[#0A0D0C] rounded-full z-10 animate-ping" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white border-2 border-[#0A0D0C] rounded-full z-10" />

        <button
          onClick={openGeneralWhatsApp}
          title="Atendimento VIP via WhatsApp"
          className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#E52E2E] text-white flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-transform duration-300 cursor-pointer"
        >
          <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 fill-current" />
        </button>
      </div>
    </div>
  );
};
