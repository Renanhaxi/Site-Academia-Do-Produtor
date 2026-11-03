import React from 'react';
import { Shield, CheckCircle, HelpCircle, Users, BookOpen, Clock } from 'lucide-react';

interface SealsProps {
  accentColor: string;
}

export const Seals: React.FC<SealsProps> = () => {
  const cardsConfianca = [
    {
      icon: <HelpCircle className="w-5 h-5 text-black" />,
      titulo: "Instalação Sem Dor de Cabeça",
      texto: "Configuramos tudo para você começar a produzir sem perder horas resolvendo erros."
    },
    {
      icon: <CheckCircle className="w-5 h-5 text-black" />,
      titulo: "Arquivos Verificados",
      texto: "Todos os softwares são testados antes da entrega."
    },
    {
      icon: <HelpCircle className="w-5 h-5 text-black" />,
      titulo: "Suporte Humanizado",
      texto: "Atendimento rápido com pessoas que entendem produção musical."
    },
    {
      icon: <Users className="w-5 h-5 text-black" />,
      titulo: "Comunidade Exclusiva",
      texto: "Networking, feedbacks, dúvidas e evolução contínua."
    },
    {
      icon: <BookOpen className="w-5 h-5 text-black" />,
      titulo: "Conteúdo Prático",
      texto: "Tutoriais e materiais produzidos pela equipe."
    },
    {
      icon: <Shield className="w-5 h-5 text-black" />,
      titulo: "Garantia Real",
      texto: "7 dias para testar com segurança."
    }
  ];

  return (
    <section id="beneficios" className="bg-[#F4F1EA] border-y border-stone-300/80">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="mb-12 border-b border-stone-300/80 pb-6 flex flex-col sm:flex-row items-baseline justify-between gap-6">
          <h2 className="text-2xl font-black tracking-tight text-[#1C1917] uppercase font-heading">
            Por que centenas de produtores confiam no Arsenal?
          </h2>
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-[#92400E] font-bold">
            VANTAGENS EXCLUSIVAS
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cardsConfianca.map((item, index) => (
            <div
              key={index}
              className="group py-8 px-6 border border-stone-300/80 bg-[#EBE6DC]/60 hover:bg-[#EBE6DC] rounded-2xl flex flex-col gap-4 hover:border-amber-700/60 hover:shadow-[0_8px_30px_rgba(146,64,14,0.1)] transition-all duration-300"
            >
              <div className="p-3 rounded-xl bg-stone-200/80 group-hover:bg-amber-900/15 border border-stone-300 group-hover:border-amber-700/40 self-start transition-colors text-[#1C1917] group-hover:text-amber-800">
                {item.icon}
              </div>
              
              <div className="flex-1 mt-2">
                <h3 className="text-base font-bold text-[#1C1917] tracking-tight mb-2 group-hover:text-[#92400E] transition-colors leading-snug font-heading">
                  {item.titulo}
                </h3>
                <p className="text-stone-700 text-sm leading-relaxed font-medium">
                  {item.texto}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
