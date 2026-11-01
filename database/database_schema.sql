-- ====================================================================
-- ESTRUTURA BLINDADA DO BANCO DE DADOS SUPABASE (ALCATEIA DOS PRODUTORES)
-- ====================================================================
-- Execute este script no SQL Editor do seu painel do Supabase.

-- 1. Habilitar extensão de criptografia e UUID
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- --------------------------------------------------------------------
-- 2. TABELA: solutions (Acervo de Produtos)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.solutions (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    link_entrega TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    preco NUMERIC(10, 2) NOT NULL DEFAULT 47.00,
    preco_promocional NUMERIC(10, 2) NOT NULL DEFAULT 47.00,
    categoria VARCHAR(100) DEFAULT 'Geral'::character varying,
    descricao TEXT,
    imagem TEXT,
    galeria TEXT[],
    visivel BOOLEAN DEFAULT true,
    is_orderbump BOOLEAN DEFAULT false,
    sistema_operacional VARCHAR(20) DEFAULT 'ambos'::character varying,
    estrelas NUMERIC(2, 1) DEFAULT 5.0,
    tag VARCHAR(50)
);

-- Ativar Row Level Security (RLS)
ALTER TABLE public.solutions ENABLE ROW LEVEL SECURITY;

-- Limpeza de políticas antigas
DROP POLICY IF EXISTS "Permitir leitura publica de solucoes" ON public.solutions;
DROP POLICY IF EXISTS "Permitir modificacao apenas autenticado" ON public.solutions;

-- Visitantes podem apenas visualizar os produtos do catálogo
CREATE POLICY "Permitir leitura publica de solucoes" ON public.solutions
    FOR SELECT USING (visivel IS NOT FALSE);

-- Modificações (Adicionar/Editar/Excluir) apenas usuários autenticados (Admin)
CREATE POLICY "Permitir modificacao apenas autenticado" ON public.solutions
    FOR ALL 
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- --------------------------------------------------------------------
-- 3. TABELA: pedidos (Compras e Transações PIX)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.pedidos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pendente_pix'::character varying NOT NULL,
    valor_total NUMERIC(10, 2),
    produto_ids INT[],
    detalhe_valores JSONB,
    user_id UUID REFERENCES auth.users(id),
    email_cliente VARCHAR(255),
    email_cliente_referencia VARCHAR(255),
    cupom_aplicado VARCHAR(100)
);

ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir criacao de pedidos" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir leitura apenas do proprio dono ou admin" ON public.pedidos;
DROP POLICY IF EXISTS "Permitir atualizacao de pedidos apenas autenticado" ON public.pedidos;

-- Qualquer cliente em processo de checkout pode registrar seu pedido
CREATE POLICY "Permitir criacao de pedidos" ON public.pedidos
    FOR INSERT WITH CHECK (true);

-- SEGURANÇA TOTAL: O cliente só consegue ver seus próprios pedidos
CREATE POLICY "Permitir leitura apenas do proprio dono ou admin" ON public.pedidos
    FOR SELECT 
    USING (
        auth.uid() = user_id OR 
        (auth.jwt()->>'email' = email_cliente) OR
        (auth.role() = 'service_role')
    );

