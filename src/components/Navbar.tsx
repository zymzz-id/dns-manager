import React from 'react';
import { Cloud, Globe, RefreshCw, LogOut, User } from 'lucide-react';
import { AuthAccount, DNSZone } from '../types/dns';
import { WebUser } from '../services/authService';

interface NavbarProps {
  currentView: 'domains' | 'records';
  onNavigate: (view: 'domains' | 'records') => void;
  activeAccount: AuthAccount | null;
  activeZone: DNSZone | null;
  zones: DNSZone[];
  onSelectZone: (zone: DNSZone) => void;
  onOpenTokenModal: () => void;
  onLogout: () => void;
  isLoading: boolean;
  onRefresh: () => void;
  webUser: WebUser | null;
  onWebLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  activeZone,
  zones,
  onSelectZone,
  isLoading,
  onRefresh,
  webUser,
  onWebLogout,
}) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-800 bg-slate-950/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button
            onClick={() => onNavigate('domains')}
            className="group flex items-center gap-2.5 text-left focus:outline-none cursor-pointer shrink-0"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 shadow-md shadow-amber-500/20 transition-transform group-hover:scale-105">
              <Cloud className="h-5 w-5 fill-slate-950" />
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white group-hover:text-amber-400 transition-colors">
                DNS Manager
              </span>
              <span className="ml-1 text-xs font-semibold text-amber-500">PRO</span>
            </div>
          </button>

          {/* Quick Zone Switcher Dropdown (Desktop) */}
          {activeZone && currentView === 'records' && (
            <div className="hidden lg:flex items-center gap-2 pl-4 border-l border-slate-800">
              <Globe className="h-4 w-4 text-slate-400" />
              <select
                aria-label="Pilih domain aktif"
                value={activeZone.id}
                onChange={(e) => {
                  const found = zones.find((z) => z.id === e.target.value);
                  if (found) onSelectZone(found);
                }}
                className="rounded-md border border-slate-800 bg-slate-900 py-1.5 pl-2.5 pr-8 text-xs font-mono font-medium text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
              >
                {zones.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.name} ({z.status === 'active' ? 'Aktif' : 'Pending'})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Zone 3: Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onRefresh}
            disabled={isLoading}
            title="Muat ulang data dari Cloudflare"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 disabled:opacity-50 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin text-amber-500' : ''}`} />
          </button>

          {/* Web User & Logout Button */}
          {webUser && (
            <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
              <span
                className="hidden md:inline-flex items-center gap-1.5 text-xs font-semibold text-slate-300 font-mono"
                title={`Login sebagai ${webUser.username}`}
              >
                <User className="h-3.5 w-3.5 text-amber-400" />
                <span>{webUser.username}</span>
              </span>

              <button
                onClick={onWebLogout}
                title="Keluar dari Dashboard (Logout)"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:bg-rose-950/40 hover:border-rose-900/60 hover:text-rose-400 transition-colors cursor-pointer"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
