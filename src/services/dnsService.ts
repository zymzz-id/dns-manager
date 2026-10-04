import { AuthAccount, DNSRecord, DNSZone, DoHResponse } from '../types/dns';
import { AuthService } from './authService';

const STORAGE_KEY_ACCOUNT = 'dns_manager_active_account_v1';

export class DnsService {
  // Account storage in browser localStorage
  static getSavedAccount(): AuthAccount | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_ACCOUNT);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed && parsed.token) {
          return {
            type: 'cloudflare',
            token: parsed.token,
            tokenName: parsed.tokenName || 'Cloudflare Token',
            userEmail: parsed.userEmail || 'Cloudflare Account',
            isValid: Boolean(parsed.isValid),
            lastChecked: parsed.lastChecked || new Date().toISOString(),
            isEnvToken: Boolean(parsed.isEnvToken),
          };
        }
      }
    } catch (e) {
      console.warn('Error reading saved account', e);
    }
    return null;
  }

  static saveAccount(account: AuthAccount) {
    localStorage.setItem(STORAGE_KEY_ACCOUNT, JSON.stringify(account));
  }

  static clearAccount() {
    localStorage.removeItem(STORAGE_KEY_ACCOUNT);
  }

  // Check if CLOUDFLARE_API_TOKEN is configured in server .env
  static async checkEnvAuth(): Promise<{
    hasEnvToken: boolean;
    isValid?: boolean;
    preview?: string;
    email?: string;
    message?: string;
  }> {
    try {
      const session = AuthService.getSessionToken();
      const res = await fetch('/api/cf/auth-status', {
        headers: session ? { 'x-web-session': session } : {},
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Could not check server env token', e);
    }
    return { hasEnvToken: false };
  }

  // Helper to build headers with web session and cf token
  private static getHeaders(account: AuthAccount): Record<string, string> {
    const session = AuthService.getSessionToken();
    const headers: Record<string, string> = {
      'x-cf-token': account.isEnvToken ? 'env' : account.token,
    };
    if (session) {
      headers['x-web-session'] = session;
    }
    return headers;
  }

  // Verify Cloudflare Token against Cloudflare API
  static async verifyToken(token: string): Promise<{ valid: boolean; email?: string; message?: string }> {
    const trimmed = token.trim();
    if (!trimmed) {
      throw new Error('Token tidak boleh kosong.');
    }

    try {
      // First, try /user/tokens/verify
      const res = await fetch('/api/cf/user/tokens/verify', {
        method: 'GET',
        headers: {
          'x-cf-token': trimmed,
        },
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          return {
            valid: true,
            email: json.result?.id ? `Token ID: ${json.result.id.slice(0, 8)}...` : 'Token Terverifikasi',
            message: 'Token Cloudflare valid dan aktif!',
          };
        }
      }

      // If token does not have User.Tokens permission, check /zones directly
      const zoneTest = await fetch('/api/cf/zones?per_page=1', {
        headers: {
          'x-cf-token': trimmed,
        },
      });

      if (zoneTest.ok) {
        const zoneJson = await zoneTest.json();
        if (zoneJson.success) {
          const total = zoneJson.result_info?.total_count ?? 0;
          return {
            valid: true,
            email: 'Cloudflare User',
            message: `Akses berhasil! Ditemukan ${total} domain pada akun.`,
          };
        }
      }

      const errData = await zoneTest.json().catch(() => null);
      const errMsg = errData?.errors?.[0]?.message || 'Token tidak valid atau tidak memiliki izin Zone:Read.';
      throw new Error(errMsg);
    } catch (err: any) {
      throw new Error(err.message || 'Gagal menghubungi Cloudflare API. Periksa koneksi internet Anda.');
    }
  }

  // Fetch zones list from Cloudflare
  static async getZones(account: AuthAccount): Promise<DNSZone[]> {
    const res = await fetch('/api/cf/zones?per_page=50', {
      headers: this.getHeaders(account),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.errors?.[0]?.message || `Gagal mengambil daftar zona (HTTP ${res.status})`);
    }

    const json = await res.json();
    return (json.result || []).map((z: any) => ({
      id: z.id,
      name: z.name,
      status: z.status || 'active',
      paused: Boolean(z.paused),
      type: z.type || 'full',
      name_servers: z.name_servers || [],
      plan: {
        id: z.plan?.id || 'free',
        name: z.plan?.name || 'Free Plan',
        is_free: z.plan?.is_free ?? true,
      },
      created_on: z.created_on || new Date().toISOString(),
      activated_on: z.activated_on,
      account: z.account ? { id: z.account.id, name: z.account.name } : undefined,
    }));
  }

  // Fetch DNS records for a specific zone
  static async getRecords(account: AuthAccount, zoneId: string): Promise<DNSRecord[]> {
    const res = await fetch(`/api/cf/zones/${zoneId}/dns_records?per_page=100`, {
      headers: this.getHeaders(account),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.errors?.[0]?.message || `Gagal mengambil DNS records (HTTP ${res.status})`);
    }

    const json = await res.json();
    return (json.result || []).map((r: any) => ({
      id: r.id,
      zone_id: r.zone_id || zoneId,
      zone_name: r.zone_name,
      name: r.name,
      type: r.type,
      content: r.content,
      proxiable: Boolean(r.proxiable),
      proxied: Boolean(r.proxied),
      ttl: r.ttl,
      priority: r.priority,
      comment: r.comment,
      tags: r.tags || [],
      created_on: r.created_on,
      modified_on: r.modified_on,
      data: r.data,
    }));
  }

  // Create record on Cloudflare
  static async createRecord(
    account: AuthAccount,
    zoneId: string,
    zoneName: string,
    record: Omit<DNSRecord, 'id' | 'zone_id' | 'zone_name'>
  ): Promise<DNSRecord> {
    const isProxiable = ['A', 'AAAA', 'CNAME'].includes(record.type);
    const effectiveProxied = isProxiable ? record.proxied : false;

    const payload: any = {
      type: record.type,
      name: record.name === '@' ? zoneName : record.name,
      content: record.content,
      ttl: Number(record.ttl),
      proxied: effectiveProxied,
      comment: record.comment || undefined,
    };

    if (record.priority !== undefined && (record.type === 'MX' || record.type === 'SRV')) {
      payload.priority = Number(record.priority);
    }
    if (record.data) {
      payload.data = record.data;
    }

    const res = await fetch(`/api/cf/zones/${zoneId}/dns_records`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(account),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.errors?.[0]?.message || 'Gagal menambahkan record baru ke Cloudflare.');
    }

    const r = json.result;
    return {
      id: r.id,
      zone_id: r.zone_id,
      zone_name: r.zone_name,
      name: r.name,
      type: r.type,
      content: r.content,
      proxiable: Boolean(r.proxiable),
      proxied: Boolean(r.proxied),
      ttl: r.ttl,
      priority: r.priority,
      comment: r.comment,
      tags: r.tags || [],
      created_on: r.created_on,
      modified_on: r.modified_on,
      data: r.data,
    };
  }

  // Update existing record
  static async updateRecord(
    account: AuthAccount,
    zoneId: string,
    zoneName: string,
    recordId: string,
    record: Partial<DNSRecord>
  ): Promise<DNSRecord> {
    const isProxiable = record.type ? ['A', 'AAAA', 'CNAME'].includes(record.type) : true;
    const effectiveProxied = isProxiable ? Boolean(record.proxied) : false;

    const payload: any = {
      type: record.type,
      name: record.name === '@' ? zoneName : record.name,
      content: record.content,
      ttl: record.ttl ? Number(record.ttl) : 1,
      proxied: effectiveProxied,
      comment: record.comment || undefined,
    };

    if (record.priority !== undefined && (record.type === 'MX' || record.type === 'SRV')) {
      payload.priority = Number(record.priority);
    }
    if (record.data) {
      payload.data = record.data;
    }

    const res = await fetch(`/api/cf/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'PUT',
      headers: {
        ...this.getHeaders(account),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.errors?.[0]?.message || 'Gagal memperbarui record pada Cloudflare.');
    }

    const r = json.result;
    return {
      id: r.id,
      zone_id: r.zone_id,
      zone_name: r.zone_name,
      name: r.name,
      type: r.type,
      content: r.content,
      proxiable: Boolean(r.proxiable),
      proxied: Boolean(r.proxied),
      ttl: r.ttl,
      priority: r.priority,
      comment: r.comment,
      tags: r.tags || [],
      created_on: r.created_on,
      modified_on: r.modified_on,
      data: r.data,
    };
  }

  // Toggle Cloudflare Proxy (orange cloud / grey cloud)
  static async toggleProxy(
    account: AuthAccount,
    zoneId: string,
    record: DNSRecord,
    newProxiedState: boolean
  ): Promise<DNSRecord> {
    if (!record.proxiable) {
      throw new Error(`Record tipe ${record.type} tidak mendukung proxy Cloudflare.`);
    }

    const res = await fetch(`/api/cf/zones/${zoneId}/dns_records/${record.id}`, {
      method: 'PATCH',
      headers: {
        ...this.getHeaders(account),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        proxied: newProxiedState,
        ttl: newProxiedState ? 1 : record.ttl,
      }),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.errors?.[0]?.message || 'Gagal mengubah status proxy Cloudflare.');
    }

    const r = json.result;
    return {
      ...record,
      proxied: r.proxied,
      ttl: r.ttl,
      modified_on: r.modified_on,
    };
  }

  // Delete Record
  static async deleteRecord(account: AuthAccount, zoneId: string, recordId: string): Promise<boolean> {
    const res = await fetch(`/api/cf/zones/${zoneId}/dns_records/${recordId}`, {
      method: 'DELETE',
      headers: this.getHeaders(account),
    });

    const json = await res.json();
    if (!res.ok || !json.success) {
      throw new Error(json.errors?.[0]?.message || 'Gagal menghapus record dari Cloudflare.');
    }
    return true;
  }

  // DoH Query (Real live propagation test)
  static async queryDoH(domain: string, type: string = 'A', provider: 'cloudflare' | 'google' = 'cloudflare'): Promise<DoHResponse> {
    try {
      const res = await fetch(`/api/dns/query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}&provider=${provider}`);
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = await res.json();
      if (!data.success && data.error) {
        throw new Error(data.error);
      }
      return data.result;
    } catch {
      // Fallback directly to Cloudflare DoH with CORS
      const directUrl = provider === 'google'
        ? `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`
        : `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;

      const directRes = await fetch(directUrl, {
        headers: { 'Accept': 'application/dns-json' },
      });
      return await directRes.json();
    }
  }

  // Export records as standard BIND Zone File
  static exportBindZone(zone: DNSZone, records: DNSRecord[]): string {
    const timestamp = new Date().toISOString();
    let file = `; Zone file for ${zone.name}\n`;
    file += `; Exported by DNS Manager Pro at ${timestamp}\n`;
    file += `$ORIGIN ${zone.name}.\n`;
    file += `$TTL 3600\n\n`;

    for (const rec of records) {
      const name = rec.name === '@' ? '@' : rec.name;
      const ttl = rec.ttl === 1 ? '300' : String(rec.ttl);
      const type = rec.type.padEnd(6, ' ');

      if (rec.type === 'MX') {
        file += `${name.padEnd(20, ' ')} ${ttl.padEnd(6, ' ')} IN ${type} ${rec.priority ?? 10} ${rec.content}\n`;
      } else if (rec.type === 'TXT') {
        const quoted = rec.content.startsWith('"') ? rec.content : `"${rec.content}"`;
        file += `${name.padEnd(20, ' ')} ${ttl.padEnd(6, ' ')} IN ${type} ${quoted}\n`;
      } else if (rec.type === 'SRV') {
        file += `${name.padEnd(20, ' ')} ${ttl.padEnd(6, ' ')} IN ${type} ${rec.priority ?? 0} ${rec.data?.weight ?? 0} ${rec.data?.port ?? 0} ${rec.data?.target || rec.content}\n`;
      } else {
        file += `${name.padEnd(20, ' ')} ${ttl.padEnd(6, ' ')} IN ${type} ${rec.content}\n`;
      }
    }

    return file;
  }
}
