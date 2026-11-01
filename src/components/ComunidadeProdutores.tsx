import React from 'react';

export const ComunidadeProdutores: React.FC = () => {
  return (
    <section id="comunidade-membros" className="py-12 bg-white border-t border-neutral-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden border border-neutral-200 bg-neutral-50 p-8 sm:p-12 lg:p-16 flex flex-col lg:flex-row items-center gap-12 group">
          
          {/* Esquerda: Informações da Comunidade */}
          <div className="flex-1 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-black text-white text-[10px] font-mono rounded-full uppercase tracking-widest font-bold">
              ACESSO LIVRE
            </div>
            <h3 className="text-2xl sm:text-4xl font-black text-black uppercase tracking-tight leading-none">
              COMUNIDADE DE PRODUTORES
            </h3>
            <p className="text-neutral-600 text-sm sm:text-base leading-relaxed font-medium">
              Conecte-se com produtores experientes e iniciantes em um ecossistema focado no crescimento mútuo. Tenha acesso a conteúdos exclusivos de produção, sorteios semanais de ferramentas de áudio e atualizações do catálogo em primeira mão.
            </p>
            
            <div className="pt-4">
              <a
                href="https://wa.me/5591980694387?text=Quero%20fazer%20parte%20da%20comunidade%20gratuita!"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex px-8 py-4 rounded-full font-bold text-sm text-white bg-black hover:bg-neutral-800 transition-all uppercase tracking-widest cursor-pointer shadow-[0_4px_20px_rgba(0,0,0,0.15)]"
              >
                Entrar na Comunidade Gratuita
              </a>
            </div>
          </div>

          {/* Direita: Banner Promocional formatado em imagem */}
          <div className="w-full lg:w-5/12 h-64 sm:h-80 rounded-2xl overflow-hidden border border-neutral-200 shadow-md relative bg-neutral-900">
            <img 
              src="https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=800&auto=format&fit=crop" 
              alt="Comunidade Banner" 
              className="w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-700 pointer-events-none"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
              <span className="text-[9px] font-mono text-neutral-400 uppercase tracking-widest font-bold">CONTEÚDOS E DESAFIOS SEMANAIS</span>
              <h4 className="text-white text-lg font-black uppercase tracking-tight mt-1">SORTEIOS DE AUDIO DE ACORDO COM O LEVEL</h4>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};

export default ComunidadeProdutores;
