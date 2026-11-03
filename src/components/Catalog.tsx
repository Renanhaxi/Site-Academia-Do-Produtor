import React, { useState, useMemo, useEffect } from 'react';
import { Sparkles, AlertCircle } from 'lucide-react';
import {
  Produto,
  produtos as listaProdutosInicial,
  produtos,
  isImagemAntigaOuPlaceholder,
} from '../data/produtos';
import { ProductCard } from './ProductCard';
import { supabase } from '../utils/supabaseClient';
import {
  fetchMediaMetaMapFromSupabase,
  mapSupabaseRowToProduto,
  getCatalogWithMediaFallback,
} from '../utils/alcateiaStore';

interface CatalogProps {
  accentColor: string;
  onOpenDetails: (produto: Produto) => void;
  onAddToCart: (produto: Produto) => void;
  cartItems: Produto[];
  onProductsLoaded?: (produtos: Produto[]) => void;
}

export const Catalog: React.FC<CatalogProps> = ({
  onOpenDetails,
  onAddToCart,
  cartItems,
  onProductsLoaded,
}) => {
  const [selectedOS, setSelectedOS] = useState<'todos' | 'windows' | 'mac'>('todos');
  const [termoBusca, setTermoBusca] = useState('');
  const [ordemPreco] = useState<string>('padrao');
  const [listaProdutos, setListaProdutos] = useState<Produto[]>(() => getCatalogWithMediaFallback());

  useEffect(() => {
    const syncBoxesToSupabaseIfNeeded = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        if (!sessionData?.session) return;

        const payloadUpsert = produtos.map((p) => {
          const precoNum = parseFloat(p.preco.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
          return {
            id: p.id,
            nome: p.nome,
            preco: precoNum,
            preco_promocional: precoNum,
            categoria: p.categoria,
            descricao: p.desc,
            imagem: p.imagem,
            galeria: p.galeria || [],
            link_entrega: p.link_entrega || '',
            estrelas: p.estrelas || 5.0,
            visivel: p.visivel !== false,
            is_orderbump: Boolean(p.is_orderbump),
            sistema_operacional: p.sistema_operacional || 'ambos',
          };
        });

        await supabase.from('solutions').upsert(payloadUpsert, { onConflict: 'id' });
      } catch (e) {
        console.warn('Aviso ao sincronizar caixas 3D:', e);
      }
    };

    const fetchSolutions = async () => {
      try {
        const [solutionsRes, mediaMetaMap] = await Promise.all([
          supabase.from('solutions').select('*').order('id', { ascending: true }),
          fetchMediaMetaMapFromSupabase(),
        ]);

        const { data, error } = solutionsRes;

        if (data && !error && data.length > 0) {
          const temImagensAntigas = data.some((sol: any) => isImagemAntigaOuPlaceholder(sol.imagem));
          if (temImagensAntigas) {
            syncBoxesToSupabaseIfNeeded();
          }

          const mappedProdutos: Produto[] = data.map((sol: any) =>
            mapSupabaseRowToProduto(sol, mediaMetaMap)
          );

          setListaProdutos(mappedProdutos);
          if (onProductsLoaded) onProductsLoaded(mappedProdutos);
        } else {
          const fallback = getCatalogWithMediaFallback();
          setListaProdutos(fallback);
          if (onProductsLoaded) onProductsLoaded(fallback);
        }
      } catch (err) {
        console.error('Erro ao puxar soluções do Supabase:', err);
      }
    };

    fetchSolutions();

    // Escuta em Tempo Real alterações de preços, mídias e visibilidade vindas do Painel Admin
    const realtimeChannel = supabase
      .channel('public_catalog_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solutions' }, () => {
        fetchSolutions();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'configuracoes' }, () => {
        fetchSolutions();
      })
      .subscribe();

    window.addEventListener('produtosAtualizados', fetchSolutions);
    return () => {
      window.removeEventListener('produtosAtualizados', fetchSolutions);
      supabase.removeChannel(realtimeChannel);
    };
  }, []);

  const parsePrice = (precoStr: string) => {
    const numbers = precoStr.replace(/[^\d,]/g, '').replace(',', '.');
    return parseFloat(numbers) || 0;
  };

  const produtosFiltrados = useMemo(() => {
    let resultado = listaProdutos.filter((item) => {
      if (item.visivel === false) return false;

      if (selectedOS !== 'todos') {
        const itemOS = item.sistema_operacional || 'ambos';
        if (itemOS !== 'ambos' && itemOS !== selectedOS) {
          return false;
        }
      }

      const matchBusca =
        item.nome.toLowerCase().includes(termoBusca.toLowerCase()) ||
        item.desc.toLowerCase().includes(termoBusca.toLowerCase()) ||
        item.categoria.toLowerCase().includes(termoBusca.toLowerCase());

      return matchBusca;
    });

    if (ordemPreco === 'menor') {
      resultado = [...resultado].sort((a, b) => parsePrice(a.preco) - parsePrice(b.preco));
    } else if (ordemPreco === 'maior') {
      resultado = [...resultado].sort((a, b) => parsePrice(b.preco) - parsePrice(a.preco));
    }

    return resultado;
  }, [termoBusca, ordemPreco, selectedOS, listaProdutos]);

  return (
    <section id="catalogo" className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 relative bg-[#F4F1EA]">
      <div className="flex flex-col items-center justify-center text-center mb-10">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-amber-700" />
          <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#92400E] font-bold">
            Catálogo de Equipamentos
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-heading font-black tracking-tight text-[#1C1917] uppercase max-w-2xl leading-tight">
          Escolha as ferramentas certas para o seu próximo nível.
        </h2>
        <p className="text-stone-700 text-xs sm:text-sm mt-3 max-w-xl font-sans leading-relaxed mx-auto font-medium">
          Os softwares mais utilizados por produtores de Trap, Funk, Música Eletrônica, Gospel e diversos outros estilos.
        </p>

        {/* Barra de Filtro de Sistema Operacional (OS Toggle) */}
        <div className="mt-8 flex flex-col items-center gap-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-stone-700 font-bold">
            SELECIONE A SUA PLATAFORMA DE TRABALHO:
          </span>
          <div className="inline-flex max-w-full p-1 bg-[#EBE6DC] border border-stone-300 rounded-full gap-1 shadow-sm overflow-x-auto">
            <button
              onClick={() => setSelectedOS('todos')}
              className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex-shrink-0 ${
                selectedOS === 'todos'
                  ? 'bg-[#1C1917] text-[#DFCA95] border border-amber-800/40 shadow-md'
                  : 'text-stone-700 hover:text-[#1C1917]'
              }`}
            >
              MOSTRAR TODOS
            </button>

            <button
              onClick={() => setSelectedOS('windows')}
              className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0 ${
                selectedOS === 'windows'
                  ? 'bg-[#1C1917] text-[#DFCA95] border border-amber-800/40 shadow-md'
                  : 'text-stone-700 hover:text-[#1C1917] hover:bg-stone-300/60'
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 88 88">
                <path d="M0 12.402l35.687-4.859v34.908H0V12.402zm35.687 33.722v34.819L0 76.084V46.124h35.687zM40.16 6.848L88 0v42.451H40.16V6.848zm47.84 39.276V88L40.16 81.332V46.124H88z"/>
              </svg>
              <span>WINDOWS</span>
            </button>

            <button
              onClick={() => setSelectedOS('mac')}
              className={`px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full font-mono text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 sm:gap-2 cursor-pointer flex-shrink-0 ${
                selectedOS === 'mac'
                  ? 'bg-[#1C1917] text-[#DFCA95] border border-amber-800/40 shadow-md'
                  : 'text-stone-700 hover:text-[#1C1917] hover:bg-stone-300/60'
              }`}
            >
              <svg className="w-3.5 h-3.5 fill-current -mt-0.5" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.82.13-9.67-1.94-14.54-6.22-3.17-2.76-7.05-7.44-11.64-14.04-6.3-9.08-11.32-19.53-15.06-31.37-3.74-11.83-5.61-23.01-5.61-33.52 0-14.61 3.59-26.68 10.77-36.2 7.18-9.53 16.27-14.38 27.27-14.56 5.37 0 11.2 1.25 17.5 3.76 6.3 2.5 10.42 3.76 12.35 3.76 1.7 0 5.86-1.3 12.49-3.9 6.63-2.6 12.02-3.83 16.17-3.68 11.9.46 21.6 4.79 29.11 13.01-10.49 6.34-15.63 15.1-15.42 26.27.22 8.7 3.65 15.98 10.29 21.84 6.64 5.86 14.46 9.17 23.47 9.94-2.52 7.6-5.96 15.22-10.33 22.86zM119.22 31.09c0-6.42 2.37-12.67 7.12-18.75 4.75-6.08 10.74-9.87 17.97-11.36.43 2.76.5 5.56.2 8.4-1.02 9.53-6.66 17.15-16.92 22.86-.33-1.05-.5-2.12-.5-3.15z"/>
              </svg>
              <span>MAC</span>
            </button>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {produtosFiltrados.length === 0 && (
        <div className="text-center py-20 bg-neutral-50 border border-neutral-200 rounded-2xl p-8 my-8">
          <AlertCircle className="w-8 h-8 text-neutral-400 mx-auto mb-4" />
          <h3 className="text-sm font-mono font-bold text-black uppercase tracking-widest">BUSCA SEM RESULTADOS</h3>
          <p className="text-neutral-500 text-xs mt-2 max-w-md mx-auto font-mono">
            NENHUM MÓDULO CORRESPONDE AOS CRITÉRIOS DE FILTRAGEM.
          </p>
          <button
            onClick={() => {
              setTermoBusca('');
              setSelectedOS('todos');
            }}
            className="mt-6 px-8 py-3 rounded-full font-mono font-bold text-[10px] border border-neutral-200 bg-white hover:border-black hover:text-black text-neutral-500 transition-colors uppercase tracking-[0.2em]"
          >
            [ MOSTRAR TODOS OS EQUIPAMENTOS ]
          </button>
        </div>
      )}

      {/* Grid de Produtos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full max-w-7xl mx-auto">
        {produtosFiltrados.map((produto) => (
          <ProductCard
            key={produto.id}
            produto={produto}
            onOpenDetails={onOpenDetails}
            onAddToCart={onAddToCart}
            isInCart={cartItems.some((item) => item.id === produto.id)}
          />
        ))}
      </div>
    </section>
  );
};
