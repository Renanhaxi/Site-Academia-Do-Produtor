import React from 'react';
import { HelpCircle, ArrowRight } from 'lucide-react';

export const ComoFunciona: React.FC = () => {
  const passos = [
    { num: "Passo 1", titulo: "Escolha sua ferramenta", desc: "Selecione a DAW ou Plugin exato para elevar suas produções." },
    { num: "Passo 2", titulo: "Receba acesso imediato", desc: "Pedido orquestrado com atendimento humanizado via WhatsApp." },
    { num: "Passo 3", titulo: "Instalação assistida", desc: "Nossa equipe configura tudo para rodar liso no seu estúdio." },
    { num: "Passo 4", titulo: "Entre para a comunidade", desc: "Conecte-se imediatamente com outros produtores experientes." },
    { num: "Passo 5", titulo: "Comece a produzir", desc: "Crie novas músicas sem telas de erro e sem complicação." }
  ];

  return (
    <section id="como-funciona" className="py-20 bg-[#F4F1EA] border-t border-stone-300/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#EBE6DC] border border-stone-300 rounded-full mb-6">
            <HelpCircle className="w-4 h-4 text-amber-700" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1C1917]">Fluxo Operacional</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1917] mb-4 uppercase leading-none">
            Da compra à produção em poucos passos.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {passos.map((item, index) => (
            <div key={index} className="relative group p-6 border border-neutral-800 bg-carbon rounded-2xl flex flex-col gap-3 hover:border-[#C5A059]/60 shadow-[0_10px_25px_rgba(0,0,0,0.35)] transition-all">
              <span className="text-[10px] font-mono font-bold text-[#C5A059] uppercase tracking-widest">{item.num}</span>
              <h4 className="text-sm font-bold text-neutral-100 uppercase leading-tight font-heading">{item.titulo}</h4>
              <p className="text-neutral-400 text-[11px] leading-relaxed font-normal">{item.desc}</p>
              {index < 4 && (
                <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#C5A059]/70 z-10" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ComoFunciona;
