import type { Pauta } from '@/lib/supabase';

export function PostQueue({ pautas, onPause, onDelete }: { pautas: Pauta[], onPause: (id: string, s: string) => void, onDelete: (id: string) => void }) {
  
  const getStatusBadge = (status: string) => {
    switch (status) {
        case 'aguardando':
            return <span className="text-[10px] font-bold text-outline bg-surface-container px-2 py-1 rounded uppercase tracking-wider">AGUARDANDO GERAÇÃO</span>;
        case 'processando':
            return <span className="text-[10px] font-bold text-primary bg-primary-fixed px-2 py-1 rounded uppercase tracking-wider">PROCESSANDO</span>;
        case 'publicado':
            return <span className="text-[10px] font-bold text-secondary bg-secondary-container px-2 py-1 rounded uppercase tracking-wider">PUBLICADO</span>;
        case 'erro':
            return <span className="text-[10px] font-bold text-error bg-error-container px-2 py-1 rounded uppercase tracking-wider">ERRO</span>;
        case 'pausado':
            return <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container-high px-2 py-1 rounded uppercase tracking-wider">PAUSADO</span>;
        default:
            return null;
    }
  }

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-6 border border-outline-variant/30">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-on-background flex items-center gap-3">
          <span className="material-symbols-outlined text-outline">list_alt</span>
          Fila de Posts
        </h3>
        <button className="text-primary hover:text-primary-container font-semibold text-sm transition-colors">Ver todos</button>
      </div>

      <div className="space-y-4 relative">
        {/* Timeline line */}
        {pautas.length > 0 && (
           <div className="absolute left-[15px] top-4 bottom-4 w-px bg-outline-variant/40 z-0"></div>
        )}

        {pautas.length === 0 ? (
           <p className="text-sm text-on-surface-variant text-center py-4">A fila está vazia.</p>
        ) : (
           pautas.map((pauta) => {
              const dateObj = new Date(pauta.data_agendada);
              const timeStr = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
              
              return (
               <div key={pauta.id} className="relative z-10 flex gap-4 items-start group">
                 <div className="w-8 h-8 rounded-full bg-surface-container-lowest border-2 border-surface-container-lowest flex items-center justify-center shrink-0 mt-1">
                   <div className={`w-2 h-2 rounded-full ${pauta.status === 'publicado' ? 'bg-secondary' : 'bg-outline-variant'}`}></div>
                 </div>
                 
                 <div className="flex-1 bg-surface p-4 rounded-xl border border-outline-variant/30 hover:border-outline-variant transition-colors relative">
                    <div className="absolute right-3 top-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                        {pauta.status === 'processando' || pauta.status === 'erro' ? (
                            <button onClick={() => onPause(pauta.id, 'pausado')} title="Reiniciar (Voltar para Aguardando)" className="text-on-surface-variant hover:text-primary p-1 rounded-md hover:bg-surface-container-high">
                               <span className="material-symbols-outlined text-[18px]">replay</span>
                            </button>
                        ) : null}
                        <button onClick={() => onPause(pauta.id, pauta.status)} title="Pausar/Retomar" className="text-on-surface-variant hover:text-primary p-1 rounded-md hover:bg-surface-container-high">
                           <span className="material-symbols-outlined text-[18px]">{pauta.status === 'pausado' ? 'play_arrow' : 'pause'}</span>
                        </button>
                        <button onClick={() => onDelete(pauta.id)} title="Excluir" className="text-on-surface-variant hover:text-error p-1 rounded-md hover:bg-error-container">
                           <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>

                   <p className={`text-base font-semibold text-on-surface mb-2 pr-16 ${pauta.status === 'pausado' ? 'line-through text-outline' : ''}`}>
                     {pauta.titulo_tema}
                   </p>
                   <div className="flex flex-wrap items-center justify-between gap-2">
                     <span className="text-xs text-outline flex items-center gap-1.5 font-medium">
                       <span className="material-symbols-outlined text-[14px]">schedule</span> {timeStr}
                     </span>
                     {getStatusBadge(pauta.status)}
                   </div>
                 </div>
               </div>
              );
           })
        )}
      </div>
    </div>
  );
}
