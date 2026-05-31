<script setup lang="ts">
import type { CampaignDto } from '@/dtos/campaign.dto'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'

defineProps<{
  campaigns: CampaignDto[]
  selectedCampaignId: string
}>()

defineEmits<{
  select: [campaignId: string]
}>()
</script>

<template>
  <article class="panel campaigns-panel">
    <div class="panel-heading">
      <div>
        <span class="eyebrow">Fonte de verdade</span>
        <h2>Campanhas</h2>
      </div>
    </div>
    <div class="table">
      <button
        v-for="campaign in campaigns"
        :key="campaign.id"
        :class="['table-row', { selected: campaign.id === selectedCampaignId }]"
        @click="$emit('select', campaign.id)"
      >
        <span>
          <strong>{{ campaign.name }}</strong>
          <small>{{ campaign.slug }} · {{ campaign.scheduleType }}</small>
        </span>
        <StatusIndicator :status="campaign.status" />
      </button>
    </div>
  </article>
</template>
