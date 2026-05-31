<script setup lang="ts">
import type { CampaignLinkedEntityDto } from '@/dtos/campaign.dto'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'

defineProps<{
  title: string
  description: string
  items: CampaignLinkedEntityDto[]
}>()
</script>

<template>
  <article class="workspace-panel">
    <div class="workspace-panel-heading">
      <div>
        <h2>{{ title }}</h2>
        <p>{{ description }}</p>
      </div>
    </div>

    <div class="management-table">
      <div class="management-row table-head three-col">
        <span>Nome</span>
        <span>Campaign ID</span>
        <span>Status</span>
      </div>
      <div v-for="item in items" :key="item.id" class="management-row three-col">
        <strong>{{ item.name }}</strong>
        <code>{{ item.campaignId }}</code>
        <StatusIndicator :status="item.status" />
      </div>
    </div>
  </article>
</template>
