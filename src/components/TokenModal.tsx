import React, { useState, useEffect } from 'react';
import { Key, Shield, AlertCircle, CheckCircle2, Loader2, X, Sparkles, Server } from 'lucide-react';
import { AuthAccount } from '../types/dns';
import { DnsService } from '../services/dnsService';

interface TokenModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAccount: AuthAccount | null;
  onLoginSuccess: (account: AuthAccount) => void;
}

export const TokenModal: React.FC<TokenModalProps> = ({
  isOpen,
  onClose,
  currentAccount,
  onLoginSuccess,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [tokenName, setTokenName] = useState('Cloudflare Token');
  const [isVerifying, setIsVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [envAuthInfo, setEnvAuthInfo] = useState<{
    hasEnvToken: boolean;
    preview?: string;
    email?: string;
    message?: string;
  } | null>(null);

  // Check if .env token exists on mount or modal open
  useEffect(() => {
    if (isOpen) {
      DnsService.checkEnvAuth().then((res) => {
        setEnvAuthInfo(res);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleUseEnvToken = () => {
    const envAccount: AuthAccount = {
      type: 'cloudflare',
      token: 'env',
      tokenName: 'Token dari .env',
      userEmail: envAuthInfo?.email || 'Cloudflare (.env)',
      isValid: true,
      lastChecked: new Date().toISOString(),
      isEnvToken: true,
    };
    DnsService.saveAccount(envAccount);
    setSuccessMsg('Menggunakan token Cloudflare dari file .env!');
    setTimeout(() => {
      onLoginSuccess(envAccount);
      onClose();
    }, 400);
  };

  const handleVerifyAndSave = async (tokenToUse: string) => {
    setIsVerifying(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (!tokenToUse.trim()) {
        throw new Error('Masukkan Cloudflare API Token Anda');
      }

      const res = await DnsService.verifyToken(tokenToUse.trim());
      if (res.valid) {
        const newAccount: AuthAccount = {
          type: 'cloudflare',
          token: tokenToUse.trim(),
          tokenName: tokenName.trim() || 'Cloudflare Token',
          userEmail: res.email || 'Cloudflare Account',
          isValid: true,
          lastChecked: new Date().toISOString(),
          isEnvToken: false,
        };
        DnsService.saveAccount(newAccount);
        setSuccessMsg(res.message || 'Token berhasil diverifikasi!');
        setTimeout(() => {
          onLoginSuccess(newAccount);
          onClose();
        }, 500);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Gagal memverifikasi token. Pastikan token memiliki izin DNS.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Key className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {currentAccount ? 'Pengaturan Cloudflare API Token' : 'Login Cloudflare API Token'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Kelola API Token Cloudflare via file .env atau input manual
              </p>
            </div>
          </div>
          {currentAccount && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* 1. AUTO .ENV TOKEN DETECTION CARD */}
        {envAuthInfo?.hasEnvToken ? (
          <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-400 shrink-0" />
                <span className="text-xs font-bold text-emerald-300">
                  Token Environment (.env) Terdeteksi!
                </span>
              </div>
              <span className="text-[10px] font-mono bg-emerald-950/80 border border-emerald-800/60 px-2 py-0.5 rounded text-emerald-300">
                {envAuthInfo.preview}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              Token <code className="bg-slate-950 px-1 py-0.5 rounded text-amber-400">CLOUDFLARE_API_TOKEN</code> ditemukan di file <code className="bg-slate-950 px-1 py-0.5 rounded text-slate-200">.env</code> server. Anda dapat langsung menggunakannya secara otomatis tanpa input berulang.
            </p>
            <button
              type="button"
              onClick={handleUseEnvToken}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-500 py-2 px-3 text-xs font-bold text-slate-950 hover:bg-emerald-400 transition-colors cursor-pointer shadow-sm"
            >
              <Server className="h-4 w-4" />
              <span>Gunakan Token dari .env Otomatis</span>
            </button>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/60 p-3.5 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Tips: Taruh Token di File .env</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Agar tidak perlu memasukkan token berulang kali, tambahkan baris berikut di file <code className="font-mono text-slate-200">.env</code> Anda:
            </p>
            <div className="rounded bg-slate-900 border border-slate-800 px-3 py-1.5 font-mono text-[11px] text-amber-300 select-all">
              CLOUDFLARE_API_TOKEN=&quot;token_cloudflare_anda&quot;
            </div>
          </div>
        )}

        {/* Divider */}
        <div className="relative flex py-3 items-center">
          <div className="flex-grow border-t border-slate-800"></div>
          <span className="flex-shrink mx-3 text-[11px] uppercase tracking-wider text-slate-500">
            {envAuthInfo?.hasEnvToken ? 'atau gunakan token manual' : 'atau masukkan token manual'}
          </span>
          <div className="flex-grow border-t border-slate-800"></div>
        </div>

        {/* Manual Form Body */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleVerifyAndSave(tokenInput);
          }}
          className="space-y-4"
        >
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-lg border border-rose-900/60 bg-rose-950/40 p-3 text-xs text-rose-300">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-900/60 bg-emerald-950/40 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Cloudflare API Token
            </label>
            <input
              type="password"
              placeholder="Contoh: vL7_9bKDq2m... atau token API Anda"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2.5 font-mono text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">
              Nama Label (Opsional)
            </label>
            <input
              type="text"
              placeholder="Cloudflare Production Token"
              value={tokenName}
              onChange={(e) => setTokenName(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            />
          </div>

          {/* Permissions Advice */}
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-400 space-y-1.5">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <Shield className="h-3.5 w-3.5 text-amber-400" />
              <span>Izin Token Cloudflare yang Dibutuhkan:</span>
            </div>
            <p className="text-[11px] leading-relaxed text-slate-400">
              Gunakan template Cloudflare <em>&quot;Edit zone DNS&quot;</em> dengan izin:
            </p>
            <div className="flex flex-wrap gap-2 text-[11px] font-mono text-amber-300/90 pt-0.5">
              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Zone &middot; DNS &middot; Edit</span>
              <span className="bg-slate-900 border border-slate-800 px-2 py-0.5 rounded">Zone &middot; Zone &middot; Read</span>
            </div>
          </div>

          {/* Action Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isVerifying || !tokenInput.trim()}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-500 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-400 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Memverifikasi ke Cloudflare...</span>
                </>
              ) : (
                <>
                  <Key className="h-4 w-4" />
                  <span>Simpan Token Manual</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
