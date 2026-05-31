export type ApiError = {
  statusCode: number
  message: string | string[]
  error?: string
}

export type CampaignStatus =
  | 'DRAFT'
  | 'SCHEDULED'
  | 'ACTIVE'
  | 'PAUSED'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type CampaignScheduleType = 'MANUAL' | 'ONE_TIME' | 'CRON' | 'EVENT_DRIVEN'

export type CampaignExecutionStatus =
  | 'PENDING'
  | 'QUEUED'
  | 'RUNNING'
  | 'COMPLETED'
  | 'PARTIALLY_COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type JsonRecord = Record<string, unknown>

export type Campaign = {
  id: string
  name: string
  slug: string
  description: string | null
  status: CampaignStatus
  scheduleType: CampaignScheduleType
  timezone: string | null
  startsAt: string | null
  endsAt: string | null
  triggerConfig: JsonRecord | null
  normalizationConfig: JsonRecord | null
  metadata: JsonRecord | null
  createdAt: string
  updatedAt: string
}

export type CampaignSummary = Campaign & {
  rulesCount: number
  audiencesCount: number
  templatesCount: number
  latestExecutionStatus: CampaignExecutionStatus | null
}

export type CampaignRule = {
  id: string
  campaignId: string
  name: string
  description: string | null
  type:
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
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  priority: number
  condition: JsonRecord
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export type CampaignAudience = {
  id: string
  campaignId: string
  type: 'PHONE_NUMBER' | 'SEGMENT' | 'WEBHOOK'
  identifier: string
  displayName: string | null
  status: 'ACTIVE' | 'INACTIVE' | 'FAILED'
  payload: JsonRecord | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export type MessageTemplate = {
  id: string
  campaignId: string
  name: string
  channel: 'WHATSAPP'
  content: string
  fallbackContent: string | null
  variables: JsonRecord | null
  status: 'DRAFT' | 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export type CampaignExecution = {
  id: string
  campaignId: string
  correlationId: string
  status: CampaignExecutionStatus
  triggerSource: 'MANUAL' | 'SCHEDULED' | 'EVENT' | 'RETRY'
  triggeredBy: string | null
  triggeredAt: string
  startedAt: string | null
  completedAt: string | null
  requestPayload: JsonRecord | null
  resultPayload: JsonRecord | null
  errorMessage: string | null
  createdAt: string
  updatedAt: string
}

export type CampaignAssembly = Campaign & {
  rules: CampaignRule[]
  audiences: CampaignAudience[]
  messageTemplates: MessageTemplate[]
  latestExecution: CampaignExecution | null
}

export type UpdateCampaignPayload = Partial<{
  name: string
  slug: string
  description: string | null
  scheduleType: CampaignScheduleType
  timezone: string | null
  startsAt: string | null
  endsAt: string | null
  triggerConfig: JsonRecord | null
  normalizationConfig: JsonRecord | null
  metadata: JsonRecord | null
}>

export type CreateCampaignPayload = {
  name: string
  slug: string
  description?: string | null
  scheduleType?: CampaignScheduleType
  timezone?: string | null
  startsAt?: string | null
  endsAt?: string | null
  triggerConfig?: JsonRecord | null
  normalizationConfig?: JsonRecord | null
  metadata?: JsonRecord | null
}

export type CreateCampaignRulePayload = {
  name: string
  description?: string | null
  type: CampaignRule['type']
  status?: CampaignRule['status']
  priority?: number
  condition: JsonRecord
}

export type CreateCampaignAudiencePayload = {
  type: CampaignAudience['type']
  identifier: string
  displayName?: string | null
  status?: CampaignAudience['status']
  payload?: JsonRecord | null
}

export type CreateMessageTemplatePayload = {
  name: string
  channel?: MessageTemplate['channel']
  content: string
  fallbackContent?: string | null
  variables?: JsonRecord | null
  status?: MessageTemplate['status']
}
