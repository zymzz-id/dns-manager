const STORAGE_KEY_WEB_SESSION = 'dns_manager_web_session_v1';
const STORAGE_KEY_WEB_USER = 'dns_manager_web_user_v1';

export interface WebUser {
  username: string;
}

export class AuthService {
  static getSessionToken(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY_WEB_SESSION);
    } catch {
      return null;
    }
  }

  static getSavedUser(): WebUser | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_WEB_USER);
      if (data) return JSON.parse(data);
    } catch {
      return null;
    }
    return null;
  }

  static saveSession(token: string, user: WebUser) {
    localStorage.setItem(STORAGE_KEY_WEB_SESSION, token);
    localStorage.setItem(STORAGE_KEY_WEB_USER, JSON.stringify(user));
  }

  static clearSession() {
    localStorage.removeItem(STORAGE_KEY_WEB_SESSION);
    localStorage.removeItem(STORAGE_KEY_WEB_USER);
  }

  static async checkSession(): Promise<{ authenticated: boolean; user?: WebUser }> {
    const token = this.getSessionToken();
    if (!token) return { authenticated: false };

    try {
      const res = await fetch('/api/auth/me', {
        headers: {
          'x-web-session': token,
        },
      });

      if (!res.ok) return { authenticated: false };
      const data = await res.json();
      if (data.authenticated && data.user) {
        return { authenticated: true, user: data.user };
      }
    } catch (e) {
      console.warn('Session verification error:', e);
    }

    this.clearSession();
    return { authenticated: false };
  }

  static async login(username: string, password: string): Promise<{ success: boolean; user?: WebUser; message?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok && data.success && data.token) {
        this.saveSession(data.token, data.user);
        return { success: true, user: data.user, message: data.message };
      }

      return { success: false, message: data.message || 'Login gagal.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Gagal menghubungi server.' };
    }
  }

  static async logout(): Promise<void> {
    const token = this.getSessionToken();
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'x-web-session': token },
        });
      } catch (e) {
        console.warn('Logout server notification failed:', e);
      }
    }
    this.clearSession();
  }
}
