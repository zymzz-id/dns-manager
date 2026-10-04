import React, { useState } from 'react';
import { Globe, Search, ArrowRight, Server, X } from 'lucide-react';
import { DNSZone } from '../types/dns';

interface DomainListProps {
  zones: DNSZone[];
  onSelectZone: (zone: DNSZone) => void;
  onOpenTokenModal?: () => void;
}

export const DomainList: React.FC<DomainListProps> = ({
  zones,
  onSelectZone,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending'>('all');

  const filteredZones = zones.filter((zone) => {
    const matchesSearch = zone.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ? true : statusFilter === 'active' ? zone.status === 'active' : zone.status !== 'active';
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-850 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <Globe className="h-6 w-6 text-amber-500" />
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Daftar Zona Domain
            </h1>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Pilih domain untuk melihat, menambah, mengubah record DNS, atau mengatur Cloudflare proxy.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs text-slate-400 font-mono">
            Total: <strong className="text-slate-200">{zones.length}</strong> domain
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari domain..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 p-0.5 cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Status Filter Tabs (Clean Segmented Control) */}
        <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 p-1 text-xs">
          <button
            onClick={() => setStatusFilter('all')}
            className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                : 'text-slate-400 hover:bg-slate-850/50 hover:text-slate-200'
            }`}
          >
            Semua ({zones.length})
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
              statusFilter === 'active'
                ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                : 'text-slate-400 hover:bg-slate-850/50 hover:text-slate-200'
            }`}
          >
            Aktif ({zones.filter((z) => z.status === 'active').length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`rounded-md px-3 py-1 font-medium transition-colors cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700/80'
                : 'text-slate-400 hover:bg-slate-850/50 hover:text-slate-200'
            }`}
          >
            Pending ({zones.filter((z) => z.status !== 'active').length})
          </button>
        </div>
      </div>

      {/* Grid of Domains */}
      {filteredZones.length === 0 ? (
        <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <Globe className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-200">
            {searchQuery ? 'Domain Tidak Ditemukan' : 'Belum Ada Domain Terdeteksi'}
          </h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto leading-relaxed">
            {searchQuery
              ? `Tidak ada zona domain yang cocok dengan pencarian "${searchQuery}".`
              : 'Pastikan file .env memiliki variabel CLOUDFLARE_API_TOKEN dengan izin Zone.DNS:Edit dan Zone.Zone:Read.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredZones.map((zone) => (
            <div
              key={zone.id}
              onClick={() => onSelectZone(zone)}
              className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/90 p-5 hover:border-amber-500/50 hover:shadow-xl hover:shadow-black/50 transition-all cursor-pointer"
            >
              <div>
                {/* Domain Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-800 text-amber-500 group-hover:bg-amber-500 group-hover:text-slate-950 transition-all">
                      <Globe className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white group-hover:text-amber-400 transition-colors font-mono">
                        {zone.name}
                      </h3>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                        <span>{zone.plan.name}</span>
                        <span aria-hidden="true">&middot;</span>
                        <span className="tabular-nums font-mono text-slate-300">{zone.records_count ?? 0} record</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Indicator */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                      zone.status === 'active'
                        ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                        : 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                    }`}
                  >
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        zone.status === 'active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
                      }`}
                    />
                    {zone.status === 'active' ? 'Aktif' : 'Pending NS'}
                  </span>
                </div>

                {/* Nameservers section */}
                <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/70 p-3">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 mb-1.5">
                    <Server className="h-3 w-3 text-slate-500" />
                    <span>Cloudflare Nameservers:</span>
                  </div>
                  <div className="space-y-1">
                    {zone.name_servers && zone.name_servers.length > 0 ? (
                      zone.name_servers.map((ns, idx) => (
                        <div
                          key={idx}
                          className="font-mono text-[11px] text-slate-300 truncate"
                        >
                          {ns}
                        </div>
                      ))
                    ) : (
                      <span className="text-[11px] text-slate-500 italic">Nameserver belum ditentukan</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-3.5 border-t border-slate-800 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-mono">
                  ID: {zone.id.slice(0, 12)}...
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                  <span>Kelola DNS</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
