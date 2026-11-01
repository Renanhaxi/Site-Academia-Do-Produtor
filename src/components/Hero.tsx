import React, { useEffect, useRef } from 'react';
import { ArrowRight, Check, Sparkles, Shield, Cpu } from 'lucide-react';

interface FloatingPluginTokenProps {
  name: string;
  logoUrl: string;
  className: string;
  delay?: string;
}

const FloatingPluginToken: React.FC<FloatingPluginTokenProps> = ({ name, logoUrl, className, delay = '0s' }) => {
  return (
    <div 
      className={`absolute select-none pointer-events-auto transition-transform duration-500 animate-float-lobo will-change-transform z-15 ${className}`}
      style={{ animationDelay: delay }}
    >
      <div 
        title={name}
        className="group relative w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-[#FAF8F5]/95 backdrop-blur-md border border-stone-200 shadow-md hover:border-amber-700/60 hover:shadow-[0_12px_28px_rgba(146,64,14,0.25)] hover:scale-110 transition-all duration-300 cursor-pointer flex items-center justify-center p-2"
      >
        {/* Subtle metallic golden corner glint on hover */}
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-700/0 via-transparent to-amber-700/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

        <img 
          src={logoUrl} 
          alt={name} 
          decoding="async"
          loading="lazy"
          className="w-full h-full object-contain filter drop-shadow-sm group-hover:scale-105 transition-transform"
        />
      </div>
    </div>
  );
};

