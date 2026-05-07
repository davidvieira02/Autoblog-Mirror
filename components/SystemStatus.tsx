const StatusItem = ({ name, icon, isOk, isPrimary = false, isTertiary = false }: { name: string, icon: string, isOk: boolean, isPrimary?: boolean, isTertiary?: boolean }) => (
  <div className="flex items-center justify-between p-3 bg-surface rounded-xl border border-outline-variant/30">
      <span className="text-sm font-medium text-on-surface flex items-center gap-3">
          <span className={`material-symbols-outlined ${isPrimary ? 'text-primary' : isTertiary ? 'text-tertiary' : 'text-outline'}`}>
              {icon}
          </span>
          {name}
      </span>
      {isOk ? (
          <span className="flex items-center gap-1 text-[11px] font-bold text-secondary bg-secondary-container px-2 py-1 rounded-full">
              <span className="material-symbols-outlined text-[14px]">check_circle</span> OK
          </span>
      ) : (
          <span className="flex items-center gap-1 text-[11px] font-bold text-error bg-error-container px-2 py-1 rounded-full">
             <span className="material-symbols-outlined text-[14px]">error</span> FIX
          </span>
      )}
  </div>
);

export function SystemStatus() {
  const isSupabaseConfigured = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes('your-project-id');
  const isWPConfigured = !!process.env.WORDPRESS_URL && !process.env.WORDPRESS_URL.includes('your-wp-site.com');
  const isGeminiConfigured = !!process.env.GEMINI_API_KEY || !!process.env['NEXT_PUBLIC_' + 'GEMINI_API_KEY'];

  return (
    <div className="bg-surface-container-lowest rounded-2xl shadow-sm p-6 border border-outline-variant/30">
      <h3 className="text-xl font-bold text-on-background mb-4 flex items-center gap-3">
        <span className="material-symbols-outlined text-outline">dns</span>
        Status do Sistema
      </h3>
      <div className="space-y-3">
        {/* We use an icon instead of an image to avoid needing remote patterns configuration for external google logo in some cases, but for this let's stick to simple icon */}
        <StatusItem name="Google AI Studio" icon="auto_awesome" isOk={isGeminiConfigured} />
        <StatusItem name="Supabase" icon="database" isOk={isSupabaseConfigured} isTertiary />
        <StatusItem name="WordPress Hostinger" icon="language" isOk={isWPConfigured} isPrimary />
      </div>
    </div>
  );
}
