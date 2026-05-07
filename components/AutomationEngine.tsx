'use client';

import { useState, useEffect, ReactNode } from 'react';
import { supabase, type Pauta } from '@/lib/supabase';
import { PostQueue } from './PostQueue';

export function AutomationEngine({ systemStatusSlot }: { systemStatusSlot?: ReactNode }) {
  const [temas, setTemas] = useState('');

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
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id')) {
      return; 
    }

    try {
      const { data, error } = await supabase
        .from('pautas')
        .select('*')
        .order('data_agendada', { ascending: true })
        .limit(5);

      if (!error && data) {
        setPautas(data as Pauta[]);
      }
    } catch (e) {
      console.warn("Could not fetch queue from Supabase.");
    }
  };

  useEffect(() => {
    fetchQueue();
    
    // Subscribe to changes if we were fully using real supabase
    // For now we just poll or fetch on mount
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleStartAutomation = async () => {
    if (!temas.trim()) return;
    setLoading(true);

    const linhas = temas.split('\\n').filter(t => t.trim().length > 0);
    if (linhas.length === 0) {
      setLoading(false);
      return;
    }

    // Prepare entries
    let currentDate = new Date();
    // Default mock data if no Supabase
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const newItems: Pauta[] = [];

    // Calculate dates based on selectedTimes
    let timeIndex = 0;
    
    for (let i = 0; i < linhas.length; i++) {
        // Adjust the date string for the chosen times
        const timeStr = selectedTimes[timeIndex];
        const [hour, minute] = timeStr.split(':');
        
        let scheduledDate = new Date(currentDate);
        scheduledDate.setHours(parseInt(hour, 10), parseInt(minute, 10), 0, 0);
        
        // If the scheduled time is in the past for today, we might skip to tomorrow if we were being super precise
        // For simplicity, we just push it forward
        if (scheduledDate < new Date()) {
           scheduledDate.setDate(scheduledDate.getDate() + 1);
        }

        const mockId = Date.now();
        const newPauta: Pauta = {
          id: isMock ? `mock-${mockId}-${i}` : '', // Let Supabase handle ID if not mock
          titulo_tema: linhas[i].trim(),
          data_agendada: scheduledDate.toISOString(),
          status: 'aguardando',
          url_wordpress: null,
          created_at: new Date().toISOString()
        };
        
        newItems.push(newPauta);

        timeIndex++;
        if (timeIndex >= selectedTimes.length) {
            timeIndex = 0;
            currentDate.setDate(currentDate.getDate() + 1);
        }
    }

    if (isMock) {
        setPautas(prev => [...prev, ...newItems].sort((a,b) => new Date(a.data_agendada).getTime() - new Date(b.data_agendada).getTime()).slice(0, 5));
        setTemas('');
        setLoading(false);
        return;
    }

    try {
        // Exclude ID to let DB generate UUID
        const insertData = newItems.map(item => {
            const { id, ...rest } = item;
            return rest;
        });

        const { error } = await supabase.from('pautas').insert(insertData);
        if (error) {
            console.error(error);
        } else {
            setTemas('');
            fetchQueue();
        }
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const handlePause = async (id: string, currentStatus: string) => {
    const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id');
    const newStatus = currentStatus === 'pausado' ? 'aguardando' : 'pausado';
    
    if (isMock) {
        setPautas(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
        return;
    }

    await supabase.from('pautas').update({ status: newStatus }).eq('id', id);
    fetchQueue();
  };

  const handleDelete = async (id: string) => {
     const isMock = !process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id');
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
          
          <div className="mb-6">
            <label className="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Temas e Ideias de Pautas</label>
            <textarea 
              value={temas}
              onChange={(e) => setTemas(e.target.value)}
              className="w-full rounded-xl border border-outline-variant bg-surface focus:border-primary focus:ring-1 focus:ring-primary text-base text-on-surface p-4 resize-y transition-colors" 
              placeholder="Cole aqui sua lista de temas..." 
              rows={6}
            />
          </div>

          <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Quantos posts por dia?</label>
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
            </div>

            <div>
              <label className="block text-xs font-bold text-on-surface-variant mb-3 uppercase tracking-wider">Horários de Publicação</label>
              <div className="flex flex-wrap gap-3">
                {selectedTimes.map(time => (
                   <span key={time} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface-container text-on-surface rounded-lg text-sm border border-outline-variant/50">
                     <span className="material-symbols-outlined text-[16px]">schedule</span> {time}
                   </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mb-8 bg-surface-container-low border border-primary-fixed-dim rounded-xl p-4 flex items-start gap-4">
            <span className="material-symbols-outlined text-primary fill mt-0.5">info</span>
            <div>
              <h4 className="font-semibold text-on-surface">Configuração do Prompt: Tom Simples / Foco em Leigos</h4>
              <p className="text-sm text-on-surface-variant mt-1 leading-relaxed">A IA usará linguagem acessível, analogias do dia a dia e evitará jargões técnicos para garantir que o conteúdo seja fácil de entender.</p>
            </div>
          </div>

          <button 
            onClick={(e) => { e.preventDefault(); handleStartAutomation(); }}
            disabled={loading}
            className="w-full bg-primary hover:bg-primary-container disabled:opacity-70 disabled:cursor-not-allowed text-on-primary font-semibold py-4 px-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-200 flex justify-center items-center gap-2 active:scale-[0.98]"
          >
            <span className="material-symbols-outlined fill">rocket_launch</span>
            {loading ? 'Processando...' : 'Salvar e Iniciar Automação'}
          </button>
        </div>
      </div>

      {/* Status Column */}
      <div className="lg:col-span-4 space-y-6">
        {systemStatusSlot}
        <PostQueue pautas={pautas} onPause={handlePause} onDelete={handleDelete} />
      </div>
    </div>
  );
}
