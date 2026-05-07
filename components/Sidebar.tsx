import Link from 'next/link';
import { ReactNode } from 'react';

type NavItemProp = {
  href: string;
  icon: string;
  label: string;
  active?: boolean;
};

function NavItem({ href, icon, label, active }: NavItemProp) {
  if (active) {
    return (
      <Link 
        href={href} 
        className="flex items-center px-3 py-3 rounded-lg text-primary font-bold border-r-4 border-primary bg-surface-container-low transition-colors duration-200"
      >
        <span className="material-symbols-outlined mr-3 fill">{icon}</span>
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <Link 
      href={href} 
      className="flex items-center px-3 py-3 rounded-lg text-on-surface-variant hover:bg-surface-container-high transition-colors duration-200"
    >
      <span className="material-symbols-outlined mr-3">{icon}</span>
      <span>{label}</span>
    </Link>
  );
}

export function Sidebar() {
  return (
    <nav className="bg-surface-container-lowest shadow-sm h-screen w-64 fixed left-0 top-0 flex flex-col py-10 px-6 space-y-3 hidden md:flex border-r border-outline-variant/30">
      <div className="mb-10">
        <h1 className="text-2xl font-extrabold text-primary">AutoBlog AI</h1>
        <p className="text-sm text-on-surface-variant">Tech for Laypeople</p>
      </div>

      <div className="flex-1 space-y-2">
        <NavItem href="#" icon="auto_awesome" label="Automation Engine" active />
        <NavItem href="#" icon="dashboard" label="Dashboard" />
        <NavItem href="#" icon="schedule" label="Post Queue" />
        <NavItem href="#" icon="settings" label="Settings" />
      </div>

      <button className="bg-primary text-on-primary font-semibold text-[15px] py-3 rounded-lg shadow-sm hover:shadow-md transition-shadow flex items-center justify-center gap-2">
        <span className="material-symbols-outlined">add</span>
        New Automation
      </button>
    </nav>
  );
}
