/**
 * Dynamic Domain & URL Resolution Utilities for TenantFlow SaaS
 * Seamlessly supports both local development (*.localhost:8080)
 * and production cloud deployments (*.tenantflow.tech)
 */

export function getBaseHost(): string {
  if (typeof window === 'undefined') {
    return 'localhost:8080';
  }
  const hostname = window.location.hostname.toLowerCase();
  const port = window.location.port ? `:${window.location.port}` : '';

  if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.localhost')) {
    return `localhost${port}`;
  }

  const parts = hostname.split('.');
  const isIp = parts.every((p) => !isNaN(Number(p)));
  if (isIp) {
    return `${hostname}${port}`;
  }

  if (parts.length >= 3) {
    return `${parts.slice(1).join('.')}${port}`;
  }

  return `${hostname}${port}`;
}

export function buildRootUrl(path: string = ''): string {
  if (typeof window === 'undefined') {
    return `http://localhost:8080${path}`;
  }
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${window.location.protocol}//${getBaseHost()}${cleanPath}`;
}

export function buildTenantUrl(slug: string, path: string = ''): string {
  if (typeof window === 'undefined') {
    return `http://${slug}.localhost:8080${path}`;
  }
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  const cleanSlug = slug.trim().toLowerCase();
  return `${window.location.protocol}//${cleanSlug}.${getBaseHost()}${cleanPath}`;
}

export function buildAdminUrl(path: string = ''): string {
  if (typeof window === 'undefined') {
    return `http://admin.localhost:8080${path}`;
  }
  const cleanPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';
  return `${window.location.protocol}//admin.${getBaseHost()}${cleanPath}`;
}

// Backward-compatible aliases
export function getBaseDomain(): string {
  const base = getBaseHost();
  return base.split(':')[0];
}

export function getEffectivePort(): string {
  if (typeof window === 'undefined') return '';
  const p = window.location.port;
  return !p || p === '80' || p === '443' ? '' : `:${p}`;
}

export function getTenantHost(slug: string): string {
  return `${slug.trim().toLowerCase()}.${getBaseHost()}`;
}

export function getRootHost(): string {
  return getBaseHost();
}

export function getTenantUrl(slug: string, path: string = ''): string {
  return buildTenantUrl(slug, path);
}

export function getRootUrl(path: string = ''): string {
  return buildRootUrl(path);
}
