import { Sidebar } from '@/components/Sidebar';
import { Topbar } from '@/components/Topbar';
import { AutomationEngine } from '@/components/AutomationEngine';
import { ManualCronButton } from '@/components/ManualCronButton';
import { SystemStatus } from '@/components/SystemStatus';

export default function Home() {
  return (
    <>
      <Sidebar />
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen bg-surface-container-lowest">
        <Topbar />
        <main className="flex-1 p-6 md:p-10 max-w-[1440px] mx-auto w-full">
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-bold text-on-surface mb-1">Motor de Automação</h2>
              <ManualCronButton />
            </div>
            <p className="text-lg text-on-surface-variant">Configure o fluxo de criação e publicação de conteúdo.</p>
          </div>
          <AutomationEngine systemStatusSlot={<SystemStatus />} />
        </main>
      </div>
    </>
  );
}

