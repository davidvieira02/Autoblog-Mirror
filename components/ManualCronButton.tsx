'use client';

export function ManualCronButton() {
  return (
    <button 
      onClick={async () => {
        try {
          await fetch('/api/cron'); 
          alert('Cron script manual finalizado. Verifique a fila.');
        } catch(e) {}
      }}
      className="text-primary hover:bg-surface-container px-3 py-1.5 rounded-lg font-semibold text-sm transition-colors border border-outline-variant/30 flex items-center gap-2"
    >
      <span className="material-symbols-outlined text-[18px]">play_circle</span>
      Executar Cron Manual
    </button>
  );
}
