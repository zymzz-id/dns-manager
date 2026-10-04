import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Web Login Credentials from .env with specified defaults
const AUTH_USERNAME = process.env.AUTH_USERNAME || 'ZamGanteng';
const AUTH_PASSWORD = process.env.AUTH_PASSWORD || 'ZamGanteng9';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');

// In-memory active session store (token -> { username, createdAt })
const activeSessions = new Map<string, { username: string; createdAt: number }>();

// Helper to create secure token
function createSessionToken(username: string): string {
  const timestamp = Date.now();
  const random = crypto.randomBytes(16).toString('hex');
  const payload = `${username}:${timestamp}:${random}`;
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  const token = Buffer.from(`${payload}:${signature}`).toString('base64');
  activeSessions.set(token, { username, createdAt: timestamp });
  return token;
}

// Helper to verify session token
function verifySessionToken(token?: string): { valid: boolean; username?: string } {
  if (!token) return { valid: false };

  // Check active sessions map first
  const session = activeSessions.get(token);
  if (session) {
    // 7 days expiration
    if (Date.now() - session.createdAt < 7 * 24 * 60 * 60 * 1000) {
      return { valid: true, username: session.username };
    }
    activeSessions.delete(token);
    return { valid: false };
  }

  // Fallback signature verification
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const parts = decoded.split(':');
    if (parts.length === 4) {
      const [username, timestampStr, random, signature] = parts;
      const payload = `${username}:${timestampStr}:${random}`;
      const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
      if (crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        const timestamp = parseInt(timestampStr, 10);
        if (Date.now() - timestamp < 7 * 24 * 60 * 60 * 1000) {
          activeSessions.set(token, { username, createdAt: timestamp });
          return { valid: true, username };
        }
      }
    }
  } catch {
    return { valid: false };
  }

  return { valid: false };
}

// Middleware to extract web session token
function getWebSessionToken(req: Request): string | undefined {
  return (
    (req.headers['x-web-session'] as string) ||
    req.headers.authorization?.replace(/^Bearer\s+/i, '')
  );
}

// Web Authentication Routes
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({
      success: false,
      message: 'Username dan password wajib diisi.',
    });
  }

  // Validate credentials against environment variables (.env)
  if (username.trim() === AUTH_USERNAME && password.trim() === AUTH_PASSWORD) {
    const token = createSessionToken(username.trim());
    return res.json({
      success: true,
      message: 'Login berhasil! Selamat datang, ' + username,
      token,
      user: {
        username: username.trim(),
      },
    });
  }

  return res.status(401).json({
    success: false,
    message: 'Username atau password salah. Silakan coba lagi.',
  });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const token = getWebSessionToken(req);
  const auth = verifySessionToken(token);

  if (auth.valid) {
    return res.json({
      authenticated: true,
      user: {
        username: auth.username,
      },
    });
  }

  return res.json({
    authenticated: false,
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const token = getWebSessionToken(req);
  if (token) {
    activeSessions.delete(token);
  }
  return res.json({
    success: true,
    message: 'Berhasil logout dari aplikasi.',
  });
});

