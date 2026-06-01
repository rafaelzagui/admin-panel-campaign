export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type ScheduleType = 'MANUAL' | 'ONE_TIME' | 'CRON' | 'EVENT_DRIVEN'
export type EntityStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED' | 'FAILED' | 'DRAFT'

export type RuleType =
  | 'PRICE_RANGE'
  | 'DISCOUNT_THRESHOLD'
  | 'KEYWORD_MATCH'
  | 'MARKETPLACE_ALLOWLIST'
  | 'MARKETPLACE_BLOCKLIST'
  | 'CATEGORY_ALLOWLIST'
  | 'CATEGORY_BLOCKLIST'
  | 'MIN_SELLER_RATING'
  | 'MIN_STOCK'
  | 'CUSTOM'

export type CampaignDto = {
  id: string
  name: string
  slug: string
  description: string
  status: CampaignStatus
  scheduleType: ScheduleType
  timezone: string
  startsAt: string
  endsAt: string
  triggerConfig: string
  normalizationConfig: string
  metadata: string
  createdAt?: string
  updatedAt?: string
  rulesCount?: number
  audiencesCount?: number
  templatesCount?: number
  latestExecutionStatus?: string | null
  error?: string
}

export type CampaignRuleDto = {
  id: string
  campaignId: string
  name?: string
  description?: string | null
  type: RuleType
  status: EntityStatus
  priority: number
  condition: string
  errorMessage?: string | null
}

export type CampaignLinkedEntityDto = {
  id: string
  campaignId: string
  name: string
  status: EntityStatus
  type?: string
  identifier?: string
  displayName?: string | null
  payload?: string
  channel?: string
  content?: string
  fallbackContent?: string | null
  variables?: string
}

export type AuditEventDto = {
  id: string
  createdAt: string
  campaignId: string
  action: string
  detail: string
}

export type CampaignSnapshotDto = {
  campaigns: CampaignDto[]
  rules: CampaignRuleDto[]
  audiences: CampaignLinkedEntityDto[]
  templates: CampaignLinkedEntityDto[]
  auditEvents: AuditEventDto[]
}
