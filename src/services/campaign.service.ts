import { reactive } from 'vue'
import type {
  CampaignAudience,
  CampaignExecution,
  CampaignRule,
  CampaignSummary,
  MessageTemplate,
  UpdateCampaignPayload,
} from '@/dtos/campaign-api.dto'
import type {
  AuditEventDto,
  CampaignDto,
  CampaignLinkedEntityDto,
  CampaignRuleDto,
  CampaignSnapshotDto,
} from '@/dtos/campaign.dto'
import { campaignSeed } from '@/mocks/campaign.mock'
import { apiRequest } from '@/services/apiClient'

type CampaignState = CampaignSnapshotDto & {
  loading: boolean
  error: string | null
  usingMock: boolean
}

function jsonToText(value: Record<string, unknown> | null | undefined) {
  return JSON.stringify(value ?? {}, null, 2)
}

function textToJson(value: string) {
  const parsed = JSON.parse(value || '{}')
  return Object.keys(parsed).length ? parsed : {}
}

function cloneSeed(): CampaignState {
  return {
    ...structuredClone(campaignSeed),
    loading: false,
    error: null,
    usingMock: true,
  }
}

function mapCampaign(campaign: CampaignSummary): CampaignDto {
  return {
    id: campaign.id,
    name: campaign.name,
    slug: campaign.slug,
    description: campaign.description ?? '',
    status: campaign.status,
    scheduleType: campaign.scheduleType,
    timezone: campaign.timezone ?? '',
    startsAt: campaign.startsAt ?? '',
    endsAt: campaign.endsAt ?? '',
    triggerConfig: jsonToText(campaign.triggerConfig),
    normalizationConfig: jsonToText(campaign.normalizationConfig),
    metadata: jsonToText(campaign.metadata),
    createdAt: campaign.createdAt,
    updatedAt: campaign.updatedAt,
    rulesCount: campaign.rulesCount,
    audiencesCount: campaign.audiencesCount,
    templatesCount: campaign.templatesCount,
    latestExecutionStatus: campaign.latestExecutionStatus,
  }
}

function mapRule(rule: CampaignRule): CampaignRuleDto {
  return {
    id: rule.id,
    campaignId: rule.campaignId,
    name: rule.name,
    description: rule.description,
    type: rule.type,
    status: rule.status,
    priority: rule.priority,
    condition: jsonToText(rule.condition),
    errorMessage: rule.errorMessage,
  }
}

function mapAudience(audience: CampaignAudience): CampaignLinkedEntityDto {
  return {
    id: audience.id,
    campaignId: audience.campaignId,
    name: audience.displayName ?? audience.identifier,
    status: audience.status,
  }
}

function mapTemplate(template: MessageTemplate): CampaignLinkedEntityDto {
  return {
    id: template.id,
    campaignId: template.campaignId,
    name: template.name,
    status: template.status,
  }
}

function mapExecution(execution: CampaignExecution): AuditEventDto {
  return {
    id: execution.id,
    campaignId: execution.campaignId,
    createdAt: execution.triggeredAt,
    action: execution.status,
    detail: execution.errorMessage ?? `correlationId=${execution.correlationId} source=${execution.triggerSource}`,
  }
}

const state = reactive<CampaignState>(cloneSeed())

function replaceCollection<T>(target: T[], items: T[]) {
  target.splice(0, target.length, ...items)
}

function replaceCampaignCollection<T extends { campaignId: string }>(target: T[], campaignId: string, items: T[]) {
  target.splice(0, target.length, ...target.filter((item) => item.campaignId !== campaignId), ...items)
}

function buildUpdatePayload(campaign: CampaignDto): UpdateCampaignPayload {
  return {
    name: campaign.name,
    slug: campaign.slug,
    description: campaign.description || null,
    scheduleType: campaign.scheduleType,
    timezone: campaign.timezone || null,
    startsAt: campaign.startsAt || null,
    endsAt: campaign.endsAt || null,
    triggerConfig: textToJson(campaign.triggerConfig),
    normalizationConfig: textToJson(campaign.normalizationConfig),
    metadata: textToJson(campaign.metadata),
  }
}

