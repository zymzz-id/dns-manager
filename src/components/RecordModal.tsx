import React, { useState, useEffect } from 'react';
import { X, Cloud, Shield, Info, AlertCircle, Check, Loader2 } from 'lucide-react';
import { DNSRecord, DNSRecordType } from '../types/dns';

interface RecordModalProps {
  isOpen: boolean;
  onClose: () => void;
  zoneName: string;
  recordToEdit?: DNSRecord | null;
  onSave: (recordData: {
    type: DNSRecordType;
    name: string;
    content: string;
    ttl: number;
    proxied: boolean;
    priority?: number;
    comment?: string;
    data?: any;
  }) => Promise<void>;
}

const RECORD_TYPES: Array<{
  type: DNSRecordType;
  label: string;
  desc: string;
  proxiable: boolean;
}> = [
  { type: 'A', label: 'A', desc: 'Menghubungkan domain ke alamat IPv4', proxiable: true },
  { type: 'AAAA', label: 'AAAA', desc: 'Menghubungkan domain ke alamat IPv6', proxiable: true },
  { type: 'CNAME', label: 'CNAME', desc: 'Mengarahkan alias ke domain lain', proxiable: true },
  { type: 'MX', label: 'MX', desc: 'Menentukan server email dan prioritasnya', proxiable: false },
  { type: 'TXT', label: 'TXT', desc: 'Verifikasi domain, SPF, DKIM, atau teks bebas', proxiable: false },
  { type: 'SRV', label: 'SRV', desc: 'Spesifikasi lokasi layanan tertentu (port/protokol)', proxiable: false },
  { type: 'NS', label: 'NS', desc: 'Menentukan server nama otoritatif subdomain', proxiable: false },
  { type: 'CAA', label: 'CAA', desc: 'Otorisasi penerbitan sertifikat SSL (Certificate Authority)', proxiable: false },
  { type: 'PTR', label: 'PTR', desc: 'Pointer reverse DNS lookup', proxiable: false },
];

const TTL_OPTIONS = [
  { value: 1, label: 'Otomatis (Auto / 1 detik)' },
  { value: 60, label: '1 Menit (60 detik)' },
  { value: 120, label: '2 Menit (120 detik)' },
  { value: 300, label: '5 Menit (300 detik)' },
  { value: 600, label: '10 Menit (600 detik)' },
  { value: 900, label: '15 Menit (900 detik)' },
  { value: 1800, label: '30 Menit (1800 detik)' },
  { value: 3600, label: '1 Jam (3600 detik)' },
  { value: 7200, label: '2 Jam (7200 detik)' },
  { value: 18000, label: '5 Jam' },
  { value: 43200, label: '12 Jam' },
  { value: 86400, label: '1 Hari (86400 detik)' },
];

