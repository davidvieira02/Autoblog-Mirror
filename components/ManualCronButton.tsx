'use client';

export function ManualCronButton() {
  return (
    <button 
      onClick={async () => {
        try {
          const res = await fetch('/api/cron'); 
          const data = await res.json();
          alert('Cron manual finalizado: ' + (data.message || data.error || 'sem retorno'));
        } catch(e: any) {
          alert('Erro no cron: ' + e.message);
        }
      }}
      className="text-primary hover:bg-surface-container px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors border border-outline-variant/30 flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-[18px]">play_circle</span>
      Executar Cron Manual
    </button>
  );
}
