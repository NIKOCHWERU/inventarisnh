/**
 * Client-side fetch wrapper that automatically forwards the stored employee
 * session token from device localStorage in an HTTP header ('x-session-token').
 * 
 * This ensures bullet-proof authentication even in mobile browsers (iOS Safari, Android Chrome)
 * connected via HTTP LAN IP (e.g. 192.168.x.x) where cookies might be delayed or blocked.
 */
export async function portalFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const options = init ? { ...init } : {};
  const headers = new Headers(options.headers || {});

  if (typeof window !== 'undefined') {
    try {
      const token = localStorage.getItem('kantor_device_session_token');
      if (token && !headers.has('x-session-token')) {
        headers.set('x-session-token', token.trim());
      }
    } catch {}
  }

  options.headers = headers;
  return fetch(input, options);
}
