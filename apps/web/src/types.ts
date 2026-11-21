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
  inviteCode?: string;
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

export interface DiscoveredTenant {
  type: 'TENANT' | 'PLATFORM_ADMIN';
  slug: string;
  name: string;
  tier: string;
  primaryColor: string;
  logoText: string;
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
  tier: 'FREE' | 'PRO' | 'ENTERPRISE';
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
  tenantSlug: string;
  method: string;
  path: string;
  status: number;
  tenantId?: string;
  subdomainMatch?: string;
  cacheStatus: string;
  rateLimit?: string;
  rlsContext?: string;
  responseTimeMs: string;
  latencyMs: number;
}

export interface MetricsSummary {
  totalTenants: number;
  activeTenants: number;
  totalRpm: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
  totalBlocked429: number;
  cacheHitRatio: number;
}

export interface MetricsTimeseriesPoint {
  time: string;
  blocked429: number;
  total: number;
  [tenantSlug: string]: string | number;
}

export interface TenantMetricsStat {
  id?: string;
  tenantId: string;
  slug: string;
  name: string;
  tier: string;
  status: string;
  rateLimitRpm: number;
  currentRpm: number;
  blocked429: number;
  p50Ms: number;
  p95Ms: number;
  l1Hits?: number;
  l2Hits?: number;
  dbMisses?: number;
  memberCount: number;
  maxMembers: number;
  boardCount: number;
  cardCount: number;
  primaryColor: string;
}

export interface MetricsOverview {
  summary: MetricsSummary;
  timeseries: MetricsTimeseriesPoint[];
  tenants?: TenantMetricsStat[];
  byTenant: TenantMetricsStat[];
}

export interface RlsProbeResult {
  dbRole: string;
  rlsForced: boolean;
  tenantId: string;
  targetSlug: string;
  otherSlug?: string;
  withoutContextCount: number;
  crossTenantCount: number;
  withContextCount: number;
  sampleTitles: string[];
  queryTimeMs: number;
  sqlWithoutContext: string;
  sqlCrossTenant: string;
  sqlWithContext: string;
}

export interface CacheProbeStep {
  step: number;
  source: 'DB_MISS' | 'L2_HIT' | 'L1_HIT';
  latencyMs: number;
  description: string;
}

export interface CacheProbeResult {
  tenantId: string;
  targetSlug: string;
  cacheKey: string;
  steps: CacheProbeStep[];
}

export interface NoisyNeighborTenantResult {
  slug: string;
  name: string;
  limitRpm: number;
  totalSent: number;
  successCount: number;
  blockedCount: number;
  p50Ms: number;
  p95Ms: number;
  statuses: number[];
}

export interface NoisyNeighborTestResult {
  noisy: NoisyNeighborTenantResult;
  normal?: NoisyNeighborTenantResult;
  acme: NoisyNeighborTenantResult;
}
