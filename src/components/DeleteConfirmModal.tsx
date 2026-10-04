import React from 'react';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';
import { DNSRecord } from '../types/dns';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: DNSRecord | null;
  onConfirm: () => Promise<void>;
  isDeleting: boolean;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  onClose,
  record,
  onConfirm,
  isDeleting,
}) => {
  if (!isOpen || !record) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-md rounded-2xl border border-rose-900/40 bg-slate-900 p-6 shadow-2xl">
        <div className="flex items-start justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Hapus DNS Record?</h3>
              <p className="text-xs text-slate-400 mt-0.5">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Record Details to delete */}
        <div className="my-4 rounded-xl border border-slate-800 bg-slate-950/80 p-4 space-y-2 text-xs">
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Tipe Record:</span>
            <span className="font-bold text-amber-400 px-2 py-0.5 bg-slate-900 rounded border border-slate-800">
              {record.type}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Nama Hostname:</span>
            <span className="font-mono text-slate-200">{record.name}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-400">Nilai / Konten:</span>
            <span className="font-mono text-slate-300 truncate max-w-[200px]" title={record.content}>
              {record.content}
            </span>
          </div>
          {record.proxied && (
            <div className="flex justify-between items-center text-amber-500 pt-1">
              <span>Status Proxy:</span>
              <span>Aktif (Cloudflare CDN)</span>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Menghapus record ini dapat menyebabkan layanan atau subdomain yang mengarah ke alamat ini tidak dapat diakses lagi.
        </p>

        {/* Actions */}
        <div className="mt-5 flex justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            disabled={isDeleting}
            className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50 transition-colors shadow-sm shadow-rose-950"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Menghapus...</span>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                <span>Ya, Hapus Record</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
