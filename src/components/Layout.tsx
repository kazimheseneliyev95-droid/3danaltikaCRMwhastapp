import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Calculator, Settings, Menu } from 'lucide-react';
import { cn } from '../lib/utils';

export default function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  const navItems = [
    { name: 'Simulator', path: '/', icon: <Calculator className="w-5 h-5" /> },
    { name: 'CRM (WhatsApp)', path: '/crm', icon: <LayoutDashboard className="w-5 h-5" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 flex-shrink-0">
        <div className="p-6 border-b border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            ReklamAnalitika
          </h1>
          <p className="text-xs text-slate-500 mt-1">Ads & CRM Suite</p>
        </div>
        
        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.path
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              {item.icon}
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="bg-slate-950 rounded-lg p-3 text-xs text-slate-500">
            <p>Version 2.1.0</p>
            <p className="mt-1">Connected: Local Mode</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto h-screen">
        {children}
      </main>
    </div>
  );
}
