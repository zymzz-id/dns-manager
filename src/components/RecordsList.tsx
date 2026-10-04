import React, { useState } from 'react';
import {
  Cloud,
  Plus,
  Search,
  Edit2,
  Trash2,
  Copy,
  Check,
  Sparkles,
  Download,
  Server,
  ArrowUpDown,
  ArrowLeft,
  X,
  Layers,
  Clock,
  ShieldCheck,
  ChevronRight,
  Globe,
} from 'lucide-react';
import { DNSRecord, DNSRecordType, DNSZone } from '../types/dns';

interface RecordsListProps {
  zone: DNSZone;
  records: DNSRecord[];
  onBackToDomains: () => void;
  onAddRecord: () => void;
  onEditRecord: (record: DNSRecord) => void;
  onDeleteRecord: (record: DNSRecord) => void;
  onToggleProxy: (record: DNSRecord, nextState: boolean) => Promise<void>;
  onOpenTemplates: () => void;
  onOpenImportExport: () => void;
}

export const RecordsList: React.FC<RecordsListProps> = ({
  zone,
  records,
  onBackToDomains,
  onAddRecord,
  onEditRecord,
  onDeleteRecord,
  onToggleProxy,
  onOpenTemplates,
  onOpenImportExport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('ALL');
  const [proxyFilter, setProxyFilter] = useState<'ALL' | 'PROXIED' | 'DNS_ONLY'>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Sorting
  const [sortBy, setSortBy] = useState<'name' | 'type' | 'ttl'>('type');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleToggle = async (record: DNSRecord) => {
    if (!record.proxiable || togglingId) return;
    setTogglingId(record.id);
    try {
      await onToggleProxy(record, !record.proxied);
    } catch (e) {
      console.error(e);
    } finally {
      setTogglingId(null);
    }
  };

  const getTypeBadgeClass = (type: DNSRecordType) => {
    switch (type) {
      case 'A':
      case 'AAAA':
        return 'badge-a text-sky-400 bg-sky-500/10 border-sky-500/25';
      case 'CNAME':
        return 'badge-cname text-violet-400 bg-violet-500/10 border-violet-500/25';
      case 'MX':
        return 'badge-mx text-amber-400 bg-amber-500/10 border-amber-500/25';
      case 'TXT':
      case 'CAA':
        return 'badge-txt text-emerald-400 bg-emerald-500/10 border-emerald-500/25';
      default:
        return 'badge-neutral text-slate-300 bg-slate-800/80 border-slate-700/80';
    }
  };

  const formatTtl = (ttl: number) => {
    if (ttl === 1) return 'Auto';
    if (ttl < 60) return `${ttl}s`;
    if (ttl < 3600) return `${Math.round(ttl / 60)} mnt`;
    if (ttl < 86400) return `${Math.round(ttl / 3600)} jam`;
    return `${Math.round(ttl / 86400)} hari`;
  };

  const filteredRecords = records
    .filter((r) => {
      const matchesSearch =
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.comment && r.comment.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesType = selectedType === 'ALL' ? true : r.type === selectedType;

      const matchesProxy =
        proxyFilter === 'ALL'
          ? true
          : proxyFilter === 'PROXIED'
          ? r.proxied
          : !r.proxied;

      return matchesSearch && matchesType && matchesProxy;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      } else if (sortBy === 'type') {
        comparison = a.type.localeCompare(b.type);
      } else if (sortBy === 'ttl') {
        comparison = a.ttl - b.ttl;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const distinctTypes = ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'CAA'];

  return (
    <div className="space-y-5">
      {/* 1. TOP BREADCRUMB & BACK NAVIGATION BAR */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-850 pb-4">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* TOMBOL BACK (KEMBALI) */}
          <button
            onClick={onBackToDomains}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-amber-500/60 hover:bg-slate-800 hover:text-amber-400 transition-all shadow-sm group cursor-pointer"
            title="Kembali ke halaman daftar domain"
          >
            <ArrowLeft className="h-4 w-4 text-amber-500 transition-transform group-hover:-translate-x-1" />
            <span>Kembali ke Semua Domain</span>
          </button>

          {/* Breadcrumb Trail */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400">
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="hover:text-slate-200 cursor-pointer" onClick={onBackToDomains}>
              Domain
            </span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="font-mono font-medium text-slate-200">{zone.name}</span>
            <ChevronRight className="h-3.5 w-3.5 text-slate-600" />
            <span className="text-amber-400 font-semibold">DNS Records</span>
          </nav>
        </div>
      </div>

      {/* 2. ZONE SUMMARY CARD */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/90 p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-amber-500" />
                <h1 className="text-xl sm:text-2xl font-bold font-mono tracking-tight text-white">
                  {zone.name}
                </h1>
              </div>

              {/* Status pill */}
              <span
                className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  zone.status === 'active'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    zone.status === 'active' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                  }`}
                />
                {zone.status === 'active' ? 'Aktif' : 'Pending Nameserver'}
              </span>
            </div>

            {/* Unboxed Metadata */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Server className="h-3.5 w-3.5 text-slate-500" />
                <span>NS: {zone.name_servers?.join(', ') || 'Cloudflare NS'}</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">&middot;</span>
              <span className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-slate-500" />
                <span>{zone.plan?.name || 'Free Plan'}</span>
              </span>
              <span aria-hidden="true" className="text-slate-600">&middot;</span>
              <span className="tabular-nums font-mono text-slate-300">
                {records.length} record DNS
              </span>
            </div>
          </div>

          {/* Secondary Quick Action Tools */}
          <div className="flex flex-wrap items-center gap-2 pt-2 lg:pt-0">
            <button
              onClick={onOpenTemplates}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 hover:text-white hover:border-slate-600 transition-colors cursor-pointer group"
            >
              <Sparkles className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-200" />
              <span>Preset Template</span>
            </button>

            <button
              onClick={onOpenImportExport}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/80 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 hover:text-white hover:border-slate-600 transition-colors cursor-pointer group"
            >
              <Download className="h-3.5 w-3.5 text-slate-400 group-hover:text-slate-200" />
              <span>Ekspor / Impor</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. CLEAN RECORD TYPE FILTER BUTTONS */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-1.5 sm:p-2">
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-0.5">
          <button
            onClick={() => setSelectedType('ALL')}
            className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
              selectedType === 'ALL'
                ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700'
                : 'text-slate-400 hover:bg-slate-850/60 hover:text-slate-200'
            }`}
          >
            Semua Tipe ({records.length})
          </button>

          {distinctTypes.map((t) => {
            const count = records.filter((r) => r.type === t).length;
            return (
              <button
                key={t}
                onClick={() => setSelectedType(t)}
                className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-medium transition-all cursor-pointer ${
                  selectedType === t
                    ? 'bg-slate-800 text-white font-bold shadow-xs border border-slate-700'
                    : count > 0
                    ? 'text-slate-300 hover:bg-slate-850/60 hover:text-white'
                    : 'text-slate-500 hover:bg-slate-850/40 hover:text-slate-400'
                }`}
              >
                {t} {count > 0 && <span className="opacity-75 font-mono">({count})</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. SEARCH & SECONDARY CONTROLS BAR */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Cari nama subdomain, IP, target, atau catatan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-800 bg-slate-900 py-2 pl-9 pr-8 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Proxy and Sort Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Proxy filter segmented buttons */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 p-1">
            <button
              onClick={() => setProxyFilter('ALL')}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                proxyFilter === 'ALL'
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setProxyFilter('PROXIED')}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                proxyFilter === 'PROXIED'
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
              <span>Proxied</span>
            </button>
            <button
              onClick={() => setProxyFilter('DNS_ONLY')}
              className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer ${
                proxyFilter === 'DNS_ONLY'
                  ? 'bg-slate-800 text-white font-semibold border border-slate-700/60 shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Cloud className="h-3.5 w-3.5 text-slate-500" />
              <span>DNS Only</span>
            </button>
          </div>

          {/* Sort button */}
          <button
            onClick={() => {
              if (sortBy === 'name') setSortBy('type');
              else if (sortBy === 'type') setSortBy('ttl');
              else setSortBy('name');
            }}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
            title="Klik untuk mengubah pengurutan"
          >
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <span>Urut: <strong className="text-slate-100">{sortBy.toUpperCase()}</strong></span>
          </button>
        </div>
      </div>

      {/* ACTION ROW: TOMBOL TAMBAH RECORD BARU (DI BAWAH KOTAK PENCARIAN) */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <span>
            Menampilkan <strong className="text-amber-400 font-mono">{filteredRecords.length}</strong> dari{' '}
            <span className="font-mono">{records.length}</span> record
          </span>
          {searchQuery && (
            <span className="text-[11px] text-slate-500 italic">
              (pencarian: &quot;{searchQuery}&quot;)
            </span>
          )}
        </div>

        <button
          onClick={onAddRecord}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-md shadow-amber-500/20 cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Tambah Record Baru</span>
        </button>
      </div>

      {/* 5. RECORDS DATA VIEW (DESKTOP TABLE & MOBILE CARDS) */}
      {filteredRecords.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
          <Cloud className="mx-auto h-10 w-10 text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">Tidak ada record DNS yang sesuai</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            {searchQuery || selectedType !== 'ALL' || proxyFilter !== 'ALL'
              ? 'Coba ganti filter tipe record atau bersihkan kata kunci pencarian.'
              : 'Zona ini belum memiliki DNS record. Klik tombol Tambah Record untuk memulai.'}
          </p>
          <button
            onClick={onAddRecord}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Tambah Record Baru</span>
          </button>
        </div>
      ) : (
        <>
          {/* DESKTOP TABLE VIEW */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-md">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  <tr>
                    <th className="py-3 px-4 w-24">Tipe</th>
                    <th className="py-3 px-4 w-48">Nama</th>
                    <th className="py-3 px-4">Konten / Nilai</th>
                    <th className="py-3 px-4 w-24 text-center">TTL</th>
                    <th className="py-3 px-4 w-36 text-center">Proxy Status</th>
                    <th className="py-3 px-4 w-28 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredRecords.map((record) => (
                    <tr
                      key={record.id}
                      className="group hover:bg-slate-850/50 transition-colors"
                    >
                      {/* Record Type Badge */}
                      <td className="py-3.5 px-4 align-middle">
                        <span
                          className={`inline-block font-mono text-[11px] font-bold px-2 py-0.5 rounded border ${getTypeBadgeClass(
                            record.type
                          )}`}
                        >
                          {record.type}
                        </span>
                      </td>

                      {/* Name / Subdomain */}
                      <td className="py-3.5 px-4 align-middle font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-100">
                            {record.name}
                          </span>
                          {record.name === '@' && (
                            <span className="text-[10px] text-slate-500 font-sans">(root)</span>
                          )}
                        </div>
                        {record.comment && (
                          <p className="text-[11px] font-sans text-slate-500 truncate max-w-xs mt-0.5">
                            {record.comment}
                          </p>
                        )}
                      </td>

                      {/* Content / Value */}
                      <td className="py-3.5 px-4 align-middle font-mono">
                        <div className="flex items-center gap-2 group/copy">
                          <span
                            className="text-slate-300 truncate max-w-[280px] lg:max-w-md block"
                            title={record.content}
                          >
                            {record.type === 'MX' && record.priority !== undefined && (
                              <span className="text-amber-400 font-bold mr-1.5">
                                [{record.priority}]
                              </span>
                            )}
                            {record.content}
                          </span>
                          <button
                            onClick={() => copyToClipboard(record.content, record.id)}
                            title="Salin konten record"
                            className="opacity-0 group-hover/copy:opacity-100 text-slate-500 hover:text-slate-300 p-1 rounded transition-opacity cursor-pointer"
                          >
                            {copiedId === record.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* TTL */}
                      <td className="py-3.5 px-4 align-middle text-center font-mono text-slate-400 tabular-nums">
                        {formatTtl(record.ttl)}
                      </td>

                      {/* Proxy Status Toggle (Orange Cloud) */}
                      <td className="py-3.5 px-4 align-middle text-center">
                        {record.proxiable ? (
                          <button
                            onClick={() => handleToggle(record)}
                            disabled={togglingId === record.id}
                            title={
                              record.proxied
                                ? 'Proxied Cloudflare aktif. Klik untuk ubah ke DNS Only.'
                                : 'DNS Only. Klik untuk mengaktifkan Orange Cloud proxy.'
                            }
                            className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer ${
                              record.proxied
                                ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 hover:bg-amber-500/25'
                                : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750 hover:text-slate-200'
                            }`}
                          >
                            <Cloud
                              className={`h-3.5 w-3.5 ${
                                record.proxied
                                  ? 'text-amber-500 fill-amber-500'
                                  : 'text-slate-500'
                              } ${togglingId === record.id ? 'animate-spin' : ''}`}
                            />
                            <span>{record.proxied ? 'Proxied' : 'DNS Only'}</span>
                          </button>
                        ) : (
                          <span
                            title="Cloudflare tidak menyediakan reverse proxy untuk tipe record ini"
                            className="inline-flex items-center gap-1 text-[11px] text-slate-500 cursor-default"
                          >
                            <Cloud className="h-3.5 w-3.5 text-slate-600" />
                            <span>DNS Only</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 align-middle text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onEditRecord(record)}
                            title="Edit record"
                            className="p-1.5 text-slate-400 hover:bg-slate-800 hover:text-amber-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => onDeleteRecord(record)}
                            title="Hapus record"
                            className="p-1.5 text-slate-400 hover:bg-rose-950/40 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* MOBILE CARDS VIEW (< 768px) */}
          <div className="grid grid-cols-1 gap-3 md:hidden">
            {filteredRecords.map((record) => (
              <div
                key={record.id}
                className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3 shadow-md"
              >
                {/* Header row: Type badge, Name, and Actions */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-block font-mono text-xs font-bold px-2 py-0.5 rounded border ${getTypeBadgeClass(
                        record.type
                      )}`}
                    >
                      {record.type}
                    </span>
                    <span className="font-mono text-xs font-bold text-white truncate max-w-[140px]">
                      {record.name}
                    </span>
                    {record.name === '@' && (
                      <span className="text-[10px] text-slate-500">(root)</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditRecord(record)}
                      className="p-2 text-slate-400 hover:text-amber-400 cursor-pointer"
                      title="Edit"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => onDeleteRecord(record)}
                      className="p-2 text-slate-400 hover:text-rose-400 cursor-pointer"
                      title="Hapus"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Content Box */}
                <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 font-mono text-xs text-slate-200 break-all flex items-start justify-between gap-2">
                  <span>
                    {record.type === 'MX' && record.priority !== undefined && (
                      <span className="text-amber-400 font-bold mr-1">
                        [{record.priority}]
                      </span>
                    )}
                    {record.content}
                  </span>
                  <button
                    onClick={() => copyToClipboard(record.content, record.id)}
                    className="p-1 text-slate-500 hover:text-slate-300 shrink-0 cursor-pointer"
                    title="Salin konten"
                  >
                    {copiedId === record.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                {/* Footer row: TTL & Proxy Toggle */}
                <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-1 text-slate-400 font-mono">
                    <Clock className="h-3.5 w-3.5 text-slate-500" />
                    <span>TTL: {formatTtl(record.ttl)}</span>
                  </div>

                  {record.proxiable ? (
                    <button
                      onClick={() => handleToggle(record)}
                      disabled={togglingId === record.id}
                      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold cursor-pointer ${
                        record.proxied
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      <Cloud
                        className={`h-3.5 w-3.5 ${
                          record.proxied
                            ? 'text-amber-500 fill-amber-500'
                            : 'text-slate-500'
                        }`}
                      />
                      <span>{record.proxied ? 'Proxied' : 'DNS Only'}</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-slate-500 flex items-center gap-1">
                      <Cloud className="h-3.5 w-3.5 text-slate-600" />
                      <span>DNS Only</span>
                    </span>
                  )}
                </div>

                {record.comment && (
                  <p className="text-[11px] text-slate-500 italic">
                    {record.comment}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
