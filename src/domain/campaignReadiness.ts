import type {
  CampaignDto,
  CampaignLinkedEntityDto,
  CampaignRuleDto,
  CampaignSnapshotDto,
} from '@/dtos/campaign.dto'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function isValidJson(value: string) {
  try {
    JSON.parse(value || '{}')
    return true
  } catch {
    return false
  }
}

function hasActiveEntity(items: Array<CampaignRuleDto | CampaignLinkedEntityDto>, campaignId: string) {
  return items.some((item) => item.campaignId === campaignId && item.status === 'ACTIVE')
}

export function validateCampaignReadiness(campaign: CampaignDto, snapshot: CampaignSnapshotDto) {
  const issues: string[] = []

  if (!campaign.name.trim()) issues.push('Nome obrigatorio.')
  if (!campaign.slug.trim()) issues.push('Slug obrigatorio.')
  if (campaign.slug && !slugPattern.test(campaign.slug)) {
    issues.push('Slug deve conter apenas minusculas, numeros e hifens.')
  }

  if (!isValidJson(campaign.triggerConfig)) issues.push('triggerConfig deve ser JSON valido.')
  if (!isValidJson(campaign.normalizationConfig)) {
    issues.push('normalizationConfig deve ser JSON valido.')
  }
  if (!isValidJson(campaign.metadata)) issues.push('metadata deve ser JSON valido.')

  if (!hasActiveEntity(snapshot.rules, campaign.id)) {
    issues.push('Adicione pelo menos uma regra ativa.')
  }
  if (!hasActiveEntity(snapshot.audiences, campaign.id)) {
    issues.push('Adicione pelo menos uma audiencia ativa.')
  }
  if (!hasActiveEntity(snapshot.templates, campaign.id)) {
    issues.push('Adicione pelo menos um template ativo.')
  }

  if (campaign.scheduleType === 'ONE_TIME' && !campaign.startsAt) {
    issues.push('ONE_TIME exige startsAt.')
  }
  if (campaign.scheduleType === 'CRON' && !campaign.triggerConfig.includes('cron')) {
    issues.push('CRON exige configuracao em triggerConfig.')
  }
  if (campaign.scheduleType === 'EVENT_DRIVEN' && !campaign.triggerConfig.includes('event')) {
    issues.push('EVENT_DRIVEN exige configuracao de evento em triggerConfig.')
  }
  if (['ONE_TIME', 'CRON'].includes(campaign.scheduleType) && !campaign.timezone) {
    issues.push('Timezone obrigatorio para agendamento por data ou cron.')
  }
  if (campaign.startsAt && campaign.endsAt && new Date(campaign.endsAt) <= new Date(campaign.startsAt)) {
    issues.push('endsAt deve ser maior que startsAt.')
  }

  return issues
}
