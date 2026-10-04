import React, { useState } from 'react';
import { Sparkles, X, Check, Mail, Cloud, Shield, Server, Loader2 } from 'lucide-react';
import { PRESET_TEMPLATES } from '../services/templates';
import { DNSTemplate, DNSRecordType } from '../types/dns';

interface TemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  onApplyTemplate: (records: Array<{
    type: DNSRecordType;
    name: string;
    content: string;
    ttl: number;
    priority?: number;
    proxied: boolean;
    comment?: string;
  }>) => Promise<void>;
}

export const TemplateModal: React.FC<TemplateModalProps> = ({
  isOpen,
  onClose,
  zoneName,
  onApplyTemplate,
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<DNSTemplate>(PRESET_TEMPLATES[0]);
  const [customDomainParam, setCustomDomainParam] = useState(zoneName);
  const [isApplying, setIsApplying] = useState(false);

  if (!isOpen) return null;

  const handleApply = async () => {
    setIsApplying(true);
    try {
      const recordsToCreate = selectedTemplate.records.map((r) => {
        let content = r.content
          .replace(/\{domain\}/g, customDomainParam.trim())
          .replace(/\{project\}/g, customDomainParam.split('.')[0] || 'app');
        return {
          ...r,
          content,
        };
      });
      await onApplyTemplate(recordsToCreate);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsApplying(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'email':
        return <Mail className="h-4 w-4 text-amber-400" />;
      case 'hosting':
        return <Cloud className="h-4 w-4 text-sky-400" />;
      case 'security':
        return <Shield className="h-4 w-4 text-emerald-400" />;
      default:
        return <Server className="h-4 w-4 text-purple-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Preset Template DNS</h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Terapkan kumpulan record konfigurasi otomatis untuk layanan populer
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Template List Selector */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
          {PRESET_TEMPLATES.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => setSelectedTemplate(tpl)}
              className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                selectedTemplate.id === tpl.id
                  ? 'border-amber-500 bg-amber-500/10 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                {getCategoryIcon(tpl.category)}
                <h3 className="text-xs font-bold text-white">{tpl.name}</h3>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">{tpl.description}</p>
              <div className="mt-2.5 flex items-center gap-2 text-[10px] text-slate-500">
                <span>{tpl.records.length} records</span>
                <span aria-hidden="true">&middot;</span>
                <span className="font-mono">{tpl.records.map((r) => r.type).join(', ')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Preview of records that will be created */}
        <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
            <span>Pratinjau Record yang Akan Dibuat ({selectedTemplate.records.length})</span>
            <span className="font-mono text-amber-400 text-[11px]">{zoneName}</span>
          </div>

          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
            {selectedTemplate.records.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-[11px] bg-slate-900/80 px-2.5 py-1.5 rounded border border-slate-800/80 font-mono"
              >
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400 w-12">{r.type}</span>
                  <span className="text-slate-300">{r.name}</span>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span className="truncate max-w-[220px]" title={r.content}>
                    {r.content.replace(/\{domain\}/g, customDomainParam)}
                  </span>
                  {r.priority !== undefined && <span className="text-slate-500">P:{r.priority}</span>}
                  <span className={r.proxied ? 'text-amber-500 font-bold' : 'text-slate-600'}>
                    {r.proxied ? 'Proxied' : 'DNS'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="mt-5 flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={isApplying}
            className="flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-sm"
          >
            {isApplying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menerapkan Record...</span>
              </>
            ) : (
              <>
                <Check className="h-4 w-4" />
                <span>Terapkan ke {zoneName}</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
