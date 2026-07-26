import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 5000,
});

interface ErrorPayload {
  name: string;
  message: string;
  stack?: string;
  type?: string;
  endpoint?: string;
  method?: string;
  statusCode?: number;
  url?: string;
  userAgent?: string;
  platform?: string;
  browser?: string;
  tgVersion?: string;
  appVersion?: string;
  metadata?: Record<string, any>;
}

class FrontendErrorReporter {
  private rateLimitMap = new Map<string, number>();
  private readonly RATE_WINDOW = 5000;

  private isRateLimited(fingerprint: string): boolean {
    const now = Date.now();
    const last = this.rateLimitMap.get(fingerprint);
    if (last && now - last < this.RATE_WINDOW) return true;
    this.rateLimitMap.set(fingerprint, now);
    return false;
  }

  captureError(error: Error | any, extra?: Partial<ErrorPayload>) {
    try {
      const name = error?.name || 'Error';
      const message = error?.message || String(error || 'Unknown error');
      const fingerprint = `${name}:${message.substring(0, 100)}`;
      if (this.isRateLimited(fingerprint)) return;

      const tg = (window as any).Telegram?.WebApp;
      const initData = tg?.initDataUnsafe;
      const userAgent = navigator.userAgent;
      const payload: ErrorPayload = {
        name,
        message,
        stack: error?.stack,
        type: extra?.type || 'frontend',
        endpoint: extra?.endpoint || window.location.pathname,
        method: extra?.method || 'GET',
        statusCode: extra?.statusCode || 0,
        url: window.location.href,
        userAgent,
        platform: tg?.platform || navigator.platform,
        browser: userAgent,
        tgVersion: tg?.version,
        appVersion: import.meta.env.VITE_APP_VERSION || '1.0.0',
        metadata: extra?.metadata,
      };

      this.send(payload);
    } catch {
      // silently fail — never crash the error reporter itself
    }
  }

  captureRequestError(error: any, endpoint?: string, method?: string, statusCode?: number) {
    try {
      const name = error?.response?.data?.error || error?.code || 'RequestError';
      const message = error?.message || 'API request failed';
      const fingerprint = `${name}:${message.substring(0, 100)}:${endpoint || ''}`;
      if (this.isRateLimited(fingerprint)) return;

      const payload: ErrorPayload = {
        name,
        message,
        stack: error?.stack,
        type: 'axios',
        endpoint: endpoint || error?.config?.url || window.location.pathname,
        method: method || error?.config?.method?.toUpperCase() || 'GET',
        statusCode: statusCode || error?.response?.status || 0,
        url: window.location.href,
        userAgent: navigator.userAgent,
        platform: navigator.platform,
      };

      this.send(payload);
    } catch {
      // silently fail
    }
  }

  private async send(payload: ErrorPayload) {
    try {
      await api.post('/errors/report', payload);
    } catch {
      // cannot report error about error reporting — silently fail
    }
  }
}

export const frontendErrorReporter = new FrontendErrorReporter();

export function initFrontendErrorReporting() {
  window.onerror = (message, source, lineno, colno, error) => {
    frontendErrorReporter.captureError(error || new Error(String(message)), {
      type: 'window_onerror',
      metadata: { source, lineno, colno },
    });
    return false;
  };

  window.onunhandledrejection = (event) => {
    const error = event.reason instanceof Error ? event.reason : new Error(String(event.reason || 'Unhandled Promise rejection'));
    frontendErrorReporter.captureError(error, { type: 'unhandled_promise_rejection' });
  };
}
