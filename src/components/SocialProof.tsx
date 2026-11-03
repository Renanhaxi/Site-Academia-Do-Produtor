import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { CONFIG_GLOBAL } from '../data/produtos';

export const SocialProof: React.FC = () => {
  const [feedbackImagens, setFeedbackImagens] = useState<string[]>(() => {
    try {
      const stored =
        localStorage.getItem('ARSENAL_FEEDBACKS') || localStorage.getItem('ALCATEIA_FEEDBACKS');
      return stored ? JSON.parse(stored) : (CONFIG_GLOBAL.feedbackImagens || []);
    } catch {
      return CONFIG_GLOBAL.feedbackImagens || [];
    }
  });

  useEffect(() => {
    const handleUpdate = () => {
      try {
        const stored =
          localStorage.getItem('ARSENAL_FEEDBACKS') || localStorage.getItem('ALCATEIA_FEEDBACKS');
        setFeedbackImagens(stored ? JSON.parse(stored) : CONFIG_GLOBAL.feedbackImagens);
      } catch {
        setFeedbackImagens(CONFIG_GLOBAL.feedbackImagens);
      }
    };

    window.addEventListener('configuracoesAtualizadas', handleUpdate);
    return () => {
      window.removeEventListener('configuracoesAtualizadas', handleUpdate);
    };
  }, []);

  // Double/triple the list so the infinite marquee animation has enough width to cycle seamlessly
  const duplicatedImagens = feedbackImagens.length > 0 
    ? [...feedbackImagens, ...feedbackImagens, ...feedbackImagens, ...feedbackImagens] 
    : [];

  return (
    <section id="depoimentos" className="py-24 bg-[#F4F1EA] border-t border-stone-300/80 relative overflow-hidden">
      <div className="w-full relative z-10">
        
        <div className="text-center max-w-3xl mx-auto mb-16 px-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-[#EBE6DC] border border-stone-300 rounded-full mb-6">
            <Star className="w-4 h-4 text-amber-700 fill-current" />
            <span className="text-xs font-bold uppercase tracking-widest text-[#1C1917]">
              RESULTADO PRÁTICO COMPROVADO
            </span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1C1917] mb-4 uppercase">
            FEEDBACK DOS MEMBROS
          </h2>
          <p className="text-stone-700 text-sm sm:text-base max-w-2xl mx-auto leading-relaxed font-medium">
            Quem utiliza as nossas ferramentas no workflow do estúdio aprova a qualidade e a velocidade na entrega dos projetos.
          </p>
        </div>

        {duplicatedImagens.length > 0 ? (
          /* Vertical cards horizontal scrolling infinite carousel */
          <div className="relative w-full overflow-hidden py-6 border-y border-stone-300/80 bg-[#EBE6DC]/60">
            <div className="flex w-[400%] sm:w-[250%] gap-6 animate-marquee">
              {duplicatedImagens.map((src, index) => (
                <div 
                  key={index}
                  className="w-56 sm:w-64 h-[350px] sm:h-[420px] rounded-2xl overflow-hidden border border-stone-800 flex-shrink-0 bg-stone-950 relative shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <img 
                    src={src} 
                    alt={`Feedback WhatsApp ${index}`} 
                    loading="lazy"
                    className="w-full h-full object-contain pointer-events-none"
                  />
                  <div className="absolute top-3 left-3 bg-stone-900/90 border border-stone-700 text-amber-500 font-mono text-[9px] px-2 py-0.5 rounded uppercase tracking-wider font-bold">
                    WHATSAPP VERIFIED
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-10 text-stone-500 text-xs font-mono">
            Nenhum print de feedback cadastrado no painel.
          </div>
        )}

      </div>
    </section>
  );
};

export default SocialProof;
