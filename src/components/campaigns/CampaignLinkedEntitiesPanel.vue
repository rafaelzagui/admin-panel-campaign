<script setup lang="ts">
import type { CampaignLinkedEntityDto } from '@/dtos/campaign.dto'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'

defineProps<{
  audiences: CampaignLinkedEntityDto[]
  templates: CampaignLinkedEntityDto[]
}>()
</script>

<template>
  <article class="panel linked-panel">
    <div class="panel-heading">
      <h2>Audiencias e templates</h2>
    </div>
    <div class="split-list">
      <div>
        <small>Audiencias</small>
        <div v-for="audience in audiences" :key="audience.id" class="compact-row">
          <span>{{ audience.name }}</span>
          <StatusIndicator :status="audience.status" />
        </div>
      </div>
      <div>
        <small>Templates</small>
        <div v-for="template in templates" :key="template.id" class="compact-row">
          <span>{{ template.name }}</span>
          <StatusIndicator :status="template.status" />
        </div>
      </div>
    </div>
  </article>
</template>
