'use client';

import { useState, useEffect, ReactNode } from 'react';
import { supabase, isMockEnvironment, type Pauta } from '@/lib/supabase';
import { PostQueue } from './PostQueue';

export function AutomationEngine({ children }: { children?: ReactNode }) {
  const [postsPerDay, setPostsPerDay] = useState(3);
  const [loading, setLoading] = useState(false);
  const [pautas, setPautas] = useState<Pauta[]>([]);

  // Fixed times for simplicity, mapping postsPerDay to times
  const timesOptions: Record<number, string[]> = {
    1: ['12:00'],
    2: ['08:00', '18:00'],
    3: ['08:00', '12:00', '18:00'],
    4: ['08:00', '12:00', '16:00', '20:00'],
    5: ['08:00', '11:00', '14:00', '17:00', '20:00'],
    6: ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00'],
  };

  const selectedTimes = timesOptions[postsPerDay];

  const fetchQueue = async () => {
    // If supabase URL is not set, we mock it
    if (isMockEnvironment()) {
      return; 
    }

    try {
      const { data, error } = await supabase
        .from('pautas')
        .select('*')
        .order('data_agendada', { ascending: true })
        .limit(5);

      if (error && error.message.includes("Could not find the table 'public.pautas'")) {
        console.warn("Table 'pautas' does not exist in your Supabase project.");
        return;
      }

      if (!error && data) {
        setPautas(data as Pauta[]);
      }
    } catch (e) {
      console.warn("Could not fetch queue from Supabase.");
    }
  };

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStatusUpdate = () => {
    fetchQueue();
  };

  const handlePause = async (id: string, currentStatus: string) => {
    const isMock = isMockEnvironment();
    const newStatus = currentStatus === 'pausado' ? 'aguardando' : 'pausado';
    
    if (isMock) {
        setPautas(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        return;
    }

    await supabase.from('pautas').update({ status: newStatus }).eq('id', id);
    fetchQueue();
  };

  const handleDelete = async (id: string) => {
     const isMock = isMockEnvironment();
     if (isMock) {
         setPautas(prev => prev.filter(p => p.id !== id));
         return;
     }

     await supabase.from('pautas').delete().eq('id', id);
     fetchQueue();
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Configuration Column */}
      <div className="lg:col-span-8 space-y-6">
        <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-6 md:p-10 border border-outline-variant/30">
          
          <div className="mb-8">
            <h3 className="text-xl font-bold text-on-surface mb-2">Automação Inteligente Ativa</h3>
            <p className="text-on-surface-variant leading-relaxed">
              O sistema "Onde Eu Clico" agora opera de forma 100% autônoma. 
              A cada execução do cron, a IA analisa os posts existentes para garantir que não haja repetições e gera conteúdo novo focado em <strong>IA e Inovações Tecnológicas</strong>.
            </p>
          </div>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Frequência Estimada</label>
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4, 5, 6].map(num => (
                  <button 
                    key={num}
                    onClick={() => setPostsPerDay(num)}
                    className={`w-10 h-10 rounded-full font-semibold transition-all flex items-center justify-center ${
                        postsPerDay === num 
                          ? 'bg-primary text-on-primary shadow-md' 
                          : 'border border-outline-variant text-on-surface hover:bg-surface-container'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
              <p className="text-[11px] text-on-surface-variant mt-2 italic">* A IA gera conteúdo sob demanda quando não há pautas na fila.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Horários de Referência</label>
              <div className="flex flex-wrap gap-3">
                {selectedTimes.map(time => (
                   <span key={time} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container text-on-surface rounded-lg text-sm border border-outline-variant/50">
                     <span className="material-symbols-outlined text-[16px]">schedule</span> {time}
                   </span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-surface-container-low border border-primary-fixed-dim rounded-xl p-6 flex items-start gap-4">
            <span className="material-symbols-outlined text-primary fill mt-0.5">verified</span>
            <div>
              <h4 className="font-semibold text-on-surface">Configuração de Nicho: Onde Eu Clico</h4>
              <ul className="text-sm text-on-surface-variant mt-2 space-y-2 mb-4">
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Foco em análises técnicas e novidades do mercado.</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Abordagem acadêmica e especializada.</li>
                <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-primary" /> Artigos densos de alto padrão (E-E-A-T).</li>
              </ul>
              <button 
                onClick={async () => {
                   const res = await fetch('/api/clear');
                   if (res.ok) {
                       alert('Pautas antigas limpas com sucesso! A próxima gerada usará o novo tema de IA.');
                       fetchQueue();
                   }
                }}
                className="inline-flex items-center gap-2 bg-error text-on-error px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-[18px]">delete_sweep</span>
                Limpar Pautas Antigas (Fila)
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Status Column */}
      <div className="lg:col-span-4 space-y-6">
        {children}
        <PostQueue pautas={pautas} onPause={handlePause} onDelete={handleDelete} />
      </div>
    </div>
  );
}
