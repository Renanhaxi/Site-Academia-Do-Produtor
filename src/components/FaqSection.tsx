import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';
import { faqAlcateia } from '../data/produtos';

export const FaqSection: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const toggleAccordion = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <section id="faq" className="py-24 bg-[#F4F1EA] border-t border-stone-300/80 relative">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#EBE6DC] border border-stone-300 rounded-full mb-6">
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1C1917]">
              Perguntas Frequentes
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1917] mb-4 uppercase">
            FICOU COM ALGUMA DÚVIDA?
          </h2>
          <p className="text-stone-700 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            Tudo o que você precisa saber sobre a liberação do catálogo, garantias e como funciona a contratação do nosso serviço de Instalação VIP.
          </p>
        </div>

        <div className="space-y-4">
          {faqAlcateia.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                className={`rounded-2xl transition-all duration-300 overflow-hidden border ${
                  isOpen 
                    ? 'bg-[#EBE6DC] border-amber-800/60 shadow-[0_8px_30px_rgba(28,25,23,0.06)]' 
                    : 'bg-[#EBE6DC]/40 border-stone-300 hover:border-amber-700/60'
                }`}
              >
                <button
                  onClick={() => toggleAccordion(index)}
                  className="w-full text-left p-6 sm:px-8 flex items-center justify-between gap-4 focus:outline-none cursor-pointer group"
                >
                  <span className={`text-base sm:text-lg font-bold transition-colors pr-4 ${isOpen ? 'text-[#1C1917]' : 'text-stone-800'}`}>
                    {item.pergunta}
                  </span>
                  <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isOpen 
                      ? 'bg-[#1C1917] text-[#DFCA95] rotate-180 shadow-[0_0_15px_rgba(146,64,14,0.25)]' 
                      : 'bg-stone-200 border border-stone-300 text-stone-700 group-hover:text-[#1C1917]'
                  }`}>
                    <ChevronDown className="w-5 h-5" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 sm:px-8 pb-8 pt-0 text-sm text-stone-700 leading-relaxed font-medium">
                    {item.resposta}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
