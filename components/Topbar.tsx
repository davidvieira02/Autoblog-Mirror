import Image from 'next/image';

export function Topbar() {
  return (
    <header className="bg-surface-container-lowest shadow-sm border-b border-outline-variant/30 flex justify-between items-center w-full px-8 py-2 sticky top-0 z-50 md:hidden">
      <div className="flex items-center gap-3">
        <button className="md:hidden text-on-surface">
          <span className="material-symbols-outlined">menu</span>
        </button>
        <span className="text-xl font-extrabold text-primary">Tech Support for Laypeople</span>
      </div>
      
      <div className="flex items-center gap-3">
        <button className="text-on-surface-variant hover:bg-surface-container-low transition-all duration-200 p-2 rounded-full">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <button className="text-on-surface-variant hover:bg-surface-container-low transition-all duration-200 p-2 rounded-full">
          <span className="material-symbols-outlined">help_outline</span>
        </button>
        <div className="relative w-8 h-8 rounded-full overflow-hidden border border-outline-variant">
          <Image 
            src="https://picsum.photos/seed/admin/100/100" 
            alt="Profile placeholder" 
            fill 
            className="object-cover" 
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    </header>
  );
}
