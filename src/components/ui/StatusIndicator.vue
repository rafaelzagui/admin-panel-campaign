<script setup lang="ts">
import type { CampaignStatus, EntityStatus } from '@/dtos/campaign.dto'
import { statusClass } from '@/domain/statusPresentation'

defineProps<{
  status: CampaignStatus | EntityStatus | 'RUNNING'
}>()
</script>

<template>
  <span :class="['status-indicator', statusClass(status === 'RUNNING' ? 'ACTIVE' : status)]">
    <span class="status-dot"></span>
    {{ status }}
  </span>
</template>