export const RecordModal: React.FC<RecordModalProps> = ({
  isOpen,
  onClose,
  zoneName,
  recordToEdit,
  onSave,
}) => {
  const [type, setType] = useState<DNSRecordType>('A');
  const [name, setName] = useState('@');
  const [content, setContent] = useState('');
  const [ttl, setTtl] = useState<number>(1);
  const [proxied, setProxied] = useState<boolean>(true);
  const [priority, setPriority] = useState<number>(10);
  const [comment, setComment] = useState('');

  // SRV specific fields
  const [srvService, setSrvService] = useState('_sip');
  const [srvProto, setSrvProto] = useState('_tcp');
  const [srvWeight, setSrvWeight] = useState(10);
  const [srvPort, setSrvPort] = useState(5060);
  const [srvTarget, setSrvTarget] = useState('');

  // CAA specific fields
  const [caaFlag, setCaaFlag] = useState(0);
  const [caaTag, setCaaTag] = useState<'issue' | 'issuewild' | 'iodef'>('issue');
  const [caaValue, setCaaValue] = useState('letsencrypt.org');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (recordToEdit) {
      setType(recordToEdit.type);
      setName(recordToEdit.name);
      setContent(recordToEdit.content);
      setTtl(recordToEdit.ttl);
      setProxied(recordToEdit.proxied);
      setPriority(recordToEdit.priority ?? 10);
      setComment(recordToEdit.comment || '');

      if (recordToEdit.data) {
        if (recordToEdit.type === 'SRV') {
          setSrvService(recordToEdit.data.service || '_sip');
          setSrvProto(recordToEdit.data.proto || '_tcp');
          setSrvWeight(recordToEdit.data.weight ?? 10);
          setSrvPort(recordToEdit.data.port ?? 5060);
          setSrvTarget(recordToEdit.data.target || recordToEdit.content);
        } else if (recordToEdit.type === 'CAA') {
          setCaaFlag(recordToEdit.data.flags ?? 0);
          setCaaTag((recordToEdit.data.tag as any) || 'issue');
          setCaaValue(recordToEdit.data.value || recordToEdit.content);
        }
      }
    } else {
      // Defaults for new record
      setType('A');
      setName('@');
      setContent('');
      setTtl(1);
      setProxied(true);
      setPriority(10);
      setComment('');
      setSrvService('_sip');
      setSrvProto('_tcp');
      setSrvWeight(10);
      setSrvPort(5060);
      setSrvTarget('');
      setCaaFlag(0);
      setCaaTag('issue');
      setCaaValue('letsencrypt.org');
    }
    setErrorMsg(null);
  }, [recordToEdit, isOpen]);

  if (!isOpen) return null;

  const currentTypeInfo = RECORD_TYPES.find((t) => t.type === type) || RECORD_TYPES[0];
  const isProxiable = currentTypeInfo.proxiable;

  // Handle Type Change
  const handleTypeChange = (newType: DNSRecordType) => {
    setType(newType);
    const newTypeInfo = RECORD_TYPES.find((t) => t.type === newType);
    if (!newTypeInfo?.proxiable) {
      setProxied(false);
      if (ttl === 1) setTtl(3600);
    } else {
      setProxied(true);
      setTtl(1);
    }
  };

  const validate = (): string | null => {
    if (!name.trim()) return 'Nama record tidak boleh kosong (gunakan @ untuk root)';
    
    if (type === 'A') {
      const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipv4Regex.test(content.trim())) {
        return 'Alamat IPv4 tidak valid (contoh: 192.0.2.1)';
      }
    } else if (type === 'AAAA') {
      if (!content.includes(':') || content.trim().length < 3) {
        return 'Alamat IPv6 tidak valid (contoh: 2001:db8::1)';
      }
    } else if (type === 'CNAME') {
      if (!content.trim()) return 'Target hostname CNAME tidak boleh kosong';
      if (content.trim() === '@' || content.trim() === zoneName) {
        return 'CNAME ke root (@) dapat menyebabkan loop. Disarankan gunakan A/AAAA record.';
      }
    } else if (type === 'MX') {
      if (!content.trim()) return 'Mail server host tidak boleh kosong';
      if (priority < 0 || priority > 65535) return 'Priority MX harus antara 0 dan 65535';
    } else if (type === 'TXT') {
      if (!content.trim()) return 'Nilai teks TXT tidak boleh kosong';
    } else if (type === 'SRV') {
      if (!srvTarget.trim()) return 'Target host SRV tidak boleh kosong';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const error = validate();
    if (error) {
      setErrorMsg(error);
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      let finalContent = content.trim();
      let recordData: any = undefined;

      if (type === 'SRV') {
        finalContent = `${priority} ${srvWeight} ${srvPort} ${srvTarget.trim()}`;
        recordData = {
          service: srvService.trim(),
          proto: srvProto.trim(),
          name: zoneName,
          priority: Number(priority),
          weight: Number(srvWeight),
          port: Number(srvPort),
          target: srvTarget.trim(),
        };
      } else if (type === 'CAA') {
        finalContent = `${caaFlag} ${caaTag} "${caaValue.trim().replace(/^"|"$/g, '')}"`;
        recordData = {
          flags: Number(caaFlag),
          tag: caaTag,
          value: caaValue.trim().replace(/^"|"$/g, ''),
        };
      }

      await onSave({
        type,
        name: name.trim(),
        content: finalContent,
        ttl: isProxiable && proxied ? 1 : Number(ttl),
        proxied: isProxiable ? proxied : false,
        priority: type === 'MX' || type === 'SRV' ? Number(priority) : undefined,
        comment: comment.trim() || undefined,
        data: recordData,
      });

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal menyimpan DNS record');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white">
              {recordToEdit ? 'Edit DNS Record' : 'Tambah DNS Record Baru'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Domain zona: <span className="font-mono text-amber-400">{zoneName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Record Type Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Tipe Record
            </label>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5">
              {RECORD_TYPES.map((t) => (
                <button
                  key={t.type}
                  type="button"
                  onClick={() => handleTypeChange(t.type)}
                  className={`flex items-center justify-center rounded-lg border py-2 px-2 text-xs font-bold transition-all ${
                    type === t.type
                      ? 'border-amber-500 bg-amber-500/15 text-amber-400 shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              {currentTypeInfo.desc}
            </p>
          </div>

          {/* Name & Content Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Nama Record
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="@"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  required
                />
              </div>
              <span className="text-[10px] text-slate-500 mt-1 block">
                @ = root domain ({zoneName})
              </span>
            </div>

            {/* Content Field (Dynamic according to type) */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                {type === 'A'
                  ? 'Alamat IPv4'
                  : type === 'AAAA'
                  ? 'Alamat IPv6'
                  : type === 'CNAME'
                  ? 'Target Domain Hostname'
                  : type === 'MX'
                  ? 'Mail Server (FQDN)'
                  : type === 'TXT'
                  ? 'Nilai Teks / SPF / DKIM'
                  : type === 'NS'
                  ? 'Nameserver Hostname'
                  : type === 'PTR'
                  ? 'Domain Name'
                  : 'Nilai Konten'}
              </label>
              {type === 'TXT' ? (
                <textarea
                  rows={3}
                  placeholder='v=spf1 include:_spf.google.com ~all'
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  required
                />
              ) : (
                <input
                  type="text"
                  placeholder={
                    type === 'A'
                      ? '192.0.2.1'
                      : type === 'AAAA'
                      ? '2606:4700:4700::1111'
                      : type === 'CNAME'
                      ? 'cname.provider.com'
                      : type === 'MX'
                      ? 'aspmx.l.google.com'
                      : 'Nilai record'
                  }
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
                  required={type !== 'SRV' && type !== 'CAA'}
                />
              )}
            </div>
          </div>

          {/* Priority for MX */}
          {type === 'MX' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Priority MX (Semakin kecil semakin tinggi prioritasnya)
              </label>
              <input
                type="number"
                min="0"
                max="65535"
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value))}
                className="w-full sm:w-1/2 rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
              />
            </div>
          )}

          {/* SRV Specific Fields */}
          {type === 'SRV' && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-3">
              <span className="text-xs font-bold text-slate-200">Konfigurasi Service Record (SRV)</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Service</label>
                  <input
                    type="text"
                    value={srvService}
                    onChange={(e) => setSrvService(e.target.value)}
                    placeholder="_sip"
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Protokol</label>
                  <select
                    value={srvProto}
                    onChange={(e) => setSrvProto(e.target.value)}
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  >
                    <option value="_tcp">_tcp</option>
                    <option value="_udp">_udp</option>
                    <option value="_tls">_tls</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Priority</label>
                  <input
                    type="number"
                    value={priority}
                    onChange={(e) => setPriority(Number(e.target.value))}
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Weight</label>
                  <input
                    type="number"
                    value={srvWeight}
                    onChange={(e) => setSrvWeight(Number(e.target.value))}
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Port</label>
                  <input
                    type="number"
                    value={srvPort}
                    onChange={(e) => setSrvPort(Number(e.target.value))}
                    placeholder="5060"
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Target Host</label>
                  <input
                    type="text"
                    value={srvTarget}
                    onChange={(e) => setSrvTarget(e.target.value)}
                    placeholder="sipserver.example.com"
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* CAA Specific Fields */}
          {type === 'CAA' && (
            <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3.5 space-y-3">
              <span className="text-xs font-bold text-slate-200">Konfigurasi Certificate Authority (CAA)</span>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Flags</label>
                  <input
                    type="number"
                    value={caaFlag}
                    onChange={(e) => setCaaFlag(Number(e.target.value))}
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Tag</label>
                  <select
                    value={caaTag}
                    onChange={(e) => setCaaTag(e.target.value as any)}
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  >
                    <option value="issue">issue (sertifikat standar)</option>
                    <option value="issuewild">issuewild (wildcard *)</option>
                    <option value="iodef">iodef (laporan pelanggaran)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">CA Authority Value</label>
                  <input
                    type="text"
                    value={caaValue}
                    onChange={(e) => setCaaValue(e.target.value)}
                    placeholder="letsencrypt.org"
                    className="w-full rounded border border-slate-700 bg-slate-900 p-1.5 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TTL and Proxy Status Configuration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Time to Live (TTL)
              </label>
              <select
                value={ttl}
                onChange={(e) => setTtl(Number(e.target.value))}
                disabled={isProxiable && proxied}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none disabled:opacity-60"
              >
                {TTL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              {isProxiable && proxied && (
                <span className="text-[10px] text-amber-400/90 mt-1 block">
                  Terkunci ke Otomatis (Auto) saat Proxy aktif
                </span>
              )}
            </div>

            {/* Cloudflare Proxy Toggle (Orange Cloud) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Proxy Status Cloudflare
              </label>
              {isProxiable ? (
                <div
                  onClick={() => setProxied(!proxied)}
                  className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                    proxied
                      ? 'border-amber-500/50 bg-amber-500/10'
                      : 'border-slate-800 bg-slate-950 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Cloud
                      className={`h-5 w-5 ${
                        proxied ? 'text-amber-500 fill-amber-500 animate-pulse' : 'text-slate-500'
                      }`}
                    />
                    <div>
                      <span className={`text-xs font-bold block ${proxied ? 'text-amber-400' : 'text-slate-400'}`}>
                        {proxied ? 'Proxied (Orange Cloud)' : 'DNS Only (Grey Cloud)'}
                      </span>
                      <span className="text-[10px] text-slate-500">
                        {proxied ? 'CDN, SSL & DDoS Protection Aktif' : 'Resolusi langsung ke IP Asal'}
                      </span>
                    </div>
                  </div>
                  {/* Switch Pill */}
                  <div
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                      proxied ? 'bg-amber-500' : 'bg-slate-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-slate-950 shadow-md ring-0 transition duration-200 ease-in-out ${
                        proxied ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-2.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-500 text-xs flex items-center gap-2">
                  <Cloud className="h-4 w-4 text-slate-600" />
                  <span className="text-[11px]">
                    DNS Only (tipe {type} tidak didukung Cloudflare CDN proxy)
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Comment / Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Catatan / Komentar (Opsional)
            </label>
            <input
              type="text"
              placeholder="Contoh: Server staging frontend production"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Resulting FQDN Preview */}
          <div className="rounded-lg border border-slate-800 bg-slate-950 p-2.5 text-[11px] font-mono text-slate-400">
            <span className="text-slate-500">Pratinjau Hostname: </span>
            <span className="text-amber-400">
              {name === '@' ? zoneName : `${name}.${zoneName}`}
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-2 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Menyimpan...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{recordToEdit ? 'Simpan Perubahan' : 'Tambah Record'}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