async function loadLinkedDataForCampaigns(campaignIds: string[]) {
  if (!campaignIds.length) {
    replaceCollection(state.rules, [])
    replaceCollection(state.audiences, [])
    replaceCollection(state.templates, [])
    replaceCollection(state.auditEvents, [])
    return
  }

  const results = await Promise.allSettled(
    campaignIds.map(async (campaignId) => {
      const [rules, audiences, templates, executions] = await Promise.all([
        apiRequest<CampaignRule[]>(`/campaigns/${campaignId}/rules`),
        apiRequest<CampaignAudience[]>(`/campaigns/${campaignId}/audiences`),
        apiRequest<MessageTemplate[]>(`/campaigns/${campaignId}/templates`),
        apiRequest<CampaignExecution[]>(`/campaigns/${campaignId}/executions`),
      ])

      return { rules, audiences, templates, executions }
    }),
  )
  const loaded = results.flatMap((result) => (result.status === 'fulfilled' ? [result.value] : []))

  replaceCollection(state.rules, loaded.flatMap((item) => item.rules.map(mapRule)))
  replaceCollection(state.audiences, loaded.flatMap((item) => item.audiences.map(mapAudience)))
  replaceCollection(state.templates, loaded.flatMap((item) => item.templates.map(mapTemplate)))
  replaceCollection(state.auditEvents, loaded.flatMap((item) => item.executions.map(mapExecution)))

  if (results.some((result) => result.status === 'rejected')) {
    state.error = 'Alguns dados vinculados nao puderam ser carregados do campaign-service.'
  }
}

async function loadCampaigns() {
  state.loading = true
  state.error = null

  try {
    const campaigns = await apiRequest<CampaignSummary[]>('/campaigns')
    replaceCollection(state.campaigns, campaigns.map(mapCampaign))
    await loadLinkedDataForCampaigns(campaigns.map((campaign) => campaign.id))
    state.usingMock = false
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Nao foi possivel carregar campanhas.'
    state.usingMock = true
  } finally {
    state.loading = false
  }
}

async function loadCampaignDetail(campaignId: string) {
  state.loading = true
  state.error = null

  try {
    const [campaign, rules, audiences, templates, executions] = await Promise.all([
      apiRequest<CampaignSummary>(`/campaigns/${campaignId}`),
      apiRequest<CampaignRule[]>(`/campaigns/${campaignId}/rules`),
      apiRequest<CampaignAudience[]>(`/campaigns/${campaignId}/audiences`),
      apiRequest<MessageTemplate[]>(`/campaigns/${campaignId}/templates`),
      apiRequest<CampaignExecution[]>(`/campaigns/${campaignId}/executions`),
    ])

    const campaignIndex = state.campaigns.findIndex((item) => item.id === campaign.id)
    const mappedCampaign = mapCampaign(campaign)

    if (campaignIndex >= 0) {
      state.campaigns.splice(campaignIndex, 1, mappedCampaign)
    } else {
      state.campaigns.unshift(mappedCampaign)
    }

    replaceCampaignCollection(state.rules, campaignId, rules.map(mapRule))
    replaceCampaignCollection(state.audiences, campaignId, audiences.map(mapAudience))
    replaceCampaignCollection(state.templates, campaignId, templates.map(mapTemplate))
    replaceCampaignCollection(state.auditEvents, campaignId, executions.map(mapExecution))
    state.usingMock = false
  } catch (error) {
    state.error = error instanceof Error ? error.message : 'Nao foi possivel carregar detalhe da campanha.'
    throw error
  } finally {
    state.loading = false
  }
}

async function updateCampaign(campaign: CampaignDto) {
  const updated = await apiRequest<CampaignSummary>(`/campaigns/${campaign.id}`, {
    method: 'PATCH',
    body: JSON.stringify(buildUpdatePayload(campaign)),
  })

  const mappedCampaign = mapCampaign(updated)
  const index = state.campaigns.findIndex((item) => item.id === campaign.id)
  if (index >= 0) state.campaigns.splice(index, 1, mappedCampaign)
  return mappedCampaign
}

async function activateCampaign(campaignId: string) {
  const updated = await apiRequest<CampaignSummary>(`/campaigns/${campaignId}/activate`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  const mappedCampaign = mapCampaign(updated)
  const index = state.campaigns.findIndex((item) => item.id === campaignId)
  if (index >= 0) state.campaigns.splice(index, 1, mappedCampaign)
  return mappedCampaign
}

async function pauseCampaign(campaignId: string) {
  const updated = await apiRequest<CampaignSummary>(`/campaigns/${campaignId}/pause`, {
    method: 'POST',
    body: JSON.stringify({}),
  })
  const mappedCampaign = mapCampaign(updated)
  const index = state.campaigns.findIndex((item) => item.id === campaignId)
  if (index >= 0) state.campaigns.splice(index, 1, mappedCampaign)
  return mappedCampaign
}

async function createExecution(campaign: CampaignDto) {
  const requestPayload = textToJson(campaign.triggerConfig)

  const execution = await apiRequest<CampaignExecution>(`/campaigns/${campaign.id}/executions`, {
    method: 'POST',
    body: JSON.stringify({
      triggeredBy: 'admin-ui',
      requestPayload,
    }),
  })

  state.auditEvents.unshift(mapExecution(execution))
  return execution
}

export function useCampaignService() {
  return {
    state,
    loadCampaigns,
    loadCampaignDetail,
    updateCampaign,
    activateCampaign,
    pauseCampaign,
    createExecution,
  }
}
