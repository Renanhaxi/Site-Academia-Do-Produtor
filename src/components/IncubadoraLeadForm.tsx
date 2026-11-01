import React, { useState, useEffect } from 'react';
import { CONFIG_GLOBAL } from '../data/produtos';

export const IncubadoraLeadForm: React.FC = () => {
  const [bannerImg, setBannerImg] = useState(() => {
    return localStorage.getItem('ALCATEIA_BANNER_IMG') || CONFIG_GLOBAL.bannerImagemUrl;
  });

  const [bannerLink, setBannerLink] = useState(() => {
    return localStorage.getItem('ALCATEIA_BANNER_LINK') || CONFIG_GLOBAL.bannerLinkUrl;
  });

  // Listen to custom configurations events to update in real-time
  useEffect(() => {
    const handleConfigUpdate = () => {
      setBannerImg(localStorage.getItem('ALCATEIA_BANNER_IMG') || CONFIG_GLOBAL.bannerImagemUrl);
      setBannerLink(localStorage.getItem('ALCATEIA_BANNER_LINK') || CONFIG_GLOBAL.bannerLinkUrl);
    };

    window.addEventListener('configuracoesAtualizadas', handleConfigUpdate);
    return () => {
      window.removeEventListener('configuracoesAtualizadas', handleConfigUpdate);
    };
  }, []);

  return (
    <section id="lead-magnet-incubadora" className="py-12 bg-[#F4F1EA] border-t border-stone-300/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Banner Click Call to Action Indicator */}
        <div className="text-center mb-6">
          <span className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full text-[9px] sm:text-[10px] font-mono font-bold tracking-[0.2em] bg-[#EBE6DC] text-stone-800 border border-stone-300 uppercase animate-pulse">
            ⚡ ACESSO GRATUITO • CLIQUE NO BANNER PARA ENTRAR NA COMUNIDADE
          </span>
        </div>

        <a 
          href={bannerLink} 
          target="_blank" 
          rel="noopener noreferrer"
          className="block relative rounded-3xl overflow-hidden border border-stone-300 hover:border-amber-700/60 shadow-md hover:shadow-xl hover:scale-[1.005] transition-all duration-300 group bg-stone-950 aspect-[21/9] sm:aspect-[3/1]"
        >
          {/* Banner Image */}
          <img 
            src={bannerImg} 
            alt="Banner Promocional Arsenal do Produtor" 
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.02]"
          />
          
          {/* Subtle overlay */}
          <div className="absolute inset-0 bg-black/10 pointer-events-none group-hover:bg-black/0 transition-colors duration-300" />
        </a>
      </div>
    </section>
  );
};

export default IncubadoraLeadForm;
