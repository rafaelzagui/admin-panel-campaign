<script setup lang="ts">
import { computed } from 'vue'
import StatusIndicator from '@/components/ui/StatusIndicator.vue'
import { useCampaignService } from '@/services/campaign.service'

const { state } = useCampaignService()

const rulesByPriority = computed(() =>
  [...state.rules].sort((a, b) => a.priority - b.priority),
)

function campaignName(campaignId: string) {
  return state.campaigns.find((campaign) => campaign.id === campaignId)?.name ?? 'Campanha removida'
}
</script>

<template>
  <section class="resource-page">
    <article class="panel resource-hero">
      <div>
        <span class="eyebrow">Regras da campanha</span>
        <h2>Ordem de avaliacao e condicoes</h2>
      </div>
      <span class="badge info">{{ state.rules.length }} regras</span>
    </article>

    <article class="panel">
      <div class="panel-heading">
        <h2>Regras cadastradas</h2>
        <span class="badge muted">somente ACTIVE conta para prontidao</span>
      </div>
      <div class="management-table">
        <div class="management-row table-head">
          <span>Tipo</span>
          <span>Campanha</span>
          <span>Prioridade</span>
          <span>Status</span>
          <span>Condicao</span>
        </div>
        <div v-for="rule in rulesByPriority" :key="rule.id" class="management-row">
          <strong>{{ rule.type }}</strong>
          <span>{{ campaignName(rule.campaignId) }}</span>
          <span>{{ rule.priority }}</span>
          <StatusIndicator :status="rule.status" />
          <code>{{ rule.condition }}</code>
        </div>
      </div>
    </article>
  </section>
</template>
