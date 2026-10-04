import React, { useState } from 'react';
import { Download, Upload, Copy, Check, X, FileText, AlertCircle, Loader2 } from 'lucide-react';
import { DNSRecord, DNSZone, DNSRecordType } from '../types/dns';
import { DnsService } from '../services/dnsService';

interface ImportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  zone: DNSZone;
  records: DNSRecord[];
  onImportRecords: (newRecords: Array<Omit<DNSRecord, 'id' | 'zone_id' | 'zone_name'>>) => Promise<void>;
}

export const ImportExportModal: React.FC<ImportExportModalProps> = ({
  isOpen,
  onClose,
  zone,
  records,
  onImportRecords,
}) => {
  const [tab, setTab] = useState<'export' | 'import'>('export');
  const [format, setFormat] = useState<'bind' | 'json'>('bind');
  const [importContent, setImportContent] = useState('');
  const [copied, setCopied] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  if (!isOpen) return null;

  const exportText =
    format === 'bind'
      ? DnsService.exportBindZone(zone, records)
      : JSON.stringify(records, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(exportText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const filename = `${zone.name}.${format === 'bind' ? 'zone' : 'json'}`;
    const blob = new Blob([exportText], {
      type: format === 'bind' ? 'text/plain' : 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!importContent.trim()) return;

    setIsImporting(true);
    setImportError(null);

    try {
      let parsedRecords: Array<Omit<DNSRecord, 'id' | 'zone_id' | 'zone_name'>> = [];

      // Try JSON parsing first
      try {
        const json = JSON.parse(importContent);
        if (Array.isArray(json)) {
          parsedRecords = json.map((item) => ({
            type: item.type || 'A',
            name: item.name || '@',
            content: item.content || '',
            ttl: item.ttl || 1,
            proxied: Boolean(item.proxied),
            priority: item.priority,
            proxiable: ['A', 'AAAA', 'CNAME'].includes(item.type),
            comment: item.comment || 'Imported via JSON',
          }));
        }
      } catch {
        // If not JSON, parse simple BIND lines
        const lines = importContent.split('\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith(';') || trimmed.startsWith('$')) continue;

          // regex match for standard resource record: name [ttl] [class] type data
          const tokens = trimmed.split(/\s+/);
          if (tokens.length >= 4) {
            const name = tokens[0];
            let typeIdx = 1;
            // skip ttl and class if present
            if (!isNaN(Number(tokens[1]))) typeIdx++;
            if (tokens[typeIdx]?.toUpperCase() === 'IN') typeIdx++;
            const type = tokens[typeIdx]?.toUpperCase() as DNSRecordType;

            if (type && ['A', 'AAAA', 'CNAME', 'MX', 'TXT', 'SRV', 'NS', 'CAA'].includes(type)) {
              let content = tokens.slice(typeIdx + 1).join(' ').replace(/^"|"$/g, '');
              let priority: number | undefined = undefined;
              if (type === 'MX' && tokens[typeIdx + 1] && !isNaN(Number(tokens[typeIdx + 1]))) {
                priority = Number(tokens[typeIdx + 1]);
                content = tokens.slice(typeIdx + 2).join(' ');
              }

              parsedRecords.push({
                type,
                name: name === zone.name ? '@' : name,
                content,
                ttl: 3600,
                proxied: false,
                priority,
                proxiable: ['A', 'AAAA', 'CNAME'].includes(type),
                comment: 'Imported from BIND zone',
              });
            }
          }
        }
      }

      if (parsedRecords.length === 0) {
        throw new Error('Tidak ada record DNS valid yang berhasil diekstrak.');
      }

      await onImportRecords(parsedRecords);
      onClose();
    } catch (err: any) {
      setImportError(err.message || 'Format data import tidak valid.');
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">Ekspor &amp; Impor DNS Records</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Zona: <span className="font-mono text-amber-400">{zone.name}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab Selection */}
        <div className="mt-4 flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setTab('export')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'export'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Download className="h-3.5 w-3.5" />
              <span>Ekspor ({records.length} Records)</span>
            </button>
            <button
              onClick={() => setTab('import')}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                tab === 'import'
                  ? 'bg-amber-500 text-slate-950'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              <span>Impor Records</span>
            </button>
          </div>

          {tab === 'export' && (
            <div className="flex items-center gap-1 text-xs">
              <button
                onClick={() => setFormat('bind')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                  format === 'bind' ? 'bg-slate-800 text-amber-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                BIND Zone
              </button>
              <button
                onClick={() => setFormat('json')}
                className={`px-2.5 py-1 rounded text-xs font-mono font-medium ${
                  format === 'json' ? 'bg-slate-800 text-amber-400' : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                JSON
              </button>
            </div>
          )}
        </div>

        {/* Tab Content */}
        {tab === 'export' ? (
          <div className="mt-4 space-y-4">
            <div className="relative">
              <textarea
                readOnly
                rows={12}
                value={exportText}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-[11px] text-slate-300 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-2.5">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-colors"
              >
                {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                <span>{copied ? 'Tersalin!' : 'Salin ke Clipboard'}</span>
              </button>
              <button
                onClick={handleDownload}
                className="flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 transition-colors shadow-sm"
              >
                <Download className="h-4 w-4" />
                <span>Unduh File {format === 'bind' ? '.zone' : '.json'}</span>
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleImportSubmit} className="mt-4 space-y-4">
            {importError && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Tempel format BIND Zone File atau JSON Array Records:
              </label>
              <textarea
                rows={10}
                placeholder="; Format BIND Zone atau JSON:&#10;@ 300 IN A 192.0.2.1&#10;www 300 IN CNAME example.com"
                value={importContent}
                onChange={(e) => setImportContent(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 p-4 font-mono text-[11px] text-slate-200 focus:border-amber-500 focus:outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isImporting || !importContent.trim()}
                className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors"
              >
                {isImporting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Mengimpor...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    <span>Mulai Impor Records</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
