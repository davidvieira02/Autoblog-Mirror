import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://mock.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'mock-key';

export const isMockEnvironment = () => {
  return !process.env.NEXT_PUBLIC_SUPABASE_URL || 
         process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id') ||
         process.env.NEXT_PUBLIC_SUPABASE_URL === 'https://mock.supabase.co';
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Define type for our pauta to be used throughout the app
export type Pauta = {
  id: string;
  titulo_tema: string;
  data_agendada: string; // ISO string
  status: 'aguardando' | 'processando' | 'publicado' | 'erro' | 'pausado';
  url_wordpress: string | null;
  created_at: string; // ISO string
};
