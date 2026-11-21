/**
 * Domain and URL Resolution Utilities for TenantFlow SaaS
 * Seamlessly supports both local development (*.localhost:8080)
 * and production cloud deployments (*.tenantflow.tech)
 */

export function getBaseDomain(): string {
  const host = window.location.hostname.toLowerCase();
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'localhost';
  }
  if (host.endsWith('.localhost')) {
    return 'localhost';
  }
  const parts = host.split('.');
  const isIp = parts.every((p) => !isNaN(Number(p)));
  if (isIp) {
    return host;
  }
  if (parts.length >= 3) {
    return parts.slice(1).join('.');
  }
  return host;
}

export function getEffectivePort(): string {
  const p = window.location.port;
  if (!p || p === '80' || p === '443') {
    return '';
  }
  return `:${p}`;
}

export function getTenantHost(slug: string): string {
  const base = getBaseDomain();
  const port = getEffectivePort();
  if (base === 'localhost') {
    return `${slug}.localhost${port}`;
  }
  return `${slug}.${base}${port}`;
}

export function getRootHost(): string {
  const base = getBaseDomain();
  const port = getEffectivePort();
  return `${base}${port}`;
}

export function getTenantUrl(slug: string, path: string = ''): string {
  const proto = window.location.protocol;
  const host = getTenantHost(slug);
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${proto}//${host}${cleanPath}`;
}

export function getRootUrl(path: string = ''): string {
  const proto = window.location.protocol;
  const host = getRootHost();
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${proto}//${host}${cleanPath}`;
}
