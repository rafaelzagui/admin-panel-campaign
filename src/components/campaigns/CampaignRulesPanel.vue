<script setup lang="ts">
import type { CampaignRuleDto } from '@/dtos/campaign.dto'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'

defineProps<{
  rules: CampaignRuleDto[]
}>()
</script>

<template>
  <article class="panel rules-panel">
    <div class="panel-heading">
      <h2>Regras</h2>
      <span class="badge muted">prioridade menor primeiro</span>
    </div>
    <div class="stack">
      <div v-for="rule in rules" :key="rule.id" class="compact-row">
        <span>
          <strong>{{ rule.type }}</strong>
          <small>priority {{ rule.priority }} - {{ rule.condition }}</small>
        </span>
        <StatusIndicator :status="rule.status" />
      </div>
    </div>
  </article>
</template>
