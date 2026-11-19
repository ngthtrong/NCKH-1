/**
 * Resolves the base domain for the application.
 * Priority:
 * 1. import.meta.env.VITE_BASE_DOMAIN if set and non-empty (e.g. "tenantflow.tech")
 * 2. Inferred from window.location.hostname:
 *    - If hostname is "localhost" or ends with ".localhost" or is an IPv4 address -> "localhost"
 *    - Otherwise, extracts the base domain (e.g. "accounts.tenantflow.tech" -> "tenantflow.tech")
 * 3. Fallback to "localhost"
 */
export function getBaseDomain(): string {
  const envDomain = import.meta.env.VITE_BASE_DOMAIN;
  if (envDomain && typeof envDomain === 'string' && envDomain.trim() !== '') {
    return envDomain.trim();
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const host = window.location.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.localhost') || /^\d+\.\d+\.\d+\.\d+$/.test(host)) {
      return 'localhost';
    }
    const dotIndex = host.indexOf('.');
    if (dotIndex !== -1 && dotIndex < host.length - 1) {
      return host.slice(dotIndex + 1);
    }
    return host;
  }

  return 'localhost';
}

/**
 * Formats a tenant slug into its full host name (e.g. "t-acme.tenantflow.tech" or "t-acme.localhost").
 * Returns an empty string if slug is empty, null, or undefined.
 */
export function formatTenantHost(slug?: string | null): string {
  if (!slug || slug.trim() === '') {
    return '';
  }
  const baseDomain = getBaseDomain();
  return `${slug.trim()}.${baseDomain}`;
}
