export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH || '';

export function getBasePath(): string {
  if (typeof window !== 'undefined') {
    if ((window as any).__NEXT_DATA__?.basePath) {
      return (window as any).__NEXT_DATA__.basePath;
    }
    if (process.env.NEXT_PUBLIC_BASE_PATH) {
      return process.env.NEXT_PUBLIC_BASE_PATH;
    }
    // App Router runtime fallback: if running under /inventaris-nh
    if (window.location.pathname.startsWith('/inventaris-nh')) {
      return '/inventaris-nh';
    }
  }
  return process.env.NEXT_PUBLIC_BASE_PATH || process.env.BASE_PATH || '';
}

export function withBasePath(path: string): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('mailto:') || path.startsWith('tel:')) {
    return path;
  }
  const base = getBasePath();
  if (!base) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  if (cleanPath === base || cleanPath.startsWith(`${base}/`)) {
    return cleanPath;
  }
  return `${base}${cleanPath}`;
}

export function formatPhotoUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return withBasePath(path);
}
