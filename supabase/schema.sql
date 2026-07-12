-- ==========================================
-- SCRIPT DE SCHEMA COMPLETO - ONDE EU CLICO
-- ==========================================
-- Instruções: 
-- 1. Acesse o painel do Supabase
-- 2. Vá em 'SQL Editor' -> 'New Query'
-- 3. Cole o código abaixo e clique em 'Run'

-- 1. Criação da Tabela de Pautas (Fila de Publicação)
CREATE TABLE IF NOT EXISTS pautas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    titulo_tema TEXT NOT NULL,
    status TEXT DEFAULT 'aguardando' CHECK (status IN ('aguardando', 'processando', 'concluido', 'falha', 'pausado')),
    data_agendada TIMESTAMPTZ DEFAULT now(),
    url_wordpress TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Índices para Otimização (Melhora a velocidade da busca no Cron)
CREATE INDEX IF NOT EXISTS idx_pautas_status ON pautas(status);
CREATE INDEX IF NOT EXISTS idx_pautas_data_agendada ON pautas(data_agendada);

-- 3. Configuração de Segurança (Row Level Security)
-- Por padrão, o Supabase bloqueia acesso externo. Vamos habilitar o acesso:
ALTER TABLE pautas ENABLE ROW LEVEL SECURITY;

-- Política: Permitir que qualquer pessoa com a KEY de serviço (ou autenticada) leia e escreva.
-- Nota: Em produção, você pode restringir isso apenas a usuários logados.
DROP POLICY IF EXISTS "Permitir acesso total para autenticados" ON pautas;
CREATE POLICY "Permitir acesso total para autenticados" 
ON pautas FOR ALL 
TO authenticated 
USING (true) 
WITH CHECK (true);

-- Política: Permitir leitura pública (se você quiser exibir a fila no front sem login)
DROP POLICY IF EXISTS "Permitir leitura pública" ON pautas;
CREATE POLICY "Permitir leitura pública" 
ON pautas FOR SELECT 
TO anon 
USING (true);

-- Comentário da tabela para facilitar identificação no Dashboard
COMMENT ON TABLE pautas IS 'Fila de automação de conteúdos para o site Onde Eu Clico';
