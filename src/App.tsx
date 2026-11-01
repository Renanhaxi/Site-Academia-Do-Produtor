import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Seals } from './components/Seals';
import { Catalog } from './components/Catalog';
import { ProductDetailPage } from './components/ProductDetailPage';
import { ExpressCartModal } from './components/ExpressCartModal';
import { AdminQuickEditModal } from './components/AdminQuickEditModal';
import { SocialProof } from './components/SocialProof';
import { FaqSection } from './components/FaqSection';
import { Footer } from './components/Footer';
import { SuccessDeliveryModal } from './components/SuccessDeliveryModal';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { IncubadoraLeadForm } from './components/IncubadoraLeadForm';
import { ComoFunciona } from './components/ComoFunciona';
import { ComoComprar } from './components/ComoComprar';
import { Garantia } from './components/Garantia';
import { CustomerDashboard } from './components/CustomerDashboard';
import { MobileBottomCartBar } from './components/MobileBottomCartBar';
import { supabase } from './utils/supabaseClient';
import { CONFIG_GLOBAL, Produto, produtos as catalogoInicial } from './data/produtos';

class AdminErrorBoundary extends React.Component<
  { onClose: () => void; children: React.ReactNode },
  { hasError: boolean; error: any }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error('Erro no AdminPanel:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-white text-black p-8 flex flex-col items-center justify-center text-center font-mono">
          <div className="max-w-md p-8 bg-neutral-50 border border-neutral-200 rounded-2xl shadow-xl space-y-4">
            <div className="text-red-600 font-bold text-sm uppercase">⚠️ PAINEL REINICIALIZADO</div>
            <p className="text-xs text-neutral-600">
              Ocorreu um ajuste de dados no painel ({this.state.error?.message || 'Erro de renderização'}).
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false });
                this.props.onClose();
              }}
              className="px-6 py-3 bg-black text-white text-xs font-bold uppercase rounded-xl hover:bg-neutral-800 transition-colors cursor-pointer"
            >
              [ RETORNAR AO SITE ]
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export const App: React.FC = () => {
  const accentColor = 'scarlett';

  const [selectedProduct, setSelectedProduct] = useState<Produto | null>(null);
  const [cartItems, setCartItems] = useState<Produto[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [isSuccessModalOpen, setIsSuccessModalOpen] = useState<boolean>(false);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authContextMsg, setAuthContextMsg] = useState<string | undefined>(undefined);
  const [pendingCheckoutAfterAuth, setPendingCheckoutAfterAuth] = useState<boolean>(false);
  const [isDashboardOpen, setIsDashboardOpen] = useState<boolean>(false);
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const refParam = params.get('ref');
    if (refParam) {
      localStorage.setItem('alcateia_referral', refParam);
    }

    const carregarConfiguracoesSupabase = async () => {
      try {
        const { data, error } = await supabase.from('configuracoes').select('chave, valor');
        if (data && !error) {
          data.forEach((item) => {
            if (item.chave && item.valor) {
              localStorage.setItem(item.chave, item.valor);
              if (item.chave === 'ALCATEIA_WHATSAPP') CONFIG_GLOBAL.whatsappNumero = item.valor;
              if (item.chave === 'ALCATEIA_MSG') CONFIG_GLOBAL.mensagemPadrao = item.valor;
              if (item.chave === 'ALCATEIA_LIVEPIX') CONFIG_GLOBAL.livepixUrl = item.valor;
              if (item.chave === 'ALCATEIA_BANNER_IMG') CONFIG_GLOBAL.bannerImagemUrl = item.valor;
              if (item.chave === 'ALCATEIA_BANNER_LINK') CONFIG_GLOBAL.bannerLinkUrl = item.valor;
              if (item.chave === 'ALCATEIA_FEEDBACKS') {
                try {
                  CONFIG_GLOBAL.feedbackImagens = JSON.parse(item.valor);
                } catch (e) {}
              }
            }
          });
          window.dispatchEvent(new Event('configuracoesAtualizadas'));
        }
      } catch (err) {
        console.error('Erro ao carregar configurações do Supabase:', err);
      }
    };
    carregarConfiguracoesSupabase();

    try {
      const saved = localStorage.getItem('ALCATEIA_CART');
      if (saved) {
        setCartItems(JSON.parse(saved));
      }
    } catch (e) {
      console.error('Erro ao carregar carrinho', e);
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserSession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUserSession(session);
      if (event === 'PASSWORD_RECOVERY') {
        setIsAuthOpen(true);
      }
    });

    const path = window.location.pathname;
    const pendentes = localStorage.getItem('alcateia_carrinho_pendente');

    if (path === '/sucesso') {
      if (pendentes) {
        setIsSuccessModalOpen(true);
      }
      window.history.replaceState({}, document.title, '/');
    }

    if (path === '/meus-acessos') {
      setIsDashboardOpen(true);
      window.history.replaceState({}, document.title, '/');
    }

    // Suporte ao botão Voltar do navegador quando estiver na página de produto
    const handlePopState = () => {
      if (!window.location.hash.startsWith('#produto-')) {
        setSelectedProduct(null);
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('ALCATEIA_CART', JSON.stringify(cartItems));
    } catch (e) {
      console.error('Erro ao salvar carrinho', e);
    }
  }, [cartItems]);

  const handleOpenProductPage = (produto: Produto) => {
    setSelectedProduct(produto);
    window.history.pushState({ produtoId: produto.id }, '', `#produto-${produto.id}`);
  };

  const handleBackToCatalog = () => {
    setSelectedProduct(null);
    if (window.location.hash.startsWith('#produto-')) {
      window.history.pushState({}, '', window.location.pathname);
    }
    setTimeout(() => {
      const el = document.getElementById('catalogo');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }, 60);
  };

  const handleToggleCartItem = (produto: Produto) => {
    setCartItems((prev) => {
      const exists = prev.some((item) => item.id === produto.id);
      if (exists) {
        return prev.filter((item) => item.id !== produto.id);
      } else {
        return [...prev, produto];
      }
    });
  };

  const handleBuyNow = (produto: Produto) => {
    setCartItems((prev) => {
      const exists = prev.some((item) => item.id === produto.id);
      return exists ? prev : [...prev, produto];
    });

    if (!userSession?.user) {
      setAuthContextMsg(
        'Identificação Obrigatória: Entre na sua conta ou cadastre-se em 10 segundos para vincular a licença vitalícia ao seu perfil e prosseguir ao PIX.'
      );
      setPendingCheckoutAfterAuth(true);
      setIsAuthOpen(true);
    } else {
      setIsCartOpen(true);
    }
  };

  const handleRemoveCartItem = (id: number) => {
    setCartItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (
    isAdminOpen ||
    window.location.pathname === '/alcateia-admin' ||
    window.location.search.includes('admin')
  ) {
    return (
      <AdminErrorBoundary
        onClose={() => {
          setIsAdminOpen(false);
          if (
            window.location.pathname === '/alcateia-admin' ||
            window.location.search.includes('admin')
          ) {
            window.history.replaceState({}, document.title, '/');
          }
        }}
      >
        <AdminPanel
          onClose={() => {
            setIsAdminOpen(false);
            if (
              window.location.pathname === '/alcateia-admin' ||
              window.location.search.includes('admin')
            ) {
              window.history.replaceState({}, document.title, '/');
            }
          }}
        />
      </AdminErrorBoundary>
    );
  }

  const appStyles = {
    '--noise-opacity': '0.015',
  } as React.CSSProperties;

  return (
    <>
      <div
        style={appStyles}
        className="min-h-screen bg-[#F4F1EA] text-[#1C1917] font-sans selection:bg-[#1C1917] selection:text-[#F4F1EA] relative transition-all duration-300"
      >
        {/* Noise Texture Overlay */}
        <div className="bg-noise" />

        {/* Analog Vintage Creme & Marfim Atmosphere */}
        <div className="fixed inset-0 pointer-events-none z-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#FAF7F0] via-[#F4F1EA] to-[#EAE5D9]" />

        <div className="relative z-10">
          <Navbar
            onOpenAdmin={() => setIsAdminOpen(true)}
            onOpenCart={() => setIsCartOpen(true)}
            onOpenAuth={() => {
              setAuthContextMsg(undefined);
              setPendingCheckoutAfterAuth(false);
              setIsAuthOpen(true);
            }}
            onOpenDashboard={() => setIsDashboardOpen(true)}
            userSession={userSession}
            cartCount={cartItems.length}
            activeProductView={!!selectedProduct}
            onBackToCatalog={handleBackToCatalog}
          />

          {/* SE UM PRODUTO ESTIVER SELECIONADO, EXIBE A PÁGINA DEDICADA DE PRODUTO (PDP) */}
          {selectedProduct ? (
            <main>
              <ProductDetailPage
                produto={selectedProduct}
                todosProdutos={catalogoInicial}
                onBack={handleBackToCatalog}
                onSelectProduct={(p) => handleOpenProductPage(p)}
                onAddToCart={handleToggleCartItem}
                onBuyNow={handleBuyNow}
                onOpenCart={() => setIsCartOpen(true)}
                cartItems={cartItems}
              />
            </main>
          ) : (
            /* HOME PRINCIPAL COM CATÁLOGO SUBIDO LOGO APÓS O HERO E SELOS */
            <main>
              <Hero />
              <Seals accentColor={accentColor} />
              <Catalog
                accentColor={accentColor}
                onOpenDetails={(p) => handleOpenProductPage(p)}
                onAddToCart={handleToggleCartItem}
                cartItems={cartItems}
              />
              <ComoComprar />
              <ComoFunciona />
              <SocialProof accentColor={accentColor} />
              <IncubadoraLeadForm />
              <FaqSection accentColor={accentColor} />
              <Garantia />
            </main>
          )}

          <Footer />
        </div>

        {/* Barra Flutuante de Carrinho no Mobile */}
        <MobileBottomCartBar cartItems={cartItems} onOpenCart={() => setIsCartOpen(true)} />
      </div>

      {/* Carrinho & Checkout Integrado no Site */}
      <ExpressCartModal
        isOpen={isCartOpen}
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveCartItem}
        onAddItem={handleToggleCartItem}
        onOpenDetails={(p) => {
          handleOpenProductPage(p);
        }}
        accentColor={accentColor}
        userSession={userSession}
        onRequireAuth={() => {
          setIsCartOpen(false);
          setAuthContextMsg(
            'Identificação Obrigatória: Faça login ou crie sua conta gratuita para vincular seus downloads vitalícios e prosseguir ao pagamento PIX.'
          );
          setPendingCheckoutAfterAuth(true);
          setIsAuthOpen(true);
        }}
        onCheckoutSuccess={() => {
          setIsCartOpen(false);
          setIsSuccessModalOpen(true);
          setCartItems([]);
        }}
        onOpenDashboard={() => setIsDashboardOpen(true)}
      />

      <SuccessDeliveryModal
        isOpen={isSuccessModalOpen}
        onClose={() => setIsSuccessModalOpen(false)}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setPendingCheckoutAfterAuth(false);
        }}
        contextMessage={authContextMsg}
        onAuthSuccess={(session) => {
          setUserSession(session);
          if (pendingCheckoutAfterAuth) {
            setPendingCheckoutAfterAuth(false);
            setTimeout(() => {
              setIsCartOpen(true);
            }, 150);
          }
        }}
      />

      {isDashboardOpen && <CustomerDashboard onClose={() => setIsDashboardOpen(false)} />}

      <AdminQuickEditModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        accentColor={accentColor}
      />
    </>
  );
};

export default App;
