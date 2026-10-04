import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DomainList } from './components/DomainList';
import { RecordsList } from './components/RecordsList';
import { RecordModal } from './components/RecordModal';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { TemplateModal } from './components/TemplateModal';
import { ImportExportModal } from './components/ImportExportModal';
import { WebLogin } from './components/WebLogin';
import { DnsService } from './services/dnsService';
import { AuthService, WebUser } from './services/authService';
import { AuthAccount, DNSRecord, DNSRecordType, DNSZone } from './types/dns';
import { CheckCircle2, AlertCircle, Globe, Loader2 } from 'lucide-react';

export default function App() {
  // Web Authentication Gate state
  const [webUser, setWebUser] = useState<WebUser | null>(null);
  const [isCheckingWebAuth, setIsCheckingWebAuth] = useState(true);

  // Cloudflare Account & DNS state
  const [activeAccount, setActiveAccount] = useState<AuthAccount | null>(null);
  const [currentView, setCurrentView] = useState<'domains' | 'records'>('domains');
  const [zones, setZones] = useState<DNSZone[]>([]);
  const [activeZone, setActiveZone] = useState<DNSZone | null>(null);
  const [records, setRecords] = useState<DNSRecord[]>([]);

  // Loading and error states
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Modals state
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [recordToEdit, setRecordToEdit] = useState<DNSRecord | null>(null);
  const [recordToDelete, setRecordToDelete] = useState<DNSRecord | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // 1. Check Web Authentication on mount
  useEffect(() => {
    const checkWebSession = async () => {
      setIsCheckingWebAuth(true);
      try {
        const res = await AuthService.checkSession();
        if (res.authenticated && res.user) {
          setWebUser(res.user);
          await initCloudflareAuth();
        }
      } catch (err) {
        console.warn('Web session check error:', err);
      } finally {
        setIsCheckingWebAuth(false);
      }
    };

    checkWebSession();
  }, []);

  // Initialize Cloudflare connection automatically from .env
  const initCloudflareAuth = async () => {
    const envAccount: AuthAccount = {
      type: 'cloudflare',
      token: 'env',
      tokenName: 'Token dari .env',
      userEmail: 'Cloudflare (.env)',
      isValid: true,
      lastChecked: new Date().toISOString(),
      isEnvToken: true,
    };
    setActiveAccount(envAccount);
    await loadZones(envAccount);
  };

  // Web Login Success
  const handleWebLoginSuccess = async (user: WebUser) => {
    setWebUser(user);
    showToast(`Selamat datang, ${user.username}!`, 'success');
    await initCloudflareAuth();
  };

  // Web Logout
  const handleWebLogout = async () => {
    await AuthService.logout();
    setWebUser(null);
    setActiveAccount(null);
    setZones([]);
    setActiveZone(null);
    setRecords([]);
    showToast('Berhasil keluar dari dashboard.', 'success');
  };

  // Fetch zones from Cloudflare
  const loadZones = async (account: AuthAccount) => {
    setIsLoading(true);
    try {
      const fetchedZones = await DnsService.getZones(account);
      setZones(fetchedZones);
      if (fetchedZones.length > 0) {
        if (!activeZone || !fetchedZones.some((z) => z.id === activeZone.id)) {
          setActiveZone(fetchedZones[0]);
          loadRecords(account, fetchedZones[0].id);
        } else {
          loadRecords(account, activeZone.id);
        }
      } else {
        setActiveZone(null);
        setRecords([]);
      }
    } catch (err: any) {
      showToast(err.message || 'Gagal memuat domain. Pastikan CLOUDFLARE_API_TOKEN di file .env sudah valid.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch DNS records for a specific zone
  const loadRecords = async (account: AuthAccount, zoneId: string) => {
    setIsLoading(true);
    try {
      const fetchedRecords = await DnsService.getRecords(account, zoneId);
      setRecords(fetchedRecords);
    } catch (err: any) {
      showToast(err.message || 'Gagal mengambil DNS records dari Cloudflare.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  // Select Zone
  const handleSelectZone = (zone: DNSZone) => {
    setActiveZone(zone);
    if (activeAccount) {
      loadRecords(activeAccount, zone.id);
    }
    setCurrentView('records');
  };

  // Create or Update Record
  const handleSaveRecord = async (recordData: {
    type: DNSRecordType;
    name: string;
    content: string;
    ttl: number;
    proxied: boolean;
    priority?: number;
    comment?: string;
    data?: any;
  }) => {
    if (!activeAccount || !activeZone) return;

    if (recordToEdit) {
      // Edit record
      const updated = await DnsService.updateRecord(
        activeAccount,
        activeZone.id,
        activeZone.name,
        recordToEdit.id,
        recordData
      );
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(`Record ${updated.type} (${updated.name}) berhasil diperbarui.`);
    } else {
      // Create record
      const created = await DnsService.createRecord(
        activeAccount,
        activeZone.id,
        activeZone.name,
        {
          type: recordData.type,
          name: recordData.name,
          content: recordData.content,
          ttl: recordData.ttl,
          proxied: recordData.proxied,
          priority: recordData.priority,
          comment: recordData.comment,
          proxiable: ['A', 'AAAA', 'CNAME'].includes(recordData.type),
          data: recordData.data,
        }
      );
      setRecords((prev) => [created, ...prev]);
      showToast(`Record ${created.type} (${created.name}) berhasil ditambahkan ke Cloudflare.`);
    }

    loadZones(activeAccount);
  };

  // Delete Record
  const handleConfirmDelete = async () => {
    if (!activeAccount || !activeZone || !recordToDelete) return;
    setIsDeleting(true);
    try {
      await DnsService.deleteRecord(activeAccount, activeZone.id, recordToDelete.id);
      setRecords((prev) => prev.filter((r) => r.id !== recordToDelete.id));
      showToast(`Record ${recordToDelete.type} (${recordToDelete.name}) berhasil dihapus.`);
      setRecordToDelete(null);
      loadZones(activeAccount);
    } catch (err: any) {
      showToast(err.message || 'Gagal menghapus record Cloudflare.', 'error');
    } finally {
      setIsDeleting(false);
    }
  };

  // Toggle Proxy Cloud
  const handleToggleProxy = async (record: DNSRecord, nextState: boolean) => {
    if (!activeAccount || !activeZone) return;

    // Optimistic UI update
    setRecords((prev) =>
      prev.map((r) =>
        r.id === record.id ? { ...r, proxied: nextState, ttl: nextState ? 1 : r.ttl } : r
      )
    );

    try {
      const updated = await DnsService.toggleProxy(
        activeAccount,
        activeZone.id,
        record,
        nextState
      );
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      showToast(
        nextState
          ? `Proxy Cloudflare (Orange Cloud) aktif untuk ${record.name}.`
          : `DNS Only (Grey Cloud) aktif untuk ${record.name}.`
      );
    } catch (err: any) {
      // Revert optimistic update
      setRecords((prev) =>
        prev.map((r) => (r.id === record.id ? record : r))
      );
      showToast(err.message || 'Gagal mengubah status proxy Cloudflare.', 'error');
    }
  };

  // Apply Batch Template
  const handleApplyTemplate = async (
    templateRecords: Array<{
      type: DNSRecordType;
      name: string;
      content: string;
      ttl: number;
      priority?: number;
      proxied: boolean;
      comment?: string;
    }>
  ) => {
    if (!activeAccount || !activeZone) return;

    let successCount = 0;
    for (const r of templateRecords) {
      try {
        const created = await DnsService.createRecord(
          activeAccount,
          activeZone.id,
          activeZone.name,
          {
            type: r.type,
            name: r.name,
            content: r.content,
            ttl: r.ttl,
            proxied: r.proxied,
            priority: r.priority,
            comment: r.comment,
            proxiable: ['A', 'AAAA', 'CNAME'].includes(r.type),
          }
        );
        setRecords((prev) => [created, ...prev]);
        successCount++;
      } catch (e) {
        console.error('Error applying template record:', e);
      }
    }

    showToast(`Berhasil menerapkan ${successCount} record DNS ke ${activeZone.name}.`);
    loadZones(activeAccount);
  };

  // Import Records
  const handleImportRecords = async (
    imported: Array<Omit<DNSRecord, 'id' | 'zone_id' | 'zone_name'>>
  ) => {
    if (!activeAccount || !activeZone) return;

    let importedCount = 0;
    for (const rec of imported) {
      try {
        const created = await DnsService.createRecord(
          activeAccount,
          activeZone.id,
          activeZone.name,
          rec
        );
        setRecords((prev) => [created, ...prev]);
        importedCount++;
      } catch (err) {
        console.error('Import record error:', err);
      }
    }
    showToast(`Berhasil mengimpor ${importedCount} record DNS ke ${activeZone.name}.`);
    loadZones(activeAccount);
  };

  // If initial web auth check is still running, show splash loader
  if (isCheckingWebAuth) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="h-7 w-7 animate-spin text-amber-500" />
        <span className="text-xs font-medium tracking-wide">Memeriksa status sesi web...</span>
      </div>
    );
  }

  // GATE CHECK: If not logged in to Web, show WebLogin screen!
  if (!webUser) {
    return <WebLogin onLoginSuccess={handleWebLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 rounded-xl border border-slate-700 bg-slate-900/95 px-4 py-3 text-xs shadow-2xl backdrop-blur-md animate-in slide-in-from-bottom-5">
          {toast.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 text-rose-400 shrink-0" />
          )}
          <span className="font-medium text-slate-200">{toast.message}</span>
        </div>
      )}

      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onNavigate={(view) => setCurrentView(view)}
        activeAccount={activeAccount}
        activeZone={activeZone}
        zones={zones}
        onSelectZone={handleSelectZone}
        onOpenTokenModal={() => {}}
        onLogout={() => {}}
        isLoading={isLoading}
        onRefresh={() => {
          if (activeAccount) {
            loadZones(activeAccount);
          }
        }}
        webUser={webUser}
        onWebLogout={handleWebLogout}
      />

      {/* Main Content Area */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* View Routing */}
        {currentView === 'domains' && (
          <DomainList
            zones={zones}
            onSelectZone={handleSelectZone}
          />
        )}

        {currentView === 'records' && (
          <>
            {activeZone ? (
              <RecordsList
                zone={activeZone}
                records={records}
                onBackToDomains={() => setCurrentView('domains')}
                onAddRecord={() => {
                  setRecordToEdit(null);
                  setIsRecordModalOpen(true);
                }}
                onEditRecord={(rec) => {
                  setRecordToEdit(rec);
                  setIsRecordModalOpen(true);
                }}
                onDeleteRecord={(rec) => {
                  setRecordToDelete(rec);
                }}
                onToggleProxy={handleToggleProxy}
                onOpenTemplates={() => setIsTemplateModalOpen(true)}
                onOpenImportExport={() => setIsImportExportModalOpen(true)}
              />
            ) : (
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-12 text-center">
                <Globe className="mx-auto h-10 w-10 text-slate-600 mb-3" />
                <p className="text-xs text-slate-400">Pilih domain terlebih dahulu untuk melihat DNS records.</p>
                <button
                  onClick={() => setCurrentView('domains')}
                  className="mt-3 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-slate-950 cursor-pointer"
                >
                  Kembali ke Daftar Domain
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-400">DNS Manager Pro</span>
            <span aria-hidden="true">&middot;</span>
            <span>Cloudflare API Compliant</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Powered by <span className="font-semibold text-amber-400">Zymzz</span></span>
          </div>
        </div>
      </footer>

      {activeZone && (
        <RecordModal
          isOpen={isRecordModalOpen}
          onClose={() => {
            setIsRecordModalOpen(false);
            setRecordToEdit(null);
          }}
          zoneName={activeZone.name}
          recordToEdit={recordToEdit}
          onSave={handleSaveRecord}
        />
      )}

      <DeleteConfirmModal
        isOpen={Boolean(recordToDelete)}
        onClose={() => setRecordToDelete(null)}
        record={recordToDelete}
        onConfirm={handleConfirmDelete}
        isDeleting={isDeleting}
      />

      {activeZone && (
        <TemplateModal
          isOpen={isTemplateModalOpen}
          onClose={() => setIsTemplateModalOpen(false)}
          zoneName={activeZone.name}
          onApplyTemplate={handleApplyTemplate}
        />
      )}

      {activeZone && (
        <ImportExportModal
          isOpen={isImportExportModalOpen}
          onClose={() => setIsImportExportModalOpen(false)}
          zone={activeZone}
          records={records}
          onImportRecords={handleImportRecords}
        />
      )}
    </div>
  );
}
