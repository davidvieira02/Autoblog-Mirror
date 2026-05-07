-- Supabase schema for AutoBlog AI
-- Copy and run this in your Supabase project's SQL Editor

CREATE TABLE pautas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    titulo_tema TEXT NOT NULL,
    data_agendada TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('aguardando', 'processando', 'publicado', 'erro', 'pausado')),
    url_wordpress TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable Row Level Security (optional but recommended depending on API exposure)
-- ALTER TABLE pautas ENABLE ROW LEVEL SECURITY;
