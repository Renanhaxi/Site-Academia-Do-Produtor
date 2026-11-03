import React from 'react';
import { Shield } from 'lucide-react';

export const Garantia: React.FC = () => {
  return (
    <section className="py-20 bg-[#EBE6DC]/70 border-t border-stone-300/80">
      <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#F4F1EA] border border-stone-300 flex items-center justify-center mx-auto shadow-sm">
          <Shield className="w-8 h-8 text-amber-800" />
        </div>
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-[#1C1917] uppercase">
          Sua compra protegida.
        </h2>
        <p className="text-stone-700 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
          Se por qualquer motivo você não conseguir utilizar sua ferramenta conforme prometido, nossa equipe estará disponível para resolver a situação durante o período de garantia de 7 dias.
        </p>
        <span className="inline-block text-[10px] font-mono font-bold text-[#DFCA95] border border-amber-800/50 px-4 py-2 rounded-full uppercase tracking-widest bg-[#1C1917] shadow-sm">
          ✓ Garantia Incondicional de 7 dias
        </span>
      </div>
    </section>
  );
};

export default Garantia;
