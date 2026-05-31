import type { CampaignStatus, EntityStatus } from '@/dtos/campaign.dto'

export function statusClass(status: CampaignStatus | EntityStatus) {
  return {
    ACTIVE: 'good',
    DRAFT: 'muted',
    SCHEDULED: 'info',
    PAUSED: 'warn',
    FAILED: 'bad',
    COMPLETED: 'done',
    CANCELLED: 'muted',
    INACTIVE: 'muted',
    ARCHIVED: 'muted',
  }[status]
}
