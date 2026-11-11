'use client';

import React, { useEffect } from 'react';
import { withBasePath } from '@/lib/base-path';

let interceptorInstalled = false;

export function BasePathProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === 'undefined' || interceptorInstalled) return;
    interceptorInstalled = true;

    const originalFetch = window.fetch;
    window.fetch = function (input: RequestInfo | URL, init?: RequestInit) {
      let finalInput = input;

      if (typeof input === 'string') {
        if (input.startsWith('/api/') || input.startsWith('/uploads/')) {
          finalInput = withBasePath(input);
        }
      }

      // Automatically forward session token from localStorage to support mobile browsers over HTTP LAN
      const options = init ? { ...init } : {};
      try {
        const token = localStorage.getItem('kantor_device_session_token');
        if (token) {
          const headers = new Headers(options.headers || {});
          if (!headers.has('x-session-token')) {
            headers.set('x-session-token', token.trim());
            options.headers = headers;
          }
        }
      } catch {}

      return originalFetch.call(this, finalInput, options);
    };
  }, []);

  return <>{children}</>;
}
