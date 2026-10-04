export type DNSRecordType = 'A' | 'AAAA' | 'CNAME' | 'MX' | 'TXT' | 'SRV' | 'NS' | 'CAA' | 'PTR';

export interface DNSRecord {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: DNSRecordType;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number; // 1 = Auto, or seconds (60, 300, 3600, etc.)
  priority?: number;
  comment?: string;
  tags?: string[];
  created_on?: string;
  modified_on?: string;
  data?: {
    service?: string;
    proto?: string;
    name?: string;
    priority?: number;
    weight?: number;
    port?: number;
    target?: string;
    flags?: number;
    tag?: string;
    value?: string;
  };
}

export interface DNSZone {
  id: string;
  name: string;
  status: 'active' | 'pending' | 'initializing' | 'moved';
  paused: boolean;
  type: string;
  name_servers: string[];
  plan: {
    id?: string;
    name: string;
    price?: number;
    currency?: string;
    is_free: boolean;
  };
  created_on: string;
  activated_on?: string;
  records_count?: number;
  account?: {
    id: string;
    name: string;
  };
}

export interface AuthAccount {
  type: 'cloudflare';
  token: string;
  tokenName: string;
  userEmail?: string;
  accountId?: string;
  isValid: boolean;
  lastChecked: string;
  isEnvToken?: boolean;
}

export interface DNSTemplate {
  id: string;
  name: string;
  category: 'email' | 'hosting' | 'security' | 'developer';
  description: string;
  records: Array<{
    type: DNSRecordType;
    name: string; // e.g. "@", "mail", "_dmarc"
    content: string;
    ttl: number;
    priority?: number;
    proxied: boolean;
    comment?: string;
  }>;
}

export interface DoHResponse {
  Status: number;
  TC: boolean;
  RD: boolean;
  RA: boolean;
  AD: boolean;
  CD: boolean;
  Question: Array<{
    name: string;
    type: number;
  }>;
  Answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
  Authority?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
  Comment?: string;
}
