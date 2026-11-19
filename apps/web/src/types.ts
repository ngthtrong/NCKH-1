export interface CustomFieldDef {
  key: string;
  label: string;
  type: 'TEXT' | 'NUMBER';
  required: boolean;
}

export interface TenantSettings {
  theme: {
    primary: string;
    accent: string;
  };
  wipMode: 'STRICT' | 'WARN';
  defaultWipLimit: number | null;
  cardDisplayMode: 'FULL' | 'COMPACT';
  defaultColumns: string[];
  customFields: CustomFieldDef[];
}

export interface WorkspaceSummary {
  tenantId: string;
  slug: string;
  name: string;
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED';
  role: 'TENANT_ADMIN' | 'MEMBER';
}

export interface AuthUser {
  email: string;
  fullName: string;
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
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED';
  settings: TenantSettings;
  createdAt: string;
}