// Endpoint to check if CLOUDFLARE_API_TOKEN is configured in server environment (.env)
app.get('/api/cf/auth-status', async (req: Request, res: Response) => {
  // Gate check
  const webAuth = verifySessionToken(getWebSessionToken(req));
  if (!webAuth.valid) {
    return res.status(401).json({ error: 'Akses ditolak. Silakan login ke dashboard terlebih dahulu.' });
  }

  const envToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  if (envToken && envToken !== 'MY_CLOUDFLARE_API_TOKEN') {
    const masked =
      envToken.length > 8
        ? `${envToken.slice(0, 4)}••••${envToken.slice(-4)}`
        : '••••••••';

    // Verify token validity with Cloudflare
    let isValid = false;
    let message = 'Token terdeteksi dari file .env';
    let email = 'Cloudflare Account (.env)';

    try {
      const testRes = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
        headers: {
          'Authorization': `Bearer ${envToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (testRes.ok) {
        const testData = await testRes.json();
        if (testData.success) {
          isValid = true;
          message = 'Token .env valid dan aktif';
          email = testData.result?.id ? `Token ID: ${testData.result.id.slice(0, 8)}...` : 'Token .env Terverifikasi';
        }
      } else {
        // Test /zones if User.Tokens scope is restricted
        const zoneRes = await fetch('https://api.cloudflare.com/client/v4/zones?per_page=1', {
          headers: { 'Authorization': `Bearer ${envToken}` },
        });
        if (zoneRes.ok) {
          const zoneData = await zoneRes.json();
          if (zoneData.success) {
            isValid = true;
            message = 'Token .env berhasil terhubung ke Cloudflare';
          }
        }
      }
    } catch (e: any) {
      console.warn('Could not verify env token immediately:', e?.message);
    }

    return res.json({
      hasEnvToken: true,
      isValid,
      preview: masked,
      email,
      message,
    });
  }

  return res.json({
    hasEnvToken: false,
  });
});

// Cloudflare API proxy to avoid browser CORS restrictions
app.all('/api/cf/*', async (req: Request, res: Response) => {
  // Gate check: user must be logged in to access Cloudflare endpoints
  const webAuth = verifySessionToken(getWebSessionToken(req));
  if (!webAuth.valid) {
    return res.status(401).json({
      success: false,
      errors: [{ message: 'Sesi login telah berakhir. Silakan login kembali ke web.' }],
    });
  }

  const subpath = req.params[0] || '';
  
  // Resolve token: priority to custom header, otherwise fallback to server .env
  let cfToken = req.headers['x-cf-token'] as string | undefined;
  if (!cfToken || cfToken === 'env') {
    cfToken = process.env.CLOUDFLARE_API_TOKEN?.trim();
  }
  if (!cfToken) {
    cfToken = req.headers.authorization?.replace(/^Bearer\s+/i, '');
  }

  if (!cfToken || cfToken === 'MY_CLOUDFLARE_API_TOKEN') {
    return res.status(401).json({
      success: false,
      errors: [
        {
          message:
            'Cloudflare API Token tidak ditemukan. Anda dapat memasukkan token di menu Pengaturan UI atau mendefinisikan CLOUDFLARE_API_TOKEN di file .env server.',
        },
      ],
    });
  }

  const cfUrl = new URL(`https://api.cloudflare.com/client/v4/${subpath}`);
  // Forward query string
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      cfUrl.searchParams.append(key, value);
    } else if (Array.isArray(value)) {
      value.forEach((v) => cfUrl.searchParams.append(key, String(v)));
    }
  }

  try {
    const cfResponse = await fetch(cfUrl.toString(), {
      method: req.method,
      headers: {
        'Authorization': `Bearer ${cfToken}`,
        'Content-Type': 'application/json',
      },
      body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? JSON.stringify(req.body) : undefined,
    });

    const data = await cfResponse.json();
    return res.status(cfResponse.status).json(data);
  } catch (error: any) {
    console.error('CF Proxy Error:', error);
    return res.status(502).json({
      success: false,
      errors: [{ message: `Gagal menghubungi Cloudflare API: ${error?.message || 'Unknown network error'}` }],
    });
  }
});

// Real DNS-over-HTTPS (DoH) lookup endpoint using Cloudflare 1.1.1.1 and Google 8.8.8.8
app.get('/api/dns/query', async (req: Request, res: Response) => {
  const domain = req.query.name as string;
  const type = (req.query.type as string) || 'A';
  const provider = (req.query.provider as string) || 'cloudflare';

  if (!domain) {
    return res.status(400).json({ error: 'Parameter name wajib diisi' });
  }

  try {
    const dohUrl =
      provider === 'google'
        ? `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`
        : `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=${encodeURIComponent(type)}`;

    const response = await fetch(dohUrl, {
      headers: {
        'Accept': 'application/dns-json',
      },
    });

    if (!response.ok) {
      throw new Error(`DoH upstream HTTP ${response.status}`);
    }

    const data = await response.json();
    return res.json({
      success: true,
      provider,
      query: { name: domain, type },
      result: data,
    });
  } catch (err: any) {
    console.error('DNS Query error:', err);
    return res.status(500).json({
      success: false,
      error: `Gagal melakukan DNS lookup: ${err?.message || 'Network error'}`,
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`DNS Manager server running on http://localhost:${PORT}`);
  });
}

startServer();