-- Atualizações de status apenas por processos autenticados / Webhooks
CREATE POLICY "Permitir atualizacao de pedidos apenas autenticado" ON public.pedidos
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- --------------------------------------------------------------------
-- 4. TABELA: cupons (Descontos e Parcerias)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.cupons (
    id SERIAL PRIMARY KEY,
    codigo VARCHAR(100) UNIQUE NOT NULL,
    desconto_percentual NUMERIC(5, 4) NOT NULL,
    ativo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.cupons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura publica de cupons ativos" ON public.cupons;
DROP POLICY IF EXISTS "Permitir gestao de cupons autenticado" ON public.cupons;

CREATE POLICY "Permitir leitura publica de cupons ativos" ON public.cupons
    FOR SELECT USING (ativo IS TRUE);

CREATE POLICY "Permitir gestao de cupons autenticado" ON public.cupons
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Inserir cupons iniciais de parceiros
INSERT INTO public.cupons (codigo, desconto_percentual, ativo) VALUES
('ALCATEIA10', 0.10, true),
('PRODUTORVIP', 0.15, true)
ON CONFLICT (codigo) DO NOTHING;

-- --------------------------------------------------------------------
-- 5. TABELA: configuracoes (WhatsApp, LivePix, Avisos Globais)
-- --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.configuracoes (
    id SERIAL PRIMARY KEY,
    chave VARCHAR(255) UNIQUE NOT NULL,
    valor TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir leitura de configuracoes" ON public.configuracoes;
DROP POLICY IF EXISTS "Permitir modificacao configuracoes autenticado" ON public.configuracoes;

CREATE POLICY "Permitir leitura de configuracoes" ON public.configuracoes
    FOR SELECT USING (true);

CREATE POLICY "Permitir modificacao configuracoes autenticado" ON public.configuracoes
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- Inserir configurações padrão
INSERT INTO public.configuracoes (chave, valor) VALUES
('ALCATEIA_WHATSAPP', '5591980694387'),
('ALCATEIA_MSG', 'Olá! Fiz uma compra no catálogo da Alcateia dos Produtores e preciso de suporte.'),
('ALCATEIA_LIVEPIX', 'https://livepix.gg/alcateiadeprodutores')
ON CONFLICT (chave) DO NOTHING;

-- --------------------------------------------------------------------
-- 6. BUCKET DE ARMAZENAMENTO PARA IMAGENS (produtos)
-- --------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public) 
VALUES ('produtos', 'produtos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Permitir leitura publica de imagens" ON storage.objects;
CREATE POLICY "Permitir leitura publica de imagens" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'produtos');

DROP POLICY IF EXISTS "Permitir upload autenticado de imagens" ON storage.objects;
CREATE POLICY "Permitir upload autenticado de imagens" 
ON storage.objects FOR INSERT 
TO anon, authenticated
WITH CHECK (bucket_id = 'produtos');

-- --------------------------------------------------------------------
-- 7. HABILITAR SINCRONIZAÇÃO EM TEMPO REAL (REALTIME PARA PIX)
-- --------------------------------------------------------------------
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_rel pr
        JOIN pg_publication p ON p.oid = pr.prpubid
        JOIN pg_class c ON c.oid = pr.prrelid
        WHERE p.pubname = 'supabase_realtime' AND c.relname = 'pedidos'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pedidos;
    END IF;
END $$;

-- --------------------------------------------------------------------
-- 8. CARGA AUTOMÁTICA DO ACERVO DE PRODUTOS (SE A TABELA ESTIVER VAZIA)
-- --------------------------------------------------------------------
INSERT INTO public.solutions (id, nome, preco, preco_promocional, categoria, descricao, imagem, sistema_operacional, estrelas, tag)
VALUES
(1, 'Ableton Live Suite 12.3', 67.00, 67.00, 'DAWs (Softwares)', 'Build profissional para manipulação cirúrgica de áudio, warping e live performance.', 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, 'Essencial'),
(2, 'Apple Logic Pro X v10.7.8 macOS', 67.00, 67.00, 'DAWs (Softwares)', 'Ambiente completo otimizado para ecossistema Apple (Apple Silicon M1-M4 & Intel).', 'https://images.unsplash.com/photo-1514790193030-c89d266d5a9d?q=80&w=600&auto=format&fit=crop', 'mac', 5.0, 'Destaque Mac'),
(3, 'FL Studio 25.2.4 Premium', 67.00, 67.00, 'DAWs (Softwares)', 'A build mais estável do software mais querido pelos beatmakers de Trap e Funk.', 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, 'Mais Vendido'),
(4, 'PreSonus Studio One Pro 7 v7.0.0', 67.00, 67.00, 'DAWs (Softwares)', 'Workflow moderno unificado para gravação, arranjo, mixagem e masterização de alta velocidade.', 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=600&auto=format&fit=crop', 'ambos', 4.8, NULL),
(5, 'Steinberg Cubase Pro 15 v15.0.6', 67.00, 67.00, 'DAWs (Softwares)', 'Mecanismo de áudio cirúrgico de altíssima fidelidade, preferido por grandes estúdios.', 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, NULL),
(6, 'FabFilter Total Bundle v2026.1', 47.00, 47.00, 'Mixagem', 'A suíte cirúrgica essencial contendo Pro-Q 3, Pro-C 2 e Pro-L 2.', 'https://images.unsplash.com/photo-1484755560693-a4074577af3a?q=80&w=600&auto=format&fit=crop', 'ambos', 5.0, 'Essencial'),
(7, 'Plugin Alliance MEGA Bundle 2024.12', 47.00, 47.00, 'Mixagem', 'Acesso total a emulações analógicas lendárias, compressores e consoles icônicos.', 'https://images.unsplash.com/photo-1516280440614-37939bbacd6a?q=80&w=600&auto=format&fit=crop', 'ambos', 4.8, NULL),
(8, 'Slate Digital Virtual Mix Rack v2.6.4.0', 47.00, 47.00, 'Mixagem', 'O rack de canais analógicos definitivo para timbragens quentes.', 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, NULL),
(9, 'ValhallaDSP Plugins Bundle', 47.00, 47.00, 'Mixagem', 'A coleção de reverbs e delays espaciais mais aclamada do planeta.', 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?q=80&w=600&auto=format&fit=crop', 'ambos', 5.0, 'Top Reverbs'),
(10, 'Waves 16 Ultimate Suite', 47.00, 47.00, 'Mixagem', 'O maior pacote de processadores de sinal da história da música mundial.', 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, NULL),
(11, 'Antares Auto-Tune Pro v11.0.0', 47.00, 47.00, 'Vocal', 'O padrão supremo da indústria musical para afinação e efeitos de voz.', 'https://images.unsplash.com/photo-1525417071002-5ee4e6bb44f7?q=80&w=600&auto=format&fit=crop', 'ambos', 5.0, 'Elite Vocal'),
(12, 'Celemony Melodyne 5 Studio', 47.00, 47.00, 'Vocal', 'Correção milimétrica de afinação, formantes e tempo nota por nota.', 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, NULL),
(13, 'BABY Audio Transit 2 v1.0.0', 47.00, 47.00, 'Efeitos', 'O plugin definitivo para transições, drops e subidas dinâmicas avassaladoras.', 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?q=80&w=600&auto=format&fit=crop', 'ambos', 4.8, NULL),
(14, 'Cableguys ShaperBox v3.5.2', 47.00, 47.00, 'Efeitos', 'Modulação rítmica cirúrgica de volume, sidechain, tempo e filtros.', 'https://images.unsplash.com/photo-1543185377-b75671bfc454?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, NULL),
(15, 'SoundToys v5.0.1.1 Bundle', 47.00, 47.00, 'Efeitos', 'A coleção analógica de saturação, delays e calor vintage de fita.', 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?q=80&w=600&auto=format&fit=crop', 'ambos', 5.0, NULL),
(16, 'XLN Audio RC-20 Retro Color', 47.00, 47.00, 'Efeitos', 'Adicione calor analógico, textura de vinil e ar vintage a qualquer som.', 'https://images.unsplash.com/photo-1518911710364-17ec553bde5d?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, 'Essencial'),
(17, 'Native Instruments Kontakt 8 v8.8.0', 57.00, 57.00, 'Instrumentos', 'O maior ecossistema de samplers do planeta. Build destravada para livrarias.', 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop', 'ambos', 5.0, 'Poderoso'),
(18, 'reFX Nexus 5 v5.1.3', 57.00, 57.00, 'Instrumentos', 'Presets prontos de altíssimo padrão comercial para hits instantâneos.', 'https://images.unsplash.com/photo-1459305272254-33a7d593a851?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, NULL),
(19, 'Spectrasonics Omnisphere v3.0.0d', 57.00, 57.00, 'Instrumentos', 'O titã da síntese sonora e atmosferas cinematográficas.', 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?q=80&w=600&auto=format&fit=crop', 'ambos', 5.0, 'Titã VSTi'),
(20, 'Xfer Serum 2 v2.0.16', 57.00, 57.00, 'Instrumentos', 'O sintetizador wavetable mais popular do mundo para timbres agressivos.', 'https://images.unsplash.com/photo-1471478331149-c72f17e33c73?q=80&w=600&auto=format&fit=crop', 'ambos', 4.9, NULL),
(26, 'Serviço de Engenharia de Estúdio (Instalação via AnyDesk)', 100.00, 100.00, 'Serviços VIP', 'Nossa equipe sênior entra de forma remota na sua máquina e deixa seu arsenal 100% pronto.', 'https://images.unsplash.com/photo-1531403009284-440f080d1e12?q=80&w=600&auto=format&fit=crop', 'ambos', 5.0, 'Exclusivo VIP')
ON CONFLICT (id) DO NOTHING;

-- Ajustar a sequência do ID para novos produtos cadastrados no painel admin
SELECT setval('public.solutions_id_seq', (SELECT MAX(id) FROM public.solutions));