export const Hero: React.FC = () => {
  const heroSectionRef = useRef<HTMLElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const mouseRef = useRef({ x: -1000, y: -1000, active: false });

  // Interactive Particle Spectrum Background Effect (Champagne Gold & Graphite)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let isVisible = true;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const handleResize = () => {
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener('resize', handleResize, { passive: true });

    class Particle {
      x: number;
      y: number;
      ox: number;
      oy: number;
      vx: number;
      vy: number;
      radius: number;
      baseAngle: number;
      speed: number;
      isGold: boolean;

      constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.ox = this.x;
        this.oy = this.y;
        this.vx = (Math.random() - 0.5) * 0.35;
        this.vy = (Math.random() - 0.5) * 0.35;
        this.radius = Math.random() * 1.6 + 0.8;
        this.baseAngle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 0.02 + 0.005;
        this.isGold = Math.random() > 0.65;
      }

      update() {
        this.baseAngle += this.speed;
        this.x += this.vx + Math.sin(this.baseAngle) * 0.15;
        this.y += this.vy + Math.cos(this.baseAngle) * 0.15;

        if (this.x < 0) this.x = width;
        if (this.x > width) this.x = 0;
        if (this.y < 0) this.y = height;
        if (this.y > height) this.y = 0;

        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - this.x;
          const dy = mouseRef.current.y - this.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 120) {
            const force = (120 - dist) / 120;
            this.x -= (dx / dist) * force * 1.1;
            this.y -= (dy / dist) * force * 1.1;
          }
        }
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.isGold ? 'rgba(180, 83, 9, 0.45)' : 'rgba(28, 25, 23, 0.16)';
        c.fill();
      }
    }

    const isMobileDevice = typeof window !== 'undefined' && window.innerWidth < 768;
    
    // No mobile, geramos um quadro estático refinado e economizamos 100% de CPU/GPU
    if (isMobileDevice) {
      const staticParticles: Particle[] = Array.from({ length: 12 }, () => new Particle());
      staticParticles.forEach(p => p.draw(ctx));
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    }

    // No Desktop, roda a animação fluida mas pausa automaticamente quando o Hero sai da tela
    const particlesCount = 38;
    const particles: Particle[] = Array.from({ length: particlesCount }, () => new Particle());

    const animate = () => {
      if (!isVisible) return;
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw(ctx);

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 95) {
            const alpha = ((95 - dist) / 95) * 0.14;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.strokeStyle = p1.isGold || p2.isGold 
              ? `rgba(180, 83, 9, ${alpha * 1.2})` 
              : `rgba(41, 37, 36, ${alpha * 0.7})`;
            ctx.lineWidth = 0.55;
            ctx.stroke();
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    // IntersectionObserver: economiza bateria e 100% de processamento quando o usuário rola para o catálogo
    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible) {
          cancelAnimationFrame(animationId);
          animationId = requestAnimationFrame(animate);
        } else {
          cancelAnimationFrame(animationId);
        }
      },
      { threshold: 0.05 }
    );

    if (heroSectionRef.current) {
      observer.observe(heroSectionRef.current);
    }

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      observer.disconnect();
    };
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mouseRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true
    };
  };

  const handleMouseLeave = () => {
    mouseRef.current.active = false;
  };

  return (
    <section 
      ref={heroSectionRef}
      id="inicio" 
      className="relative pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden bg-[#F4F1EA] flex flex-col border-b border-stone-300/80"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Textura Tátil Analógica Sutil (Noise 2% de opacidade) */}
      <div className="absolute inset-0 z-1 pointer-events-none opacity-[0.025] bg-vintage-noise" />

      {/* Interactive Canvas Spectrum Background */}
      <canvas 
        ref={canvasRef} 
        className="absolute inset-0 w-full h-full pointer-events-none z-0 opacity-50"
      />

      {/* Camada Holográfica Suave com Toque de Válvula Analógica (Âmbar / Latão) */}
      <div 
        className="absolute inset-0 z-5 pointer-events-none opacity-40 mix-blend-multiply transition-all duration-700"
        style={{
          backgroundImage: `
            radial-gradient(circle at 25% 30%, rgba(180, 83, 9, 0.12) 0%, transparent 50%),
            radial-gradient(circle at 75% 65%, rgba(244, 241, 234, 0.8) 0%, transparent 60%),
            linear-gradient(135deg, rgba(235, 230, 220, 0.4) 0%, transparent 100%)
          `,
          boxShadow: 'inset 0 0 100px rgba(180, 83, 9, 0.03)'
        }}
      />

      {/* ELEMENTOS EM ÓRBITA: CÁPSULAS DE LUXO FLUTUANTES (SOMENTE ÍCONES) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10 max-w-6xl mx-auto">
        {/* Superior Central: FL Studio */}
        <FloatingPluginToken 
          name="FL Studio 24" 
          logoUrl="https://i.postimg.cc/m2SgYxrT/2860381753797976389-Photoroom.png" 
          className="top-[3%] left-1/2 -translate-x-1/2" 
          delay="0.2s"
        />

        {/* Arco Superior Esquerda: Ableton Live */}
        <FloatingPluginToken 
          name="Ableton Live 12" 
          logoUrl="https://i.postimg.cc/h4rkMKVb/56caa9a4-f700-4ec1-bcdf-100a5f2ab6d0-Photoroom.png" 
          className="top-[12%] left-[4%] sm:left-[16%]" 
          delay="0.8s"
        />

        {/* Arco Superior Direita: Logic Pro */}
        <FloatingPluginToken 
          name="Logic Pro 11" 
          logoUrl="https://i.postimg.cc/1tSdcdXZ/63fd00e2-9af7-4c66-8a81-f981375e004e-Photoroom.png" 
          className="top-[12%] right-[4%] sm:right-[16%]" 
          delay="1.4s"
        />

        {/* Lateral Meio Esquerda: Cubase */}
        <FloatingPluginToken 
          name="Cubase Pro" 
          logoUrl="https://i.postimg.cc/nVRdCr4M/cfe4ba4d-e70d-4af1-a047-f71dc1241f86-Photoroom.png" 
          className="top-[25%] left-[2%] sm:left-[8%]" 
          delay="2.0s"
        />

        {/* Lateral Meio Direita: Studio One */}
        <FloatingPluginToken 
          name="Studio One" 
          logoUrl="https://i.postimg.cc/bvcVp5Q1/5fcf9725-47c8-485b-a4ef-fbc933a047b5-Photoroom.png" 
          className="top-[25%] right-[2%] sm:right-[8%]" 
          delay="2.6s"
        />

        {/* Lateral Baixo Esquerda: Nexus (Posicionada com folga do texto) */}
        <FloatingPluginToken 
          name="reFX Nexus" 
          logoUrl="https://i.postimg.cc/BbdDd9Gc/d610f3d2-19d8-449b-b273-9e395eb70b88-Photoroom.png" 
          className="hidden sm:flex top-[38%] left-[4%] sm:left-[11%]" 
          delay="3.0s"
        />

        {/* Lateral Baixo Direita: Omnisphere (Posicionada com folga do texto) */}
        <FloatingPluginToken 
          name="Omnisphere" 
          logoUrl="https://i.postimg.cc/1ztGnKMN/e61031f3-4fdd-4d26-a808-9844b65e4d54-Photoroom.png" 
          className="hidden sm:flex top-[38%] right-[4%] sm:right-[11%]" 
          delay="3.4s"
        />
      </div>

      {/* CONTAINER PRINCIPAL CENTRALIZADO */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 relative z-20 w-full flex flex-col items-center justify-center mt-2">
        
        {/* Micro Tag Tecnológica com Textura de Fibra de Carbono e Dourado Metálico */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-carbon border border-[#C5A059]/40 shadow-sm backdrop-blur-md text-[10px] sm:text-xs font-mono font-bold text-neutral-300 mb-4 animate-in fade-in duration-700">
          <span className="w-2 h-2 rounded-full bg-[#C5A059] animate-pulse shadow-[0_0_8px_rgba(197,160,89,0.9)]" />
          <span className="tracking-widest uppercase text-[#DFCA95]">ARSENAL DE ESTÚDIO 2026</span>
          <span className="text-neutral-500">•</span>
          <span className="text-[#C5A059] font-black tracking-wider uppercase">BUILD VITALÍCIA</span>
        </div>

        {/* O BRASÃO OFICIAL COM O PIANO + AURA METÁLICA DOURADA */}
        <div className="relative w-full max-w-[28rem] flex justify-center items-center z-10 group animate-slide-up-lobo">
          
          {/* Anel de Calibração Analógico & Aura Dourada Tridimensional (Visível com fluidez no Desktop) */}
          <div className="hidden sm:block absolute w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-amber-700/25 pointer-events-none scale-110 sm:scale-120 animate-spin" style={{ animationDuration: '60s' }}>
            {/* Marcadores de Calibração */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#C5A059] rounded-full shadow-[0_0_6px_#C5A059]" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#C5A059] rounded-full shadow-[0_0_6px_#C5A059]" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#C5A059] rounded-full shadow-[0_0_6px_#C5A059]" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-[#C5A059] rounded-full shadow-[0_0_6px_#C5A059]" />
          </div>

          {/* Flash / Glow Radial Dourado Quente Tridimensional */}
          <div className="absolute inset-0 bg-gradient-radial from-[#C5A059]/20 via-amber-700/10 to-transparent blur-2xl sm:blur-3xl pointer-events-none scale-120 sm:scale-135 z-0" />
          
          {/* Imagem do Brasão com Piano (Sem sobreposição de tarja) */}
          <img 
            src="/hero-arsenal-piano.png" 
            alt="Arsenal do Produtor - Brasão Oficial com Teclado" 
            decoding="async"
            fetchPriority="high"
            loading="eager"
            className="w-56 sm:w-76 md:w-[22rem] h-auto object-contain mx-auto relative z-10 pointer-events-none filter drop-shadow-[0_15px_30px_rgba(28,25,23,0.18)] drop-shadow-[0_0_20px_rgba(197,160,89,0.22)] group-hover:scale-105 transition-transform duration-500"
          />
        </div>

        {/* HEADLINE: ARSENAL DO PRODUTOR (Sem tarja esbranquiçada) */}
        <div className="relative -mt-4 sm:-mt-10 md:-mt-12 z-30 text-center animate-in slide-in-from-top-8 fade-in duration-1000 max-w-4xl mx-auto w-full px-2">
          
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-heading font-black tracking-tight uppercase leading-tight sm:leading-none text-transparent bg-clip-text bg-gradient-to-b from-[#1C1917] via-[#292524] to-[#44403C] drop-shadow-sm pointer-events-auto hover:scale-[1.01] transition-transform duration-300">
            ARSENAL DO PRODUTOR
          </h1>

          <div className="flex items-center justify-center gap-2 mt-2 sm:mt-3">
            <span className="w-5 sm:w-10 h-[1.5px] bg-[#92400E]/50" />
            <h2 className="text-[11px] sm:text-sm md:text-base font-mono font-bold text-[#92400E] uppercase tracking-[0.15em] sm:tracking-[0.25em]">
              O SEU ARSENAL DE PRODUÇÃO MUSICAL COMEÇA AQUI.
            </h2>
            <span className="w-5 sm:w-10 h-[1.5px] bg-[#92400E]/50" />
          </div>

          <p className="text-xs sm:text-sm md:text-base text-stone-700 font-sans max-w-2xl mx-auto mt-4 sm:mt-6 font-medium leading-relaxed px-3 sm:px-4">
            A elite do áudio profissional. Tenha em mãos as armas secretas dos maiores produtores da cena com suporte de instalação assistida e arquivos testados em estúdio.
          </p>

          {/* CTAs COM DESIGN DE ESTÚDIO ANALÓGICO: STONE-900 + TEXTO CREME */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mt-7 sm:mt-8 w-full max-w-xs sm:max-w-none mx-auto">
            <button 
              onClick={() => {
                const formElem = document.getElementById('lead-magnet-incubadora');
                if (formElem) formElem.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-full font-heading font-bold text-xs sm:text-sm text-[#F4F1EA] bg-[#1C1917] hover:bg-[#78350F] border border-amber-800/40 hover:border-amber-700 transition-all uppercase tracking-widest cursor-pointer shadow-[0_10px_25px_rgba(28,25,23,0.18)] hover:shadow-[0_0_20px_rgba(146,64,14,0.35)] hover:scale-105 active:scale-95 flex items-center justify-center gap-2"
            >
              <span>Entrar para o Ecossistema</span>
              <ArrowRight className="w-4 h-4 text-amber-500" />
            </button>

            <button 
              onClick={() => {
                const catElem = document.getElementById('catalogo');
                if (catElem) catElem.scrollIntoView({ behavior: 'smooth' });
              }}
              className="w-full sm:w-auto px-6 py-3.5 sm:px-8 sm:py-4 rounded-full font-heading font-bold text-xs sm:text-sm bg-[#EBE6DC] border border-stone-300 hover:border-amber-700/60 text-[#1C1917] hover:text-[#92400E] hover:bg-white transition-all uppercase tracking-widest cursor-pointer shadow-sm hover:shadow-md hover:scale-105 active:scale-95 text-center"
            >
              Explorar Catálogo
            </button>
          </div>

          {/* ELEMENTOS DE CONFIANÇA COM DETALHES EM LATÃO ENVELHECIDO */}
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-3 mt-10 max-w-3xl mx-auto px-4">
            {[
              "Instalação Assistida", 
              "Arquivos Testados", 
              "Sem Vírus", 
              "Garantia de 7 Dias", 
              "Comunidade Exclusiva", 
              "Suporte Humanizado"
            ].map((item, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-stone-800 font-mono font-bold">
                <span className="w-4 h-4 rounded-full bg-amber-900/15 text-amber-800 flex items-center justify-center text-[10px]">
                  ✓
                </span>
                <span>{item}</span>
              </div>
            ))}
          </div>

        </div>

      </div>

      {/* MANIFESTO COM TOQUE DE HARDWARE ANALÓGICO E FILETE METÁLICO */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 mt-24 mb-4 relative z-20 text-center md:text-left">
        <div className="p-8 sm:p-10 rounded-3xl bg-[#EBE6DC]/80 border border-stone-300 shadow-[0_10px_35px_rgba(28,25,23,0.04)] relative overflow-hidden backdrop-blur-sm">
          {/* Filete Dourado Envelhecido Lateral de Estúdio */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-amber-700 via-amber-600 to-amber-900" />

          <div className="w-12 h-[2.5px] bg-[#92400E] mb-6 mx-auto md:mx-0" />

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-heading font-black text-[#1C1917] leading-tight mb-4 tracking-tight uppercase">
            Mais do que softwares. <span className="text-[#92400E] font-mono font-bold">Um ecossistema para produtores.</span>
          </h2>

          <p className="text-stone-700 text-xs sm:text-sm md:text-base max-w-3xl font-sans leading-relaxed mx-auto md:mx-0 font-medium">
            Entregamos a rota dos profissionais. Oferecemos suporte humanizado, comunidade ativa e tutoriais práticos para eliminar qualquer barreira técnica no Windows ou Mac e acelerar suas produções musicais.
          </p>
        </div>
      </div>

    </section>
  );
};

export default Hero;
