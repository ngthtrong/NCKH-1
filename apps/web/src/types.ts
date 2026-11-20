export interface CustomFieldDef {
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE';
  required: boolean;
  options?: string[];
}

export interface TenantSettings {
  theme: {
    primary: string;
    accent: string;
    logoText?: string;
    tagline?: string;
  };
  wipMode: 'STRICT' | 'WARN' | 'OFF';
  defaultWipLimit: number | null;
  cardDisplayMode: 'FULL' | 'COMPACT';
  defaultColumns: string[];
  customFields: CustomFieldDef[];
}

export interface PublicBranding {
  id: string;
  slug: string;
  name: string;
  tier: string;
  status: string;
  theme: {
    primary: string;
    accent: string;
    logoText?: string;
    tagline?: string;
  };
}

export interface AuthUser {
  email: string;
  fullName: string;
  role: string;
  systemAdmin: boolean;
}

export interface TenantInfo {
  tenantId: string | null;
  slug: string;
  userId: string | null;
  email: string;
  fullName: string;
  role: string;
  tier: string;
  systemAdmin: boolean;
}

export interface Board {
  id: string;
  tenantId: string;
  name: string;
  createdAt: string;
}

export interface BoardColumn {
  id: string;
  tenantId: string;
  boardId: string;
  name: string;
  position: number;
  wipLimit: number | null;
}

export interface Card {
  id: string;
  tenantId: string;
  columnId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  position: number;
  version: number;
  customFields: Record<string, unknown>;
  createdAt: string;
}

export interface TenantMember {
  id: string;
  email: string;
  fullName: string;
  role: 'TENANT_ADMIN' | 'MEMBER';
  createdAt: string;
}

export interface AdminTenant {
  id: string;
  slug: string;
  name: string;
  tier: 'FREE' | 'STANDARD' | 'PRO' | 'ENTERPRISE';
  rateLimitRpm: number;
  maxMembers: number;
  status: 'ACTIVE' | 'SUSPENDED';
  memberCount?: number;
  blocked429Count?: number;
  settings: TenantSettings;
  createdAt: string;
}

export interface InspectorTelemetry {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  tenantId: string;
  subdomainMatch: string;
  cacheStatus: string;
  rateLimit: string;
  rlsContext: string;
  responseTimeMs: string;
}
