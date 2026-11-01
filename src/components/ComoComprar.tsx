import React, { useEffect, useRef, useState } from 'react';
import { ShoppingBag, Percent, ShieldCheck, Zap } from 'lucide-react';

interface AnimatedStepRowProps {
  passo: any;
  idx: number;
}

const AnimatedStepRow: React.FC<AnimatedStepRowProps> = ({ passo, idx }) => {
  const [isVisible, setIsVisible] = useState(false);
  const elementRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  const isOdd = idx % 2 === 0;
  const initialTransformClass = isOdd
    ? 'translate-x-8 md:translate-x-12'
    : '-translate-x-8 md:-translate-x-12';

  return (
    <div
      ref={elementRef}
      className={`bg-carbon border border-neutral-800 p-5 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:border-[#C5A059]/60 shadow-[0_10px_25px_rgba(0,0,0,0.45)] transition-all duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)] relative will-change-transform ${
        isVisible ? 'opacity-100 translate-x-0' : `opacity-0 ${initialTransformClass}`
      }`}
    >
      <div className="flex items-start gap-4 flex-1">
        <div className="p-2.5 bg-black/60 border border-neutral-800 rounded-2xl shadow-sm group-hover:border-[#C5A059]/40 transition-colors flex-shrink-0 text-[#C5A059]">
          {passo.icone}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-black text-neutral-100 uppercase tracking-wider font-mono">
            {passo.numero}. {passo.titulo}
          </h3>
          <p className="text-neutral-400 text-xs sm:text-sm mt-0.5 leading-relaxed font-medium">
            {passo.desc}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 md:flex-shrink-0 pl-0 md:pl-16 mt-2 md:mt-0">
        {passo.destaques &&
          passo.destaques.map((d: string, dIdx: number) => (
            <span
              key={dIdx}
              className="inline-flex text-[9px] font-mono font-extrabold uppercase tracking-wider px-2.5 py-1 rounded-full bg-black/70 text-[#C5A059] border border-[#C5A059]/30 shadow-sm"
            >
              {d}
            </span>
          ))}
      </div>
    </div>
  );
};

export const ComoComprar: React.FC = () => {
  const passos = [
    {
      numero: '01',
      titulo: 'Escolha seu Arsenal',
      desc: 'Explore o catálogo acima, clique em qualquer produto para ver a ficha técnica completa, vídeos e demonstrações, e adicione ao seu Rack.',
      icone: <ShoppingBag className="w-6 h-6 text-[#C5A059]" />,
      destaques: ['Ficha Completa', 'Preview de Estúdio'],
    },
    {
      numero: '02',
      titulo: 'Desconto Progressivo Automático',
      desc: 'Quanto mais ferramentas você equipa, menor o valor unitário: 2 itens destravam 10% OFF e 3 ou mais itens liberam 20% OFF na hora.',
      icone: <Percent className="w-6 h-6 text-[#C5A059]" />,
      destaques: ['2 itens = 10% OFF', '3+ itens = 20% OFF'],
    },
    {
      numero: '03',
      titulo: 'Identificação de Membro VIP',
      desc: 'Acesse ou crie sua conta com e-mail e senha em segundos. Sua compra fica blindada e vinculada permanentemente ao seu perfil.',
      icone: <ShieldCheck className="w-6 h-6 text-[#C5A059]" />,
      destaques: ['Conta Protegida', 'Licença Vitalícia'],
    },
    {
      numero: '04',
      titulo: 'Pagamento PIX & Liberação Automática',
      desc: 'Pague via PIX no próprio site. Assim que compensado, seus links de download em alta velocidade são liberados automaticamente em "Meus Acessos".',
      icone: <Zap className="w-6 h-6 text-[#C5A059]" />,
      destaques: ['100% Automático', 'Download Imediato'],
    },
  ];

  return (
    <section
      id="como-comprar"
      className="py-20 relative overflow-hidden bg-[#F4F1EA] border-t border-b border-stone-300/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-14">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-mono font-bold tracking-[0.2em] bg-[#EBE6DC] text-[#92400E] border border-stone-300 uppercase mb-4">
            ⚡ Jornada 100% Automatizada no Site
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-[#1C1917] tracking-tight uppercase leading-none">
            Como Funciona a Liberação?
          </h2>
          <p className="text-stone-700 font-mono text-xs sm:text-sm mt-3 uppercase tracking-widest font-semibold">
            Sem filas de espera: escolha, autentique sua conta, pague via PIX e baixe na hora.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-4 overflow-x-hidden p-2">
          {passos.map((p, idx) => (
            <AnimatedStepRow key={idx} passo={p} idx={idx} />
          ))}
        </div>
      </div>
    </section>
  );
};
