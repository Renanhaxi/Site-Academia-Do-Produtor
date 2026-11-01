import React from 'react';
import { HelpCircle, Star, Shield, ArrowRight } from 'lucide-react';

export const ComoFuncionaGarantia: React.FC = () => {
  const passos = [
    { num: "Passo 1", titulo: "Escolha sua ferramenta", desc: "Selecione a DAW ou Plugin exato para elevar suas produções." },
    { num: "Passo 2", titulo: "Receba acesso imediato", desc: "Pedido orquestrado com atendimento humanizado via WhatsApp." },
    { num: "Passo 3", titulo: "Instalação assistida", desc: "Nossa equipe configura tudo para rodar liso no seu estúdio." },
    { num: "Passo 4", titulo: "Entre para a comunidade", desc: "Conecte-se imediatamente com outros produtores experientes." },
    { num: "Passo 5", titulo: "Comece a produzir", desc: "Crie novas músicas sem telas de erro e sem complicação." }
  ];

  return (
    <div className="bg-white border-t border-neutral-200">
      
      {/* SEÇÃO 06 — COMO FUNCIONA */}
      <section id="como-funciona" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-neutral-100 border border-neutral-200 rounded-full mb-6">
            <HelpCircle className="w-4 h-4 text-black" />
            <span className="text-xs font-bold uppercase tracking-widest text-black">Fluxo Operacional</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-black mb-4 uppercase">
            Da compra à produção em poucos passos.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 relative">
          {passos.map((item, index) => (
            <div key={index} className="relative group p-6 border border-neutral-200 bg-neutral-50 rounded-2xl flex flex-col gap-3 hover:border-black transition-all">
              <span className="text-[10px] font-mono font-bold text-neutral-500 uppercase tracking-widest">{item.num}</span>
              <h4 className="text-sm font-bold text-black uppercase leading-tight font-heading">{item.titulo}</h4>
              <p className="text-neutral-500 text-[11px] leading-relaxed font-medium">{item.desc}</p>
              {index < 4 && (
                <ArrowRight className="hidden md:block absolute -right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-300 z-10" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* SEÇÃO 08 — GARANTIA */}
      <section className="py-20 bg-neutral-50 border-t border-neutral-200">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-white border border-neutral-200 flex items-center justify-center mx-auto shadow-sm">
            <Shield className="w-8 h-8 text-black" />
          </div>
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-black uppercase">
            Sua compra protegida.
          </h2>
          <p className="text-neutral-600 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            Se por qualquer motivo você não conseguir utilizar sua ferramenta conforme prometido, nossa equipe estará disponível para resolver a situação durante o período de garantia de 7 dias.
          </p>
          <span className="inline-block text-[10px] font-mono font-bold text-black border border-black px-4 py-2 rounded-full uppercase tracking-widest bg-white">
            ✓ Garantia Incondicional de 7 dias
          </span>
        </div>
      </section>

      {/* SEÇÃO 10 — CTA FINAL */}
      <section className="py-20 bg-neutral-900 text-white border-t border-neutral-850">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white uppercase leading-none">
            Seu próximo projeto merece as ferramentas certas.
          </h2>
          <p className="text-neutral-400 text-xs sm:text-sm max-w-xl mx-auto font-medium">
            Entre para o ecossistema Arsenal do Produtor e tenha acesso a softwares, suporte e uma comunidade construída para acelerar sua evolução.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <button 
              onClick={() => {
                const catElem = document.getElementById('catalogo');
                if (catElem) catElem.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-3.5 rounded-full font-bold text-sm bg-white hover:bg-neutral-200 text-black transition-all uppercase tracking-widest cursor-pointer shadow-md"
            >
              Explorar Catálogo
            </button>
            <button 
              onClick={() => {
                const formElem = document.getElementById('lead-magnet-incubadora');
                if (formElem) formElem.scrollIntoView({ behavior: 'smooth' });
              }}
              className="px-8 py-3.5 rounded-full font-bold text-sm bg-neutral-800 hover:bg-neutral-750 text-white border border-neutral-700 transition-all uppercase tracking-widest cursor-pointer"
            >
              Entrar na Comunidade Gratuita
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};
