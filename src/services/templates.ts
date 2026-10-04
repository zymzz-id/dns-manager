import { DNSTemplate } from '../types/dns';

export const PRESET_TEMPLATES: DNSTemplate[] = [
  {
    id: 'tpl-google-workspace',
    name: 'Google Workspace (Gmail)',
    category: 'email',
    description: 'Set MX records lengkap (ASPMX, ALT1-ALT4) & TXT SPF untuk layanan email Google.',
    records: [
      { type: 'MX', name: '@', content: 'aspmx.l.google.com', priority: 1, ttl: 3600, proxied: false, comment: 'Google Workspace Primary' },
      { type: 'MX', name: '@', content: 'alt1.aspmx.l.google.com', priority: 5, ttl: 3600, proxied: false, comment: 'Google Workspace Backup 1' },
      { type: 'MX', name: '@', content: 'alt2.aspmx.l.google.com', priority: 5, ttl: 3600, proxied: false, comment: 'Google Workspace Backup 2' },
      { type: 'MX', name: '@', content: 'alt3.aspmx.l.google.com', priority: 10, ttl: 3600, proxied: false, comment: 'Google Workspace Backup 3' },
      { type: 'MX', name: '@', content: 'alt4.aspmx.l.google.com', priority: 10, ttl: 3600, proxied: false, comment: 'Google Workspace Backup 4' },
      { type: 'TXT', name: '@', content: 'v=spf1 include:_spf.google.com ~all', ttl: 3600, proxied: false, comment: 'Google SPF Record' },
    ],
  },
  {
    id: 'tpl-microsoft-365',
    name: 'Microsoft 365 / Outlook',
    category: 'email',
    description: 'Konfigurasi MX Outlook Protection, autodiscover CNAME, dan SPF Microsoft.',
    records: [
      { type: 'MX', name: '@', content: '{domain}.mail.protection.outlook.com', priority: 0, ttl: 3600, proxied: false, comment: 'M365 Mail Protection' },
      { type: 'CNAME', name: 'autodiscover', content: 'autodiscover.outlook.com', ttl: 3600, proxied: false, comment: 'Exchange Autodiscover' },
      { type: 'TXT', name: '@', content: 'v=spf1 include:spf.protection.outlook.com -all', ttl: 3600, proxied: false, comment: 'M365 SPF record' },
    ],
  },
  {
    id: 'tpl-vercel-hosting',
    name: 'Vercel Hosting',
    category: 'hosting',
    description: 'A record (76.76.21.21) untuk root domain dan CNAME (cname.vercel-dns.com) untuk subdomain.',
    records: [
      { type: 'A', name: '@', content: '76.76.21.21', ttl: 1, proxied: false, comment: 'Vercel Anycast IP' },
      { type: 'CNAME', name: 'www', content: 'cname.vercel-dns.com', ttl: 1, proxied: false, comment: 'Vercel CNAME' },
    ],
  },
  {
    id: 'tpl-cloudflare-pages',
    name: 'Cloudflare Pages',
    category: 'hosting',
    description: 'Menghubungkan custom domain ke project Cloudflare Pages dengan Orange Cloud aktif.',
    records: [
      { type: 'CNAME', name: 'app', content: '{project}.pages.dev', ttl: 1, proxied: true, comment: 'Cloudflare Pages Frontend' },
    ],
  },
  {
    id: 'tpl-email-security',
    name: 'DMARC & CAA Security Suite',
    category: 'security',
    description: 'DMARC enforcement policy TXT dan CAA record untuk mengamankan penerbitan sertifikat SSL.',
    records: [
      { type: 'TXT', name: '_dmarc', content: 'v=DMARC1; p=quarantine; pct=100; rua=mailto:postmaster@{domain}', ttl: 3600, proxied: false, comment: 'DMARC Policy' },
      { type: 'CAA', name: '@', content: '0 issue "letsencrypt.org"', ttl: 86400, proxied: false, comment: 'Allow LetsEncrypt SSL' },
      { type: 'CAA', name: '@', content: '0 issue "digicert.com"', ttl: 86400, proxied: false, comment: 'Allow DigiCert SSL' },
    ],
  },
];
